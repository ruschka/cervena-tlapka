"use strict";

import KoaRouter from "koa-router";
import { renderTemplate } from "../core/template";

export const pagesRouter = new KoaRouter();

pagesRouter.get("/", async (ctx, next) => {
    await renderTemplate(ctx, "homepage.pug");
});

pagesRouter.get("/contacts", async (ctx, next) => {
    await renderTemplate(ctx, "about-us/contacts.pug");
});

pagesRouter.get("/about-us", async (ctx, next) => {
    await renderTemplate(ctx, "about-us/about-us.pug");
});

pagesRouter.get("/want-to-help", async (ctx, next) => {
    await renderTemplate(ctx, "donor/want-to-help.pug");
});

pagesRouter.get("/robots.txt", async (ctx, next) => {
    ctx.response.body = "User-agent: * \n" + "Disallow: /";
});

pagesRouter.get("/404", async (ctx, next) => {
    ctx.status = 404;
    await renderTemplate(ctx, "error-page/404.pug");
});

pagesRouter.get("/500", async (ctx, next) => {
    ctx.status = 500;
    await renderTemplate(ctx, "error-page/500.pug");
});
