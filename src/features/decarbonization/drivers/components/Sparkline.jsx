import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/**
 * Mini-curva (sparkline) inline em SVG para a série de índice do driver.
 * Leve de propósito (sem instanciar um chart por item da lista).
 */
function Sparkline({ values, width, height, color }) {
    const path = useMemo(() => {
        if (!values || values.length < 2) return '';
        const min = Math.min(...values);
        const max = Math.max(...values);
        const x = (i) => (i / (values.length - 1)) * width;
        const y = (v) => height - 2 - ((v - min) / (max - min || 1)) * (height - 4);
        return `M${values.map((v, i) => `${x(i)},${y(v)}`).join(' L')}`;
    }, [values, width, height]);

    if (!path) return null;

    return (
        <svg width={width} height={height} viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
            <path d={path} fill="none" stroke={color} strokeWidth={1.6} />
        </svg>
    );
}

Sparkline.propTypes = {
    values: PropTypes.arrayOf(PropTypes.number).isRequired,
    width: PropTypes.number,
    height: PropTypes.number,
    color: PropTypes.string,
};

Sparkline.defaultProps = {
    width: 120,
    height: 24,
    color: '#210856',
};

export default Sparkline;
