"use strict";

import axios from "axios";
import config from "../config";
import { success, unsuccess } from "../utils";

const secret = config.recaptcha.apiKey;

export async function validateRecaptcha(ctx, data, actionName) {
    const response = data["g-recaptcha-response"];
    const remoteip = ctx.request.ip;
    const result = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}&remoteip${remoteip}`
    );
    const recaptchaResult = result.data;
    if (!recaptchaResult.success) {
        console.error(`Recaptcha error: ${JSON.stringify(recaptchaResult)}`);
        return unsuccess(data, {
            global:
                "Ochrana proti robotům selhala. Zkuste to prosím později znovu. Omlouváme se za problémy."
        });
    }
    if (recaptchaResult.action !== actionName) {
        return unsuccess(data, {
            global: "Recaptcha actions don't match."
        });
    }
    if (recaptchaResult.score < 0.5) {
        return unsuccess(data, {
            global:
                "Tento formulář využívá ochranu proti robotům. Pokud toto čtete, je to omyl, za který se omlouváme. Zkuste obnovit stránku a formulář vyplnit znovu. Jestliže se chyba opakuje, kontaktujte nás prosím."
        });
    } else {
        return success();
    }
}
