import config from "../config";

export function setTemplateData(ctx, data) {
    Object.assign(data, { recaptchaKey: config.recaptcha.clientKey });
    Object.assign(ctx.state, { templateData: data });
}
