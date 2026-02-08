
import React from 'react';
import { InputNumber } from 'antd';

/**
 * Custom InputNumber component handling specific formatting requirements.
 * - Initial value is empty (not 0 or 0.00).
 * - No auto-formatting while typing.
 * - Accepts both ',' and '.' as decimal separators.
 * - Supports Integer and Float modes.
 */
const CustomNumberInput = ({
    isInteger = false,
    width = '100%',
    style,
    placeholder,
    ...props
}) => {
    // Determine precision based on type
    const precision = isInteger ? 0 : 2;
    const step = isInteger ? 1 : 0.01;

    // Formatter logic
    const formatter = (value, { userTyping, input }) => {
        if (userTyping) return value; // Don't format while typing
        if (value === null || value === undefined || value === '') return '';

        const num = parseFloat(value);
        if (isNaN(num)) return '';

        // Format using de-DE locale which matches VN standard (1.234,56)
        // Integer: 1.234
        // Float: 1.234,56
        return new Intl.NumberFormat('de-DE', {
            minimumFractionDigits: precision,
            maximumFractionDigits: precision,
        }).format(num);
    };

    // Parser logic
    const parser = (displayValue) => {
        if (!displayValue) return '';

        // Remove whitespace
        const val = displayValue.toString().trim();

        // Check if value contains comma (VN/DE decimal separator)
        if (val.includes(',')) {
            // Remove thousands separators (.) and replace decimal separator (,) with (.) -> Standard JS Float
            return val.replace(/\./g, '').replace(',', '.');
        }

        // If NO comma, check for dots
        // Case 1: Multiple dots (e.g., 1.234.567) -> Definitely thousands separators -> Remove dots
        const dotCount = (val.match(/\./g) || []).length;
        if (dotCount > 1) {
            return val.replace(/\./g, '');
        }

        // Case 2: Single dot or no dot
        // User rule: "2.1" is decimal.
        // So solitary dot is treated as decimal separator.
        // (Note: This means user cannot type "1.000" for 1000, must type "1000")
        return val;
    };

    return (
        <InputNumber
            style={{ width, ...style }}
            step={step}
            precision={precision}
            formatter={formatter}
            parser={parser}
            placeholder={placeholder}
            {...props}
        />
    );
};

export default CustomNumberInput;
