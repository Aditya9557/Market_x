/**
 * Override Express route params to always return string instead of string | string[].
 * This matches the behavior in Express 4.x and handles the stricter Express 5 types.
 */
import 'express';

declare module 'express' {
    interface ParamsDictionary {
        [key: string]: string;
    }
}
