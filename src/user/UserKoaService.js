"use strict";

import bcrypt from "bcrypt";
import { User } from "./User";
import { validateAsync } from "../core/mongo";
import jwt from "jsonwebtoken";
import { isUserLogged, loggedUserId } from "../core/user";
import { sendMail } from "../core/mail";
import crypto from "crypto";
import util from "util";
import config from "../core/config";

export const tokenCookie = "token";
const jwtSecret = config.user.jwtSecret;
const saltRounds = config.user.saltRounds;

export class UserKoaService {
    async register(ctx) {
        const data = ctx.request.body;
        // FIXME check duplicate user names
        // FIXME check validity of email
        // FIXME check complexity of password
        // FIXME validate zip
        const email = data.email;
        const passwordHash = await util.promisify(bcrypt.hash)(
            data.password,
            saltRounds
        );
        const activateHash = (await util.promisify(crypto.randomBytes)(
            64
        )).toString("base64");
        const user = new User({
            email: email,
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
                    email,
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
        const user = await User.findOne({ email: data.email });
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
}
