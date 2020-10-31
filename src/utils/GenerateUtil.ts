import { randomBytes } from 'crypto';

/**
 * Generate a string.
 * @param {string} length The length of the string.
 * @return {string} The generated string.
 */
function generateString(length: number): string {
    return randomBytes(length)
        .toString('hex')
        .slice(0, length);
}

export {
    generateString
};
