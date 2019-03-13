import fs from "fs";
import csv from "fast-csv";
import axios from "axios";
import { Transform } from "stream";
import { MongoProvider } from "./core/mongo/MongoProvider";
import { Zip } from "./zip/Zip";

const apiKey = "CHANGE_ME";

class ZipTransform extends Transform {
    constructor() {
        super({ objectMode: true });
    }

    async _transform(chunk, encoding, callback) {
        const placeResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/place/autocomplete/json?input=${
                chunk.zip
            }&types=(regions)&components=country:CZ&key=${apiKey}`
        );
        if (placeResponse.status !== 200) {
            throw new Error(
                `${placeResponse.status} ${placeResponse.statusText}`
            );
        }
        const found = placeResponse.data.predictions[0];
        if (!found) {
            console.log(`Unknown zip ${chunk.zip}`);
            callback();
            return;
        }
        const placeId = found.place_id;
        const geocodeResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey}`
        );
        if (geocodeResponse.status !== 200) {
            throw new Error(
                `${geocodeResponse.status} ${geocodeResponse.statusText}`
            );
        }
        const result = geocodeResponse.data.results[0];
        if (!result) {
            console.log(`Unknown zip ${chunk.zip}`);
            callback();
            return;
        }
        const coordinates = result.geometry.location;
        if (!coordinates) {
            console.log(`No coordinates for zip ${chunk.zip}`);
            callback();
            return;
        }
        console.log(coordinates);
        const zip = new Zip({
            zip: chunk.zip,
            city: chunk.city,
            coordinates: [coordinates.lng, coordinates.lat]
        });
        await zip.save();
        callback();
    }
}

class ZipToGpsCoordinates {
    async run() {
        const mongo = new MongoProvider();
        await mongo.connect();
        const stream = fs.createReadStream("data/cz-zip-test.csv");

        const csvStream = csv({ headers: true, delimiter: ";" });

        const transformStream = new ZipTransform();

        await new Promise((resolve, reject) => {
            stream
                .on("error", err => {
                    console.error(err);
                    reject(err);
                })
                .pipe(csvStream)
                .on("error", err => {
                    console.error(err);
                    reject(err);
                })
                .pipe(transformStream)
                .on("error", err => {
                    console.error(err);
                    reject(err);
                })
                .on("finish", () => resolve());
        });
        await mongo.disconnect();
    }
}

new ZipToGpsCoordinates()
    .run()
    .then(() => console.log("Done"))
    .catch(err => console.error(err));
