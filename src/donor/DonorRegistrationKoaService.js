"use strict";

import { isUserLogged, loggedUserId } from "../core/user";
import { Zip } from "../zip/Zip";
import { DonorRegistration } from "./DonorRegistration";
import mongoose from "mongoose";
import { validateAsync } from "../core/mongo";
import { emailRegex, sendMail } from "../core/mail";
import {
    assignEntity,
    hasAnyOwnProperty,
    isEmptyString,
    isNonEmptyString,
    removeAccentsAndDiacritics,
    success,
    unsuccess
} from "../core/utils";
import { User } from "../user/User";
import { DonorApplication } from "./DonorApplication";
import { validateRecaptcha } from "../core/recaptcha";
import { DogTagOrder } from "./DogTagOrder";
import { phoneRegex, sendSms } from "../core/phone";

export class DonorRegistrationKoaService {
    async findDonors(ctx, paging) {
        const queryResult = await this.createDonorQuery(ctx);
        if (!queryResult.success) {
            return queryResult;
        }
        const { query, zipCode, maxDistance } = queryResult.data;
        const registrations = await DonorRegistration.find(query)
            .skip(paging.offset)
            .limit(paging.limit);
        return success({ registrations, zipCode, maxDistance });
    }

    async countDonors(ctx) {
        const queryResult = await this.createDonorQuery(ctx);
        if (!queryResult.success) {
            return queryResult;
        }
        const { query, zipCode, maxDistance } = queryResult.data;
        const totalCount = await DonorRegistration.count(query);
        return success({ totalCount, zipCode, maxDistance });
    }

