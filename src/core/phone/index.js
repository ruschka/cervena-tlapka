"use strict";

import twilio from "twilio";
import config from "../config";

// https://www.regularnivyrazy.info/telefonni-cislo.html
export const phoneRegex = /^(\+420)?[1-9][0-9]{2}[0-9]{3}[0-9]{3}$/;

export const defaultFrom = config.twilio.defaultFrom;

const client = twilio(config.twilio.accountSid, config.twilio.authToken);

export async function sendSms(body, to, from) {
    try {
        const sms = {
            body,
            from: from || defaultFrom,
            to
        };
        console.info(`Sending sms. ${JSON.stringify(sms)}.`);
        const result = await client.messages.create(sms);
        console.info(result);
    } catch (err) {
        console.error(err);
        throw err;
    }
}
