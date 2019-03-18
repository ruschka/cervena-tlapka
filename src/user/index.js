"use strict";

import { setTemplateData } from "../core/template";
import KoaRouter from "koa-router";
import { UserKoaService } from "./UserKoaService";

export const userRouter = new KoaRouter();

const userService = new UserKoaService();

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
    setTemplateData(ctx, {});
    await ctx.render("login.pug");
});

userRouter.post("/login", async (ctx, next) => {
    const { success, data } = await userService.login(ctx);
    console.log(success);
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
