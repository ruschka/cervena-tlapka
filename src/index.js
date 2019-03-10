"use strict";

import { MongoProvider } from "./core/mongo/MongoProvider";
import { DonorRegistration } from "./donor/DonorRegistration";

import Koa from "koa";
import KoaRouter from "koa-router";
import views from "koa-views";
import bodyParser from "koa-body";

const app = new Koa();
const router = new KoaRouter();
const mongoProvider = new MongoProvider();

app.use(
    views(__dirname + "/../views", {
        map: {
            pug: "pug"
        }
    })
);

app.use(
    bodyParser({
        formidable: { uploadDir: "./uploads" },
        multipart: true,
        urlencoded: true
    })
);

router.get("/", async (ctx, next) => {
    ctx.state = {};
    await ctx.render("homepage.pug");
});

router.get("/find-donor", async (ctx, next) => {
    const registrations = await DonorRegistration.find();
    ctx.state = { registrations: registrations };
    await ctx.render("find-donor.pug");
});

router.get("/register-donor", async (ctx, next) => {
    ctx.state = { actualYear: new Date().getFullYear() };
    await ctx.render("register-donor.pug");
});

router.post("/register-donor", async (ctx, next) => {
    const data = ctx.request.body;
    const registration = new DonorRegistration({
        name: data.name,
        weight: data.weight,
        birthYear: data.birthYear,
        sex: data.sex,
        breed: data.breed
    });
    const validation = registration.validateSync();
    if (validation) {
        ctx.state = {
            actualYear: new Date().getFullYear(),
            data: data,
            errors: validation.errors
        };
        await ctx.render("register-donor.pug");
    } else {
        await registration.save();
        ctx.redirect("/register-donor-thanks");
    }
});

router.get("/register-donor-thanks", async (ctx, next) => {
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
