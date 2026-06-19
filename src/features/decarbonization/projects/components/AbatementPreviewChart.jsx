import React, { useEffect, useRef, useMemo } from 'react';
import PropTypes from 'prop-types';
import { Line } from '@antv/g2plot';
import { Empty } from 'antd';
import { groupEmissionInYear, abatementInYear } from '../utils/projectAbatement';

const COLORS = { group: '#9CA3AF', net: '#2F6F5E' };
const fmt = (v) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 })} tCO2e`;

/**
 * Preview do abatimento: emissão do grupo (BAU) vs. emissão após o projeto
 * (grupo − abatimento). A diferença entre as linhas é o abatimento. Ao vivo.
 */
function AbatementPreviewChart({ project, initiative, ctx }) {
    const ref = useRef(null);
    const plot = useRef(null);

    const data = useMemo(() => {
        const out = [];
        for (let y = ctx.baseYear; y <= ctx.endYear; y += 1) {
            const group = groupEmissionInYear(project, y, ctx);
            const abat = abatementInYear(project, y, initiative, ctx);
            out.push({ year: String(y), value: group, serie: 'Emissão do grupo (BAU)' });
            out.push({ year: String(y), value: Math.max(0, group - abat), serie: 'Após o projeto' });
        }
        return out;
    }, [project, initiative, ctx]);

    const hasMembers = (project.memberActivityIds || []).length > 0;

    useEffect(() => {
        if (!ref.current || !hasMembers) return undefined;
        const id = setTimeout(() => {
            if (!ref.current) return;
            ref.current.innerHTML = '';
            plot.current = new Line(ref.current, {
                data,
                xField: 'year',
                yField: 'value',
                seriesField: 'serie',
                autoFit: true,
                color: ({ serie }) => (serie === 'Após o projeto' ? COLORS.net : COLORS.group),
                lineStyle: ({ serie }) => (serie === 'Após o projeto' ? { lineWidth: 2.5 } : { lineWidth: 2, lineDash: [5, 4] }),
                yAxis: { min: 0, title: { text: 'Emissões (tCO2e)', style: { fontSize: 11, fill: '#666' } } },
                meta: { value: { formatter: fmt } },
                tooltip: { formatter: (d) => ({ name: d.serie, value: fmt(d.value) }) },
                legend: { position: 'bottom' },
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
    }, [data, hasMembers]);

    if (!hasMembers) return <Empty description="Selecione atividades do grupo para ver o abatimento." />;
    return <div ref={ref} style={{ width: '100%', height: 220 }} />;
}

AbatementPreviewChart.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    project: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    initiative: PropTypes.object,
    // eslint-disable-next-line react/forbid-prop-types
    ctx: PropTypes.object.isRequired,
};

AbatementPreviewChart.defaultProps = { initiative: null };

export default AbatementPreviewChart;
