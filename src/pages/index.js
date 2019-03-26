"use strict"

import KoaRouter from "koa-router";
import { setTemplateData } from "../core/template";

export const pagesRouter = new KoaRouter();

pagesRouter.get("/", async (ctx, next) => {
    setTemplateData(ctx, {});
    await ctx.render("homepage.pug");
});
