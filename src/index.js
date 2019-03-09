const Koa = require('koa');
const KoaRouter = require('koa-router');
const views = require('koa-views');
const bodyParser = require('koa-body');

const app = new Koa();
const router = new KoaRouter();

app.use(views(__dirname + '/../views', {
    map: {
        pug: 'pug'
    }
}));

app.use(bodyParser({
    formidable: {uploadDir: './uploads'},
    multipart: true,
    urlencoded: true
}));

router.get('/', async (ctx, next) => {
    ctx.state = {};
    await ctx.render('homepage.pug');
});

router.get('/hledej-darce', async (ctx, next) => {
    ctx.state = {};
    await ctx.render('hledej-darce.pug');
});

router.get('/registrace-darce', async (ctx, next) => {
    ctx.state = { actualYear: new Date().getFullYear()};
    await ctx.render('registrace-darce.pug');
});

router.post('/register-donor', async (ctx, next) => {
    console.log(ctx.request.body);
    ctx.redirect('podekovani-za-registraci-darce');
})

router.get('/podekovani-za-registraci-darce', async (ctx, next) => {
    ctx.state = { actualYear: new Date().getFullYear()};
    await ctx.render('podekovani-za-registraci-darce.pug');
});

app.use(router.routes());
app.use(router.allowedMethods());
app.listen(3000);
