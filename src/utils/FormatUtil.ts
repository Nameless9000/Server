/**
 * Format a file size to a human readable size.
 * @param {number} size The filesize in bytes.
 * @return {string} The formatted filesize.
 */
function formatFilesize(size: number): string {
    if (size === 0)
        return '0 B';

    const sizes = ['B', 'KB', 'MB', 'GB'];
    const int = Math.floor(Math.log(size) / Math.log(1024));

    return (size / Math.pow(1024, int)).toFixed(2) + ' ' + sizes[int];
}

export {
    formatFilesize
};
