/**
 * Helper to safely extract a route parameter as a string.
 * Express types can return `string | string[]` for params — this ensures a string.
 */
export const param = (value: string | string[] | undefined): string => {
    if (Array.isArray(value)) return value[0] || '';
    return value || '';
};
