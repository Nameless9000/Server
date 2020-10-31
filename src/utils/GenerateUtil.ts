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

/**
 * Generate a short url.
 * @return {string} The short url.
 */
function generateShortUrl(): string {
    let url = '';
    const invisibleCharacters = ['\u200B', '\u2060', '\u180E', '\u200D', '\u200C'].join('');
    for (let i = 0; i < 24; i++) {
        url += invisibleCharacters.charAt(Math.floor(Math.random() * invisibleCharacters.length));
    }
    return url;
}

export {
    generateString,
    generateShortUrl
};
