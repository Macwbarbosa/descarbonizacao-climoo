import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
    Card,
    Typography,
    Space,
    Tag,
    Button,
    Empty,
    Row,
    Col,
    Select,
    Collapse,
    Divider
} from 'antd';
import { Line } from '@antv/g2plot';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';
import useTechnologyBankStore from '../../../../store/technologyBankStore';

const { Title, Text } = Typography;

// Componente do gráfico de emissões
function EmissionChart({ initiative, emissionsInventory }) {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    // Acessar o store para obter parâmetros de projeção e tecnologias
    const store = useDecarbonizationSettingsStore();
    const { getTechnologies } = useTechnologyBankStore();
    const technologies = getTechnologies();

    // Função para obter projeção de emissões para uma atividade específica (usando mesma lógica do modal)
    const getEmissionProjectionForActivity = useCallback((activityId, year) => {
        const emission = emissionsInventory.find(item => item.id === activityId);
        if (!emission || !emission.anchorage) {
            return emission?.emission || 0; // Return base emission if no projection
        }

        // Find the anchorage parameter from projections
        const projections = store.getProjectionParameters();
        const anchorageParam = projections.find(p => p.id === emission.anchorage);

        if (!anchorageParam) {
            return emission?.emission || 0; // Return base emission if no anchorage found
        }

        // Calculate projected emission for the year
        const baseEmission = emission.emission || 0;
        let projectedValue = baseEmission;

        // Apply year-over-year variations from base year to target year
        // Obter anos dinamicamente das metas de redução
        const { reductionGoals = [] } = store;
        const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

        let baseYear = 2025; // fallback
        if (safeReductionGoals.length > 0) {
            const baseYears = safeReductionGoals.map(goal =>
                goal.baseline_year || goal.baseYear || 2025
            );
            baseYear = Math.min(...baseYears);
        }

        for (let y = baseYear; y < year; y += 1) {
            const currentParamValue = anchorageParam.values[y + 1] || 0;
            const previousParamValue = anchorageParam.values[y] || 0;

            // Calculate variation percentage
            let variation = 0;
            if (previousParamValue === 0) {
                variation = currentParamValue === 0 ? 0 : 100;
            } else {
                variation = ((currentParamValue - previousParamValue) / previousParamValue) * 100;
            }

            // Apply variation to projected value
            projectedValue *= (1 + variation / 100);
        }

        return projectedValue;
    }, [emissionsInventory, store]);

    // Função para calcular dados do gráfico para uma iniciativa (usando mesma lógica do modal)
    const calculateChartDataForInitiative = useCallback((initiativeData) => {
        if (!initiativeData.activities || !initiativeData.technology || !initiativeData.coverage) {
            return [];
        }

        // Get selected technology
        const selectedTechnology = technologies.find(tech => tech.id === initiativeData.technology);
        const reductionPercentage = selectedTechnology?.reductionPotential || 0;

        const data = [];

        // Generate data for each year in coverage
        Object.entries(initiativeData.coverage || {}).forEach(([year, coverage]) => {
            const yearNum = parseInt(year, 10);
            const coverageValue = coverage || 0;

            // Calculate consolidated base emissions for all selected activities for this year
            const consolidatedBaseEmissions = (initiativeData.activities || []).reduce((total, activityName) => (
                total + getEmissionProjectionForActivity(activityName, yearNum)
            ), 0);

            // Base emissions (red line) - consolidated projection for the year
            data.push({
                year: yearNum,
                value: consolidatedBaseEmissions,
                category: 'Emissão Base (tCO2e)',
                type: 'baseline'
            });

            // Emissions with decarbonization (green line)
            // Formula: base emissions * coverage * (1 - reduction percentage)
            const reducedEmissions = consolidatedBaseEmissions * (coverageValue / 100) * (reductionPercentage / 100);
            const finalEmissions = consolidatedBaseEmissions - reducedEmissions;

            data.push({
                year: yearNum,
                value: Math.max(0, finalEmissions),
                category: 'Emissão com Descarbonização (tCO2e)',
                type: 'reduced'
            });
        });

        return data.sort((a, b) => a.year - b.year);
    }, [getEmissionProjectionForActivity, technologies]);

    const chartData = calculateChartDataForInitiative(initiative);

    useEffect(() => {
        if (!chartRef.current || chartData.length === 0) return;

        // Destruir gráfico existente
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        // Criar novo gráfico (usando mesma configuração do modal)
        const line = new Line(chartRef.current, {
            data: chartData,
            xField: 'year',
            yField: 'value',
            seriesField: 'category',
            smooth: true,
            animation: false, // Disable animations to prevent errors
            color: ['#ff4d4f', '#52c41a'],
            lineStyle: {
                lineWidth: 3,
            },
            point: {
                size: 5,
                shape: 'circle',
                style: {
                    fill: 'white',
                    stroke: '#999',
                    lineWidth: 2,
                },
            },
            yAxis: {
                title: {
                    text: 'Emissões (tCO2e)',
                    style: {
                        fontSize: 12,
                        fontWeight: 'bold',
                    },
                },
                label: {
                    formatter: (v) => `${Number(v).toLocaleString('pt-BR', {
                        maximumFractionDigits: 2
                    })}`,
                },
            },
            xAxis: {
                title: {
                    text: 'Ano',
                    style: {
                        fontSize: 12,
                        fontWeight: 'bold',
                    },
                },
                type: 'linear',
                min: Math.min(...chartData.map(d => d.year)) - 0.5,
                max: Math.max(...chartData.map(d => d.year)) + 0.5,
            },
            legend: {
                position: 'bottom',
            },
            tooltip: {
                formatter: (datum) => ({
                    name: datum.category,
                    value: `${Number(datum.value).toLocaleString('pt-BR', {
                        maximumFractionDigits: 2
                    })} tCO2e`,
                }),
            },
        });

        line.render();
        chartInstanceRef.current = line;
    }, [chartData]);

    // Cleanup no desmonte
    useEffect(() => () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }
    }, []);

    if (chartData.length === 0) {
        return (
            <div className="text-center py-8 bg-gray-50 rounded-lg">
                <Text type="secondary" className="block mb-2">
                    Não foi possível gerar o gráfico de projeção.
                </Text>
                <Text type="secondary" className="text-xs">
                    Verifique se a iniciativa possui atividades selecionadas, tecnologia definida,
                    abrangência configurada e parâmetros de projeção no Passo 2.
                </Text>
            </div>
        );
    }

    return (
        <div>
            <div
                ref={chartRef}
                style={{
                    height: '300px',
                    width: '100%',
                    position: 'relative'
                }}
            />

            {/* Resumo */}
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
                <Text strong className="text-blue-700 block mb-2">
                    Resumo da Projeção
                </Text>
                <Row gutter={[16, 8]}>
                    <Col span={8}>
                        <Text type="secondary" className="text-xs">Emissões Base Total (Ano Base):</Text>
                        <div className="text-sm">
                            {(initiative.activities || []).reduce((total, activityId) => {
                                const emission = emissionsInventory.find(item => item.id === activityId);
                                return total + (emission?.emission || 0);
                            }, 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 })} tCO2e
                        </div>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" className="text-xs">Tecnologia Selecionada:</Text>
                        <div className="text-sm">
                            {(() => {
                                const selectedTechnology = technologies.find(tech => tech.id === initiative.technology);
                                return selectedTechnology ?
                                    `${selectedTechnology.name} (${selectedTechnology.reductionPotential}% redução)` :
                                    'Nenhuma tecnologia selecionada';
                            })()}
                        </div>
                    </Col>
                    <Col span={8}>
                        <Text type="secondary" className="text-xs">Número de Atividades:</Text>
                        <div className="text-sm">
                            {(initiative.activities || []).length} atividade(s)
                        </div>
                    </Col>
                </Row>
            </div>
        </div>
    );
}

