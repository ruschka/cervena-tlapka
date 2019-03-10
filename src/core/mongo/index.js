"use strict"

export function validateAsync(entity) {
    return new Promise((resolve, reject) => {
        entity.validate(result => resolve(result));
    });
}
