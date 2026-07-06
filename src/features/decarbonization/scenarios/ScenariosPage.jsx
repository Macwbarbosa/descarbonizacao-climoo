import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Button, Spin, Alert, Switch, Segmented, Tabs, Tag, Row, Col, Tooltip, Modal, Input, Empty, message } from 'antd';
import { PlusOutlined, CloseOutlined, EditOutlined } from '@ant-design/icons';
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
import { computeMetaTarget, isIntensityType, reductionTypeOf } from '../targets-timeframe/services/sbtiTargetService';
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
import { metaCoveredActivities } from '../shared/metaScopes';
import ScenarioKpis from './components/ScenarioKpis';
import ScenarioProjectsColumn from './components/ScenarioProjectsColumn';
import WaterfallChart from './components/WaterfallChart';
import ScenarioLinesChart from './components/ScenarioLinesChart';
import MaccChart from './components/MaccChart';
import ScenarioComparisonTable from './components/ScenarioComparisonTable';
import ChartConfig from './components/ChartConfig';
import useChartTheme from './utils/chartTheme';
import { downloadXlsx } from './utils/chartExport';

const fmt0 = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const fmt2 = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 2 });

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
    const assignOrphanScenarios = useScenariosStore((s) => s.assignOrphanScenarios);
    const palette = useChartTheme((s) => s.palette);

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
    const baseActivities = useMemo(
        () => activitiesForYear(inventoryActivities, planParams.baseYear, planParams.baseYear),
        [inventoryActivities, planParams.baseYear]
    );
    const baselineByScope = useMemo(() => aggregateByScope(baseActivities), [baseActivities]);
    // Catálogo global compartilhado — para resolver iniciativas `tech-*` dos projetos.
    const technologies = useTechnologyBankStore((s) => s.technologies);

    const [focusMetaId, setFocusMetaId] = useState(null);
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

    // Meta em foco (só o objeto da meta — independe dos cálculos de target).
    const focusMetaObj = useMemo(
        () => metas.find((m) => m.id === focusMetaId) || metas[0] || null,
        [metas, focusMetaId]
    );
    // Atividades do cenário restritas à COBERTURA da meta em foco (escopos +
    // exclusões). Sem meta → todas. Assim BAU, cascata, linhas e gap respeitam
    // a cobertura definida na meta, ficando consistentes com a trajetória.
    const scenarioActivities = useMemo(
        () =>
            focusMetaObj && metaScopeLabels(focusMetaObj).length
                ? metaCoveredActivities(focusMetaObj, activities)
                : activities,
        [focusMetaObj, activities]
    );

    const ctx = useMemo(
        () => ({
            baseYear,
            endYear,
            activities: scenarioActivities,
            activitiesById: Object.fromEntries(scenarioActivities.map((a) => [a.id, a])),
            driversById: Object.fromEntries(drivers.map((d) => [d.id, d])),
        }),
        [baseYear, endYear, scenarioActivities, drivers]
    );
    // ctx COMPLETO (todas as atividades) — para exibições DESCRITIVAS do projeto
    // (tags de escopo e potencial standalone na coluna), independente da meta.
    const displayCtx = useMemo(
        () => ({
            baseYear,
            endYear,
            activities,
            activitiesById: Object.fromEntries(activities.map((a) => [a.id, a])),
            driversById: ctx.driversById,
        }),
        [baseYear, endYear, activities, ctx.driversById]
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
            baseActivities,
            getDenominatorProjection: (driverId) => {
                const driver = drivers.find((d) => d.id === driverId);
                if (!driver) return null;
                return indicePorAno(driver, { baseYear, endYear: netZeroYear }).map((p) => ({
                    year: p.year,
                    value: driver.baseValue > 0 ? (driver.baseValue * p.index) / 100 : p.index,
                }));
            },
        }),
        [baseYear, planParams.recentYear, netZeroYear, baselineByScope, baseActivities, drivers]
    );
    const metaTargets = useMemo(() => metas.map((m) => ({ meta: m, target: computeMetaTarget(m, metaCtx) })), [metas, metaCtx]);
    const focusMeta = metaTargets.find((mt) => mt.meta.id === focusMetaId) || metaTargets[0] || null;

    // Ano-alvo NÃO é selecionável aqui: vem do horizonte near-term da meta em foco
    // (definido na tela de Metas). Sem meta, cai num horizonte padrão do plano.
    const targetYear = focusMeta?.meta.nearTermYear || Math.min(endYear, baseYear + 6);

    // Cenários DESTA meta. Cenários sem meta (legados/seed) contam para a meta
    // PRINCIPAL já na exibição — evita "piscar vazio" enquanto a migração persiste.
    const primaryMetaId = metas[0]?.id || null;
    const scenariosOfMeta = useMemo(() => {
        if (!focusMetaObj) return [];
        return scenarios.filter(
            (s) => s.metaId === focusMetaObj.id || (!s.metaId && focusMetaObj.id === primaryMetaId)
        );
    }, [scenarios, focusMetaObj, primaryMetaId]);
    const activeScenario = scenariosOfMeta.find((s) => s.id === activeScenarioId) || null;

    // Migração one-shot: cenários antigos sem meta vinculam-se à meta principal.
    useEffect(() => {
        if (primaryMetaId) assignOrphanScenarios(primaryMetaId);
    }, [primaryMetaId, scenarios, assignOrphanScenarios]);

    // Mantém o cenário ativo dentro da meta selecionada.
    useEffect(() => {
        if (!focusMetaObj) return;
        const ofMeta = scenarios.filter((s) => s.metaId === focusMetaObj.id);
        if (!ofMeta.some((s) => s.id === activeScenarioId)) {
            setActive(ofMeta[0]?.id ?? null);
        }
    }, [focusMetaObj, scenarios, activeScenarioId, setActive]);

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

    // Exibição em INTENSIDADE: quando a meta em foco é de intensidade, os
    // indicadores (gauges) e os projetos passam a mostrar o VALOR NO INDICADOR
    // (tCO2e ÷ denominador no ano-alvo), em vez de tCO2e absoluto.
    const intensityDisplay = useMemo(() => {
        const identity = { isIntensity: false, unit: 'tCO2e', toDisplay: (v) => v, atYear: (v) => v };
        const meta = focusMeta?.meta;
        if (!meta || !isIntensityType(reductionTypeOf(meta)) || !meta.denominatorDriverId) return identity;
        const proj = metaCtx.getDenominatorProjection(meta.denominatorDriverId) || [];
        const byYear = Object.fromEntries(proj.map((p) => [p.year, p.value]));
        const denomTarget = byYear[targetYear] || null;
        if (!denomTarget) return identity;
        const driver = drivers.find((d) => d.id === meta.denominatorDriverId);
        return {
            isIntensity: true,
            unit: `tCO2e/${driver?.unit || 'un.'}`,
            toDisplay: (v) => (v == null ? v : v / denomTarget), // valores no ano-alvo
            atYear: (v, y) => (v == null ? v : byYear[y] ? v / byYear[y] : v), // por ano (cascata: base)
        };
    }, [focusMeta, metaCtx, targetYear, drivers]);

    // Cascata em INTENSIDADE: base no ano-base, BAU/reduções/resultado no ano-alvo.
    const wfDisplay = useMemo(() => {
        if (!wf || !intensityDisplay.isIntensity) return wf;
        return {
            ...wf,
            baseEmission: intensityDisplay.atYear(wf.baseEmission, baseYear),
            bau: intensityDisplay.atYear(wf.bau, targetYear),
            result: intensityDisplay.atYear(wf.result, targetYear),
            bars: (wf.bars || []).map((b) => ({ ...b, value: intensityDisplay.atYear(b.value, targetYear) })),
        };
    }, [wf, intensityDisplay, baseYear, targetYear]);
    const focusMetaTargetDisplay = intensityDisplay.toDisplay(focusMetaTarget);

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
            scenariosOfMeta.filter((s) => s.id !== activeScenarioId).forEach((s) => {
                for (let y = baseYear; y <= endYear; y += 1) {
                    data.push({ serie: s.name, year: String(y), value: scenarioScopeEmissionInYear(s, scopeSet, y, ctx, projectsById, initiativesById) });
                }
                kinds[s.name] = 'compare';
            });
        }
        return { lineData: data, serieKinds: kinds };
    }, [baseYear, endYear, ctx, scopeSet, activeScenario, focusMeta, compare, scenariosOfMeta, activeScenarioId, projectsById, initiativesById]);

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
            scenariosOfMeta.map((s) => {
                const emission = scenarioScopeEmissionInYear(s, scopeSet, targetYear, ctx, projectsById, initiativesById);
                // % de redução SOBRE O BAU (não sobre o ano-base): (BAU − cenário)/BAU.
                const reductionPct = bauTarget > 0 ? ((emission - bauTarget) / bauTarget) * 100 : 0;
                const fin = scenarioFinance(s, ctx, projectsById, initiativesById);
                const gap = focusMeta ? metaGapInYear(s, focusMeta.meta, focusMeta.target, targetYear, ctx, projectsById, initiativesById).gap : null;
                return { id: s.id, name: s.name, active: s.id === activeScenarioId, emission, reductionPct, gap, custoBruto: fin.custoBruto, savings: fin.savings };
            }),
        [scenariosOfMeta, scopeSet, targetYear, ctx, projectsById, initiativesById, bauTarget, focusMeta, activeScenarioId]
    );


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
        if (!focusMetaObj) return;
        const id = addScenario(focusMetaObj.id);
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

    // Dados (para exportar .xlsx) por gráfico.
    const xlsxRows = {
        cascata: () => {
            if (!wf) return [];
            const r = [];
            if (wf.baseEmission != null && baseYear) r.push({ Etapa: `Base ${baseYear}`, Tipo: 'Emissão', 'tCO2e': Number(wf.baseEmission) });
            r.push({ Etapa: `BAU ${targetYear}`, Tipo: 'Emissão', 'tCO2e': Number(wf.bau) });
            (wf.bars || []).forEach((b) => r.push({ Etapa: b.name, Tipo: 'Redução (projeto)', 'tCO2e': Number(b.value) }));
            if (focusMetaTarget != null) r.push({ Etapa: `Meta ${targetYear}`, Tipo: 'Meta', 'tCO2e': Number(focusMetaTarget) });
            else r.push({ Etapa: 'Resultado', Tipo: 'Resultado', 'tCO2e': Number(wf.result) });
            return r;
        },
        linhas: () => lineDataView.map((p) => ({ Ano: Number(p.year), Série: p.serie, 'Valor (tCO2e)': Number(p.value) })),
        macc: () =>
            macc.map((m) => ({
                Projeto: m.name,
                'Custo (R$/tCO2e)': Number(m.costPerTon),
                'Potencial (tCO2e)': Number(m.potential),
                Incluído: m.included ? 'Sim' : 'Não',
            })),
    };
    const downloadChartData = (key) => downloadXlsx(`${key}-${targetYear}.xlsx`, CHART_TITLES[key], xlsxRows[key]());

    // Cabeçalho dos cards de gráfico: título + ícone de config (baixar / cores).
    const chartHeader = (key) => (
        <div className="flex items-center justify-between mb-2">
            <h3 className="text-base font-semibold text-[#210856]">{CHART_TITLES[key]}</h3>
            <ChartConfig
                onDownloadPng={() => downloadChart(key)}
                onDownloadXlsx={() => downloadChartData(key)}
                onExpand={() => setZoomChart(key)}
            />
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
                    metas={metas}
                    focusMeta={focusMeta?.meta || null}
                    initiativesById={initiativesById}
                    ctx={displayCtx}
                    targetYear={targetYear}
                    unitLabel={intensityDisplay.unit}
                    toDisplay={intensityDisplay.toDisplay}
                    onToggle={(pid, included) => upsertItem(activeScenarioId, pid, { included })}
                    onUpsertItem={(pid, patch) => upsertItem(activeScenarioId, pid, patch)}
                    onRemoveItem={(pid) => removeItem(activeScenarioId, pid)}
                />
            </Col>
            <Col xs={24} lg={16} xl={17}>
                <Card className="mb-4" style={chartCardStyle}>
                    {chartHeader('cascata')}
                    <WaterfallChart ref={cascadeRef} data={wfDisplay} metaTarget={focusMetaTargetDisplay} unit={intensityDisplay.unit} targetYear={targetYear} baseYear={baseYear} palette={palette} />
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
                    <ScenarioLinesChart ref={linesRef} data={lineDataView} serieKinds={serieKinds} targetYear={targetYear} palette={palette} />
                </Card>
                <Card className="mb-4" style={chartCardStyle}>
                    {chartHeader('macc')}
                    <MaccChart ref={maccRef} rows={macc} onToggle={toggleMaccProject} palette={palette} />
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
                <WaterfallChart data={wfDisplay} metaTarget={focusMetaTargetDisplay} unit={intensityDisplay.unit} targetYear={targetYear} baseYear={baseYear} height={560} palette={palette} />
            )}
            {zoomChart === 'linhas' && (
                <ScenarioLinesChart data={lineDataView} serieKinds={serieKinds} targetYear={targetYear} height={560} palette={palette} />
            )}
            {zoomChart === 'macc' && <MaccChart rows={macc} onToggle={toggleMaccProject} palette={palette} />}
        </Modal>
    );

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <div className="mb-4">
                <div className="text-xs text-gray-500">
                    Plano de Descarbonização &nbsp;›&nbsp; <span className="text-[#210856] font-medium">Cenários</span>
                </div>
                <h2 className="text-xl font-semibold text-[#210856] mt-1">Cenários</h2>
                <p className="text-sm text-gray-500">
                    Escolha a meta, monte cenários de projetos e compare a trajetória com o BAU.
                </p>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                {metaTargets.length === 0 ? (
                    <Alert
                        type="info"
                        showIcon
                        message="Crie uma meta primeiro"
                        description="Os cenários são organizados por meta. Vá em Metas & Período e crie ao menos uma meta para montar cenários."
                    />
                ) : (
                  <>
                    {/* Nível 1 — META em abas */}
                    <Tabs
                        type="card"
                        activeKey={focusMeta?.meta.id}
                        onChange={setFocusMetaId}
                        items={metaTargets.map((mt) => ({ key: mt.meta.id, label: mt.meta.name }))}
                        className="mb-3"
                    />

                    {/* Card de contexto da meta selecionada */}
                    {focusMeta && (
                        <Card className="mb-4">
                            <div className="flex flex-wrap items-center justify-between gap-4">
                                <div>
                                    <div className="climoo-heading text-base font-bold text-[#210856]">{focusMeta.meta.name}</div>
                                    <div className="mt-1 flex items-center gap-1 flex-wrap">
                                        {metaScopeLabels(focusMeta.meta).map((s) => (
                                            <Tag key={s} className="rounded-full m-0 text-[11px]">{s}</Tag>
                                        ))}
                                    </div>
                                </div>
                                <div className="flex items-center gap-6 text-sm">
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Ano-alvo</div>
                                        <div className="font-semibold text-[#210856] tabular-nums">{targetYear}</div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Baseline</div>
                                        <div className="font-semibold tabular-nums">
                                            {(intensityDisplay.isIntensity ? fmt2 : fmt0)(focusMeta.target?.valorBase)}{' '}
                                            {intensityDisplay.unit}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Alvo {targetYear}</div>
                                        <div className="font-semibold tabular-nums">
                                            {(intensityDisplay.isIntensity ? fmt2 : fmt0)(focusMeta.target?.valorNearTerm)}{' '}
                                            {intensityDisplay.unit}
                                        </div>
                                    </div>
                                    <div>
                                        <div className="text-[10px] uppercase tracking-wide text-gray-500">Redução</div>
                                        <div className="font-semibold text-[#2F6F5E]">−{Math.round(focusMeta.target?.reducaoNearTermPct || 0)}%</div>
                                    </div>
                                </div>
                            </div>
                        </Card>
                    )}

                    {/* Nível 2 — Cenários DESTA meta + comparar */}
                    <div className="flex items-center justify-between mb-2 gap-2 flex-wrap">
                        <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                            Cenários desta meta
                        </div>
                        <span className="text-xs text-gray-500 flex items-center gap-1">
                            Comparar cenários <Switch size="small" checked={compare} onChange={setCompare} />
                        </span>
                    </div>
                    <div className="flex flex-wrap items-center gap-2 mb-4">
                    {scenariosOfMeta.map((s) => {
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
                                        <Tooltip title="Remover cenário">
                                            <button
                                                type="button"
                                                onClick={() => removeScenario(s.id)}
                                                className={`pr-3 pl-1 py-1.5 ${active ? 'text-white/70 hover:text-white' : 'text-gray-400 hover:text-[#b9462f]'}`}
                                            >
                                                <CloseOutlined style={{ fontSize: 11 }} />
                                            </button>
                                        </Tooltip>
                                    </>
                                )}
                            </div>
                        );
                    })}
                    <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={handleAddScenario}>
                        Novo cenário
                    </Button>
                </div>

                {activeScenario ? (
                  <>
                    <ScenarioKpis
                        bauTarget={intensityDisplay.toDisplay(bauTarget)}
                        scenarioTarget={intensityDisplay.toDisplay(scenarioTarget)}
                        metaTarget={intensityDisplay.toDisplay(focusMetaTarget)}
                        gap={intensityDisplay.toDisplay(focusGap.gap)}
                        unit={intensityDisplay.unit}
                        targetYear={targetYear}
                        metaName={focusMeta?.meta.name || ''}
                    />

                    {dashboard}

                    {compare && <ScenarioComparisonTable rows={comparisonRows} targetYear={targetYear} metaName={focusMeta?.meta.name || ''} />}
                  </>
                ) : (
                    <Empty
                        className="py-12"
                        description="Nenhum cenário nesta meta. Clique em “Novo cenário” para começar."
                    />
                )}
                  </>
                )}
            </Spin>

            {zoomModal}
        </div>
    );
}

export default ScenariosPage;
