/**
 * Format a number to a float string (fixed 2 decimal places)
 * @param {number|string} value - The number to format
 * @param {string} locale - Locale for formatting (default: 'vi-VN')
 * @returns {string} The formatted string (e.g., 1.234,56)
 */
export const formatFloat = (value, locale = 'vi-VN') => {
    if (value === undefined || value === null || value === '') return '0,00';
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00';

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

/**
 * Format a number to an integer string (0 decimal places)
 * @param {number|string} value - The number to format
 * @param {string} locale - Locale for formatting (default: 'vi-VN')
 * @returns {string} The formatted string (e.g., 1.234)
 */
export const formatInteger = (value, locale = 'vi-VN') => {
    if (value === undefined || value === null || value === '') return '0';
    const num = parseFloat(value);
    if (isNaN(num)) return '0';

    return new Intl.NumberFormat(locale, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(num);
};
