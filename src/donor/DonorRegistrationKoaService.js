"use strict";

import { isUserLogged, loggedUserId, loggedUserZip } from "../core/user";
import { Zip } from "../zip/Zip";
import { DonorRegistration } from "./DonorRegistration";
import mongoose from "mongoose";
import { validateAsync } from "../core/mongo";
import { emailRegex, sendMail } from "../core/mail";
import { hasAnyOwnProperty, isEmptyString } from "../core/utils";
import { User } from "../user/User";
import { DonorApplication } from "./DonorApplication";
import { validateRecaptcha } from "../core/recaptcha";

export class DonorRegistrationKoaService {
    async findDonors(ctx, paging) {
        const { query, zipCode, maxDistance } = await this.createDonorQuery(
            ctx
        );
        const registrations = await DonorRegistration.find(query)
            .skip(paging.offset)
            .limit(paging.limit);
        return { registrations, zipCode, maxDistance };
    }

    async countDonors(ctx) {
        const { query } = await this.createDonorQuery(ctx);
        return await DonorRegistration.count(query);
    }

    async createDonorQuery(ctx) {
        let query = {};
        const zipCode = ctx.query.zip
            ? ctx.query.zip
            : isUserLogged(ctx)
            ? loggedUserZip(ctx)
            : null;
        const maxDistance = ctx.query.maxDistance
            ? Number(ctx.query.maxDistance)
            : 50; // default 50km
        if (zipCode) {
            // FIXME unknown zip?
            const zip = await this.findZip(ctx, zipCode);
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
        return { query, zipCode, maxDistance };
    }

    async aggregateDonorsByZip(ctx, zipCode, maxDistance) {
        let aggregate = DonorRegistration.aggregate();
        if (zipCode) {
            const zip = await this.findZip(ctx, zipCode);
            aggregate = aggregate.near({
                near: { type: "Point", coordinates: zip.coordinates },
                distanceField: "distance",
                maxDistance: maxDistance * 1000, // meters
                num: 1000000
            });
        }
        return aggregate
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
            .exec();
    }

    async registerDonor(ctx) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "registerDonor"
        );
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const zip = await this.findZip(ctx, loggedUserZip(ctx));
        const registration = new DonorRegistration({
            name: data.name,
            weight: data.weight,
            birthYear: data.birthYear,
            sex: data.sex,
            breed: data.breed,
            userId: mongoose.mongo.ObjectId(loggedUserId(ctx)),
            zip: zip.zip,
            district: zip.district,
            location: { type: "Point", coordinates: zip.coordinates }
        });
        const validation = await validateAsync(registration);
        if (validation) {
            return { success: false, data: data, errors: validation.errors };
        } else {
            await registration.save();
            return { success: true };
        }
    }

    removeDonorRegistration(ctx) {
        return this.modifyDonorRegistration(ctx, async (ctx, registration) => {
            await DonorRegistration.deleteOne({ _id: registration.id });
        });
    }

    editDonorRegistration(ctx) {
        return this.modifyDonorRegistration(ctx, async (ctx, registration) => {
            const data = ctx.request.body;
            const recaptchaResult = await validateRecaptcha(
                ctx,
                data,
                "editDonor"
            );
            if (!recaptchaResult.success) {
                return recaptchaResult;
            }
            registration.name = data.name;
            registration.weight = data.weight;
            registration.birthYear = data.birthYear;
            registration.sex = data.sex;
            registration.breed = data.breed;
            const validation = await validateAsync(registration);
            if (validation) {
                return {
                    success: false,
                    registration: registration,
                    data: data,
                    errors: validation.errors
                };
            } else {
                await DonorRegistration.replaceOne(
                    { _id: registration.id },
                    registration
                );
                return { success: true };
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
            return recaptchaResult;
        }
        const applicantEmail = data.email;
        const applicantName = data.name;
        const applicantMessage = data.message;
        const errors = {};
        if (!emailRegex.test(applicantEmail)) {
            Object.assign(errors, { email: "Email není validní." });
        }
        if (isEmptyString(applicantName)) {
            Object.assign(errors, { name: "Jméno je povinné." });
        }
        if (isEmptyString(applicantMessage)) {
            Object.assign(errors, { message: "Zpráva pro dárce je povinná." });
        }
        if (hasAnyOwnProperty(errors)) {
            return { success: false, data: data, errors: errors };
        } else {
            const userId = isUserLogged(ctx) ? loggedUserId(ctx) : null;
            const donorApplication = new DonorApplication({
                applicantEmail: applicantEmail,
                applicantName: applicantName,
                applicantMessage: applicantMessage,
                donorRegistrationId: registration.id,
                userId: userId,
                createdDate: new Date()
            });
            await donorApplication.save();
            await sendMail(
                "contact-donor",
                { applicantMessage, applicantName, registration },
                donor.originalEmail,
                applicantEmail
            );
            return { success: true };
        }
    }

    async findZip(ctx, zipCode) {
        const zip = await Zip.findOne({ zip: zipCode });
        if (!zip) {
            ctx.throw(400, "unknown zip");
        }
        return zip;
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
