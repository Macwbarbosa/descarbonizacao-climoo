import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Input, InputNumber, Select, Segmented, Checkbox, Button, Row, Col, Alert, Divider, Empty } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import {
    AMBITION_OPTIONS,
    TARGET_TYPE_OPTIONS,
    COMBINED_REDUCTION_OPTIONS,
    SCOPE_KEYS,
    SCOPE3_MIN_COVERAGE_PCT,
    ENGAGEMENT_HORIZON_YEARS,
    isEngagementType,
    isCombinedType,
    isFlagType,
    isIntensityType,
    reductionTypeOf,
} from '../services/sbtiTargetService';
import TargetResultPanel from './TargetResultPanel';
import EngagementResultPanel from './EngagementResultPanel';
import EngagementPartnersEditor from './EngagementPartnersEditor';
import MetaCoverageTree from './MetaCoverageTree';
import { metaScopeLabels } from '../../shared/metaScopes';

const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';
const SCOPE_NAME = { scope1: 'Escopo 1', scope2: 'Escopo 2', scope3: 'Escopo 3' };
const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

/**
 * Editor de UMA meta: escopos, tipo, denominador (se intensidade), engajamento
 * (fornecedores/clientes), ambição, horizonte e a meta resultante. Recálculo ao
 * vivo. Suporta metas de Escopo 3: intensidade física/monetária, engajamento e
 * combinada (redução + engajamento, cobertura conjunta ≥ 67%).
 */
