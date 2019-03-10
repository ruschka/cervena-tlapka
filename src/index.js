"use strict";

import { MongoProvider } from "./core/mongo/MongoProvider";
import { DonorRegistration } from "./donor/DonorRegistration";
import { User } from "./user/User";
import { validateAsync } from "./core/mongo";
import { setTemplateData } from "./core/template";
import mongoose from "mongoose";

import Koa from "koa";
import KoaBody from "koa-body";
import KoaJwt from "koa-jwt";
import KoaRouter from "koa-router";
import KoaViews from "koa-views";
import jwt from "jsonwebtoken";
import bcrypt from "bcrypt";
import { isUserLogged, loggedUserId } from "./core/user";

// FIXME configuration
const jwtSecret = "asdfghjkl";
const saltRounds = 10;
const tokenCookie = "token";

const app = new Koa();
const router = new KoaRouter();
const mongoProvider = new MongoProvider();

// middlewares

app.use(
    KoaViews(__dirname + "/../views", {
        map: {
            pug: "pug"
        }
    })
);

app.use((ctx, next) => {
    return next().catch(err => {
        if (401 === err.status) {
            ctx.redirect("/login");
        } else {
            throw err;
        }
    });
});

app.use(KoaJwt({ secret: jwtSecret, cookie: tokenCookie, passthrough: true }));

app.use(
    KoaBody({
        formidable: { uploadDir: "./uploads" },
        multipart: true,
        urlencoded: true
    })
);

// routes

router.get("/", async (ctx, next) => {
    await ctx.render("homepage.pug");
});

router.get("/register", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register.pug");
});

router.post("/register", async (ctx, next) => {
    const data = ctx.request.body;
    // FIXME check duplicate user names
    // FIXME check validity of email
    // FIXME send activation email
    // FIXME check complexity of password
    const passwordHash = await new Promise((resolve, reject) => {
        bcrypt.hash(data.password, saltRounds, (err, hash) => {
            err ? reject(err) : resolve(hash);
        });
    });
    const user = new User({ email: data.email, passwordHash: passwordHash });
    const validation = await validateAsync(user);
    if (validation) {
        setTemplateData(ctx, { data: data });
        await ctx.render("register.pug");
    } else {
        await user.save();
        ctx.redirect("/register/thanks");
    }
});

router.get("/register/thanks", async (ctx, next) => {
    await ctx.render("register-thanks.pug");
});

router.get("/login", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("login.pug");
});

router.post("/login", async (ctx, next) => {
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
                    sub: { id: user.id, email: user.email }
                },
                jwtSecret,
                {
                    expiresIn: "1h"
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

router.get("/logout", async (ctx, next) => {
    ctx.cookies.set(tokenCookie);
    ctx.redirect("/");
});

router.get("/find-donor", async (ctx, next) => {
    const registrations = await DonorRegistration.find();
    setTemplateData(ctx, { registrations: registrations });
    await ctx.render("find-donor.pug");
});

router.get("/register-donor", async (ctx, next) => {
    setTemplateData(ctx, { actualYear: new Date().getFullYear() });
    await ctx.render("register-donor.pug");
});

router.post("/register-donor", async (ctx, next) => {
    if (!isUserLogged(ctx)) {
        ctx.throw(401);
        return;
    }
    const data = ctx.request.body;
    const registration = new DonorRegistration({
        name: data.name,
        weight: data.weight,
        birthYear: data.birthYear,
        sex: data.sex,
        breed: data.breed,
        userId: mongoose.mongo.ObjectId(loggedUserId(ctx))
    });
    const validation = await validateAsync(registration);
    if (validation) {
        setTemplateData(ctx, {
            actualYear: new Date().getFullYear(),
            data: data,
            errors: validation.errors
        });
        console.log(ctx.state);
        await ctx.render("register-donor.pug");
    } else {
        await registration.save();
        ctx.redirect("/register-donor/thanks");
    }
});

router.get("/register-donor/thanks", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register-donor-thanks.pug");
});

app.use(router.routes());
app.use(router.allowedMethods());

app.on("error", (err, ctx) => {
    console.error("App error", err);
});

mongoProvider.connect().then(() => {
    app.listen(3000);
});
