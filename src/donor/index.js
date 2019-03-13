"use strict";

import { DonorRegistration } from "./DonorRegistration";
import { setTemplateData } from "../core/template";
import { isUserLogged, loggedUserId, loggedUserZip } from "../core/user";
import mongoose from "mongoose";
import { validateAsync } from "../core/mongo";
import KoaRouter from "koa-router";
import { Zip } from "../zip/Zip";

export const donorRouter = new KoaRouter();

donorRouter.get("/find-donor", async (ctx, next) => {
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
        const zip = await Zip.findOne({ zip: zipCode });
        if (!zip) {
            console.log(`Unknown zip ${zipCode}`);
            ctx.throw(400);
            return;
        }
        Object.assign(query, {
            location: {
                $near: {
                    $geometry: { type: "Point", coordinates: zip.coordinates },
                    $maxDistance: maxDistance * 1000 // meters
                }
            }
        });
    }
    const registrations = await DonorRegistration.find(query);
    setTemplateData(ctx, {
        registrations: registrations,
        data: { zip: zipCode, maxDistance: maxDistance }
    });
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
    const zip = await Zip.findOne({ zip: loggedUserZip(ctx) });
    if (!zip) {
        console.log(`Unknown zip ${loggedUserZip(ctx)}`);
        ctx.throw(400);
        return;
    }
    const registration = new DonorRegistration({
        name: data.name,
        weight: data.weight,
        birthYear: data.birthYear,
        sex: data.sex,
        breed: data.breed,
        userId: mongoose.mongo.ObjectId(loggedUserId(ctx)),
        zip: zip.zip,
        city: zip.city,
        location: { type: "Point", coordinates: zip.coordinates }
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
