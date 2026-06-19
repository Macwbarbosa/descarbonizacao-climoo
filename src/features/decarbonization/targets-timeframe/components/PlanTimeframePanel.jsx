import React, { useMemo } from 'react';
import { Select, Checkbox, Alert, Row, Col, Divider } from 'antd';
import { Card } from '@/shared/components/ui/Card';
import usePlanTargetsStore from '../store/usePlanTargetsStore';
import { validatePlan, NET_ZERO_MAX_YEAR } from '../utils/planValidation';
import PlanTimeline from './PlanTimeline';

const range = (from, to) => {
    const years = [];
    for (let y = from; y <= to; y += 1) years.push({ value: y, label: String(y) });
    return years;
};

const fieldLabelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';
const noteCls = 'text-[11px] text-gray-500 mt-1.5';

/**
 * Bloco 1 — Período do plano (eixo temporal compartilhado) + linha do tempo.
 * Ano de submissão e near-term ficam por meta; o net-zero aqui é o HORIZONTE
 * (teto temporal do plano).
 */
function PlanTimeframePanel() {
    const params = usePlanTargetsStore((s) => s.params);
    const setParam = usePlanTargetsStore((s) => s.setParam);
    const { baseYear, recentYear, netZeroYear, inventoryDone } = params;

    const validation = useMemo(() => validatePlan(params), [params]);

    const handleBaseYearChange = (value) => {
        setParam('baseYear', value);
        if (recentYear < value) setParam('recentYear', value);
    };

    return (
        <Card className="mb-4">
            <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-base font-semibold text-[#210856]">Período do plano</h3>
                <span className="text-[11px] text-gray-500">
                    eixo temporal compartilhado — vale para BAU, metas e cenários
                </span>
            </div>
            <Divider className="my-3" />

            <Row gutter={[16, 16]}>
                <Col xs={24} sm={12} lg={8}>
                    <span className={fieldLabelCls}>Ano-base</span>
                    <Select value={baseYear} onChange={handleBaseYearChange} options={range(2015, Math.max(2030, baseYear))} style={{ width: '100%' }} />
                    <div className={noteCls}>Inventário GEE completo e verificado.</div>
                    <Checkbox className="mt-2.5 text-xs" checked={inventoryDone} onChange={(e) => setParam('inventoryDone', e.target.checked)}>
                        Inventário do ano-base concluído
                    </Checkbox>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <span className={fieldLabelCls}>Ano mais recente (dados)</span>
                    <Select value={recentYear} onChange={(v) => setParam('recentYear', v)} options={range(baseYear, Math.max(2030, recentYear))} style={{ width: '100%' }} />
                    <div className={noteCls}>Último ano com inventário (pode ser igual ao ano-base).</div>
                </Col>

                <Col xs={24} sm={12} lg={8}>
                    <span className={fieldLabelCls}>Horizonte do plano (net-zero)</span>
                    <Select value={netZeroYear} onChange={(v) => setParam('netZeroYear', v)} options={range(2040, NET_ZERO_MAX_YEAR)} style={{ width: '100%' }} />
                    <div className={noteCls}>Teto temporal do plano (até {NET_ZERO_MAX_YEAR}). O alvo de longo prazo é definido por meta.</div>
                </Col>
            </Row>

            <Alert
                className="mt-4"
                type={validation.ok ? 'success' : 'warning'}
                showIcon
                message={
                    validation.ok
                        ? `Período válido — base ${baseYear}, mais recente ${recentYear}, horizonte ${netZeroYear}.`
                        : validation.errors.join(' · ')
                }
            />

            <Divider className="my-4" />
            <div className="text-[11px] uppercase tracking-wide text-gray-500 mb-2 font-semibold">Linha do tempo</div>
            <PlanTimeline baseYear={baseYear} recentYear={recentYear} netZeroYear={netZeroYear} />
        </Card>
    );
}

export default PlanTimeframePanel;
