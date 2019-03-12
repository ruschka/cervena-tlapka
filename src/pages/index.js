import KoaRouter from "koa-router";

export const pagesRouter = new KoaRouter();

pagesRouter.get("/", async (ctx, next) => {
    await ctx.render("homepage.pug");
});
