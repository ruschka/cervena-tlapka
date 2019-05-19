import config from "../config";

function setTemplateData(ctx, data) {
    Object.assign(data, { recaptchaKey: config.recaptcha.clientKey });
    Object.assign(ctx.state, { templateData: data });
}

export async function renderTemplate(ctx, templateName, data) {
    setTemplateData(ctx, data || {});
    await ctx.render(templateName);
}
