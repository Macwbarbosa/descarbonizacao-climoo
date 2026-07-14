import React from 'react';
import PropTypes from 'prop-types';
import { Tag, Row, Col, Alert } from 'antd';
import { Stack, TrendDown, Target, Leaf } from '@phosphor-icons/react';
import { StatCard, ChartCard } from '@/shared/components/ui/Card';
import { useAuthStore } from '@/features/auth/shared/store/authStore';
import { reductionCommitmentText, engagementCommitmentText, flagCommitmentText } from '../services/sbtiTargetService';
import TargetTrajectoryChart from './TargetTrajectoryChart';

const num = (v, dec = 0) => Number(v).toLocaleString('pt-BR', { maximumFractionDigits: dec });
const pct = (v) => `${Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}%`;

/**
 * Seção "Meta resultante" de UMA meta (derivada pela regra SBTi v2.5):
 * resumo em linguagem natural + KPIs + gráfico da trajetória daquela meta.
 * Suporta metas absolutas (tCO2e) e de intensidade (tCO2e/unidade).
 */
function TargetResultPanel({ target, meta, params, scopesLabel, ambitionLabel, typeLabel, denominatorUnit }) {
    const { baseYear, recentYear } = params;
    const companyName = useAuthStore((s) => s.user?.selectedCompany?.company) || 'A empresa';
    const {
        unidade,
        baseCoberta,
        taxaAnual,
        reducaoNearTermPct,
        reducaoNetZeroPct,
        valorBase,
        valorNearTerm,
        valorNetZero,
        hasNetZero,
        trajetoria,
        denominadorAusente,
        larrFloorPct,
        pisoAtivo,
    } = target;

    const isIntensity = unidade === 'intensidade';
    const unitLabel = isIntensity ? `tCO2e/${denominatorUnit || 'un.'}` : 'tCO2e';
    const nearTermYear = trajetoria.find((p) => p.tipo === 'near-term')?.ano;
    const netZeroYear = trajetoria.find((p) => p.tipo === 'net-zero')?.ano;

    if (denominadorAusente) {
        return (
            <Alert
                className="mt-3"
                type="warning"
                showIcon
                message="Selecione um denominador (variável de crescimento da Etapa 3) para derivar a meta de intensidade."
            />
        );
    }

    const reductionText =
        target.kind === 'flag'
            ? flagCommitmentText({ companyName, meta, target, baseYear })
            : reductionCommitmentText({ companyName, meta, target, baseYear, denominatorUnit });
    const engagementText =
        target.kind === 'combined' ? engagementCommitmentText({ companyName, target, standalone: false }) : null;
    const summary = (
        <>
            {reductionText}
            {engagementText ? <> {engagementText}</> : null}
        </>
    );

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Meta resultante
                </span>
                <Tag color="blue" className="rounded-full">
                    ✦ derivada · SBTi tool v2.5
                </Tag>
            </div>

            <div className="rounded-lg bg-[#210856] text-white px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide opacity-70">
                    Resumo da meta (gerado pela regra SBTi v2.5)
                </div>
                <div className="text-[15px] leading-relaxed mt-1.5">{summary}</div>
            </div>

            {!isIntensity && target.kind !== 'flag' && (
                <Alert
                    className="mt-3"
                    type="info"
                    showIcon
                    message={
                        pisoAtivo
                            ? `Pela regra SBTi (ACA), a trajetória de net-zero exigiria menos que o piso da ambição: aplica-se o piso de ${num(larrFloorPct, 2)}%/ano → taxa efetiva ${num(taxaAnual, 2)}%/ano.`
                            : `Taxa derivada da trajetória de net-zero por escopo (E1 90% · E2 100% · E3 90%/75%), ponderada pelo inventário: ${num(taxaAnual, 2)}%/ano (acima do piso de ${num(larrFloorPct, 2)}%/ano). A % de redução varia com o mix de escopos.`
                    }
                />
            )}

            <Row gutter={[12, 12]} className="mt-4">
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Stack size={18} weight="fill" />}
                        title="Base coberta"
                        value={num(baseCoberta)}
                        unit="tCO2e"
                        tooltipInfo={`Soma das atividades selecionadas em "Cobertura da meta" no ano-base (${baseYear}).`}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<TrendDown size={18} weight="fill" />}
                        title="Taxa anual (SBTi)"
                        value={`-${num(taxaAnual, 2)}%`}
                        unit="a.a."
                        tooltipInfo="Taxa de redução anual derivada da ambição (regra v2.5)."
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Target size={18} weight="fill" />}
                        title={`Meta ${nearTermYear} (-${pct(reducaoNearTermPct)})`}
                        value={num(valorNearTerm, isIntensity ? 2 : 0)}
                        unit={unitLabel}
                        tooltipInfo={`Redução de ${pct(reducaoNearTermPct)} sobre a base.`}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Leaf size={18} weight="fill" />}
                        title={hasNetZero ? `Net-zero ${netZeroYear} (-${pct(reducaoNetZeroPct)})` : 'Net-zero'}
                        value={hasNetZero ? num(valorNetZero, isIntensity ? 2 : 0) : '—'}
                        unit={hasNetZero ? unitLabel : ''}
                        tooltipInfo={hasNetZero ? 'Residual de ~10% neutralizado.' : 'Sem horizonte de longo prazo nesta meta.'}
                    />
                </Col>
            </Row>

            <div className="mt-4">
                <ChartCard
                    title="Trajetória-alvo SBTi"
                    subtitle="Trajetória desta meta — exposta por meta para a tela de Cenários."
                    chart={
                        <TargetTrajectoryChart
                            trajetoria={trajetoria}
                            baseValue={valorBase}
                            residualValue={hasNetZero ? valorNetZero : null}
                            milestoneYears={[baseYear, nearTermYear, netZeroYear].filter(Boolean)}
                            unitLabel={unitLabel}
                        />
                    }
                />
            </div>
        </div>
    );
}

TargetResultPanel.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    target: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    meta: PropTypes.object.isRequired,
    params: PropTypes.shape({
        baseYear: PropTypes.number,
        recentYear: PropTypes.number,
    }).isRequired,
    scopesLabel: PropTypes.string.isRequired,
    ambitionLabel: PropTypes.string.isRequired,
    typeLabel: PropTypes.string.isRequired,
    denominatorUnit: PropTypes.string,
};

TargetResultPanel.defaultProps = {
    denominatorUnit: '',
};

export default TargetResultPanel;
