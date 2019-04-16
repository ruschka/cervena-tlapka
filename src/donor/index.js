"use strict";

import { setTemplateData } from "../core/template";
import KoaRouter from "koa-router";
import { DonorRegistrationKoaService } from "./DonorRegistrationKoaService";
import { pagingFromContext } from "../core/utils/Paging";

export const donorRouter = new KoaRouter();

const donorService = new DonorRegistrationKoaService();

donorRouter.get("/find-donor", async (ctx, next) => {
    const totalCount = await donorService.countDonors(ctx);
    const paging = pagingFromContext(ctx, 10, totalCount);
    const {
        registrations,
        zipCode,
        maxDistance
    } = await donorService.findDonors(ctx, paging);
    const aggregatedRegistrations = await donorService.aggregateDonorsByZip(
        ctx,
        zipCode,
        maxDistance
    );
    setTemplateData(ctx, {
        registrations,
        aggregatedRegistrations,
        paging,
        data: { zip: zipCode, maxDistance }
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
    await ctx.render("register-donor/thanks.pug");
});

donorRouter.get("/donor/:id", async (ctx, next) => {
    const registration = await donorService.findDonorRegistration(ctx);
    if (!registration) {
        ctx.throw(404);
    }
    setTemplateData(ctx, {
        registration,
        applicationSent: ctx.query.applicationSent
    });
    await ctx.render("donor/detail.pug");
});

donorRouter.post("/donor/:id/contact", async (ctx, next) => {
    const { success, data, errors, entity } = await donorService.contactDonor(
        ctx
    );
    if (success) {
        ctx.redirect(`/donor/${ctx.params.id}?applicationSent=true`);
    } else {
        setTemplateData(ctx, { data, errors, registration: entity });
        await ctx.render("donor/detail.pug");
    }
});
