/**
 * Format a number to currency string
 * @param {number|string} value - The number to format
 * @param {string} locale - The locale to use (default: 'vi-VN')
 * @returns {string} The formatted string
 */
export const formatNumber = (value) => {
    if (value === undefined || value === null || value === '') return '0,00';
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00';

    return new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};

/**
 * Format currency with symbol
 * @param {number|string} value 
 * @param {string} currency - 'VND' | 'USD' | 'CNY'
 */
export const formatCurrency = (value, currency = 'VND') => {
    if (value === undefined || value === null || value === '') return '0,00';
    const num = parseFloat(value);
    if (isNaN(num)) return '0,00';

    return new Intl.NumberFormat('vi-VN', {
        style: 'currency',
        currency: currency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
    }).format(num);
};
