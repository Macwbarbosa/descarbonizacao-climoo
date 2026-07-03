import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Empty } from 'antd';
import { spanQuarters, quarterIndex, parseQuarter } from '../quarters';
import { statusMeta } from '../status';

/**
 * PlanGantt — cronograma do plano em grade (trimestres × etapas).
 * Cada etapa com trimestre inicial/final vira uma barra colorida pelo status.
 * Somente leitura (as datas são editadas na lista de etapas).
 */
export default function PlanGantt({ stages }) {
    const quarters = useMemo(() => spanQuarters(stages), [stages]);

    // Agrupa trimestres por ano para o cabeçalho superior (colspan por ano).
    const yearGroups = useMemo(() => {
        const groups = [];
        quarters.forEach((q) => {
            const { year } = parseQuarter(q);
            const last = groups[groups.length - 1];
            if (last && last.year === year) last.span += 1;
            else groups.push({ year, span: 1 });
        });
        return groups;
    }, [quarters]);

    if (!quarters.length) {
        return (
            <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description="Defina os trimestres de início e fim das etapas para montar o cronograma."
            />
        );
    }

    const LABEL_W = 260;
    const COL_W = 88;
    const base = quarterIndex(quarters[0]);
    const gridTemplate = `${LABEL_W}px repeat(${quarters.length}, ${COL_W}px)`;

    return (
        <div className="overflow-x-auto">
            <div style={{ minWidth: LABEL_W + quarters.length * COL_W }}>
                {/* Cabeçalho: anos */}
                <div style={{ display: 'grid', gridTemplateColumns: gridTemplate }}>
                    <div />
                    {yearGroups.map((g) => (
                        <div
                            key={g.year}
                            style={{ gridColumn: `span ${g.span}` }}
                            className="text-white text-sm font-semibold px-3 py-1.5 rounded-t-md"
                        >
                            <span className="inline-block bg-[#210856] px-2.5 py-1 rounded-md">{g.year}</span>
                        </div>
                    ))}
                </div>

                {/* Cabeçalho: trimestres */}
                <div
                    style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
                    className="border-b border-gray-200"
                >
                    <div />
                    {quarters.map((q) => (
                        <div key={q} className="text-xs font-semibold text-[#341472] px-2 py-2 text-center">
                            T{parseQuarter(q).q}
                        </div>
                    ))}
                </div>

                {/* Linhas: etapas */}
                {stages.map((s, i) => {
                    const a = quarterIndex(s.startQuarter);
                    const b = quarterIndex(s.endQuarter);
                    const meta = statusMeta(s.status);
                    // coluna 1 = rótulo; trimestres começam na coluna 2.
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
                            {/* célula que contém a barra, posicionada por gridColumn */}
                            {colStart != null ? (
                                <div style={{ gridColumn: `${colStart} / ${colEnd}` }} className="py-2 px-1">
                                    <div
                                        className="h-6 rounded-md flex items-center px-2 text-[11px] font-medium text-white truncate shadow-sm"
                                        style={{ background: meta.bar, color: s.status === 'nao_iniciado' ? '#475569' : '#fff' }}
                                        title={`${meta.label}${s.note ? ` — ${s.note}` : ''}`}
                                    >
                                        {s.note || meta.label}
                                    </div>
                                </div>
                            ) : (
                                <div style={{ gridColumn: `2 / ${quarters.length + 2}` }} className="py-2 text-xs text-gray-300">
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
