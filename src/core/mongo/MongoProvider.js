'use strict';

import mongoose from 'mongoose';

export class MongoProvider {
    constructor() {}

    // FIXME handle disconnect event
    async connect() {
        return new Promise((resolve, reject) => {
            const options = {useNewUrlParser: true};
            mongoose
                .connect('mongodb://localhost:27017/donor-registry', options)
                .catch(err => {
                    console.error('MongoDB connect failed.', err);
                    reject(err);
                });
            const db = mongoose.connection;
            db.on('error', err => {
                console.error.bind(console, 'connection error:');
                reject(err);
            });
            db.once('open', () => {
                console.log('MongoDB connected!');
                resolve();
            });
        });
    }
}
