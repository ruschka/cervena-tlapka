"use strict";

import { setTemplateData } from "../core/template";
import KoaRouter from "koa-router";
import { UserKoaService } from "./UserKoaService";
import { DonorRegistrationKoaService } from "../donor/DonorRegistrationKoaService";
import { isUserLogged } from "../core/user";

export const userRouter = new KoaRouter();

const userService = new UserKoaService();
const donorService = new DonorRegistrationKoaService();

userRouter.get("/register", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register.pug");
});

userRouter.post("/register", async (ctx, next) => {
    const { success, data, errors } = await userService.register(ctx);
    if (success) {
        ctx.redirect("/register/thanks");
    } else {
        setTemplateData(ctx, { data: data, errors: errors });
        await ctx.render("register.pug");
    }
});

userRouter.get("/register/thanks", async (ctx, next) => {
    await ctx.render("register-thanks.pug");
});

userRouter.get("/login", async (ctx, next) => {
    if (isUserLogged(ctx)) {
        ctx.redirect("/");
    }
    setTemplateData(ctx, {});
    await ctx.render("login.pug");
});

userRouter.post("/login", async (ctx, next) => {
    const { success, data } = await userService.login(ctx);
    if (success) {
        ctx.redirect("/");
    } else {
        setTemplateData(ctx, { data: data });
        await ctx.render("login.pug");
    }
});

userRouter.get("/logout", async (ctx, next) => {
    userService.logout(ctx);
    ctx.redirect("/");
});

userRouter.get("/profile", async (ctx, next) => {
    setTemplateData(ctx, {
        loggedUser: await userService.loggedUser(ctx),
        registrations: await donorService.findLoggedUserRegistrations(ctx)
    });
    await ctx.render("profile.pug");
});

userRouter.get("/profile/donor/:id/edit", async (ctx, next) => {
    setTemplateData(ctx, {
        actualYear: new Date().getFullYear(),
        registration: await donorService.findDonorRegistration(ctx)
    });
    await ctx.render("edit-donor.pug");
});

userRouter.post("/profile/donor/:id/edit", async (ctx, next) => {
    const {
        success,
        registration,
        data,
        errors
    } = await donorService.editDonorRegistration(ctx);
    if (success) {
        ctx.redirect("/profile");
    } else {
        setTemplateData(ctx, {
            actualYear: new Date().getFullYear(),
            registration,
            data,
            errors
        });
        await ctx.render("edit-donor.pug");
    }
});

userRouter.post("/profile/donor/:id/remove", async (ctx, next) => {
    await donorService.removeDonorRegistration(ctx);
    ctx.redirect("/profile");
});
