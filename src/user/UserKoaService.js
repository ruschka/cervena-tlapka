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
        const email = originalEmail.toLowerCase();
        const existingUser = await this.findUserByEmail(email);
        if (existingUser) {
            return {
                success: false,
                data: data,
                errors: { email: "Účet s daným emailem již existuje." }
            };
        }
        const zip = await Zip.findOne({ zip: data.zip });
        if (!zip) {
            return {
                success: false,
                data: data,
                errors: { zip: "Neznámé PSČ." }
            };
        }
        const password = data.password;
        const passwordCheck = zxcvbn(password);
        // configuration
        if (passwordCheck.score < 3) {
            return {
                success: false,
                data: data,
                errors: {
                    password:
                        "Heslo je příliš slabé. Mělo by být dostatečně dlouhé a obsahovat malé i velké písmena a číslice, případně další symboly."
                }
            };
        }
        const passwordHash = await util.promisify(bcrypt.hash)(
            password,
            saltRounds
        );
        const activateHash = (await util.promisify(crypto.randomBytes)(
            64
        )).toString("base64");
        const user = new User({
            email: email,
            originalEmail: originalEmail,
            passwordHash: passwordHash,
            activated: false,
            activateHash: activateHash,
            registerDate: new Date(),
            zip: data.zip
        });
        const validation = await validateAsync(user);
        if (validation) {
            return { success: false, data: data, errors: validation.errors };
        } else {
            await user.save();
            await sendMail(
                "activate-profile",
                {
                    email: originalEmail,
                    activateHash
                },
                email
            );
            return { success: true };
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
        if (result.nModified === 1) {
            return { success: true };
        } else {
            return { success: false };
        }
    }

    async login(ctx) {
        const data = ctx.request.body;
        const user = await this.findUserByEmail(data.email);
        if (!user) {
            return { success: false, data: data };
        }
        const passwordMatch = await bcrypt.compare(
            data.password,
            user.passwordHash
        );
        if (passwordMatch) {
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
            return { success: true };
        } else {
            return { success: false, data: data };
        }
    }

    logout(ctx) {
        ctx.cookies.set(tokenCookie);
    }

    async loggedUser(ctx) {
        if (!isUserLogged(ctx)) {
            ctx.throw(401);
        }
        const userId = loggedUserId(ctx);
        const user = User.findOne({ _id: userId });
        if (!user) {
            ctx.throw(404);
        }
        return user;
    }

    findUserByEmail(email) {
        return User.findOne({ email });
    }
}