function MetaEditor({ meta, params, baselineByScope, baseActivities, drivers, target, issues, onPatch, onRemove }) {
    const scope3Total = baselineByScope.scope3 || 0;

    const engagement = isEngagementType(meta.type);
    const combined = isCombinedType(meta.type);
    const flag = isFlagType(meta.type);
    const reductionType = reductionTypeOf(meta);
    const intensity = isIntensityType(reductionType); // parte de redução usa denominador?
    const flagTotalPct = (Number(meta.flagReductionPct) || 0) + (Number(meta.flagRemovalPct) || 0);

    // Atividades do ano-base dentro dos escopos cobertos — universo da cobertura (parte de redução).
    const coverageActivities = useMemo(() => {
        const scopes = metaScopeLabels(meta);
        return (baseActivities || []).filter((a) => scopes.includes(a.scope));
    }, [baseActivities, meta]);

    // Categorias do Escopo 3 presentes no inventário do ano-base (para os parceiros).
    const scope3CategoryOptions = useMemo(() => {
        const cats = new Set();
        (baseActivities || []).forEach((a) => {
            if (a.scope === 'Escopo 3' && a.category) cats.add(a.category);
        });
        return [...cats].sort().map((c) => ({ value: c, label: c }));
    }, [baseActivities]);

    const submissionYear = meta.submissionYear ?? new Date().getFullYear();
    const yearOptions = (from, to) => {
        const out = [];
        for (let y = from; y <= to; y += 1) out.push({ value: y, label: String(y) });
        return out;
    };

    const driverOptions = drivers.map((d) => ({ value: d.id, label: `${d.name}${d.unit ? ` (${d.unit})` : ''}` }));
    const denominatorDriver = drivers.find((d) => d.id === meta.denominatorDriverId);
    const ambitionLabel = AMBITION_OPTIONS.find((o) => o.value === meta.ambition)?.label || '';
    const typeLabel = TARGET_TYPE_OPTIONS.find((o) => o.value === meta.type)?.label || '';
    const scopesLabel = SCOPE_KEYS.filter((k) => meta.scopes[k]).map((k) => `E${k.slice(-1)}`).join('+');

    const toggleScope = (k) => {
        const scopes = { ...meta.scopes, [k]: !meta.scopes[k] };
        const validScopes = metaScopeLabels({ scopes });
        const validIds = new Set((baseActivities || []).filter((a) => validScopes.includes(a.scope)).map((a) => a.id));
        const excludedActivityIds = (meta.excludedActivityIds || []).filter((id) => validIds.has(id));
        onPatch({ scopes, excludedActivityIds });
    };

    // Troca de tipo: engajamento e combinada são metas de Escopo 3; engajamento
    // trava o horizonte em submissão + 5 anos.
    const onTypeChange = (v) => {
        const patch = { type: v };
        if (v === 'engajamento' || v === 'combinada') {
            patch.scopes = { scope1: false, scope2: false, scope3: true };
            const validIds = new Set((baseActivities || []).filter((a) => a.scope === 'Escopo 3').map((a) => a.id));
            patch.excludedActivityIds = (meta.excludedActivityIds || []).filter((id) => validIds.has(id));
        }
        if (v === 'engajamento') patch.nearTermYear = submissionYear + ENGAGEMENT_HORIZON_YEARS;
        onPatch(patch);
    };

    const onSubmissionChange = (v) => {
        const patch = { submissionYear: v };
        if (engagement) patch.nearTermYear = v + ENGAGEMENT_HORIZON_YEARS;
        else if (meta.nearTermYear < v + 5) patch.nearTermYear = v + 5;
        else if (meta.nearTermYear > v + 10) patch.nearTermYear = v + 10;
        onPatch(patch);
    };

    const setPartners = (partners) => onPatch({ engagement: { ...(meta.engagement || {}), partners } });

    // Bloco de ambição / submissão / horizonte (vem no início da meta).
    const horizonBlock = engagement ? (
        <Row gutter={[12, 12]}>
            <Col xs={12} lg={4}>
                <span className={labelCls}>Ano de submissão</span>
                <Select
                    value={submissionYear}
                    options={yearOptions(2020, new Date().getFullYear() + 3)}
                    onChange={onSubmissionChange}
                    style={{ width: '100%' }}
                />
            </Col>
            <Col xs={12} lg={6}>
                <span className={labelCls}>Ano-alvo (fixo)</span>
                <Input value={submissionYear + ENGAGEMENT_HORIZON_YEARS} disabled />
                <div className="text-[11px] text-gray-400 mt-1">
                    Engajamento: {ENGAGEMENT_HORIZON_YEARS} anos a partir da submissão.
                </div>
            </Col>
        </Row>
    ) : (
        <Row gutter={[12, 12]}>
            {!flag && (
                <Col xs={24} lg={8}>
                    <span className={labelCls}>Ambição</span>
                    <div>
                        <Segmented
                            value={meta.ambition}
                            options={AMBITION_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                            onChange={(v) => onPatch({ ambition: v })}
                        />
                    </div>
                </Col>
            )}
            <Col xs={12} lg={4}>
                <span className={labelCls}>Ano de submissão</span>
                <Select
                    value={submissionYear}
                    options={yearOptions(2020, new Date().getFullYear() + 3)}
                    onChange={onSubmissionChange}
                    style={{ width: '100%' }}
                />
            </Col>
            <Col xs={12} lg={6}>
                <span className={labelCls}>Near-term</span>
                <Select
                    value={meta.nearTermYear}
                    options={yearOptions(submissionYear + 5, submissionYear + 10)}
                    onChange={(v) => onPatch({ nearTermYear: v })}
                    style={{ width: '100%' }}
                />
                <div className="text-[11px] text-gray-400 mt-1">5–10 anos da submissão ({submissionYear}).</div>
            </Col>
            <Col xs={12} lg={6}>
                <span className={labelCls}>Long-term (net-zero) · opcional</span>
                <div className="flex items-center gap-2">
                    <Checkbox
                        checked={meta.netZeroYear != null}
                        onChange={(e) => onPatch({ netZeroYear: e.target.checked ? params.netZeroYear : null })}
                    />
                    <Select
                        value={meta.netZeroYear || undefined}
                        disabled={meta.netZeroYear == null}
                        options={yearOptions(meta.nearTermYear + 1, params.netZeroYear)}
                        onChange={(v) => onPatch({ netZeroYear: v })}
                        placeholder="sem long-term"
                        style={{ flex: 1 }}
                    />
                </div>
            </Col>
        </Row>
    );

    return (
        <div>
            {/* Nome + remover */}
            <Row gutter={[12, 12]} align="bottom">
                <Col flex="1 1 auto">
                    <span className={labelCls}>Nome da meta (rótulo automático editável)</span>
                    <Input value={meta.name} onChange={(e) => onPatch({ name: e.target.value })} />
                </Col>
                <Col flex="0 0 auto">
                    <Button danger icon={<DeleteOutlined />} onClick={() => onRemove(meta.id)}>
                        Remover
                    </Button>
                </Col>
            </Row>

            {/* Ambição / submissão / horizonte (início) */}
            <div className="mt-4">{horizonBlock}</div>

            {/* Escopos cobertos */}
            <div className="mt-4">
                <span className={labelCls}>Escopos cobertos</span>
                {(engagement || combined) && (
                    <div className="text-[11px] text-[#9354e0] mb-2">
                        {engagement ? 'Meta de engajamento' : 'Meta combinada'} — aplicada ao Escopo 3.
                    </div>
                )}
                <Row gutter={[8, 8]}>
                    {SCOPE_KEYS.map((k) => {
                        const lockScope = (engagement || combined) && k !== 'scope3';
                        return (
                            <Col xs={24} md={8} key={k}>
                                <button
                                    type="button"
                                    onClick={() => !lockScope && toggleScope(k)}
                                    disabled={lockScope}
                                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                                        meta.scopes[k] ? 'border-[#210856] bg-[#210856]/5' : 'border-gray-200'
                                    } ${lockScope ? 'opacity-40 cursor-not-allowed' : ''}`}
                                >
                                    <Checkbox
                                        checked={meta.scopes[k]}
                                        disabled={lockScope}
                                        onChange={() => !lockScope && toggleScope(k)}
                                    >
                                        <b className="text-sm">{SCOPE_NAME[k]}</b>
                                    </Checkbox>
                                </button>
                            </Col>
                        );
                    })}
                </Row>
            </div>

            {/* Tipo + (sub-tipo de redução da combinada) + denominador */}
            <Row gutter={[12, 12]} className="mt-4">
                <Col xs={24} lg={combined || intensity ? 8 : 24}>
                    <span className={labelCls}>Tipo de meta</span>
                    <Select
                        value={meta.type}
                        options={TARGET_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={onTypeChange}
                        style={{ width: '100%' }}
                    />
                </Col>
                {combined && (
                    <Col xs={24} lg={8}>
                        <span className={labelCls}>Tipo da parte de redução</span>
                        <Select
                            value={meta.combinedReductionType || 'absoluta'}
                            options={COMBINED_REDUCTION_OPTIONS}
                            onChange={(v) => onPatch({ combinedReductionType: v })}
                            style={{ width: '100%' }}
                        />
                    </Col>
                )}
                {intensity && (
                    <Col xs={24} lg={combined ? 8 : 12}>
                        <span className={labelCls}>Denominador (variável de crescimento — Etapa 3)</span>
                        {driverOptions.length > 0 ? (
                            <Select
                                value={meta.denominatorDriverId || undefined}
                                options={driverOptions}
                                onChange={(v) => onPatch({ denominatorDriverId: v })}
                                placeholder="Selecione o denominador"
                                style={{ width: '100%' }}
                            />
                        ) : (
                            <Alert type="warning" showIcon message="Nenhuma variável de crescimento cadastrada na Etapa 3." />
                        )}
                    </Col>
                )}
            </Row>

            {/* FLAG: meta de redução + meta de remoção (informadas manualmente) */}
            {flag && (
                <div className="mt-4 rounded-lg border border-[#e4d9fb] bg-[#faf8ff] p-3">
                    <div className="text-[11px] text-gray-500 mb-2">
                        Meta FLAG (Florestas, Terra e Agricultura): informe a meta de redução e a de remoção; a
                        meta geral FLAG é a soma das duas.
                    </div>
                    <Row gutter={[12, 12]} align="bottom">
                        <Col xs={12} lg={8}>
                            <span className={labelCls}>Meta de redução (%)</span>
                            <InputNumber
                                value={meta.flagReductionPct ?? 0}
                                min={0}
                                max={100}
                                step={0.5}
                                className="w-full"
                                addonAfter="%"
                                onChange={(v) => onPatch({ flagReductionPct: v ?? 0 })}
                            />
                        </Col>
                        <Col xs={12} lg={8}>
                            <span className={labelCls}>Meta de remoção (%)</span>
                            <InputNumber
                                value={meta.flagRemovalPct ?? 0}
                                min={0}
                                max={100}
                                step={0.5}
                                className="w-full"
                                addonAfter="%"
                                onChange={(v) => onPatch({ flagRemovalPct: v ?? 0 })}
                            />
                        </Col>
                        <Col xs={24} lg={8}>
                            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-1">Meta geral FLAG</div>
                            <div className="text-lg font-bold text-[#210856] tabular-nums">
                                {flagTotalPct.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%
                            </div>
                            <div className="text-[11px] text-gray-400">redução + remoção</div>
                        </Col>
                    </Row>
                </div>
            )}

            {/* Cobertura da meta (atividades) — parte de redução (não em engajamento puro) */}
            {!engagement && (
                <div className="mt-4">
                    <span className={labelCls}>Cobertura da meta (atividades incluídas)</span>
                    <div className="text-[11px] text-gray-400 mb-2">
                        Por padrão 100% das atividades dos escopos cobertos. Desmarque para desconsiderar
                        atividades ou categorias inteiras — a baseline e a trajetória se ajustam.
                    </div>
                    <MetaCoverageTree
                        activities={coverageActivities}
                        excludedIds={meta.excludedActivityIds || []}
                        onChange={(excludedActivityIds) => onPatch({ excludedActivityIds })}
                    />
                </div>
            )}

            {/* Engajamento: fornecedores/clientes (engajamento puro e combinada) */}
            {(engagement || combined) && (
                <div className="mt-4 rounded-lg border border-[#e4d9fb] bg-[#faf8ff] p-3">
                    <div className="text-[11px] text-gray-500 mb-2">
                        {combined
                            ? 'Parte de engajamento — a emissão de cada parceiro é descontada da sua categoria na cobertura de redução acima (evita dupla contagem) e somada à cobertura conjunta.'
                            : 'Emissões cobertas pela meta = soma das emissões dos fornecedores/clientes engajados.'}
                    </div>
                    <EngagementPartnersEditor
                        partners={meta.engagement?.partners || []}
                        scope3Total={scope3Total}
                        categoryOptions={scope3CategoryOptions}
                        onChange={setPartners}
                    />
                </div>
            )}

            {meta.type === 'sda_setorial' && (
                <Alert
                    className="mt-3"
                    type="warning"
                    showIcon
                    message="Setorial (SDA) ainda não implementado — usando Contração Absoluta (ACA) como aproximação. Suporte a pathways setoriais é a fase 2."
                />
            )}

            {/* Cobertura conjunta (combinada) */}
            {combined && target && (
                <Alert
                    className="mt-4"
                    type={target.meets67 ? 'success' : 'warning'}
                    showIcon
                    message={
                        <span>
                            Cobertura conjunta = redução {fmt(target.reductionCoveredScope3)}
                            {target.engagementDeducted > 0 && (
                                <> (já descontados {fmt(target.engagementDeducted)} de engajamento por categoria)</>
                            )}{' '}
                            + engajamento {fmt(target.engagementEmissions)} tCO2e ={' '}
                            <b>{Number(target.combinedCoveragePct || 0).toFixed(0)}%</b> do Escopo 3 (
                            {fmt(target.scope3Total)} tCO2e).{' '}
                            {target.meets67
                                ? `Atende ao mínimo de ${SCOPE3_MIN_COVERAGE_PCT}%.`
                                : `Abaixo do mínimo de ${SCOPE3_MIN_COVERAGE_PCT}% exigido para meta combinada.`}
                        </span>
                    }
                />
            )}

            {/* Avisos da meta */}
            {issues.length > 0 && <Alert className="mt-4" type="warning" showIcon message={issues.join(' · ')} />}

            <Divider className="my-4" />

            {/* Meta resultante */}
            {engagement ? (
                target ? (
                    <EngagementResultPanel target={target} />
                ) : (
                    <Empty description="Cadastre os fornecedores/clientes para derivar a meta de engajamento." />
                )
            ) : target ? (
                <TargetResultPanel
                    target={target}
                    meta={meta}
                    params={params}
                    scopesLabel={scopesLabel}
                    ambitionLabel={ambitionLabel}
                    typeLabel={typeLabel}
                    denominatorUnit={denominatorDriver?.unit || ''}
                />
            ) : (
                <Empty description="Selecione ao menos um escopo para derivar a meta." />
            )}
        </div>
    );
}

MetaEditor.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    meta: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    params: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    baselineByScope: PropTypes.object.isRequired,
    baseActivities: PropTypes.arrayOf(PropTypes.object), // eslint-disable-line react/forbid-prop-types
    // eslint-disable-next-line react/forbid-prop-types
    drivers: PropTypes.arrayOf(PropTypes.object).isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    target: PropTypes.object,
    issues: PropTypes.arrayOf(PropTypes.string).isRequired,
    onPatch: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
};

MetaEditor.defaultProps = {
    target: null,
    baseActivities: [],
};

export default MetaEditor;
