import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Button, Spin, Alert, Select, Switch, Segmented, Row, Col, Tooltip, Modal, Input, message } from 'antd';
import { SaveOutlined, PlusOutlined, CloseOutlined, FullscreenOutlined, EditOutlined, DownloadOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import useScenariosStore from './store/useScenariosStore';
import useProjectsStore from '../projects/store/useProjectsStore';
import useBauStore from '../bau/store/useBauStore';
import useDriversStore from '../drivers/store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import useInventoryStore from '../inventory/store/useInventoryStore';
import useTechnologyBankStore from '../../../store/technologyBankStore';
import { mergedInitiativesById } from '../projects/utils/initiativeCatalog';
import { aggregateByScope, activitiesForYear } from '../inventory/utils/inventoryAggregate';
import { computeMetaTarget } from '../targets-timeframe/services/sbtiTargetService';
import { indicePorAno } from '../drivers/utils/driverIndex';
import {
    waterfallData,
    scenarioScopeEmissionInYear,
    bauScopeEmissionInYear,
    maccRows,
    scenarioFinance,
    metaGapInYear,
    metaTargetAbsoluteInYear,
    metaScopeLabels,
    SCOPES,
} from './utils/scenarioCalc';
import DecarbonizationDataBar from '../shared/DecarbonizationDataBar';
import { saveCompanyToProject } from '../shared/decarbonizationExport';
import ScenarioKpis from './components/ScenarioKpis';
import ScenarioProjectsColumn from './components/ScenarioProjectsColumn';
import WaterfallChart from './components/WaterfallChart';
import ScenarioLinesChart from './components/ScenarioLinesChart';
import MaccChart from './components/MaccChart';
import ScenarioComparisonTable from './components/ScenarioComparisonTable';

/**
 * Etapa 6 — Cenários. Combina Projetos (Etapa 5) em cenários e compara a
 * trajetória resultante com o BAU (Etapa 4) e as metas SBTi (tela de Metas).
 * Cap por atividade evita dupla contagem. Recálculo ao vivo.
 */
function ScenariosPage() {
    const scenarios = useScenariosStore((s) => s.scenarios);
    const activeScenarioId = useScenariosStore((s) => s.activeScenarioId);
    const compare = useScenariosStore((s) => s.compare);
    const loading = useScenariosStore((s) => s.loading);
    const error = useScenariosStore((s) => s.error);
    const loadScenarios = useScenariosStore((s) => s.loadScenarios);
    const setActive = useScenariosStore((s) => s.setActive);
    const setCompare = useScenariosStore((s) => s.setCompare);
    const addScenario = useScenariosStore((s) => s.addScenario);
    const patchScenario = useScenariosStore((s) => s.patchScenario);
    const removeScenario = useScenariosStore((s) => s.removeScenario);
    const upsertItem = useScenariosStore((s) => s.upsertItem);
    const removeItem = useScenariosStore((s) => s.removeItem);

    const projects = useProjectsStore((s) => s.projects);
    const bank = useProjectsStore((s) => s.bank);
    const loadProjects = useProjectsStore((s) => s.loadProjects);
    const activities = useBauStore((s) => s.activities);
    const loadActivities = useBauStore((s) => s.loadActivities);
    const drivers = useDriversStore((s) => s.drivers);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);
    const metas = usePlanTargetsStore((s) => s.metas);
    const planParams = usePlanTargetsStore((s) => s.params);
    const loadPlanData = usePlanTargetsStore((s) => s.loadPlanData);
    const inventoryActivities = useInventoryStore((s) => s.activities);
    // Só o inventário do ano-base alimenta a baseline dos cenários.
    const baselineByScope = useMemo(
        () => aggregateByScope(activitiesForYear(inventoryActivities, planParams.baseYear, planParams.baseYear)),
        [inventoryActivities, planParams.baseYear]
    );
    // Catálogo global compartilhado — para resolver iniciativas `tech-*` dos projetos.
    const technologies = useTechnologyBankStore((s) => s.technologies);

    const [focusMetaId, setFocusMetaId] = useState(null);
    const [saving, setSaving] = useState(false);
    const [zoomChart, setZoomChart] = useState(null); // 'cascata' | 'linhas' | 'macc'
    const [editingId, setEditingId] = useState(null); // cenário em edição de nome
    const [editName, setEditName] = useState('');
    const cascadeRef = useRef(null);
    const linesRef = useRef(null);
    const maccRef = useRef(null);
    const [lineHorizon, setLineHorizon] = useState('longo'); // 'curto' (até near-term) | 'longo' (até net-zero)

    useEffect(() => {
        loadPlanData().catch(() => {});
        loadDrivers().catch(() => {});
        loadActivities().catch(() => {});
        loadProjects().catch(() => {});
        loadScenarios().catch(() => message.error('Erro ao carregar cenários.'));
    }, [loadPlanData, loadDrivers, loadActivities, loadProjects, loadScenarios]);

    const { baseYear, netZeroYear } = planParams;
    const endYear = netZeroYear;

    const ctx = useMemo(
        () => ({
            baseYear,
            endYear,
            activities,
            activitiesById: Object.fromEntries(activities.map((a) => [a.id, a])),
            driversById: Object.fromEntries(drivers.map((d) => [d.id, d])),
        }),
        [baseYear, endYear, activities, drivers]
    );
    const projectsById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p])), [projects]);
    const initiativesById = useMemo(() => mergedInitiativesById(bank, technologies), [bank, technologies]);

    // Contexto e alvos por meta (reusa a regra da tela de Metas).
    const metaCtx = useMemo(
        () => ({
            baseYear,
            recentYear: planParams.recentYear,
            planNetZeroYear: netZeroYear,
            baselineByScope,
            getDenominatorProjection: (driverId) => {
                const driver = drivers.find((d) => d.id === driverId);
                if (!driver) return null;
                return indicePorAno(driver, { baseYear, endYear: netZeroYear }).map((p) => ({
                    year: p.year,
                    value: driver.baseValue > 0 ? (driver.baseValue * p.index) / 100 : p.index,
                }));
            },
        }),
        [baseYear, planParams.recentYear, netZeroYear, baselineByScope, drivers]
    );
    const metaTargets = useMemo(() => metas.map((m) => ({ meta: m, target: computeMetaTarget(m, metaCtx) })), [metas, metaCtx]);
    const focusMeta = metaTargets.find((mt) => mt.meta.id === focusMetaId) || metaTargets[0] || null;

    // Ano-alvo NÃO é selecionável aqui: vem do horizonte near-term da meta em foco
    // (definido na tela de Metas). Sem meta, cai num horizonte padrão do plano.
    const targetYear = focusMeta?.meta.nearTermYear || Math.min(endYear, baseYear + 6);

    const activeScenario = scenarios.find((s) => s.id === activeScenarioId) || null;

    // Escopos da meta em foco — TODA a comparação (BAU, cascata, linhas, KPIs) é
    // restrita a esses escopos. Sem meta, cai no total (todos os escopos).
    const focusScopes = useMemo(() => (focusMeta ? metaScopeLabels(focusMeta.meta) : null), [focusMeta]);
    const scopeSet = focusScopes && focusScopes.length ? focusScopes : SCOPES;

    // Cálculos do cenário ativo (ao vivo) — restritos aos escopos da meta em foco.
    const wf = useMemo(
        () => (activeScenario ? waterfallData(activeScenario, targetYear, ctx, projectsById, initiativesById, focusScopes) : null),
        [activeScenario, targetYear, ctx, projectsById, initiativesById, focusScopes]
    );
    const bauTarget = useMemo(() => bauScopeEmissionInYear(scopeSet, targetYear, ctx), [scopeSet, targetYear, ctx]);
    const scenarioTarget = activeScenario
        ? scenarioScopeEmissionInYear(activeScenario, scopeSet, targetYear, ctx, projectsById, initiativesById)
        : bauTarget;

    const focusGap = useMemo(() => {
        if (!activeScenario || !focusMeta) return { target: null, gap: null };
        return metaGapInYear(activeScenario, focusMeta.meta, focusMeta.target, targetYear, ctx, projectsById, initiativesById);
    }, [activeScenario, focusMeta, targetYear, ctx, projectsById, initiativesById]);

    // Alvo absoluto da meta em foco no ano-alvo (linha de referência da cascata).
    const focusMetaTarget = useMemo(
        () => (focusMeta ? metaTargetAbsoluteInYear(focusMeta.target, targetYear) : null),
        [focusMeta, targetYear]
    );

    // Linhas no tempo (restritas aos escopos da meta em foco).
    const { lineData, serieKinds } = useMemo(() => {
        const data = [];
        const kinds = {};
        for (let y = baseYear; y <= endYear; y += 1) {
            data.push({ serie: 'BAU', year: String(y), value: bauScopeEmissionInYear(scopeSet, y, ctx) });
        }
        kinds.BAU = 'bau';
        if (activeScenario) {
            for (let y = baseYear; y <= endYear; y += 1) {
                data.push({ serie: activeScenario.name, year: String(y), value: scenarioScopeEmissionInYear(activeScenario, scopeSet, y, ctx, projectsById, initiativesById) });
            }
            kinds[activeScenario.name] = 'scenario';
        }
        // Linha da meta EM FOCO (alvo absoluto nos escopos cobertos) — comparável à emissão restrita.
        if (focusMeta) {
            const serie = `Meta: ${focusMeta.meta.name}`;
            for (let y = baseYear; y <= endYear; y += 1) {
                const v = metaTargetAbsoluteInYear(focusMeta.target, y);
                if (v != null) data.push({ serie, year: String(y), value: v });
            }
            kinds[serie] = 'meta';
        }
        if (compare) {
            scenarios.filter((s) => s.id !== activeScenarioId).forEach((s) => {
                for (let y = baseYear; y <= endYear; y += 1) {
                    data.push({ serie: s.name, year: String(y), value: scenarioScopeEmissionInYear(s, scopeSet, y, ctx, projectsById, initiativesById) });
                }
                kinds[s.name] = 'compare';
            });
        }
        return { lineData: data, serieKinds: kinds };
    }, [baseYear, endYear, ctx, scopeSet, activeScenario, focusMeta, compare, scenarios, activeScenarioId, projectsById, initiativesById]);

    // Horizonte do gráfico de linhas: curto prazo (até o ano da meta near-term em
    // foco) ou longo prazo (até o net-zero / fim do plano).
    const lineHorizonEnd = lineHorizon === 'curto' ? targetYear : endYear;
    const lineDataView = useMemo(() => lineData.filter((p) => Number(p.year) <= lineHorizonEnd), [lineData, lineHorizonEnd]);

    const macc = useMemo(
        () => (activeScenario ? maccRows(activeScenario, targetYear, ctx, projectsById, initiativesById) : []),
        [activeScenario, targetYear, ctx, projectsById, initiativesById]
    );

    const comparisonRows = useMemo(
        () =>
            scenarios.map((s) => {
                const emission = scenarioScopeEmissionInYear(s, scopeSet, targetYear, ctx, projectsById, initiativesById);
                // % de redução SOBRE O BAU (não sobre o ano-base): (BAU − cenário)/BAU.
                const reductionPct = bauTarget > 0 ? ((emission - bauTarget) / bauTarget) * 100 : 0;
                const fin = scenarioFinance(s, ctx, projectsById, initiativesById);
                const gap = focusMeta ? metaGapInYear(s, focusMeta.meta, focusMeta.target, targetYear, ctx, projectsById, initiativesById).gap : null;
                return { id: s.id, name: s.name, active: s.id === activeScenarioId, emission, reductionPct, gap, custoBruto: fin.custoBruto, savings: fin.savings };
            }),
        [scenarios, scopeSet, targetYear, ctx, projectsById, initiativesById, bauTarget, focusMeta, activeScenarioId]
    );

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = await saveCompanyToProject();
            message.success(`Salvo no projeto: decarbonization-data/${data.cnpj}.json`);
        } catch (e) {
            message.warning('Salvo localmente. Para gravar o arquivo no projeto, rode em npm run dev.');
        } finally {
            setSaving(false);
        }
    };

    // Renomear cenário (edição inline no chip).
    const startEdit = (s) => {
        setEditingId(s.id);
        setEditName(s.name);
    };
    const commitEdit = () => {
        if (editingId) {
            const n = editName.trim();
            if (n) patchScenario(editingId, { name: n });
        }
        setEditingId(null);
    };
    const handleAddScenario = () => {
        const id = addScenario();
        const created = useScenariosStore.getState().scenarios.find((s) => s.id === id);
        if (created) startEdit(created); // já abre em edição para nomear
    };

    const toggleMaccProject = (pid) =>
        upsertItem(activeScenarioId, pid, { included: !(activeScenario?.items || []).find((it) => it.projetoId === pid)?.included });

    const CHART_TITLES = {
        cascata: `Caminho de descarbonização · ${targetYear}`,
        linhas: 'Trajetória no tempo',
        macc: 'MACC · custo marginal de abatimento',
    };

    const chartRefs = { cascata: cascadeRef, linhas: linesRef, macc: maccRef };
    const downloadChart = (key) => chartRefs[key].current?.downloadPNG(`${key}-${targetYear}.png`);

    // Cabeçalho dos cards de gráfico: título + baixar PNG + expandir (popup).
    const chartHeader = (key) => (
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-[#210856]">{CHART_TITLES[key]}</h3>
            <div className="flex items-center">
                <Tooltip title="Baixar PNG">
                    <Button type="text" size="small" icon={<DownloadOutlined />} onClick={() => downloadChart(key)} aria-label="Baixar PNG" />
                </Tooltip>
                <Tooltip title="Expandir gráfico">
                    <Button type="text" size="small" icon={<FullscreenOutlined />} onClick={() => setZoomChart(key)} aria-label="Expandir gráfico" />
                </Tooltip>
            </div>
        </div>
    );

    // align="top": impede o stretch das colunas — o CSS global dá height:100% aos
    // .ant-card, e com a coluna esticada cada card herdaria a altura total da Row
    // (cards de 1000px+ estourando sobre a tabela). style height:auto reforça.
    const chartCardStyle = { height: 'auto' };
    const dashboard = (
        <Row gutter={16} align="top">
            <Col xs={24} lg={8} xl={7}>
                <ScenarioProjectsColumn
                    scenario={activeScenario}
                    projects={projects}
                    initiativesById={initiativesById}
                    ctx={ctx}
                    targetYear={targetYear}
                    onToggle={(pid, included) => upsertItem(activeScenarioId, pid, { included })}
                    onUpsertItem={(pid, patch) => upsertItem(activeScenarioId, pid, patch)}
                    onRemoveItem={(pid) => removeItem(activeScenarioId, pid)}
                />
            </Col>
            <Col xs={24} lg={16} xl={17}>
                <Card className="mb-4" style={chartCardStyle}>
                    {chartHeader('cascata')}
                    <WaterfallChart ref={cascadeRef} data={wf} metaTarget={focusMetaTarget} targetYear={targetYear} baseYear={baseYear} />
                </Card>
                <Card className="mb-4" style={chartCardStyle}>
                    {chartHeader('linhas')}
                    <div className="mb-2">
                        <Segmented
                            size="small"
                            value={lineHorizon}
                            onChange={setLineHorizon}
                            options={[
                                { label: `Curto prazo (até ${targetYear})`, value: 'curto' },
                                { label: `Longo prazo (até ${endYear})`, value: 'longo' },
                            ]}
                        />
                    </div>
                    <ScenarioLinesChart ref={linesRef} data={lineDataView} serieKinds={serieKinds} targetYear={targetYear} />
                </Card>
                <Card className="mb-4" style={chartCardStyle}>
                    {chartHeader('macc')}
                    <MaccChart ref={maccRef} rows={macc} onToggle={toggleMaccProject} />
                </Card>
            </Col>
        </Row>
    );

    // Popup de zoom: gráfico grande e centralizado, com blur no fundo.
    const zoomModal = (
        <Modal
            open={!!zoomChart}
            onCancel={() => setZoomChart(null)}
            footer={null}
            centered
            width="88vw"
            title={zoomChart ? CHART_TITLES[zoomChart] : ''}
            styles={{ mask: { backdropFilter: 'blur(6px)', backgroundColor: 'rgba(23, 12, 61, 0.45)' } }}
        >
            {zoomChart === 'cascata' && (
                <WaterfallChart data={wf} metaTarget={focusMetaTarget} targetYear={targetYear} baseYear={baseYear} height={560} />
            )}
            {zoomChart === 'linhas' && (
                <ScenarioLinesChart data={lineDataView} serieKinds={serieKinds} targetYear={targetYear} height={560} />
            )}
            {zoomChart === 'macc' && <MaccChart rows={macc} onToggle={toggleMaccProject} />}
        </Modal>
    );

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <DecarbonizationDataBar />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp; <span className="text-[#210856] font-medium">Cenários</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Cenários</h2>
                    <p className="text-sm text-gray-500">Combine projetos e compare a trajetória com o BAU e as metas SBTi.</p>
                </div>
                <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs text-gray-500">
                        Ano-meta <span className="font-medium text-[#210856]">{targetYear}</span>{' '}
                        <span className="text-gray-400">(da meta)</span>
                    </span>
                    {metaTargets.length > 0 && (
                        <span className="text-xs text-gray-500">
                            Meta em foco{' '}
                            <Select
                                value={focusMeta?.meta.id}
                                onChange={setFocusMetaId}
                                options={metaTargets.map((mt) => ({ value: mt.meta.id, label: mt.meta.name }))}
                                size="small"
                                style={{ width: 200 }}
                            />
                        </span>
                    )}
                    <span className="text-xs text-gray-500 flex items-center gap-1">
                        Comparar <Switch size="small" checked={compare} onChange={setCompare} />
                    </span>
                    <Button type="primary" icon={<SaveOutlined />} onClick={handleSave} loading={saving} className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6" size="large">
                        Salvar no projeto (JSON)
                    </Button>
                </div>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                {/* Seletor de cenários (chips) */}
                <div className="flex flex-wrap items-center gap-2 mb-4">
                    {scenarios.map((s) => {
                        const active = s.id === activeScenarioId;
                        return (
                            <div
                                key={s.id}
                                className={`flex items-center rounded-full border transition-colors ${
                                    active ? 'border-[#210856] bg-[#210856] text-white' : 'border-gray-300 bg-white text-gray-700'
                                }`}
                            >
                                {editingId === s.id ? (
                                    <Input
                                        size="small"
                                        autoFocus
                                        value={editName}
                                        onChange={(e) => setEditName(e.target.value)}
                                        onPressEnter={commitEdit}
                                        onBlur={commitEdit}
                                        className="m-0.5"
                                        style={{ width: 170 }}
                                    />
                                ) : (
                                    <>
                                        <button
                                            type="button"
                                            onClick={() => setActive(s.id)}
                                            onDoubleClick={() => startEdit(s)}
                                            className="pl-4 pr-2 py-1.5 text-sm font-medium"
                                        >
                                            {s.name}
                                        </button>
                                        <Tooltip title="Renomear cenário">
                                            <button
                                                type="button"
                                                onClick={() => startEdit(s)}
                                                className={`px-1 py-1.5 ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-[#210856]'}`}
                                                aria-label="Renomear cenário"
                                            >
                                                <EditOutlined style={{ fontSize: 12 }} />
                                            </button>
                                        </Tooltip>
                                        {scenarios.length > 1 && (
                                            <Tooltip title="Remover cenário">
                                                <button
                                                    type="button"
                                                    onClick={() => removeScenario(s.id)}
                                                    className={`pr-3 pl-1 py-1.5 ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-[#b9462f]'}`}
                                                >
                                                    <CloseOutlined style={{ fontSize: 11 }} />
                                                </button>
                                            </Tooltip>
                                        )}
                                    </>
                                )}
                            </div>
                        );
                    })}
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddScenario}>
                        Novo cenário
                    </Button>
                </div>

                <ScenarioKpis
                    bauTarget={bauTarget}
                    scenarioTarget={scenarioTarget}
                    metaTarget={focusMetaTarget}
                    gap={focusGap.gap}
                    targetYear={targetYear}
                    metaName={focusMeta?.meta.name || ''}
                />

                {dashboard}

                {compare && <ScenarioComparisonTable rows={comparisonRows} targetYear={targetYear} metaName={focusMeta?.meta.name || ''} />}
            </Spin>

            {zoomModal}
        </div>
    );
}

export default ScenariosPage;
