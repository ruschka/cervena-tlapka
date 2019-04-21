"use strict";

import { renderTemplate, setTemplateData } from "../core/template";
import KoaRouter from "koa-router";
import { UserKoaService } from "./UserKoaService";
import { DonorRegistrationKoaService } from "../donor/DonorRegistrationKoaService";
import { isUserLogged } from "../core/user";

export const userRouter = new KoaRouter();

const userService = new UserKoaService();
const donorService = new DonorRegistrationKoaService();

userRouter.get("/register", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register/register.pug");
});

userRouter.post("/register", async (ctx, next) => {
    const { success, data, errors } = await userService.register(ctx);
    if (success) {
        ctx.redirect("/register/saved");
    } else {
        setTemplateData(ctx, { data: data, errors: errors });
        await ctx.render("register/register.pug");
    }
});

userRouter.get("/register/saved", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("register/saved.pug");
});

userRouter.get("/register/activate", async (ctx, next) => {
    const { success } = await userService.activate(ctx);
    ctx.redirect(`/register/thanks?success=${success}`);
});

userRouter.get("/register/thanks", async (ctx, next) => {
    setTemplateData(ctx, { success: ctx.query.success === "true" });
    await ctx.render("register/thanks.pug");
});

userRouter.get("/login", async (ctx, next) => {
    if (isUserLogged(ctx)) {
        ctx.redirect("/");
    }
    setTemplateData(ctx, {});
    await ctx.render("profile/login.pug");
});

userRouter.post("/login", async (ctx, next) => {
    const { success, data } = await userService.login(ctx);
    if (success) {
        ctx.redirect("/");
    } else {
        setTemplateData(ctx, { data: data });
        await ctx.render("profile/login.pug");
    }
});

userRouter.get("/logout", async (ctx, next) => {
    userService.logout(ctx);
    ctx.redirect("/");
});

userRouter.get("/password-reset/email", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("password-reset/email-form.pug");
});

userRouter.post("/password-reset/email", async (ctx, next) => {
    const { success, data, errors } = await userService.sendPasswordResetEmail(
        ctx
    );
    if (success) {
        ctx.redirect("/password-reset/email-sent");
    } else {
        setTemplateData(ctx, { data, errors });
        await ctx.render("password-reset/email-form.pug");
    }
});

userRouter.get("/password-reset/email-sent", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("password-reset/email-sent.pug");
});

userRouter.get("/password-reset", async (ctx, next) => {
    setTemplateData(ctx, {
        data: { passwordResetHash: ctx.query.passwordResetHash }
    });
    await ctx.render("password-reset/reset-form.pug");
});

userRouter.post("/password-reset", async (ctx, next) => {
    const { success, data, errors } = await userService.resetPassword(ctx);
    if (success) {
        ctx.redirect("/password-reset/success");
    } else {
        setTemplateData(ctx, { data, errors });
        await ctx.render("password-reset/reset-form.pug");
    }
});

userRouter.get("/password-reset/success", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("password-reset/success.pug");
});

userRouter.get("/profile", async (ctx, next) => {
    setTemplateData(ctx, {
        loggedUser: await userService.loggedUser(ctx),
        registrations: await donorService.findLoggedUserRegistrations(ctx)
    });
    await ctx.render("profile/profile.pug");
});

userRouter.get("/profile/donor/:id/edit", async (ctx, next) => {
    setTemplateData(ctx, {
        actualYear: ctx.state.now.getFullYear(),
        registration: await donorService.findDonorRegistration(ctx)
    });
    await ctx.render("donor/edit.pug");
});

userRouter.post("/profile/donor/:id/edit", async (ctx, next) => {
    const {
        success,
        data,
        errors,
        entity
    } = await donorService.editDonorRegistration(ctx);
    if (success) {
        ctx.redirect("/profile");
    } else {
        setTemplateData(ctx, {
            actualYear: ctx.state.now.getFullYear(),
            registration: entity,
            data,
            errors
        });
        await ctx.render("donor/edit.pug");
    }
});

userRouter.post("/profile/donor/:id/remove", async (ctx, next) => {
    await donorService.removeDonorRegistration(ctx);
    ctx.redirect("/profile");
});

userRouter.get("/profile/edit-address", async (ctx, next) => {
    setTemplateData(ctx, { loggedUser: await userService.loggedUser(ctx) });
    await ctx.render("profile/edit-address.pug");
});

userRouter.post("/profile/edit-address", async (ctx, next) => {
    const { success, data, errors } = await userService.editAddress(ctx);
    if (success) {
        ctx.redirect("/profile");
    } else {
        setTemplateData(ctx, {
            loggedUser: await userService.loggedUser(ctx),
            data,
            errors
        });
        await ctx.render("profile/edit-address.pug");
    }
});

userRouter.get("/profile/change-password", async (ctx, next) => {
    await renderTemplate(ctx, "profile/change-password.pug");
});

userRouter.post("/profile/change-password", async (ctx, next) => {
    const { success, data, errors } = await userService.changePassword(ctx);
    if (success) {
        ctx.redirect("/profile");
    } else {
        await renderTemplate(ctx, "profile/change-password.pug", {
            data,
            errors
        });
    }
});

userRouter.post("/profile/delete", async (ctx, next) => {
    const success = await userService.deleteProfile(ctx);
    if (success) {
        ctx.redirect("/profile/deleted");
    }
});

userRouter.get("/profile/deleted", async (ctx, next) => {
    await renderTemplate(ctx, "profile/deleted.pug");
});
