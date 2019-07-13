"use strict";

import { renderTemplate } from "../core/template";
import KoaRouter from "koa-router";
import { UserKoaService } from "./UserKoaService";
import { DonorRegistrationKoaService } from "../donor/DonorRegistrationKoaService";
import { isUserLogged } from "../core/user";

export const userRouter = new KoaRouter();

const userService = new UserKoaService();
const donorService = new DonorRegistrationKoaService();

userRouter.get("/register", async (ctx, next) => {
    await renderTemplate(ctx, "register/register.pug");
});

userRouter.post("/register", async (ctx, next) => {
    const { success, data, errors } = await userService.register(ctx);
    if (success) {
        ctx.redirect("/register/saved");
    } else {
        await renderTemplate(ctx, "register/register.pug", {
            data: data,
            errors: errors
        });
    }
});

userRouter.get("/register/saved", async (ctx, next) => {
    await renderTemplate(ctx, "register/saved.pug");
});

userRouter.get("/register/activate", async (ctx, next) => {
    const { success } = await userService.activate(ctx);
    ctx.redirect(`/register/thanks?success=${success}`);
});

userRouter.get("/register/thanks", async (ctx, next) => {
    await renderTemplate(ctx, "register/thanks.pug", {
        success: ctx.query.success === "true"
    });
});

userRouter.get("/login", async (ctx, next) => {
    if (isUserLogged(ctx)) {
        ctx.redirect("/");
    }
    await renderTemplate(ctx, "profile/login.pug");
});

userRouter.post("/login", async (ctx, next) => {
    const { success, data, errors } = await userService.login(ctx);
    if (success) {
        ctx.redirect("/");
    } else {
        await renderTemplate(ctx, "profile/login.pug", { data, errors });
    }
});

userRouter.get("/logout", async (ctx, next) => {
    userService.logout(ctx);
    ctx.redirect("/");
});

userRouter.get("/password-reset/email", async (ctx, next) => {
    await renderTemplate(ctx, "password-reset/email-form.pug");
});

userRouter.post("/password-reset/email", async (ctx, next) => {
    const { success, data, errors } = await userService.sendPasswordResetEmail(
        ctx
    );
    if (success) {
        ctx.redirect("/password-reset/email-sent");
    } else {
        await renderTemplate(ctx, "password-reset/email-form.pug", {
            data,
            errors
        });
    }
});

userRouter.get("/password-reset/email-sent", async (ctx, next) => {
    await renderTemplate(ctx, "password-reset/email-sent.pug");
});

userRouter.get("/password-reset", async (ctx, next) => {
    await renderTemplate(ctx, "password-reset/reset-form.pug", {
        data: { passwordResetHash: ctx.query.passwordResetHash }
    });
});

userRouter.post("/password-reset", async (ctx, next) => {
    const { success, data, errors } = await userService.resetPassword(ctx);
    if (success) {
        ctx.redirect("/password-reset/success");
    } else {
        await renderTemplate(ctx, "password-reset/reset-form.pug", {
            data,
            errors
        });
    }
});

userRouter.get("/password-reset/success", async (ctx, next) => {
    await renderTemplate(ctx, "password-reset/success.pug");
});

userRouter.get("/activate-profile/email", async (ctx, next) => {
    await renderTemplate(ctx, "activate-profile/email-form.pug");
});

userRouter.post("/activate-profile/email", async (ctx, next) => {
    const {
        success,
        data,
        errors
    } = await userService.resendActivateProfileEmail(ctx);
    if (success) {
        ctx.redirect("/activate-profile/email-sent");
    } else {
        await renderTemplate(ctx, "activate-profile/email-form.pug", {
            data,
            errors
        });
    }
});

userRouter.get("/activate-profile/email-sent", async (ctx, next) => {
    await renderTemplate(ctx, "activate-profile/email-sent.pug");
});

userRouter.get("/profile", async (ctx, next) => {
    await renderTemplate(ctx, "profile/profile.pug", {
        loggedUser: await userService.loggedUser(ctx),
        registrations: await donorService.findLoggedUserRegistrations(ctx)
    });
});

userRouter.get("/profile/donor/:id/edit", async (ctx, next) => {
    await renderTemplate(ctx, "donor/edit.pug", {
        actualYear: ctx.state.now.getFullYear(),
        registration: await donorService.findDonorRegistration(ctx)
    });
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
        await renderTemplate(ctx, "donor/edit.pug", {
            actualYear: ctx.state.now.getFullYear(),
            registration: entity,
            data,
            errors
        });
    }
});

userRouter.post("/profile/donor/:id/remove", async (ctx, next) => {
    await donorService.removeDonorRegistration(ctx);
    ctx.redirect("/profile");
});

userRouter.get("/profile/edit-address", async (ctx, next) => {
    await renderTemplate(ctx, "profile/edit-address.pug", {
        loggedUser: await userService.loggedUser(ctx)
    });
});

userRouter.post("/profile/edit-address", async (ctx, next) => {
    const { success, data, errors } = await userService.editAddress(ctx);
    if (success) {
        ctx.redirect("/profile");
    } else {
        await renderTemplate(ctx, "profile/edit-address.pug", {
            loggedUser: await userService.loggedUser(ctx),
            data,
            errors
        });
    }
});

userRouter.get("/profile/edit-phone", async (ctx, next) => {
    await renderTemplate(ctx, "profile/edit-phone.pug", {
        loggedUser: await userService.loggedUser(ctx)
    });
});

userRouter.post("/profile/edit-phone", async (ctx, next) => {
    const { success, data, errors } = await userService.editPhone(ctx);
    if (success) {
        ctx.redirect("/profile");
    } else {
        await renderTemplate(ctx, "profile/edit-phone.pug", {
            loggedUser: await userService.loggedUser(ctx),
            data,
            errors
        });
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
