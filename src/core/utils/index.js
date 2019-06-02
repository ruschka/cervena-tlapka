"use strict";

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

export function trimString(s) {
    return s ? s.trim() : s;
}

export function success(data) {
    return { success: true, data };
}

export function unsuccess(data, errors, entity) {
    return { success: false, data, errors, entity };
}
