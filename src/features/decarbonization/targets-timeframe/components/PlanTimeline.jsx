import React, { useMemo } from 'react';
import PropTypes from 'prop-types';

/** Cores dos marcos da linha do tempo (alinhadas ao design system). */
const MARK_COLORS = {
    base: '#6B7280',
    recent: '#7C6CC4',
    netZero: '#2F7D4F',
};

/**
 * Linha do tempo visual do plano (eixo temporal compartilhado): ano-base,
 * ano mais recente (se diferente) e horizonte (net-zero). Os near-terms são
 * por meta e aparecem na trajetória de cada meta.
 */
function PlanTimeline({ baseYear, recentYear, netZeroYear }) {
    const { ticks, marks, xOf } = useMemo(() => {
        const W = 1080;
        const padL = 40;
        const padR = 40;
        const y0 = baseYear;
        const y1 = Math.max(netZeroYear, baseYear + 1);
        const x = (yr) => padL + ((yr - y0) / (y1 - y0 || 1)) * (W - padL - padR);

        const tickYears = [];
        for (let yr = Math.ceil(y0 / 5) * 5; yr < y1; yr += 5) tickYears.push(yr);

        const markList = [{ yr: baseYear, label: 'Ano-base', color: MARK_COLORS.base }];
        if (recentYear > baseYear) markList.push({ yr: recentYear, label: 'Mais recente', color: MARK_COLORS.recent });
        markList.push({ yr: netZeroYear, label: 'Horizonte', color: MARK_COLORS.netZero });

        return { ticks: tickYears, marks: markList, xOf: x };
    }, [baseYear, recentYear, netZeroYear]);

    const y = 70;

    return (
        <svg viewBox="0 0 1080 120" style={{ display: 'block', width: '100%', height: 'auto' }} role="img" aria-label="Linha do tempo do plano">
            <line x1={40} y1={y} x2={1040} y2={y} stroke="#E5E7EB" strokeWidth={2} />

            {ticks.map((yr) => (
                <g key={`tick-${yr}`}>
                    <line x1={xOf(yr)} y1={y - 4} x2={xOf(yr)} y2={y + 4} stroke="#E5E7EB" />
                    <text x={xOf(yr)} y={y + 22} textAnchor="middle" fontSize={10} fill="#9CA3AF">
                        {yr}
                    </text>
                </g>
            ))}

            {marks.map((m) => (
                <g key={`mark-${m.label}`}>
                    <circle cx={xOf(m.yr)} cy={y} r={7} fill={m.color} />
                    <text x={xOf(m.yr)} y={y - 16} textAnchor="middle" fontSize={12} fontWeight={700} fill={m.color}>
                        {m.yr}
                    </text>
                    <text x={xOf(m.yr)} y={y + 40} textAnchor="middle" fontSize={11} fill={m.color}>
                        {m.label}
                    </text>
                </g>
            ))}
        </svg>
    );
}

PlanTimeline.propTypes = {
    baseYear: PropTypes.number.isRequired,
    recentYear: PropTypes.number.isRequired,
    netZeroYear: PropTypes.number.isRequired,
};

export default PlanTimeline;
