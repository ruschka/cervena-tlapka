"use strict";

import { DonorRegistration } from "./DonorRegistration";
import { setTemplateData } from "../core/template";
import KoaRouter from "koa-router";
import { DonorRegistrationKoaService } from "./DonorRegistrationKoaService";

export const donorRouter = new KoaRouter();

const donorService = new DonorRegistrationKoaService();

donorRouter.get("/find-donor", async (ctx, next) => {
    const {
        registrations,
        zipCode,
        maxDistance
    } = await donorService.findDonors(ctx);
    const aggregatedRegistrations = await donorService.aggregateDonorsByZip(
        ctx,
        zipCode,
        maxDistance
    );
    setTemplateData(ctx, {
        registrations: registrations,
        aggregatedRegistrations: aggregatedRegistrations,
        data: { zip: zipCode, maxDistance: maxDistance }
    });
    await ctx.render("donor/find.pug");
});

donorRouter.get("/register-donor", async (ctx, next) => {
    setTemplateData(ctx, { actualYear: new Date().getFullYear() });
    await ctx.render("register-donor/register-donor.pug");
});

donorRouter.post("/register-donor", async (ctx, next) => {
    const { success, data, errors } = await donorService.registerDonor(ctx);
    if (success) {
        ctx.redirect("/register-donor/thanks");
    } else {
        setTemplateData(ctx, {
            actualYear: new Date().getFullYear(),
            data: data,
            errors: errors
        });
        await ctx.render("register-donor/register-donor.pug");
    }
});

donorRouter.get("/register-donor/thanks", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register-donor/register-donor-thanks.pug");
});

donorRouter.get("/donor/:id", async (ctx, next) => {
    const registration = await DonorRegistration.findOne({
        _id: ctx.params.id
    });
    if (!registration) {
        ctx.throw(404);
    }
    setTemplateData(ctx, { registration });
    await ctx.render("donor/detail.pug");
});
