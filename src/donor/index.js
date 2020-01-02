"use strict";

import { renderTemplate } from "../core/template";
import KoaRouter from "koa-router";
import { DonorRegistrationKoaService } from "./DonorRegistrationKoaService";
import { pagingFromContext } from "../core/utils/Paging";

export const donorRouter = new KoaRouter();

const donorService = new DonorRegistrationKoaService();

donorRouter.get("/find-donor", async (ctx, next) => {
    async function renderFindDonors(
        registrations,
        aggregatedRegistrations,
        paging,
        params,
        errors
    ) {
        await renderTemplate(ctx, "donor/find.pug", {
            registrations,
            aggregatedRegistrations,
            paging,
            params,
            errors
        });
    }
    const { success, data, errors } = await donorService.countDonors(ctx);
    const { totalCount, zipCode, maxDistance } = data;
    if (!success) {
        await renderFindDonors(
            [],
            [],
            null,
            { zip: zipCode, maxDistance },
            errors
        );
        return;
    }
    const paging = pagingFromContext(ctx, 10, totalCount);
    const registrationsResult = await donorService.findDonors(ctx, paging);
    if (!registrationsResult.success) {
        await renderFindDonors(
            [],
            [],
            null,
            { zip: zipCode, maxDistance },
            errors
        );
        return;
    }
    const { registrations } = registrationsResult.data;
    const aggregatedRegistrationsResult = await donorService.aggregateDonorsByZip(
        ctx,
        zipCode,
        maxDistance
    );
    if (!aggregatedRegistrationsResult.success) {
        await renderFindDonors(
            [],
            [],
            null,
            { zip: zipCode, maxDistance },
            errors
        );
        return;
    }
    const aggregatedRegistrations = aggregatedRegistrationsResult.data;
    await renderFindDonors(registrations, aggregatedRegistrations, paging, {
        zip: zipCode,
        maxDistance
    });
});

donorRouter.get("/register-donor", async (ctx, next) => {
    await renderTemplate(ctx, "register-donor/register-donor.pug", {
        actualYear: ctx.state.now.getFullYear()
    });
});

donorRouter.post("/register-donor", async (ctx, next) => {
    const { success, data, errors } = await donorService.registerDonor(ctx);
    if (success) {
        ctx.redirect("/register-donor/thanks");
    } else {
        await renderTemplate(ctx, "register-donor/register-donor.pug", {
            actualYear: ctx.state.now.getFullYear(),
            data: data,
            errors: errors
        });
    }
});

donorRouter.get("/register-donor/thanks", async (ctx, next) => {
    await renderTemplate(ctx, "register-donor/thanks.pug");
});

donorRouter.get("/donor/:id", async (ctx, next) => {
    const registration = await donorService.findDonorRegistration(ctx);
    if (!registration) {
        ctx.throw(404);
    }
    await renderTemplate(ctx, "donor/detail.pug", {
        registration,
        applicationSent: ctx.query.applicationSent
    });
});

donorRouter.post("/donor/:id/contact", async (ctx, next) => {
    const { success, data, errors, entity } = await donorService.contactDonor(
        ctx
    );
    if (success) {
        ctx.redirect(`/donor/${ctx.params.id}?applicationSent=true`);
    } else {
        await renderTemplate(ctx, "donor/detail.pug", {
            data,
            errors,
            registration: entity
        });
    }
});

donorRouter.get("/map-fullscreen", async (ctx, next) => {
    const maxDate = ctx.query.maxDate;
    const aggregatedRegistrations = await donorService.aggregateDonorsByZip(
        ctx,
        null,
        null,
        maxDate ? new Date(maxDate) : null
    );
    await renderTemplate(ctx, "donor/map-fullscreen.pug", {
        aggregatedRegistrations: aggregatedRegistrations.data,
        actualDate: maxDate ? new Date(maxDate) : new Date()
    });
});
