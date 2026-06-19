import React, { useMemo, useState } from 'react';
import PropTypes from 'prop-types';
import { Input, Select, InputNumber, Button, Row, Col, Alert, Divider, Tag, Tooltip } from 'antd';
import { DeleteOutlined, PlusOutlined, FileTextOutlined } from '@ant-design/icons';
import { StatCard } from '@/shared/components/ui/Card';
import {
    groupEmissionInYear,
    abatementInYear,
    coverageInYear,
    projectFinanceSummary,
} from '../utils/projectAbatement';
import ActivityGroupTree from './ActivityGroupTree';
import CoverageCurveChart from './CoverageCurveChart';
import AbatementPreviewChart from './AbatementPreviewChart';
import InitiativeMemorialModal from './InitiativeMemorialModal';

const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';
const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });
const money = (v, c = 'BRL') => `${c} ${Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

const yearOptions = (from, to) => {
    const out = [];
    for (let y = from; y <= to; y += 1) out.push({ value: y, label: String(y) });
    return out;
};

/** Editor de um Projeto: nome, aplicabilidade temporal, iniciativa, grupo de atividades, abrangência e preview do abatimento. */
function ProjectEditor({ project, initiatives, activities, ctx, targetYear, onPatch, onRemove }) {
    const [memorialOpen, setMemorialOpen] = useState(false);
    const initiative = initiatives.find((i) => i.id === project.initiativeId) || null;
    const isExclusive = initiative?.source === 'empresa';

    // Opções agrupadas por origem: catálogo global (Banco de tecnologias) +
    // eventuais iniciativas exclusivas pré-existentes. Aqui é SÓ consulta/atribuição
    // — a criação/edição de iniciativas é feita na página "Banco de tecnologias".
    const initiativeOptions = useMemo(() => {
        const toOpt = (i) => ({ value: i.id, label: `${i.name} · ${i.efficacy}%` });
        const exclusivas = initiatives.filter((i) => i.source === 'empresa').map(toOpt);
        const globais = initiatives.filter((i) => i.source !== 'empresa').map(toOpt);
        return [
            { label: 'Catálogo global (Banco de tecnologias)', options: globais },
            { label: 'Exclusivas da empresa', options: exclusivas },
        ].filter((g) => g.options.length > 0);
    }, [initiatives]);

    // Financeiro POR PROJETO (a iniciativa do banco traz só a eficácia).
    const finance = project.finance || {};
    const setFinance = (patch) => onPatch({ finance: { ...finance, ...patch } });

    const groupBase = useMemo(
        () => (project.memberActivityIds || []).reduce((t, id) => t + (ctx.activitiesById[id]?.baseEmission || 0), 0),
        [project.memberActivityIds, ctx.activitiesById]
    );
    const abatementTarget = abatementInYear(project, targetYear, initiative, ctx);
    const groupTarget = groupEmissionInYear(project, targetYear, ctx);
    const financeSummary = projectFinanceSummary(project, initiative, ctx);

    const issues = useMemo(() => {
        const out = [];
        if (!initiative) out.push('selecione uma iniciativa do banco');
        if ((project.memberActivityIds || []).length === 0) out.push('selecione ao menos uma atividade do grupo');
        if (project.startYear < ctx.baseYear || project.endYear > ctx.endYear) {
            out.push(`aplicabilidade deve ficar dentro do período do plano (${ctx.baseYear}–${ctx.endYear})`);
        }
        if (project.endYear < project.startYear) out.push('ano de fim anterior ao de início');
        const outOfRange = (project.coveragePoints || []).some((p) => p.year < project.startYear || p.year > project.endYear);
        if (outOfRange) out.push('há pontos de abrangência fora do intervalo início–fim');
        return out;
    }, [project, initiative, ctx]);

    // Pontos de abrangência (ordenados) + ações
    const points = [...(project.coveragePoints || [])].sort((a, b) => a.year - b.year);
    const setPoints = (next) => onPatch({ coveragePoints: next });
    const updatePoint = (idx, field, value) => setPoints(points.map((p, i) => (i === idx ? { ...p, [field]: Number(value) } : p)));
    const removePoint = (idx) => setPoints(points.filter((_, i) => i !== idx));
    const addPoint = () => {
        const lastYear = points.length ? points[points.length - 1].year : project.startYear;
        setPoints([...points, { year: Math.min(project.endYear, lastYear + 1), pct: 50 }]);
    };

    return (
        <div>
            <Row gutter={[12, 12]} align="bottom">
                <Col flex="1 1 auto">
                    <span className={labelCls}>Nome do projeto</span>
                    <Input value={project.name} onChange={(e) => onPatch({ name: e.target.value })} />
                </Col>
                <Col flex="0 0 auto">
                    <Button danger icon={<DeleteOutlined />} onClick={() => onRemove(project.id)}>
                        Remover
                    </Button>
                </Col>
            </Row>

            {/* Aplicabilidade temporal + iniciativa */}
            <Row gutter={[12, 12]} className="mt-3">
                <Col xs={12} md={4}>
                    <span className={labelCls}>Início</span>
                    <Select
                        value={project.startYear}
                        options={yearOptions(ctx.baseYear, ctx.endYear)}
                        onChange={(v) => onPatch({ startYear: v })}
                        style={{ width: '100%' }}
                    />
                </Col>
                <Col xs={12} md={4}>
                    <span className={labelCls}>Fim</span>
                    <Select
                        value={project.endYear}
                        options={yearOptions(ctx.baseYear, ctx.endYear)}
                        onChange={(v) => onPatch({ endYear: v })}
                        style={{ width: '100%' }}
                    />
                </Col>
                <Col xs={24} md={16}>
                    <span className={labelCls}>Iniciativa (do Banco de tecnologias)</span>
                    <div className="flex items-center gap-2">
                        <Select
                            value={project.initiativeId || undefined}
                            options={initiativeOptions}
                            onChange={(v) => onPatch({ initiativeId: v })}
                            placeholder="Selecione a iniciativa"
                            style={{ flex: 1 }}
                            showSearch
                            optionFilterProp="label"
                        />
                        <Tooltip title="Ver memorial da iniciativa">
                            <Button icon={<FileTextOutlined />} disabled={!initiative} onClick={() => setMemorialOpen(true)}>
                                Memorial
                            </Button>
                        </Tooltip>
                    </div>
                    {initiative ? (
                        <div className="text-[11px] text-gray-500 mt-1">
                            <Tag color={isExclusive ? 'purple' : 'blue'} className="rounded-full mr-1">
                                {isExclusive ? 'Exclusiva da empresa' : 'Catálogo global'}
                            </Tag>
                            Eficácia <b>{initiative.efficacy}%</b> · a quantificação financeira é configurada no projeto (abaixo).
                        </div>
                    ) : (
                        <div className="text-[11px] text-gray-400 mt-1">
                            Iniciativas são criadas/editadas na página <b>Banco de tecnologias</b> — aqui apenas selecione.
                        </div>
                    )}
                </Col>
            </Row>

            {issues.length > 0 && <Alert className="mt-3" type="warning" showIcon message={issues.join(' · ')} />}

            {/* Atividades do grupo */}
            <Divider className="my-4" orientation="left" orientationMargin={0}>
                <span className="text-[12px] text-gray-500">
                    Atividades do grupo · base {fmt(groupBase)} tCO2e ({(project.memberActivityIds || []).length} ativ.)
                </span>
            </Divider>
            <ActivityGroupTree
                activities={activities}
                selectedIds={project.memberActivityIds || []}
                onChange={(ids) => onPatch({ memberActivityIds: ids })}
            />

            {/* Abrangência no tempo */}
            <Divider className="my-4" orientation="left" orientationMargin={0}>
                <span className="text-[12px] text-gray-500">Abrangência no tempo (% do grupo)</span>
            </Divider>
            <Row gutter={16}>
                <Col xs={24} md={10}>
                    {points.map((p, idx) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <Row gutter={8} align="middle" className="mb-2" key={idx}>
                            <Col flex="1 1 0">
                                <Select
                                    value={p.year}
                                    options={yearOptions(project.startYear, project.endYear)}
                                    onChange={(v) => updatePoint(idx, 'year', v)}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col flex="1 1 0">
                                <InputNumber
                                    value={p.pct}
                                    min={0}
                                    max={100}
                                    formatter={(v) => `${v}%`}
                                    parser={(v) => v.replace('%', '')}
                                    onChange={(v) => updatePoint(idx, 'pct', v)}
                                    style={{ width: '100%' }}
                                />
                            </Col>
                            <Col flex="0 0 auto">
                                <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removePoint(idx)} aria-label="Remover ponto" />
                            </Col>
                        </Row>
                    ))}
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addPoint}>
                        Adicionar ponto
                    </Button>
                    <div className="text-[11px] text-gray-400 mt-2">
                        Interpolação linear; 0% antes do início; constante após o último ponto.
                    </div>
                </Col>
                <Col xs={24} md={14}>
                    <CoverageCurveChart project={project} baseYear={ctx.baseYear} endYear={ctx.endYear} />
                </Col>
            </Row>

            {/* Quantificação financeira (POR PROJETO) — alimenta o custo do MACC */}
            <Divider className="my-4" orientation="left" orientationMargin={0}>
                <span className="text-[12px] text-gray-500">
                    Quantificação financeira do projeto <Tag className="rounded-full ml-1">CAPEX · OPEX · receitas · economias</Tag>
                </span>
            </Divider>
            <Row gutter={[12, 12]}>
                <Col xs={12} md={8} lg={4}>
                    <span className={labelCls}>CAPEX</span>
                    <InputNumber value={finance.capex} min={0} onChange={(v) => setFinance({ capex: Number(v) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={8} lg={4}>
                    <span className={labelCls}>OPEX (a.a.)</span>
                    <InputNumber value={finance.opex} min={0} onChange={(v) => setFinance({ opex: Number(v) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={8} lg={4}>
                    <span className={labelCls}>Receitas</span>
                    <InputNumber value={finance.revenues} min={0} onChange={(v) => setFinance({ revenues: Number(v) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={8} lg={4}>
                    <span className={labelCls}>Economias</span>
                    <InputNumber value={finance.savings} min={0} onChange={(v) => setFinance({ savings: Number(v) || 0 })} style={{ width: '100%' }} />
                </Col>
                <Col xs={12} md={8} lg={4}>
                    <span className={labelCls}>Moeda</span>
                    <Input value={finance.currency || 'BRL'} onChange={(e) => setFinance({ currency: e.target.value })} />
                </Col>
                <Col xs={12} md={8} lg={4}>
                    <span className={labelCls}>Vida útil (anos)</span>
                    <InputNumber value={finance.lifetimeYears} min={1} onChange={(v) => setFinance({ lifetimeYears: Number(v) || 1 })} style={{ width: '100%' }} />
                </Col>
            </Row>

            {/* Abatimento resultante */}
            <Divider className="my-4" orientation="left" orientationMargin={0}>
                <span className="text-[12px] text-gray-500">
                    Abatimento resultante <Tag color="blue" className="rounded-full ml-1">grupo × abrangência × eficácia</Tag>
                </span>
            </Divider>
            <Row gutter={[12, 12]} className="mb-3">
                <Col xs={12} lg={6}>
                    <StatCard title={`Abrangência ${targetYear}`} value={`${coverageInYear(project, targetYear).toFixed(0)}%`} unit="" />
                </Col>
                <Col xs={12} lg={6}>
                    <StatCard title={`Abatimento ${targetYear}`} value={fmt(abatementTarget)} unit="tCO2e" tooltipInfo={`Grupo ${fmt(groupTarget)} tCO2e no ano-meta.`} />
                </Col>
                <Col xs={12} lg={6}>
                    <StatCard title="Custo líquido (horizonte)" value={money(financeSummary.custoLiquido, financeSummary.currency)} unit="" tooltipInfo="CAPEX + OPEX×vida − receitas − economias (placeholder)." />
                </Col>
                <Col xs={12} lg={6}>
                    <StatCard title="Custo por tCO2e" value={money(Math.round(financeSummary.custoPorTon), financeSummary.currency)} unit="/tCO2e" tooltipInfo="Custo líquido ÷ abatimento acumulado (placeholder MACC)." />
                </Col>
            </Row>
            <AbatementPreviewChart project={project} initiative={initiative} ctx={ctx} />

            <InitiativeMemorialModal open={memorialOpen} initiative={initiative} onClose={() => setMemorialOpen(false)} />
        </div>
    );
}

ProjectEditor.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    project: PropTypes.object.isRequired,
    initiatives: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    activities: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    // eslint-disable-next-line react/forbid-prop-types
    ctx: PropTypes.object.isRequired,
    targetYear: PropTypes.number.isRequired,
    onPatch: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
};

export default ProjectEditor;
