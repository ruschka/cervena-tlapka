"use strict";

import { setTemplateData } from "../core/template";
import bcrypt from "bcrypt";
import { User } from "./User";
import { validateAsync } from "../core/mongo";
import jwt from "jsonwebtoken";
import KoaRouter from "koa-router";

export const userRouter = new KoaRouter();

// FIXME configuration
export const jwtSecret = "asdfghjkl";
export const tokenCookie = "token";
const saltRounds = 10;

userRouter.get("/register", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register.pug");
});

userRouter.post("/register", async (ctx, next) => {
    const data = ctx.request.body;
    // FIXME check duplicate user names
    // FIXME check validity of email
    // FIXME send activation email
    // FIXME check complexity of password
    // FIXME validate zip
    const passwordHash = await new Promise((resolve, reject) => {
        bcrypt.hash(data.password, saltRounds, (err, hash) => {
            err ? reject(err) : resolve(hash);
        });
    });
    const user = new User({
        email: data.email,
        passwordHash: passwordHash,
        zip: data.zip
    });
    const validation = await validateAsync(user);
    if (validation) {
        setTemplateData(ctx, { data: data });
        await ctx.render("register.pug");
    } else {
        await user.save();
        ctx.redirect("/register/thanks");
    }
});

userRouter.get("/register/thanks", async (ctx, next) => {
    await ctx.render("register-thanks.pug");
});

userRouter.get("/login", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("login.pug");
});

userRouter.post("/login", async (ctx, next) => {
    const data = ctx.request.body;
    const user = await User.findOne({ email: data.email });
    if (!user) {
        setTemplateData(ctx, { data: data });
        await ctx.render("login.pug");
        return;
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
        ctx.redirect("/");
    } else {
        setTemplateData(ctx, { data: data });
        await ctx.render("login.pug");
    }
});

userRouter.get("/logout", async (ctx, next) => {
    ctx.cookies.set(tokenCookie);
    ctx.redirect("/");
});
