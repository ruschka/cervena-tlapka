import fs from "fs";
import csv from "fast-csv";
import axios from "axios";
import { MongoProvider } from "./core/mongo/MongoProvider";
import { Zip } from "./zip/Zip";
import { Writable } from "stream";

const apiKey = "CHANGE_ME";

class ZipTransform extends Writable {
    constructor() {
        super({ objectMode: true });
    }

    async _write(chunk, encoding, callback) {
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
        const predictions = placeResponse.data.predictions;
        if (!predictions || predictions.length === 0) {
            console.log(`Unknown zip ${chunk.zip}`);
            callback();
            return;
        }
        const placeId = predictions[0].place_id;
        const geocodeResponse = await axios.get(
            `https://maps.googleapis.com/maps/api/geocode/json?place_id=${placeId}&key=${apiKey}`
        );
        if (geocodeResponse.status !== 200) {
            throw new Error(
                `${geocodeResponse.status} ${geocodeResponse.statusText}`
            );
        }
        const results = geocodeResponse.data.results;
        if (!results || results.length === 0) {
            console.log(`Unknown zip ${chunk.zip}`);
            callback();
            return;
        }
        const coordinates = results[0].geometry.location;
        if (!coordinates) {
            console.log(`No coordinates for zip ${chunk.zip}`);
            callback();
            return;
        }
        const zip = new Zip({
            zip: chunk.zip,
            city: chunk.city,
            coordinates: [coordinates.lng, coordinates.lat]
        });
        await zip.save();
        console.log(`Zip ${chunk.zip} done`);
        callback();
    }
}

class ZipToGpsCoordinates {
    async run() {
        const mongo = new MongoProvider();
        await mongo.connect();
        const stream = fs.createReadStream("data/cz-zip.csv");

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
