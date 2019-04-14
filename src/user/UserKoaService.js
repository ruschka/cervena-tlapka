"use strict";

import bcrypt from "bcrypt";
import { User } from "./User";
import { validateAsync } from "../core/mongo";
import jwt from "jsonwebtoken";
import { isUserLogged, loggedUserId } from "../core/user";
import { validateRecaptcha } from "../core/recaptcha";
import { sendMail } from "../core/mail";
import crypto from "crypto";
import util from "util";
import config from "../core/config";
import { Zip } from "../zip/Zip";
import zxcvbn from "zxcvbn";
import { PasswordReset } from "./PasswordReset";
import {
    hasAnyOwnProperty,
    isEmptyString,
    isNonEmptyString,
    success,
    unsuccess
} from "../core/utils";

export const tokenCookie = "token";
const jwtSecret = config.user.jwtSecret;
const saltRounds = config.user.saltRounds;

export class UserKoaService {
    async register(ctx) {
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(ctx, data, "register");
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const originalEmail = data.email;
        const email = this.normalizeEmail(originalEmail);
        const existingUser = await this.findUserByEmail(email);
        if (existingUser) {
            return unsuccess(data, {
                email: "Účet s daným emailem již existuje."
            });
        }
        const password = data.password;
        const passwordCheck = this.checkPassword(
            data,
            password,
            data.passwordConfirm
        );
        if (!passwordCheck.success) {
            return passwordCheck;
        }
        const passwordHash = await this.createPasswordHash(password);
        const activateHash = (await util.promisify(crypto.randomBytes)(
            64
        )).toString("base64");
        const validatedAddress = await this.buildAndValidateAddress(ctx);
        if (!validatedAddress.success) {
            return validatedAddress;
        }
        const address = validatedAddress.data;
        const user = new User({
            email: email,
            originalEmail: originalEmail,
            passwordHash: passwordHash,
            firstName: address.firstName,
            surname: address.surname,
            street: address.street,
            city: address.city,
            zip: address.zip,
            activated: false,
            activateHash: activateHash,
            registerDate: new Date()
        });
        const validation = await validateAsync(user);
        if (validation) {
            return unsuccess(data, validation.errors);
        } else {
            await user.save();
            await sendMail(
                "activate-profile",
                {
                    email,
                    activateHash
                },
                originalEmail
            );
            return success();
        }
    }

    async activate(ctx) {
        const email = ctx.query.email;
        const activateHash = ctx.query.activateHash;
        const result = await User.updateOne(
            { email, activateHash },
            {
                $set: {
                    activated: true,
                    activateDate: new Date(),
                    activateHash: null
                }
            }
        );
        if (result.nModified !== 1) {
            return { success: false };
        }
        const user = await this.findUserByEmail(email);
        await this.setTokenCookie(ctx, user);
        return { success: true };
    }

    async login(ctx) {
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(ctx, data, "login");
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const user = await this.findUserByEmail(
            this.normalizeEmail(data.email)
        );
        if (!user) {
            return { success: false, data: data };
        }
        // FIXME check if profile is activated
        const passwordMatch = await bcrypt.compare(
            data.password,
            user.passwordHash
        );
        if (passwordMatch) {
            await this.setTokenCookie(ctx, user);
            return { success: true };
        } else {
            return { success: false, data: data };
        }
    }

    async setTokenCookie(ctx, user) {
        const token = await new Promise((resolve, reject) => {
            jwt.sign(
                {
                    iss: "cervena-tlapka",
                    sub: { id: user.id, email: user.email, zip: user.zip },
                    iat: Math.floor(Date.now() / 1000)
                },
                jwtSecret,
                {
                    expiresIn: "7d"
                },
                (err, token) => {
                    err ? reject(err) : resolve(token);
                }
            );
        });
        ctx.cookies.set(tokenCookie, token, { overwrite: true });
    }

    logout(ctx) {
        ctx.cookies.set(tokenCookie);
    }

