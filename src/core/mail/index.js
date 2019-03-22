"use strict";

import Email from "email-templates";
import nodemailer from "nodemailer";
import nodemailerSparkpostTransport from "nodemailer-sparkpost-transport";
import path from "path";

const transporter = nodemailer.createTransport(
    nodemailerSparkpostTransport({
        sparkPostApiKey: "changeme"
    })
);
const root = path.join(__dirname, "../../..", "mail-templates");
const email = new Email({
    views: { root: root },
    message: {
        from: "no-reply@email.cervenatlapka.cz"
    },
    //send: true,
    transport: transporter
});

export async function sendMail(to, templateName, templateParams) {
    return email.send({
        template: templateName,
        message: {
            to: to
        },
        locals: enrichTemplateParams(templateParams)
    });
}

function enrichTemplateParams(templateParams) {
    return Object.assign(templateParams, { baseUrl: "http://localhost:3000" }); // FIXME configuration
}
