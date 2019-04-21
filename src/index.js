"use strict";

import path from "path";
import Koa from "koa";
import KoaBody from "koa-body";
import KoaJwt from "koa-jwt";
import KoaViews from "koa-views";
import KoaStatic from "koa-static";
import { userRouter } from "./user";
import { pagesRouter } from "./pages";
import { donorRouter } from "./donor";
import { MongoProvider } from "./core/mongo/MongoProvider";
import { tokenCookie } from "./user/UserKoaService";
import config from "./core/config";
import { setTemplateData } from "./core/template";

const app = new Koa();
const mongoProvider = new MongoProvider();

console.log(`Config: ${JSON.stringify(config)}`);

const jwtSecret = config.user.jwtSecret;

// middlewares

app.use(async (ctx, next) => {
    ctx.state.now = new Date();
    return next();
});

app.use(KoaStatic(path.join(__dirname, "..", "public")));

app.use(
    KoaViews(path.join(__dirname, "..", "views"), {
        map: {
            pug: "pug"
        }
    })
);

app.use(async (ctx, next) => {
    return next().catch(async err => {
        if (401 === err.status) {
            ctx.redirect("/login");
        } else if (404 === err.status) {
            ctx.status = 404;
            setTemplateData(ctx, {});
            await ctx.render("error-page/404.pug");
        } else if (500 === err.status) {
            ctx.status = 500;
            setTemplateData(ctx, {});
            await ctx.render("error-page/500.pug");
        } else {
            throw err;
        }
    });
});

app.use(KoaJwt({ secret: jwtSecret, cookie: tokenCookie, passthrough: true }));

app.use(
    KoaBody({
        formidable: { uploadDir: "./uploads" },
        multipart: true,
        urlencoded: true
    })
);

// routes

const routers = [pagesRouter, userRouter, donorRouter];
routers.forEach(router => {
    app.use(router.routes());
    app.use(router.allowedMethods());
});

app.on("error", (err, ctx) => {
    console.error(`App error, status: ${err.status}`, err);
});

mongoProvider.connect().then(() => {
    app.listen(config.server.port);
});
