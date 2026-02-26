
import React from 'react';
import { InputNumber } from 'antd';

/**
 * Custom InputNumber component handling specific formatting requirements.
 * - Initial value is empty (not 0 or 0.00).
 * - Accepts ',' as decimal separator.
 * - Auto-formatting relies purely on native antd properties.
 * - Supports Integer and Float modes.
 */
const CustomNumberInput = ({
    isInteger = false,
    width = '100%',
    style,
    placeholder,
    ...props
}) => {
    // Determine step and precision based on type
    const precision = isInteger ? 0 : 2;
    const step = isInteger ? 1 : 0.01;

    return (
        <InputNumber
            style={{ width, ...style }}
            step={step}
            precision={precision}
            placeholder={placeholder}
            decimalSeparator=","
            {...props}
        />
    );
};

export default CustomNumberInput;
