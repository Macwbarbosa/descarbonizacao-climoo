import React, { useEffect, useRef } from 'react';
import { Modal, Typography, Row, Col, Card, Statistic } from 'antd';
import { Line } from '@antv/g2plot';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';

const { Title, Text } = Typography;

function EmissionProjectionModal({ visible, onClose, emissionItem }) {
    const { i18n } = useTranslation();
    const chartRef = useRef(null);
    const chartInstance = useRef(null);

    const store = useDecarbonizationSettingsStore();
    const { projections = [] } = store;

    // Função para formatar números grandes de forma compacta
    const formatCompactNumber = (value) => {
        if (!value && value !== 0) return '0';

        const language = i18n.language || 'pt-br';
        const numValue = Number(value);

        if (Number.isNaN(numValue)) return '0';

        // Para valores muito grandes, usar notação compacta
        if (Math.abs(numValue) >= 1000000) {
            if (language.startsWith('en')) {
                return numValue.toLocaleString('en-US', {
                    notation: 'compact',
                    compactDisplay: 'short',
                    maximumFractionDigits: 1
                });
            }

            // Para português, implementar notação compacta manual
            if (Math.abs(numValue) >= 1000000000) {
                return `${(numValue / 1000000000).toFixed(1).replace('.', ',')}B`;
            }
            if (Math.abs(numValue) >= 1000000) {
                return `${(numValue / 1000000).toFixed(1).replace('.', ',')}M`;
            }
        }

        // Para valores menores, usar formatação normal
        if (language.startsWith('en')) {
            return numValue.toLocaleString('en-US', {
                maximumFractionDigits: 2
            });
        }

        return numValue.toLocaleString('pt-BR', {
            maximumFractionDigits: 2
        });
    };

    // Garantir que projections seja array
    const safeProjections = Array.isArray(projections) ? projections : [];

    // Encontrar o parâmetro de ancoragem
    const anchorageParam = safeProjections.find(p => p.id === emissionItem?.anchorage);

    // Calcular variação percentual entre dois valores
    const calculateVariation = (currentValue, previousValue) => {
        if (previousValue === 0) {
            if (currentValue === 0) return 0;
            return 100; // Se valor anterior for 0 e atual > 0, retornar 100% de crescimento
        }
        return ((currentValue - previousValue) / previousValue) * 100;
    };

    // Calcular dados do gráfico
    const calculateProjectionData = () => {
        if (!emissionItem || !anchorageParam) return [];

        // Obter anos dinamicamente baseados nas metas de redução (mesma lógica do Passo 2)
        const { reductionGoals = [] } = store;
        const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

        const getYears = () => {
            if (safeReductionGoals.length === 0) {
                // Se não há metas, usar período padrão 2025-2035
                const yearsList = [];
                for (let year = 2025; year <= 2035; year += 1) {
                    yearsList.push(year);
                }
                return yearsList;
            }

            // Encontrar menor ano base e maior ano meta das metas de redução
            const baseYears = safeReductionGoals.map(goal =>
                goal.baseline_year || goal.baseYear || 2025
            );
            const targetYears = safeReductionGoals.map(goal =>
                goal.target_year || goal.targetYear || 2035
            );

            const minBaseYear = Math.min(...baseYears);
            const maxTargetYear = Math.max(...targetYears);

            const yearsList = [];
            for (let year = minBaseYear; year <= maxTargetYear; year += 1) {
                yearsList.push(year);
            }
            return yearsList;
        };

        const years = getYears();

        const baseEmission = emissionItem.emission || 0;
        const data = [];
        let currentValue = baseEmission;

        // Primeiro ano (ano base)
        data.push({
            year: years[0].toString(),
            value: currentValue,
            emission: currentValue
        });

        // Anos subsequentes (usando os percentuais de variação calculados)
        for (let i = 1; i < years.length; i += 1) {
            const currentYear = years[i];
            const previousYear = years[i - 1];

            // Obter valores dos parâmetros para o ano atual e anterior
            const currentParamValue = anchorageParam.values[currentYear] || 0;
            const previousParamValue = anchorageParam.values[previousYear] || 0;

            // Calcular a variação percentual do parâmetro
            const paramVariation = calculateVariation(currentParamValue, previousParamValue);

            // Aplicar a variação percentual sobre o valor de emissão anterior
            currentValue *= (1 + paramVariation / 100);

            data.push({
                year: currentYear.toString(),
                value: currentValue,
                emission: currentValue
            });
        }

        return data;
    };

    const projectionData = calculateProjectionData();

    // Limpar gráfico quando modal fecha
    useEffect(() => {
        if (!visible && chartInstance.current) {
            chartInstance.current.destroy();
            chartInstance.current = null;
        }
    }, [visible]);

    // Inicializar gráfico quando modal abre
    useEffect(() => {
        if (!visible || !emissionItem || !projectionData.length || !chartRef.current) {
            return;
        }

        setTimeout(() => {
            if (!chartRef.current) return;

            try {
                // Destruir gráfico anterior se existir
                if (chartInstance.current) {
                    chartInstance.current.destroy();
                }

                // Criar novo gráfico
                chartInstance.current = new Line(chartRef.current, {
                    data: projectionData,
                    xField: 'year',
                    yField: 'value',
                    height: 260,
                    padding: [20, 20, 50, 70],
                    point: {
                        size: 8,
                        shape: 'circle',
                        style: {
                            fill: '#1890ff',
                            stroke: '#ffffff',
                            lineWidth: 2,
                        },
                    },
                    lineStyle: {
                        stroke: '#1890ff',
                        lineWidth: 3,
                    },
                    xAxis: {
                        position: 'bottom',
                        title: {
                            text: 'Ano',
                            style: {
                                fontSize: 14,
                                fontWeight: 'bold',
                                fill: '#333',
                            },
                        },
                        label: {
                            style: {
                                fontSize: 12,
                                fill: '#666',
                            },
                        },
                        line: {
                            style: {
                                stroke: '#333',
                                lineWidth: 1,
                            },
                        },
                        tickLine: {
                            style: {
                                stroke: '#333',
                                lineWidth: 1,
                            },
                        },
                    },
                    yAxis: {
                        position: 'left',
                        title: {
                            text: 'Emissão (tCO2e)',
                            style: {
                                fontSize: 14,
                                fontWeight: 'bold',
                                fill: '#333',
                            },
                        },
                        label: {
                            formatter: (value) => `${parseFloat(value).toFixed(1)}`,
                            style: {
                                fontSize: 12,
                                fill: '#666',
                            },
                        },
                        grid: {
                            line: {
                                style: {
                                    stroke: '#f0f0f0',
                                    lineWidth: 1,
                                    lineDash: [3, 3],
                                },
                            },
                        },
                        line: {
                            style: {
                                stroke: '#333',
                                lineWidth: 1,
                            },
                        },
                        tickLine: {
                            style: {
                                stroke: '#333',
                                lineWidth: 1,
                            },
                        },
                    },
                    tooltip: {
                        formatter: (datum) => ({
                            name: 'Emissão',
                            value: `${parseFloat(datum.value).toFixed(2)} tCO2e`,
                        }),
                    },
                });

                chartInstance.current.render();

            } catch (error) {
                // Silenciar erro de renderização
            }
        }, 200);
    }, [visible, projectionData, emissionItem]);

    // Calcular estatísticas
    const getStatistics = () => {
        if (projectionData.length === 0) return {};

        const firstYear = projectionData[0]?.value || 0;
        const lastYear = projectionData[projectionData.length - 1]?.value || 0;
        const totalChange = lastYear - firstYear;
        const percentageChange = firstYear > 0 ? ((lastYear - firstYear) / firstYear * 100) : 0;

        return {
            baseEmission: firstYear,
            projectedEmission: lastYear,
            totalChange,
            percentageChange
        };
    };

    const stats = getStatistics();

    // Não renderizar se não tiver dados válidos
    if (!visible || !emissionItem) return null;

    return (
        <Modal
            title={null}
            open={visible}
            onCancel={onClose}
            footer={null}
            width={800}
            destroyOnClose
            centered
            maskClosable
        >
            <div className="p-4">
                {/* Cabeçalho */}
                <div className="mb-6">
                    <Title level={4} className="mb-2">
                        {emissionItem.activity || 'Atividade'}
                    </Title>
                    <Text type="secondary">
                        {emissionItem.scope} • {emissionItem.category}
                    </Text>
                </div>

                {/* Estatísticas */}
                <Row gutter={16} className="mb-6">
                    <Col span={6}>
                        <Card size="small" style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Statistic
                                title={
                                    <div style={{ lineHeight: '1.2', marginBottom: '8px', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                        Emissão Base ({(() => {
                                            const { reductionGoals = [] } = store;
                                            const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

                                            if (safeReductionGoals.length === 0) {
                                                return "2025";
                                            }

                                            const baseYears = safeReductionGoals.map(goal =>
                                                goal.baseline_year || goal.baseYear || 2025
                                            );

                                            return Math.min(...baseYears);
                                        })()})
                                    </div>
                                }
                                value={formatCompactNumber(stats.baseEmission)}
                                suffix="tCO2e"
                                valueStyle={{ color: '#1890ff', fontSize: '18px', whiteSpace: 'nowrap' }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Statistic
                                title={
                                    <div style={{ lineHeight: '1.2', marginBottom: '8px', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                        Projeção Final ({(() => {
                                            const { reductionGoals = [] } = store;
                                            const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

                                            if (safeReductionGoals.length === 0) {
                                                return "2035";
                                            }

                                            const targetYears = safeReductionGoals.map(goal =>
                                                goal.target_year || goal.targetYear || 2035
                                            );

                                            return Math.max(...targetYears);
                                        })()})
                                    </div>
                                }
                                value={formatCompactNumber(stats.projectedEmission)}
                                suffix="tCO2e"
                                valueStyle={{
                                    color: stats.totalChange >= 0 ? '#cf1322' : '#52c41a',
                                    fontSize: '18px',
                                    whiteSpace: 'nowrap'
                                }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Statistic
                                title={
                                    <div style={{ lineHeight: '1.2', marginBottom: '8px', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                        Variação Total
                                    </div>
                                }
                                value={formatCompactNumber(Math.abs(stats.totalChange))}
                                suffix="tCO2e"
                                prefix={stats.totalChange >= 0 ? '+' : '-'}
                                valueStyle={{
                                    color: stats.totalChange >= 0 ? '#cf1322' : '#52c41a',
                                    fontSize: '18px',
                                    whiteSpace: 'nowrap'
                                }}
                            />
                        </Card>
                    </Col>
                    <Col span={6}>
                        <Card size="small" style={{ minHeight: '100px', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
                            <Statistic
                                title={
                                    <div style={{ lineHeight: '1.2', marginBottom: '8px', minHeight: '32px', display: 'flex', alignItems: 'center' }}>
                                        Variação %
                                    </div>
                                }
                                value={Math.abs(stats.percentageChange).toFixed(1)}
                                suffix="%"
                                prefix={stats.percentageChange >= 0 ? '+' : '-'}
                                valueStyle={{
                                    color: stats.percentageChange >= 0 ? '#cf1322' : '#52c41a',
                                    fontSize: '18px',
                                    whiteSpace: 'nowrap'
                                }}
                            />
                        </Card>
                    </Col>
                </Row>

                {/* Informação sobre ancoragem */}
                {anchorageParam && (
                    <div className="mb-4">
                        <Text strong>Parâmetro Ancorado: </Text>
                        <Text>{anchorageParam.name || `Parâmetro ${anchorageParam.id}`}</Text>
                        <br />
                        {anchorageParam.comments && (
                            <>
                                <Text strong>Descrição: </Text>
                                <Text>{anchorageParam.comments}</Text>
                                <br />
                            </>
                        )}
                        <Text type="secondary" style={{ fontSize: '12px' }}>
                            As projeções são calculadas aplicando as variações percentuais do parâmetro sobre as emissões ano a ano.
                        </Text>
                    </div>
                )}

                {/* Gráfico */}
                <div className="mb-4">
                    <Title level={5} className="mb-3">
                        Projeção de Emissões ({(() => {
                            const { reductionGoals = [] } = store;
                            const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

                            if (safeReductionGoals.length === 0) {
                                return "2025-2035";
                            }

                            const baseYears = safeReductionGoals.map(goal =>
                                goal.baseline_year || goal.baseYear || 2025
                            );
                            const targetYears = safeReductionGoals.map(goal =>
                                goal.target_year || goal.targetYear || 2035
                            );

                            const minBaseYear = Math.min(...baseYears);
                            const maxTargetYear = Math.max(...targetYears);

                            return `${minBaseYear}-${maxTargetYear}`;
                        })()})
                    </Title>
                    {projectionData.length > 0 ? (
                        <div
                            ref={chartRef}
                            style={{
                                height: '300px',
                                width: '100%',
                                paddingTop: '12px',
                                display: 'flex',
                                flexDirection: 'column'
                            }}
                        />
                    ) : (
                        <Card size="small">
                            <div className="text-center py-8">
                                <Text type="secondary">
                                    {!anchorageParam
                                        ? 'Nenhum parâmetro de ancoragem definido para esta atividade.'
                                        : 'Não foi possível gerar a projeção com os dados disponíveis.'
                                    }
                                </Text>
                            </div>
                        </Card>
                    )}
                </div>
            </div>
        </Modal>
    );
}

export default EmissionProjectionModal;
