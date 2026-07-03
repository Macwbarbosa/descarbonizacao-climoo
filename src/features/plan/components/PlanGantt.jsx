import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Empty } from 'antd';
import { spanMonths, monthIndex, parseMonth, monthShort } from '../months';
import { statusMeta } from '../status';
import { effectiveStatus } from '../planAPI';

/**
 * PlanGantt — cronograma do plano em grade (meses × etapas).
 * Cada etapa com mês inicial/final vira uma barra colorida pelo status.
 * Somente leitura (as datas são editadas na lista de etapas).
 */
export default function PlanGantt({ stages }) {
    const months = useMemo(() => spanMonths(stages), [stages]);

    // Agrupa meses por ano para o cabeçalho superior (colspan por ano).
    const yearGroups = useMemo(() => {
        const groups = [];
        months.forEach((m) => {
            const { year } = parseMonth(m);
            const last = groups[groups.length - 1];
            if (last && last.year === year) last.span += 1;
            else groups.push({ year, span: 1 });
        });
        return groups;
    }, [months]);

    if (!months.length) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Defina o mês de início e fim das etapas para montar o cronograma."
            />
        );
    }

    const LABEL_W = 260;
    const COL_W = 44;
    const base = monthIndex(months[0]);
    const gridTemplate = `${LABEL_W}px repeat(${months.length}, ${COL_W}px)`;

    return (
        <div className="overflow-x-auto">
            <div style={{ minWidth: LABEL_W + months.length * COL_W }}>
                {/* Cabeçalho: anos */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
                    <div />
                    {yearGroups.map((g) => (
                        <div key={g.year} style={{ gridColumn: `span ${g.span}` }} className="px-1 pb-1">
                            <span className="inline-block bg-[#210856] text-white text-xs font-semibold px-2.5 py-1 rounded-md">
                                {g.year}
                            </span>
                        </div>
                    ))}
                </div>

                {/* Cabeçalho: meses */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }} className="border-b border-gray-200">
                    <div />
                    {months.map((m) => (
                        <div key={m} className="text-[10px] font-medium text-[#341472] py-2 text-center capitalize">
                            {monthShort(m)}
                        </div>
                    ))}
                </div>

                {/* Linhas: etapas */}
                {stages.map((s, i) => {
                    const a = monthIndex(s.startMonth);
                    const b = monthIndex(s.endMonth);
                    const meta = statusMeta(effectiveStatus(s));
                    const colStart = a != null ? a - base + 2 : null;
                    const colEnd = b != null ? b - base + 3 : colStart != null ? colStart + 1 : null;
                    return (
                        <div
                            key={s.id}
                            style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
                            className={`items-center ${i % 2 ? 'bg-gray-50/60' : ''}`}
                        >
                            <div className="text-sm text-gray-700 pr-3 py-2 truncate" title={s.title}>
                                {i + 1}. {s.title}
                            </div>
                            {colStart != null ? (
                                <div style={{ gridColumn: `${colStart} / ${colEnd}` }} className="py-2 px-0.5">
                                    <div
                                        className="h-6 rounded-md flex items-center px-2 text-[11px] font-medium truncate shadow-sm"
                                        style={{ background: meta.bar, color: effectiveStatus(s) === 'nao_iniciado' ? '#475569' : '#fff' }}
                                        title={`${meta.label}${s.note ? ` — ${s.note}` : ''}`}
                                    >
                                        {s.note || meta.label}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ gridColumn: `2 / ${months.length + 2}` }} className="py-2 text-xs text-gray-300">
                                    sem datas
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}

PlanGantt.propTypes = {
    stages: PropTypes.arrayOf(PropTypes.object).isRequired,
};
