import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { Input, Select, Segmented, Checkbox, Button, Row, Col, Alert, Divider, Empty } from 'antd';
import { DeleteOutlined } from '@ant-design/icons';
import {
    AMBITION_OPTIONS,
    TARGET_TYPE_OPTIONS,
    needsDenominator,
    SCOPE_KEYS,
} from '../services/sbtiTargetService';
import TargetResultPanel from './TargetResultPanel';

const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';
const SCOPE_NAME = { scope1: 'Escopo 1', scope2: 'Escopo 2', scope3: 'Escopo 3' };
const fmt = (v) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

/**
 * Editor de UMA meta: escopos, tipo, denominador (se intensidade), ambição,
 * horizonte e a meta resultante (resumo + KPIs + trajetória). Recálculo ao vivo.
 */
function MetaEditor({ meta, params, baselineByScope, drivers, target, issues, onPatch, onRemove }) {
    const total = useMemo(
        () => SCOPE_KEYS.reduce((sum, k) => sum + (baselineByScope[k] || 0), 0),
        [baselineByScope]
    );

    const intensity = needsDenominator(meta.type);
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

    const toggleScope = (k) => onPatch({ scopes: { ...meta.scopes, [k]: !meta.scopes[k] } });

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

            {/* Escopos cobertos */}
            <div className="mt-4">
                <span className={labelCls}>Escopos cobertos</span>
                <Row gutter={[8, 8]}>
                    {SCOPE_KEYS.map((k) => {
                        const value = baselineByScope[k] || 0;
                        const share = total > 0 ? (value / total) * 100 : 0;
                        return (
                            <Col xs={24} md={8} key={k}>
                                <button
                                    type="button"
                                    onClick={() => toggleScope(k)}
                                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                                        meta.scopes[k] ? 'border-[#210856] bg-[#210856]/5' : 'border-gray-200'
                                    }`}
                                >
                                    <div className="flex items-center justify-between">
                                        <Checkbox checked={meta.scopes[k]} onChange={() => toggleScope(k)}>
                                            <b className="text-sm">{SCOPE_NAME[k]}</b>
                                        </Checkbox>
                                    </div>
                                    <div className="text-lg font-bold tabular-nums mt-1">{fmt(value)}</div>
                                    <div className="text-[11px] text-gray-500">tCO2e · {share.toFixed(0)}% do total</div>
                                </button>
                            </Col>
                        );
                    })}
                </Row>
            </div>

            {/* Tipo + denominador */}
            <Row gutter={[12, 12]} className="mt-4">
                <Col xs={24} lg={intensity ? 12 : 24}>
                    <span className={labelCls}>Tipo de meta</span>
                    <Select
                        value={meta.type}
                        options={TARGET_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
                        onChange={(v) => onPatch({ type: v })}
                        style={{ width: '100%' }}
                    />
                </Col>
                {intensity && (
                    <Col xs={24} lg={12}>
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
                            <Alert
                                type="warning"
                                showIcon
                                message="Nenhuma variável de crescimento cadastrada na Etapa 3."
                            />
                        )}
                    </Col>
                )}
            </Row>

            {meta.type === 'sda_setorial' && (
                <Alert
                    className="mt-3"
                    type="warning"
                    showIcon
                    message="Setorial (SDA) ainda não implementado — usando Contração Absoluta (ACA) como aproximação. Suporte a pathways setoriais é a fase 2."
                />
            )}

            {/* Ambição + submissão + horizontes */}
            <Row gutter={[12, 12]} className="mt-4">
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
                <Col xs={12} lg={4}>
                    <span className={labelCls}>Ano de submissão</span>
                    <Select
                        value={submissionYear}
                        options={yearOptions(2020, new Date().getFullYear() + 3)}
                        onChange={(v) => {
                            const patch = { submissionYear: v };
                            if (meta.nearTermYear < v + 5) patch.nearTermYear = v + 5;
                            else if (meta.nearTermYear > v + 10) patch.nearTermYear = v + 10;
                            onPatch(patch);
                        }}
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

            {/* Avisos da meta */}
            {issues.length > 0 && (
                <Alert className="mt-4" type="warning" showIcon message={issues.join(' · ')} />
            )}

            <Divider className="my-4" />

            {/* Meta resultante */}
            {target ? (
                <TargetResultPanel
                    target={target}
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
};

export default MetaEditor;
