"use strict";

import { DonorRegistration } from "./DonorRegistration";
import { setTemplateData } from "../core/template";
import { isUserLogged, loggedUserId } from "../core/user";
import mongoose from "mongoose";
import { validateAsync } from "../core/mongo";
import KoaRouter from "koa-router";

export const donorRouter = new KoaRouter();

donorRouter.get("/find-donor", async (ctx, next) => {
    const registrations = await DonorRegistration.find();
    setTemplateData(ctx, { registrations: registrations });
    await ctx.render("find-donor.pug");
});

donorRouter.get("/register-donor", async (ctx, next) => {
    setTemplateData(ctx, { actualYear: new Date().getFullYear() });
    await ctx.render("register-donor.pug");
});

donorRouter.post("/register-donor", async (ctx, next) => {
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

donorRouter.get("/register-donor/thanks", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register-donor-thanks.pug");
});