    async sendPasswordResetEmail(ctx) {
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "sendPasswordResetEmail"
        );
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const originalEmail = data.email;
        const email = this.normalizeEmail(originalEmail);
        const user = await this.findUserByEmail(email);
        if (!user) {
            return {
                success: false,
                data: data,
                errors: {
                    email: "Uživatel nebyl nalezen. Je zadaný email správně?"
                }
            };
        }
        const passwordResetHash = (await util.promisify(crypto.randomBytes)(
            64
        )).toString("base64");
        const passwordReset = new PasswordReset({
            userId: user.id,
            passwordResetHash: passwordResetHash,
            createdDate: new Date()
        });
        await passwordReset.save();
        await sendMail(
            "password-reset",
            {
                passwordResetHash
            },
            originalEmail
        );
        return { success: true };
    }

    async resetPassword(ctx) {
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "passwordReset"
        );
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const passwordResetHash = data.passwordResetHash;
        const passwordReset = await PasswordReset.findOne({
            passwordResetHash
        });
        if (!passwordReset) {
            return {
                success: false,
                data,
                errors: {
                    password:
                        "Odkaz pro obnovení hesla není platný. Zkuste to prosím znovu."
                }
            };
        }
        const password = data.password;
        const passwordCheck = this.checkPassword(
            data,
            password,
            data.passwordConfirm
        );
        if (!passwordCheck.success) {
            return passwordCheck;
        }
        const passwordHash = await this.createPasswordHash(password);
        const result = await User.updateOne(
            { _id: passwordReset.userId },
            { passwordHash }
        );
        await PasswordReset.deleteOne({ _id: passwordReset.id });
        if (result.nModified === 1) {
            return { success: true };
        } else {
            console.error(
                `Password wasn't reset. User id ${passwordReset.userId}`
            );
            return {
                success: false,
                data,
                errors: {
                    password: "Heslo nebylo obnoveno. Kontaktujte nás prosím."
                }
            };
        }
    }

    async changePassword(ctx) {
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "changePassword"
        );
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const user = await this.loggedUser(ctx);
        const passwordMatch = await bcrypt.compare(
            data.oldPassword,
            user.passwordHash
        );
        if (!passwordMatch) {
            return unsuccess(data, {
                oldPassword: "Zadané heslo není správně."
            });
        }
        const password = data.password;
        const passwordCheck = this.checkPassword(
            data,
            password,
            data.passwordConfirm
        );
        if (!passwordCheck.success) {
            return passwordCheck;
        }
        const passwordHash = await this.createPasswordHash(password);
        const result = await User.updateOne({ _id: user.id }, { passwordHash });
        if (result.nModified === 1) {
            return { success: true };
        } else {
            console.error(`Password wasn't changed. User id ${user.id}`);
            return {
                success: false,
                data,
                errors: {
                    password: "Heslo nebylo změněno. Kontaktujte nás prosím."
                }
            };
        }
    }

    async editAddress(ctx) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const data = ctx.request.body;
        const recaptchaResult = await validateRecaptcha(
            ctx,
            data,
            "editAddress"
        );
        if (!recaptchaResult.success) {
            return recaptchaResult;
        }
        const validatedAddress = await this.buildAndValidateAddress(ctx);
        if (!validatedAddress.success) {
            return validatedAddress;
        }
        const address = validatedAddress.data;
        const userId = loggedUserId(ctx);
        const result = await User.updateOne({ _id: userId }, address);
        if (result.nModified === 1) {
            return { success: true };
        } else {
            console.error(`Address wasn't saved. User id ${userId}`);
            return {
                success: false,
                data,
                errors: {
                    password: "Adresa nebyla uložena. Kontaktujte nás prosím."
                }
            };
        }
    }

    async loggedUser(ctx) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const userId = loggedUserId(ctx);
        const user = await User.findOne({ _id: userId });
        if (!user) {
            ctx.throw(404);
        }
        return user;
    }

    findUserByEmail(email) {
        return User.findOne({ email });
    }

    normalizeEmail(email) {
        if (!email) {
            return email;
        }
        return email.toLowerCase().trim();
    }

    checkPassword(data, password, passwordConfirm) {
        if (password !== passwordConfirm) {
            return {
                success: false,
                data: data,
                errors: {
                    password: "Hesla nejsou stejná. Zkuste to prosím znovu."
                }
            };
        }
        const passwordCheck = zxcvbn(password);
        if (passwordCheck.score < config.user.passwordStrength) {
            return {
                success: false,
                data: data,
                errors: {
                    password:
                        "Heslo je příliš slabé. Mělo by být dostatečně dlouhé a obsahovat malé i velké písmena a číslice, případně další symboly."
                }
            };
        } else {
            return { success: true };
        }
    }

    createPasswordHash(password) {
        return util.promisify(bcrypt.hash)(password, saltRounds);
    }

    async buildAndValidateAddress(ctx) {
        const errors = {};
        const data = ctx.request.body;
        const { firstName, surname, street, city, zip } = data;
        // mandatory only if one is non empty
        if (
            isNonEmptyString(firstName) ||
            isNonEmptyString(surname) ||
            isNonEmptyString(street) ||
            isNonEmptyString(city)
        ) {
            if (isEmptyString(firstName)) {
                Object.assign(errors, { firstName: "Doplňte křestní jméno." });
            }
            if (isEmptyString(surname)) {
                Object.assign(errors, { surname: "Doplňte příjmení." });
            }
            if (isEmptyString(street)) {
                Object.assign(errors, {
                    street: "Doplňte ulici a číslo domu."
                });
            }
            if (isEmptyString(city)) {
                Object.assign(errors, { city: "Doplňte město." });
            }
        }
        if (isEmptyString(zip)) {
            Object.assign(errors, { zip: "PSČ je povinné." });
        } else {
            const foundZip = await Zip.findOne({ zip });
            if (!foundZip) {
                Object.assign(errors, { zip: "Neznámé PSČ." });
            }
        }
        if (hasAnyOwnProperty(errors)) {
            return unsuccess(data, errors);
        } else {
            return success({ firstName, surname, street, city, zip });
        }
    }
}
