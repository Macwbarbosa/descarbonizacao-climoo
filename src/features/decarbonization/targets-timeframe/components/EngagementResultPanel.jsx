import React from 'react';
import PropTypes from 'prop-types';
import { Tag, Row, Col, Alert } from 'antd';
import { Users, Target, Handshake, CalendarCheck } from '@phosphor-icons/react';
import { StatCard } from '@/shared/components/ui/Card';
import { SCOPE3_MIN_COVERAGE_PCT } from '../services/sbtiTargetService';

const num = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });

/**
 * Resultado de uma meta de ENGAJAMENTO (SBTi supplier/customer engagement):
 * emissões cobertas pelos parceiros, % do Escopo 3 e ano-alvo (submissão + 5).
 * Não gera trajetória de redução do inventário próprio — é um compromisso de
 * engajamento para que os parceiros definam suas próprias metas.
 */
function EngagementResultPanel({ target }) {
    const { engagementEmissions, scope3Total, coveragePct, targetYear, partners, meets67 } = target;
    const fornecedores = partners.filter((p) => p.kind === 'fornecedor').length;
    const clientes = partners.filter((p) => p.kind === 'cliente').length;

    return (
        <div className="mt-4">
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Meta resultante</span>
                <Tag color="blue" className="rounded-full">✦ engajamento · SBTi</Tag>
            </div>

            <div className="rounded-lg bg-[#210856] text-white px-4 py-4">
                <div className="text-[11px] uppercase tracking-wide opacity-70">Resumo da meta de engajamento</div>
                <div className="text-[15px] leading-relaxed mt-1.5">
                    Engajar <b className="text-emerald-300">{partners.length}</b> parceiro(s) —{' '}
                    <b className="text-emerald-300">{fornecedores}</b> fornecedor(es) e{' '}
                    <b className="text-emerald-300">{clientes}</b> cliente(s) — cobrindo{' '}
                    <b className="text-emerald-300">{num(engagementEmissions)} tCO2e</b> (
                    <b className="text-emerald-300">{coveragePct.toFixed(0)}%</b> do Escopo 3) para que definam suas
                    próprias metas até <b className="text-emerald-300">{targetYear}</b> (5 anos a partir da submissão).
                </div>
            </div>

            <Alert
                className="mt-3"
                type={meets67 ? 'success' : 'warning'}
                showIcon
                message={
                    meets67
                        ? `Cobertura de ${coveragePct.toFixed(0)}% do Escopo 3 — atende ao mínimo de ${SCOPE3_MIN_COVERAGE_PCT}%.`
                        : `Cobertura de ${coveragePct.toFixed(0)}% do Escopo 3 — abaixo do mínimo de ${SCOPE3_MIN_COVERAGE_PCT}% recomendado para metas de Escopo 3.`
                }
            />

            <Row gutter={[12, 12]} className="mt-4">
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Handshake size={18} weight="fill" />}
                        title="Emissões cobertas"
                        value={num(engagementEmissions)}
                        unit="tCO2e"
                        tooltipInfo="Soma das emissões associadas aos fornecedores/clientes engajados."
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Target size={18} weight="fill" />}
                        title="Cobertura do Escopo 3"
                        value={`${coveragePct.toFixed(0)}%`}
                        unit={`de ${num(scope3Total)} tCO2e`}
                        tooltipInfo={`Mínimo recomendado: ${SCOPE3_MIN_COVERAGE_PCT}%.`}
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<Users size={18} weight="fill" />}
                        title="Parceiros"
                        value={num(partners.length)}
                        unit={`${fornecedores} forn. · ${clientes} cli.`}
                        tooltipInfo="Fornecedores e clientes que serão engajados."
                    />
                </Col>
                <Col xs={24} sm={12} lg={6}>
                    <StatCard
                        icon={<CalendarCheck size={18} weight="fill" />}
                        title="Ano-alvo"
                        value={String(targetYear)}
                        unit="submissão + 5 anos"
                        tooltipInfo="Metas de engajamento têm horizonte fixo de 5 anos a partir da submissão."
                    />
                </Col>
            </Row>
        </div>
    );
}

EngagementResultPanel.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    target: PropTypes.object.isRequired,
};

export default EngagementResultPanel;
