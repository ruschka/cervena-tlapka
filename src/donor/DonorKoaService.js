"use strict";

import { isUserLogged, loggedUserZip } from "../core/user";
import { Zip } from "../zip/Zip";
import { DonorRegistration } from "./DonorRegistration";

export class DonorKoaService {
    async findDonors(ctx) {
        let query = {};
        const zipCode = ctx.query.zip
            ? ctx.query.zip
            : isUserLogged(ctx)
            ? loggedUserZip(ctx)
            : null;
        const maxDistance = ctx.query.maxDistance
            ? Number(ctx.query.maxDistance)
            : 50; // default 50km
        if (zipCode) {
            const zip = await this.findZip(ctx, zipCode);
            Object.assign(query, {
                location: {
                    $near: {
                        $geometry: {
                            type: "Point",
                            coordinates: zip.coordinates
                        },
                        $maxDistance: maxDistance * 1000 // meters
                    }
                }
            });
        }
        const registrations = await DonorRegistration.find(query);
        return { registrations, zipCode, maxDistance };
    }

    async aggregateDonorsByZip(ctx, zipCode, maxDistance) {
        let aggregate = DonorRegistration.aggregate();
        if (zipCode) {
            const zip = await this.findZip(ctx, zipCode);
            aggregate = aggregate.near({
                near: { type: "Point", coordinates: zip.coordinates },
                distanceField: "distance",
                maxDistance: maxDistance * 1000, // meters
                num: 1000000
            });
        }
        return aggregate
            .group({
                _id: "$zip",
                registrationCount: { $sum: 1 },
                location: { $first: "$location.coordinates" }
            })
            .project({
                zip: "$_id",
                registrationCount: 1,
                location: 1,
                _id: 0
            })
            .exec();
    }

    async findZip(ctx, zipCode) {
        const zip = await Zip.findOne({ zip: zipCode });
        if (!zip) {
            console.log(`Unknown zip ${zipCode}`);
            ctx.throw(400, "unknown zip");
            return;
        }
        return zip;
    }
}