    async createDonorQuery(ctx) {
        let query = {};
        const zipCode = ctx.query.zip
            ? ctx.query.zip.replace(/\s/g, "")
            : isUserLogged(ctx)
            ? (await User.findOne({ _id: loggedUserId(ctx) })).zip
            : null;
        const maxDistance = ctx.query.maxDistance
            ? Number(ctx.query.maxDistance)
            : 50; // default 50km
        if (zipCode) {
            const zipResult = await this.findZip(ctx, zipCode);
            if (!zipResult.success) {
                return unsuccess({ zipCode, maxDistance }, zipResult.errors);
            }
            const zip = zipResult.data;
            Object.assign(query, {
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: zip.coordinates
                        },
                        $maxDistance: maxDistance * 1000 // meters
                    }
                }
            });
        }
        return success({ query, zipCode, maxDistance });
    }

    async aggregateDonorsByZip(ctx, zipCode, maxDistance, maxDate) {
        let aggregate = DonorRegistration.aggregate();
        if (zipCode) {
            const zipResult = await this.findZip(ctx, zipCode);
            if (!zipResult.success) {
                return zipResult;
            }
            const zip = zipResult.data;
            aggregate = aggregate.near({
                near: { type: "Point", coordinates: zip.coordinates },
                distanceField: "distance",
                maxDistance: maxDistance * 1000, // meters
                num: 1000000
            });
        }
        if (maxDate) {
            aggregate = aggregate.match({ registerDate: { $lte: maxDate } });
        }
        return success(
            await aggregate
                .group({
                    _id: "$zip",
                    registrationCount: { $sum: 1 },
                    location: { $first: "$location.coordinates" }
                })
                .project({
                    zip: "$_id",
                    registrationCount: 1,
                    location: 1,
                    _id: 0
                })
                .exec()
        );
    }

    async registerDonor(ctx) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const data = ctx.request.body;
        // recaptcha v2
        /*const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "registerDonor"
        );
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }*/
        const duplicateCheck = await this.checkDuplicateDonorRegistration(
            ctx,
            data
        );
        if (!duplicateCheck.success) {
            return duplicateCheck;
        }
        const user = await User.findOne({ _id: loggedUserId(ctx) });
        const zipResult = await this.findZip(ctx, user.zip);
        if (!zipResult.success) {
            console.error(
                `Unknown zip ${user.zip} during registering donor. This should never happen.`
            );
            return zipResult;
        }
        const zip = zipResult.data;
        const registration = new DonorRegistration({
            name: data.name,
            weight: data.weight,
            birthYear: data.birthYear,
            sex: data.sex,
            breed: data.breed,
            userId: mongoose.mongo.ObjectId(loggedUserId(ctx)),
            zip: zip.zip,
            district: zip.district,
            location: { type: "Point", coordinates: zip.coordinates },
            note: data.note,
            phoneFilledIn: isNonEmptyString(user.phone),
            registerDate: ctx.state.now,
            modifyDate: ctx.state.now
        });
        const validation = await validateAsync(registration);
        if (validation) {
            return unsuccess(data, validation.errors);
        } else {
            const savedRegistration = await registration.save();
            if (this.shouldCreateDogTagOrder(user)) {
                const dogTagOrder = new DogTagOrder({
                    userId: mongoose.mongo.ObjectId(loggedUserId(ctx)),
                    donorRegistrationId: mongoose.mongo.ObjectId(
                        savedRegistration.id
                    ),
                    orderState: "NEW",
                    firstName: user.firstName,
                    surname: user.surname,
                    street: user.street,
                    city: user.city,
                    zip: user.zip,
                    createdDate: ctx.state.now
                });
                await dogTagOrder.save();
            }
            return success();
        }
    }

    async checkDuplicateDonorRegistration(ctx, data, modified) {
        const registrations = await this.findLoggedUserRegistrations(ctx);
        const duplicate = registrations.find(
            // FIXME better check? lower case, without interpunction?
            registration => {
                return (
                    registration.name.toLowerCase() ===
                        data.name.toLowerCase().trim() &&
                    (!modified || registration.id !== modified.id)
                );
            }
        );
        if (duplicate) {
            console.warn(
                `Duplicate registration. UserId ${loggedUserId(ctx)}.`
            );
            return unsuccess(data, {
                donorRegistration: "duplicate-registration"
            });
        } else {
            return success();
        }
    }

    shouldCreateDogTagOrder(user) {
        return (
            isNonEmptyString(user.firstName) &&
            isNonEmptyString(user.surname) &&
            isNonEmptyString(user.street) &&
            isNonEmptyString(user.city) &&
            isNonEmptyString(user.zip)
        );
    }

    removeDonorRegistration(ctx) {
        return this.modifyDonorRegistration(ctx, async (ctx, registration) => {
            await DonorRegistration.deleteOne({ _id: registration.id });
        });
    }

    editDonorRegistration(ctx) {
        return this.modifyDonorRegistration(ctx, async (ctx, registration) => {
            const data = ctx.request.body;
            // recaptcha v2
            /*const recaptchaResult = await validateRecaptcha(
                ctx,
                data,
                "editDonor"
            );
            if (!recaptchaResult.success) {
                return recaptchaResult;
            }*/
            const duplicateCheck = await this.checkDuplicateDonorRegistration(
                ctx,
                data,
                registration
            );
            if (!duplicateCheck.success) {
                return assignEntity(duplicateCheck, registration);
            }
            registration.name = data.name;
            registration.weight = data.weight;
            registration.birthYear = data.birthYear;
            registration.sex = data.sex;
            registration.breed = data.breed;
            registration.note = data.note;
            registration.modifyDate = ctx.state.now;
            const validation = await validateAsync(registration);
            if (validation) {
                return unsuccess(data, validation.errors, registration);
            } else {
                await DonorRegistration.replaceOne(
                    { _id: registration.id },
                    registration
                );
                return success();
            }
        });
    }

    async modifyDonorRegistration(ctx, modifyFun) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const userId = loggedUserId(ctx);
        const registration = await this.findDonorRegistration(ctx);
        if (userId !== registration.userId.toString()) {
            ctx.throw(403);
        }
        return modifyFun(ctx, registration);
    }

    async contactDonor(ctx) {
        const registration = await this.findDonorRegistration(ctx);
        if (!registration) {
            ctx.throw(404, "Unknown donor registration");
        }
        const donor = await User.findOne({ _id: registration.userId });
        if (!donor) {
            ctx.throw(404, "Unknown donor user");
        }
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "contactDonor"
        );
        if (!recaptchaResult.success) {
            return assignEntity(recaptchaResult, registration);
        }
        const applicantEmail = data.email;
        const applicantPhone = isNonEmptyString(data.fullPhone)
            ? data.fullPhone
            : null;
        const applicantName = data.name;
        const applicantMessage = data.message;
        console.info(
            `Try to contact donor. Registration ${registration.id}, applicant ${applicantEmail}, ${applicantName}, ${applicantMessage}.`
        );
        const errors = {};
        if (!emailRegex.test(applicantEmail)) {
            Object.assign(errors, { email: "Email není validní." });
        }
        if (
            isNonEmptyString(applicantPhone) &&
            !phoneRegex.test(applicantPhone)
        ) {
            Object.assign(errors, { phone: "Mobil není validní." });
        }
        if (isEmptyString(applicantName)) {
            Object.assign(errors, { name: "Jméno je povinné." });
        }
        if (isEmptyString(applicantMessage)) {
            Object.assign(errors, { message: "Zpráva pro dárce je povinná." });
        }
        if (hasAnyOwnProperty(errors)) {
            return unsuccess(data, errors, registration);
        } else {
            const userId = isUserLogged(ctx) ? loggedUserId(ctx) : null;
            const donorApplication = new DonorApplication({
                applicantEmail: applicantEmail,
                applicantPhone: applicantPhone,
                applicantName: applicantName,
                applicantMessage: applicantMessage,
                donorRegistrationId: registration.id,
                userId: userId,
                createdDate: ctx.state.now
            });
            await donorApplication.save();
            await sendMail(
                "contact-donor",
                {
                    applicantMessage,
                    applicantName,
                    applicantPhone,
                    registration
                },
                donor.originalEmail,
                applicantEmail
            );
            if (donor.phone && applicantPhone) {
                const smsApplicantName = removeAccentsAndDiacritics(
                    applicantName
                );
                await sendSms(
                    `Dobry den, ${smsApplicantName} vas zada o darovani psi krve. Ozvete se prosim na telefonni cislo ${applicantPhone}. Dekujeme, Cervena tlapka.`,
                    donor.phone
                );
            }
            return success();
        }
    }

    async findZip(ctx, zipCode) {
        const zip = await Zip.findOne({ zip: zipCode });
        if (!zip) {
            console.warn(`Unknown zip ${zipCode}.`);
            return unsuccess(null, { zip: "unknown-zip" });
        }
        return success(zip);
    }

    async findLoggedUserRegistrations(ctx) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const userId = loggedUserId(ctx);
        return DonorRegistration.find({
            userId: userId
        });
    }

    findDonorRegistration(ctx) {
        const registrationId = ctx.params.id;
        return DonorRegistration.findOne({
            _id: registrationId
        });
    }
}
