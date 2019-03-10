'use strict';

import { MongoProvider } from './core/mongo/MongoProvider';
import { DonorRegistration } from './donor/DonorRegistration';

import Koa from 'koa';
import KoaRouter from 'koa-router';
import views from 'koa-views';
import bodyParser from 'koa-body';

const app = new Koa();
const router = new KoaRouter();
const mongoProvider = new MongoProvider();

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
    await ctx.render('hledej-darce.pug');
});

router.get('/registrace-darce', async (ctx, next) => {
    ctx.state = { actualYear: new Date().getFullYear()};
    await ctx.render('registrace-darce.pug');
});

router.post('/registrace-darce', async (ctx, next) => {
    const data = ctx.request.body;
    const registration = new DonorRegistration({name: data.name, weight: data.weight, birthYear: data.birthYear, sex: data.sex, breed: data.breed});
    const validation = registration.validateSync();
    if (validation) {
        ctx.state = { actualYear: new Date().getFullYear(), data: data, errors: validation.errors };
        await ctx.render('registrace-darce.pug');
    } else {
        await registration.save();
        ctx.redirect('podekovani-za-registraci-darce');
    }
});

router.get('/podekovani-za-registraci-darce', async (ctx, next) => {
    await ctx.render('podekovani-za-registraci-darce.pug');
});

app.use(router.routes());
app.use(router.allowedMethods());

app.on('error', (err, ctx) => {
    console.error('App error', err);
});

mongoProvider.connect().then(() => {
    app.listen(3000);
});
