import { randomBytes } from 'crypto';

/**
 * Generate a filename.
 * @return {string} The filename.
 */
function generateFileName(): string {
    return randomBytes(10)
        .toString('hex')
        .slice(0, 10);
}

/**
 * Generate a deletion key.
 * @return {string} The deletion key.
 */
function generateDeletionKey(): string {
    return randomBytes(40)
        .toString('hex')
        .slice(0, 40);
}

export {
    generateFileName,
    generateDeletionKey
};
