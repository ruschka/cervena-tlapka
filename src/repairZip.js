import fs from "fs";
import csv from "fast-csv";
import { MongoProvider } from "./core/mongo/MongoProvider";
import { Zip } from "./zip/Zip";
import { Writable } from "stream";

class ZipTransform extends Writable {
    constructor() {
        super({ objectMode: true });
    }

    async _write(chunk, encoding, callback) {
        const find = { zip: chunk.zip };
        const result = await Zip.updateOne(find, {
            $set: { district: chunk.district, region: chunk.region }
        });
        console.log(JSON.stringify(result));
        console.log(`Zip ${chunk.zip} done`);
        callback();
    }
}

class ZipToGpsCoordinates {
    async run() {
        const mongo = new MongoProvider();
        await mongo.connect();
        const stream = fs.createReadStream("data/cz-zip-district.csv");

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
