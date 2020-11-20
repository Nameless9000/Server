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
    const invisibleCharacters = ['\u200B', '\u180E', '\u2060', '\u200C', '\u200D'].join('');
    for (let i = 0; i < 25; i++) {
        url += invisibleCharacters.charAt(Math.floor(Math.random() * invisibleCharacters.length));
    }
    return url + '\u200B';
}

/**
 * Generate a invite code.
 * @return {string} The invite code.
 */
function generateInvite(): string {
    const key = randomBytes(80)
        .toString('hex');
    return [key.slice(0, 8), key.slice(1, 10), key.slice(3, 7)].join('-');
}

export {
    generateString,
    generateShortUrl,
    generateInvite
};
