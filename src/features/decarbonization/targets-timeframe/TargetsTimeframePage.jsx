import React, { useEffect, useMemo } from 'react';
import { Button, Spin, Alert, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import usePlanTargetsStore from './store/usePlanTargetsStore';
import useDriversStore from '../drivers/store/useDriversStore';
import useInventoryStore from '../inventory/store/useInventoryStore';
import { aggregateByScope, activitiesForYear } from '../inventory/utils/inventoryAggregate';
import { indicePorAno } from '../drivers/utils/driverIndex';
import { computeMetaTarget } from './services/sbtiTargetService';
import { validateMetas } from './utils/metaValidation';
import DecarbonizationDataBar from '../shared/DecarbonizationDataBar';
import { saveCompanyToProject } from '../shared/decarbonizationExport';
import PlanTimeframePanel from './components/PlanTimeframePanel';
import MetasPanel from './components/MetasPanel';
import CoverageOverviewPanel from './components/CoverageOverviewPanel';

/**
 * Tela "Metas & Período" (SBTi) — período único no topo + lista de MÚLTIPLAS
 * metas, cada uma configurada e derivada separadamente (cada meta gera a sua
 * trajetória). Recálculo ao vivo; sem perfis de visualização.
 */
function TargetsTimeframePage() {
    const params = usePlanTargetsStore((s) => s.params);
    const metas = usePlanTargetsStore((s) => s.metas);
    const selectedMetaId = usePlanTargetsStore((s) => s.selectedMetaId);
    const loading = usePlanTargetsStore((s) => s.loading);
    const saving = usePlanTargetsStore((s) => s.saving);
    const error = usePlanTargetsStore((s) => s.error);
    const loadPlanData = usePlanTargetsStore((s) => s.loadPlanData);
    const selectMeta = usePlanTargetsStore((s) => s.selectMeta);
    const addMeta = usePlanTargetsStore((s) => s.addMeta);
    const applySbtiTemplate = usePlanTargetsStore((s) => s.applySbtiTemplate);
    const patchMeta = usePlanTargetsStore((s) => s.patchMeta);
    const removeMeta = usePlanTargetsStore((s) => s.removeMeta);
    const savePlan = usePlanTargetsStore((s) => s.savePlan);

    const drivers = useDriversStore((s) => s.drivers);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);

    // Inventário (fonte única) → totais por escopo derivados ao vivo.
    const inventoryActivities = useInventoryStore((s) => s.activities);
    const loadInventory = useInventoryStore((s) => s.loadInventory);
    // Só o inventário do ano-base alimenta a cobertura das metas.
    const baseActivities = useMemo(
        () => activitiesForYear(inventoryActivities, params.baseYear, params.baseYear),
        [inventoryActivities, params.baseYear]
    );
    const baselineByScope = useMemo(() => aggregateByScope(baseActivities), [baseActivities]);

    useEffect(() => {
        loadPlanData().catch(() => message.error('Erro ao carregar dados do plano de descarbonização.'));
        loadDrivers().catch(() => {});
        loadInventory().catch(() => {});
    }, [loadPlanData, loadDrivers, loadInventory]);

    // Contexto de cálculo das metas (pure → reutilizável também pelos Cenários).
    const ctx = useMemo(
        () => ({
            baseYear: params.baseYear,
            recentYear: params.recentYear,
            planNetZeroYear: params.netZeroYear,
            baselineByScope,
            baseActivities,
            getDenominatorProjection: (driverId) => {
                const driver = drivers.find((d) => d.id === driverId);
                if (!driver) return null;
                return indicePorAno(driver, { baseYear: params.baseYear, endYear: params.netZeroYear }).map((p) => ({
                    year: p.year,
                    value: driver.baseValue > 0 ? (driver.baseValue * p.index) / 100 : p.index,
                }));
            },
        }),
        [params.baseYear, params.recentYear, params.netZeroYear, baselineByScope, baseActivities, drivers]
    );

    // Trajetória derivada POR META (mapa id → target). Recalcula ao vivo.
    const targets = useMemo(() => {
        const map = {};
        metas.forEach((m) => {
            map[m.id] = computeMetaTarget(m, ctx);
        });
        return map;
    }, [metas, ctx]);

    const validation = useMemo(
        () => validateMetas(metas, { baselineByScope, params }),
        [metas, baselineByScope, params]
    );

    const handleSave = async () => {
        try {
            await savePlan();
            try {
                const data = await saveCompanyToProject();
                message.success(`Plano salvo no projeto: decarbonization-data/${data.cnpj}.json`);
            } catch (fileErr) {
                message.warning('Plano salvo localmente. Para gravar o arquivo no projeto, rode em npm run dev.');
            }
        } catch (err) {
            message.error('Erro ao salvar o plano. Tente novamente.');
        }
    };

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <DecarbonizationDataBar />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp;{' '}
                        <span className="text-[#210856] font-medium">Metas &amp; Período</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Metas &amp; Período (SBTi)</h2>
                    <p className="text-sm text-gray-500">
                        Período do plano único no topo; abaixo, várias metas — cada uma calculada e derivada
                        por si, gerando sua própria trajetória.
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                    className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                    size="large"
                >
                    Salvar plano
                </Button>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                <PlanTimeframePanel />
                <MetasPanel
                    metas={metas}
                    selectedMetaId={selectedMetaId}
                    targets={targets}
                    issuesByMeta={validation.metaIssues}
                    params={params}
                    baselineByScope={baselineByScope}
                    baseActivities={baseActivities}
                    drivers={drivers}
                    onSelect={selectMeta}
                    onAdd={addMeta}
                    onApplyTemplate={applySbtiTemplate}
                    onPatch={patchMeta}
                    onRemove={removeMeta}
                />
                <CoverageOverviewPanel baselineByScope={baselineByScope} validation={validation} />
            </Spin>
        </div>
    );
}

export default TargetsTimeframePage;
