import axios from "axios";
import config from "../config";

const secret = config.recaptcha.apiKey;

export async function validateRecaptcha(ctx, response) {
    const remoteip = ctx.request.ip;
    const result = await axios.post(
        `https://www.google.com/recaptcha/api/siteverify?secret=${secret}&response=${response}&remoteip${remoteip}`
    );
    const data = result.data;
    if (!data.success) {
        console.error(JSON.stringify(data));
    }
    return data;
}
