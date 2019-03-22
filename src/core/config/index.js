/**
 * Utility for deep merge of objects
 *
 * @param {*} target Target, where will be sources merged
 * @param  {...any} sources Many sources, will be merged gradually
 */
import { isObject } from "../utils";
import config from "../../../config";

function merge(target, ...sources) {
    // no sources...
    if (!sources.length) {
        return target;
    }

    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) {
                    // create new property in target object
                    Object.assign(target, { [key]: {} });
                }
                merge(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    // recursive run
    return merge(target, ...sources);
}

// return environment config merged to default config
export default merge({}, config.defaultConfig, config.envConfig);
