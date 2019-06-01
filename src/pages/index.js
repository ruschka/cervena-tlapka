"use strict";

import KoaRouter from "koa-router";
import { renderTemplate } from "../core/template";
import sm from "sitemap";
import config from "../core/config";
import { DonorRegistration } from "../donor/DonorRegistration";

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

pagesRouter.get("/press", async (ctx, next) => {
    await renderTemplate(ctx, "about-us/press.pug");
});

pagesRouter.get("/in-the-news", async (ctx, next) => {
    await renderTemplate(ctx, "about-us/in-the-news.pug");
});

pagesRouter.get("/want-to-help", async (ctx, next) => {
    await renderTemplate(ctx, "donor/want-to-help.pug");
});

pagesRouter.get("/robots.txt", async (ctx, next) => {
    if (process.env.NODE_ENV === "production") {
        ctx.response.body =
            "User-agent: * \n" +
            "Allow: / \n\n" +
            `Sitemap: ${config.server.baseUrl}/sitemap.xml`;
    } else {
        ctx.response.body = "User-agent: * \n" + "Disallow: /";
    }
});

pagesRouter.get("/sitemap.xml", async (ctx, next) => {
    const sitemap = sm.createSitemap({
        hostname: config.server.baseUrl,
        cacheTime: 600000,
        urls: [
            { url: "/", changefreq: "weekly", priority: 1 },
            { url: "/find-donor", changefreq: "hourly", priority: 1 },
            { url: "/register-donor", changefreq: "monthly", priority: 1 },
            { url: "/want-to-help", changefreq: "monthly", priority: 0.5 },
            { url: "/about-us", changefreq: "monthly", priority: 0.5 },
            { url: "/contacts", changefreq: "monthly", priority: 0.5 },
            { url: "/press", changefreq: "daily", priority: 0.5 },
            { url: "/in-the-news", changefreq: "weekly", priority: 0.5 }
        ]
    });
    await new Promise((resolve, reject) => {
        const cursor = DonorRegistration.find().cursor();
        cursor.on("data", registration => {
            sitemap.add({
                url: `/donor/${registration.id}`,
                changefreq: "monthly",
                priority: 0.7
            });
        });
        cursor.on("error", err => reject(err));
        cursor.on("close", () => resolve());
    });
    ctx.response.body = await new Promise((resolve, reject) => {
        sitemap.toXML((err, xml) => {
            if (err) {
                reject(err);
            }
            resolve(xml);
        });
    });
});

pagesRouter.get("/404", async (ctx, next) => {
    ctx.status = 404;
    await renderTemplate(ctx, "error-page/404.pug");
});

pagesRouter.get("/500", async (ctx, next) => {
    ctx.status = 500;
    await renderTemplate(ctx, "error-page/500.pug");
});
