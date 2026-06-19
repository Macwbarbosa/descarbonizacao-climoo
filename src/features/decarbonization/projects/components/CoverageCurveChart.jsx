import React, { useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Line } from '@antv/g2plot';
import { coverageInYear } from '../utils/projectAbatement';

/** Curva de abrangência (%) do grupo ao longo do tempo. Recalcula ao vivo. */
function CoverageCurveChart({ project, baseYear, endYear }) {
    const ref = useRef(null);
    const plot = useRef(null);

    const data = useMemo(() => {
        const out = [];
        for (let y = baseYear; y <= endYear; y += 1) out.push({ year: String(y), value: coverageInYear(project, y) });
        return out;
    }, [project, baseYear, endYear]);

    useEffect(() => {
        if (!ref.current) return undefined;
        const id = setTimeout(() => {
            if (!ref.current) return;
            ref.current.innerHTML = '';
            plot.current = new Line(ref.current, {
                data,
                xField: 'year',
                yField: 'value',
                autoFit: true,
                color: '#2F6F5E',
                lineStyle: { lineWidth: 2.5 },
                point: { size: 3, style: { fill: '#fff', stroke: '#2F6F5E', lineWidth: 1.5 } },
                yAxis: { min: 0, max: 100, title: { text: 'Abrangência (%)', style: { fontSize: 11, fill: '#666' } } },
                meta: { value: { formatter: (v) => `${Number(v).toFixed(0)}%` } },
                tooltip: { formatter: (d) => ({ name: 'Abrangência', value: `${Number(d.value).toFixed(0)}%` }) },
            });
            plot.current.render();
        }, 60);
        return () => {
            clearTimeout(id);
            if (plot.current) {
                plot.current.destroy();
                plot.current = null;
            }
        };
    }, [data]);

    return <div ref={ref} style={{ width: '100%', height: 200 }} />;
}

CoverageCurveChart.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    project: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
};

export default CoverageCurveChart;
