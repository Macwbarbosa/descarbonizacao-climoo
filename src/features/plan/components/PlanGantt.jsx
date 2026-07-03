import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Empty } from 'antd';
import { CheckCircleFilled, DownOutlined, RightOutlined } from '@ant-design/icons';
import { spanMonths, monthIndex, parseMonth, monthShort, dateToMonth } from '../months';
import { statusMeta } from '../status';
import { effectiveStatus } from '../planAPI';

/**
 * PlanGantt — cronograma do plano (meses × etapas), com linhas EXPANSÍVEIS.
 * Cada etapa com mês inicial/final vira uma barra colorida pelo status; se tiver
 * tarefas, um "▸" expande a etapa e mostra as tarefas como sub-linhas indentadas
 * (com o estado concluída/pendente), no estilo de um roadmap. Somente leitura —
 * a configuração (nome, datas, tarefas) é feita no modal da etapa.
 */
export default function PlanGantt({ stages }) {
    const [expanded, setExpanded] = useState({}); // { [stageId]: true }
    const months = useMemo(() => spanMonths(stages), [stages]);

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
                description="Defina a data de início e fim das etapas para montar o cronograma."
            />
        );
    }

    const LABEL_W = 280;
    const COL_W = 46;
    const base = monthIndex(months[0]);
    const gridTemplate = `${LABEL_W}px repeat(${months.length}, ${COL_W}px)`;
    const toggle = (id) => setExpanded((e) => ({ ...e, [id]: !e[id] }));

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

                {/* Linhas: etapas (+ tarefas quando expandida) */}
                {stages.map((s, i) => {
                    const a = monthIndex(dateToMonth(s.startDate));
                    const b = monthIndex(dateToMonth(s.endDate));
                    const status = effectiveStatus(s);
                    const meta = statusMeta(status);
                    const colStart = a != null ? a - base + 2 : null;
                    const colEnd = b != null ? b - base + 3 : colStart != null ? colStart + 1 : null;
                    const hasTasks = s.tasks.length > 0;
                    const tasksDone = s.tasks.filter((t) => t.done).length;
                    const pct = hasTasks ? Math.round((tasksDone / s.tasks.length) * 100) : status === 'concluido' ? 100 : 0;
                    const isOpen = !!expanded[s.id];
                    const chipStart = colStart || 2;
                    const chipEnd = Math.min(chipStart + 2, months.length + 2);

                    return (
                        <React.Fragment key={s.id}>
                            {/* Linha da etapa */}
                            <div
                                style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
                                className="items-center border-t border-gray-100"
                            >
                                <div className="pr-3 py-2 min-w-0">
                                    <div className="flex items-center gap-1">
                                        {hasTasks ? (
                                            <button
                                                type="button"
                                                onClick={() => toggle(s.id)}
                                                className="bg-transparent border-0 cursor-pointer text-[#9385c4] p-0 w-4"
                                                aria-label={isOpen ? 'Recolher tarefas' : 'Expandir tarefas'}
                                            >
                                                {isOpen ? <DownOutlined /> : <RightOutlined />}
                                            </button>
                                        ) : (
                                            <span className="inline-block w-4" />
                                        )}
                                        <span className="text-sm text-gray-700 truncate" title={s.title}>
                                            {i + 1}. {s.title}
                                        </span>
                                        {hasTasks && (
                                            <span className="ml-1 text-[11px] text-gray-400 whitespace-nowrap">
                                                {tasksDone}/{s.tasks.length}
                                            </span>
                                        )}
                                    </div>
                                    {/* Mini barra de progresso da etapa */}
                                    <div className="ml-5 mt-1 h-1 rounded bg-gray-200 overflow-hidden" style={{ maxWidth: 200 }}>
                                        <div className="h-1 rounded" style={{ width: `${pct}%`, background: meta.bar }} />
                                    </div>
                                </div>

                                {colStart != null ? (
                                    <div style={{ gridColumn: `${colStart} / ${colEnd}` }} className="py-2 px-0.5">
                                        <div
                                            className="h-6 rounded-md flex items-center px-2 text-[11px] font-medium truncate shadow-sm"
                                            style={{ background: meta.bar, color: status === 'nao_iniciado' ? '#475569' : '#fff' }}
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

                            {/* Sub-linhas: tarefas da etapa */}
                            {isOpen &&
                                s.tasks.map((t) => (
                                    <div
                                        key={t.id}
                                        style={{ display: 'grid', gridTemplateColumns: gridTemplate }}
                                        className="items-center bg-gray-50/50"
                                    >
                                        <div className="pl-9 pr-3 py-1.5 flex items-center gap-2 min-w-0">
                                            {t.done ? (
                                                <CheckCircleFilled style={{ color: '#0E7C66' }} />
                                            ) : (
                                                <span className="inline-block w-3.5 h-3.5 rounded-full border-2 border-gray-300" />
                                            )}
                                            <span
                                                className={`text-[13px] truncate ${t.done ? 'line-through text-gray-400' : 'text-gray-600'}`}
                                                title={t.title}
                                            >
                                                {t.title}
                                            </span>
                                        </div>
                                        <div style={{ gridColumn: `${chipStart} / ${chipEnd}` }} className="py-1.5 px-0.5">
                                            <span
                                                className="inline-block text-[10px] font-semibold px-2 py-0.5 rounded-full whitespace-nowrap"
                                                style={
                                                    t.done
                                                        ? { background: '#d6f2ea', color: '#0b5a4b' }
                                                        : { background: '#eef1f5', color: '#64748b' }
                                                }
                                            >
                                                {t.done ? 'Concluída' : 'Pendente'}
                                            </span>
                                        </div>
                                    </div>
                                ))}
                        </React.Fragment>
                    );
                })}
            </div>
        </div>
    );
}

PlanGantt.propTypes = {
    stages: PropTypes.arrayOf(PropTypes.object).isRequired,
};
