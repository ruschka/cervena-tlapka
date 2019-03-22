"use strict";

import bcrypt from "bcrypt";
import { User } from "./User";
import { validateAsync } from "../core/mongo";
import jwt from "jsonwebtoken";
import { isUserLogged, loggedUserId } from "../core/user";
import { sendMail } from "../core/mail";
import crypto from "crypto";

// FIXME configuration
export const jwtSecret = "asdfghjkl";
export const tokenCookie = "token";
export const saltRounds = 10;

export class UserKoaService {
    async register(ctx) {
        const data = ctx.request.body;
        // FIXME check duplicate user names
        // FIXME check validity of email
        // FIXME check complexity of password
        // FIXME validate zip
        // FIXME send activation email
        const passwordHash = await new Promise((resolve, reject) => {
            bcrypt.hash(data.password, saltRounds, (err, hash) => {
                err ? reject(err) : resolve(hash);
            });
        });
        const activateHash = crypto.randomBytes(64).toString("base64");
        const user = new User({
            email: data.email,
            passwordHash: passwordHash,
            activated: false,
            activateHash: activateHash,
            zip: data.zip
        });
        const validation = await validateAsync(user);
        if (validation) {
            return { success: false, data: data, errors: validation.errors };
        } else {
            await user.save();
            await sendMail(user.email, "activate-profile", { activateHash });
            return { success: true };
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
