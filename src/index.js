"use strict";

import path from "path";
import Koa from "koa";
import KoaBody from "koa-body";
import KoaJwt from "koa-jwt";
import KoaViews from "koa-views";
import KoaStatic from "koa-static";
import { jwtSecret, tokenCookie, userRouter } from "./user";
import { pagesRouter } from "./pages";
import { donorRouter } from "./donor";
import { MongoProvider } from "./core/mongo/MongoProvider";

const app = new Koa();
const mongoProvider = new MongoProvider();

// middlewares

app.use(KoaStatic(path.join(__dirname, "..", "public")));

app.use(
    KoaViews(path.join(__dirname, "..", "views"), {
        map: {
            pug: "pug"
        }
    })
);

app.use((ctx, next) => {
    return next().catch(err => {
        if (401 === err.status) {
            ctx.redirect("/login");
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
    console.error("App error", err);
});

mongoProvider.connect().then(() => {
    app.listen(3000);
});
