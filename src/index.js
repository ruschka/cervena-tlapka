const Koa = require('koa');
const KoaRouter = require('koa-router');
const views = require('koa-views');

const app = new Koa();
const router = new KoaRouter();

app.use(views(__dirname + '/../views', {
    map: {
        html: 'nunjucks'
    }
}));

router.get('/', async (ctx, next) => {
    ctx.state = { name: 'Vojtech' };
    await ctx.render('homepage.html');
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