function PlanReviewStep({ onNext, onPrev, currentStep, totalSteps }) {
    const { t } = useTranslation();

    const {
        reductionGoals = [],
        scenarios = [],
        getAllInitiatives,
        emissionsInventory = []
    } = useDecarbonizationSettingsStore();

    const initiatives = getAllInitiatives ? getAllInitiatives() : [];

    // Função para obter cenários que têm iniciativas associadas a uma meta específica
    function getScenariosForGoal(goalId) {
        if (!goalId || !initiatives || !scenarios) return [];

        const scenarioIds = new Set(
            initiatives
                .filter(initiative => initiative?.associatedGoal === goalId)
                .map(initiative => initiative?.scenarioId)
                .filter(Boolean)
        );

        return scenarios.filter(scenario => scenarioIds.has(scenario?.id));
    }

    // Estado para controlar qual cenário está selecionado para cada meta
    const [selectedScenarios, setSelectedScenarios] = useState(() => {
        const initial = {};
        if (reductionGoals && Array.isArray(reductionGoals)) {
            reductionGoals.forEach(goal => {
                if (goal?.id) {
                    const availableScenarios = getScenariosForGoal(goal.id);
                    if (availableScenarios.length > 0) {
                        initial[goal.id] = availableScenarios[0]?.id;
                    }
                }
            });
        }
        return initial;
    });

    // Função para calcular emissões totais do ano base para uma meta específica
    function calculateBaselineEmissions(goal) {
        if (!goal || !emissionsInventory || !Array.isArray(emissionsInventory)) return 0;

        return emissionsInventory
            .filter(item => {
                if (!item) return false;
                // Associar fontes baseado no escopo da meta
                if (goal.scope === 'scope1_2' || goal.scope === 'Escopos 1 e 2') {
                    return ['Escopo 1', 'Escopo 2'].includes(item.scope);
                }
                if (goal.scope === 'scope3' || goal.scope === 'Escopo 3') {
                    return item.scope === 'Escopo 3';
                }
                return false;
            })
            .reduce((total, item) => total + (item?.emission || 0), 0);
    }

    // Função para calcular investimento total para uma meta específica
    function calculateTotalInvestment(goal) {
        if (!goal?.id || !initiatives || !Array.isArray(initiatives)) return 0;

        return initiatives
            .filter(initiative => initiative?.associatedGoal === goal.id)
            .reduce((total, initiative) => total + (initiative?.investment?.totalAmount || 0), 0);
    }

    // Função para contar iniciativas associadas a uma meta
    function countInitiatives(goal) {
        if (!goal?.id || !initiatives || !Array.isArray(initiatives)) return 0;

        return initiatives.filter(initiative => initiative?.associatedGoal === goal.id).length;
    }

    // Função para obter iniciativas de um cenário específico associadas a uma meta
    function getInitiativesForScenarioAndGoal(scenarioId, goalId) {
        return initiatives.filter(initiative =>
            initiative.scenarioId === scenarioId && initiative.associatedGoal === goalId
        );
    }

    // Manipular seleção de cenário para uma meta específica
    function handleScenarioChange(goalId, scenarioId) {
        setSelectedScenarios(prev => ({
            ...prev,
            [goalId]: scenarioId
        }));
    }

    // Função para renderizar o gráfico de projeção de emissões
    function renderEmissionProjectionChart(initiative) {
        return <EmissionChart initiative={initiative} emissionsInventory={emissionsInventory} />;
    }

    // Renderizar iniciativas de um cenário específico para uma meta
    function renderInitiativesForScenario(scenarioId, goalId) {
        const scenarioInitiatives = getInitiativesForScenarioAndGoal(scenarioId, goalId);
        const scenario = scenarios.find(s => s.id === scenarioId);

        if (scenarioInitiatives.length === 0) {
            return (
                <Empty
                    description="Nenhuma iniciativa encontrada para esta combinação de cenário e meta"
                    className="py-8"
                />
            );
        }

        return (
            <div>
                <Title level={5} className="text-[#210856] mb-4">
                    Iniciativas de Descarbonização - {scenario?.name}
                </Title>

                <div className="space-y-4">
                    {scenarioInitiatives.map((initiative) => (
                        <Card
                            key={initiative.id}
                            size="small"
                            className="border border-gray-200 hover:border-blue-300 transition-colors"
                        >
                            <div className="flex justify-between items-start">
                                <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                        <Text strong className="text-base">
                                            {initiative.title}
                                        </Text>
                                        <Space>
                                            <Tag color="processing">
                                                {initiative.projectType || 'Sem tipo definido'}
                                            </Tag>
                                            <Tag color="blue">
                                                {t(initiative.scope) || 'Escopo não definido'}
                                            </Tag>
                                            <Tag color="green">
                                                {initiative.category || 'Categoria não definida'}
                                            </Tag>
                                        </Space>
                                    </div>

                                    <Row gutter={16} className="text-sm">
                                        <Col span={8}>
                                            <Text type="secondary">Responsável:</Text>
                                            <br />
                                            <Text>{initiative.responsible || 'Não informado'}</Text>
                                        </Col>
                                        <Col span={8}>
                                            <Text type="secondary">Data de Início:</Text>
                                            <br />
                                            <Text>{new Date(initiative.startDate).toLocaleDateString() || 'Não informado'}</Text>
                                        </Col>
                                        <Col span={8}>
                                            <Text type="secondary">Data de Fim:</Text>
                                            <br />
                                            <Text>{new Date(initiative.endDate).toLocaleDateString() || 'Não informado'}</Text>
                                        </Col>
                                    </Row>

                                    {initiative.description && (
                                        <div className="mt-3">
                                            <Text type="secondary">Descrição:</Text>
                                            <br />
                                            <Text>{initiative.description}</Text>
                                        </div>
                                    )}

                                    {initiative.investment && (
                                        <div className="mt-3 p-3 bg-blue-50 rounded">
                                            <Text strong>Informações de Investimento:</Text>
                                            <div className="grid grid-cols-3 gap-4 mt-2 text-sm">
                                                <div>
                                                    <Text type="secondary">Tipo:</Text>
                                                    <br />
                                                    <Text>{t(initiative.investment.type) || 'Não informado'}</Text>
                                                </div>
                                                <div>
                                                    <Text type="secondary">Ano:</Text>
                                                    <br />
                                                    <Text>{initiative.investment.year || 'Não informado'}</Text>
                                                </div>
                                                <div>
                                                    <Text type="secondary">Valor Total:</Text>
                                                    <br />
                                                    <Text>
                                                        {initiative.investment.totalAmount
                                                            ? `R$ ${initiative.investment.totalAmount.toLocaleString()}`
                                                            : 'Não informado'
                                                        }
                                                    </Text>
                                                </div>
                                            </div>
                                            {initiative.investment.description && (
                                                <div className="mt-2">
                                                    <Text type="secondary">Descrição do Investimento:</Text>
                                                    <br />
                                                    <Text>{initiative.investment.description}</Text>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Seção expansível para gráfico */}
                            <div className="mt-4 border-t pt-4">
                                <Collapse
                                    size="small"
                                    items={[
                                        {
                                            key: 'projection',
                                            label: 'Ver Projeção de Descarbonização',
                                            children: renderEmissionProjectionChart(initiative)
                                        }
                                    ]}
                                />
                            </div>
                        </Card>
                    ))}
                </div>
            </div>
        );
    }

    // Renderizar card de cada meta
    function renderGoalCard(goal) {
        const baselineEmissions = calculateBaselineEmissions(goal);
        const totalInvestment = calculateTotalInvestment(goal);
        const initiativesCount = countInitiatives(goal);
        const availableScenarios = getScenariosForGoal(goal.id);
        const selectedScenario = selectedScenarios[goal.id];

        return (
            <Card key={goal.id} className="mb-6 border-0 shadow-sm">
                <div className="mb-4">
                    <div className="flex items-center justify-between mb-3">
                        <Title level={4} className="text-[#210856] mb-0">
                            {goal.goalName}
                        </Title>
                        <Space>
                            <Tag color="blue">{t(goal.scope)}</Tag>
                            <Tag color="green">{goal.reductionValue}% de redução</Tag>
                        </Space>
                    </div>

                    {/* Métricas da Meta */}
                    <Row gutter={[16, 16]} className="mb-4">
                        <Col span={6}>
                            <Card className="border-0 shadow-sm text-center">
                                <div className="text-xl font-bold text-gray-800 mb-1">
                                    {baselineEmissions.toFixed(1)}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Emissões Totais do Ano Base (tCO2e)
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card className="border-0 shadow-sm text-center">
                                <div className="text-xl font-bold text-green-700 mb-1">
                                    {totalInvestment.toLocaleString('pt-BR', {
                                        style: 'currency',
                                        currency: 'BRL',
                                        minimumFractionDigits: 0
                                    })}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Investimento Total Planejado
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card className="border-0 shadow-sm text-center">
                                <div className="text-xl font-bold text-blue-700 mb-1">
                                    {initiativesCount}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Número Total de Iniciativas
                                </div>
                            </Card>
                        </Col>
                        <Col span={6}>
                            <Card className="border-0 shadow-sm text-center">
                                <div className="text-xl font-bold text-purple-700 mb-1">
                                    {goal.baseYear || '2023'} - {goal.targetYear || '2030'}
                                </div>
                                <div className="text-sm text-gray-600">
                                    Período do Plano
                                </div>
                            </Card>
                        </Col>
                    </Row>

                    {/* Seletor de Cenário */}
                    {availableScenarios.length > 0 && (
                        <div className="mb-4">
                            <Text strong className="block mb-2">
                                Selecionar Cenário para Visualizar Iniciativas:
                            </Text>
                            <Select
                                value={selectedScenario}
                                onChange={(value) => handleScenarioChange(goal.id, value)}
                                className="w-full"
                                placeholder="Selecione um cenário"
                                style={{ height: '40px' }}
                            >
                                {availableScenarios.map(scenario => (
                                    <Select.Option key={scenario.id} value={scenario.id}>
                                        {scenario.name}
                                    </Select.Option>
                                ))}
                            </Select>
                        </div>
                    )}

                    <Divider />

                    {/* Iniciativas do Cenário Selecionado */}
                    {selectedScenario && renderInitiativesForScenario(selectedScenario, goal.id)}
                </div>
            </Card>
        );
    }

    return (
        <div className="space-y-6">
            {/* Header com título, descrição e botões de navegação */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
                <div className="flex-1 lg:mr-6">
                    <Title level={3} className="text-[#210856] mb-3">
                        Passo 5: Revisão do Plano
                    </Title>
                    <Text type="secondary" className="text-base leading-relaxed">
                        Revise todas as configurações do seu plano de descarbonização antes de finalizar.
                    </Text>
                </div>
                <div className="flex space-x-3 flex-shrink-0">
                    <Button
                        disabled={currentStep === 0}
                        onClick={onPrev}
                        className="h-10 px-6"
                        size="large"
                    >
                        Anterior
                    </Button>
                    <Button
                        type="primary"
                        onClick={onNext}
                        disabled={currentStep === totalSteps - 1}
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                        size="large"
                    >
                        Concluir Plano
                    </Button>
                </div>
            </div>

            {/* Resumo Geral do Plano */}
            {reductionGoals.length > 0 && (
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                {reductionGoals.length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Metas Configuradas
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                                {scenarios.length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Cenários Criados
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                                {initiatives.length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Iniciativas Totais
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-orange-600 mb-1">
                                {reductionGoals.reduce((total, goal) =>
                                    total + calculateTotalInvestment(goal), 0
                                ).toLocaleString('pt-BR', {
                                    style: 'currency',
                                    currency: 'BRL',
                                    minimumFractionDigits: 0
                                })}
                            </div>
                            <div className="text-sm text-gray-600">
                                Investimento Total
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            <Card className="border-0 shadow-sm">
                {/* Renderizar cards para cada meta */}
                {reductionGoals.length > 0 ? (
                    reductionGoals.map(goal => renderGoalCard(goal))
                ) : (
                    <Empty
                        description="Nenhuma meta de redução configurada"
                        className="py-16"
                    >
                        <Text type="secondary">
                            Configure suas metas de redução no Passo 1 para visualizar o resumo do plano.
                        </Text>
                    </Empty>
                )}
            </Card>
        </div>
    );
}

export default PlanReviewStep;