"use strict"

export function isObject(item) {
    return item && typeof item === "object" && !Array.isArray(item);
}

export function hasAnyOwnProperty(item) {
    for (const property in item) {
        if (item.hasOwnProperty(property)) {
            return true;
        }
    }
    return false;
}

export function isEmptyString(s) {
    return !s || 0 === s.length;
}

export function isNonEmptyString(s) {
    return !isEmptyString(s);
}

export function success(result) {
    return { success: true, result };
}

export function unsuccess(data, errors) {
    return { success: false, data, errors };
}
