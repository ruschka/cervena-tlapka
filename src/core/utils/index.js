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
