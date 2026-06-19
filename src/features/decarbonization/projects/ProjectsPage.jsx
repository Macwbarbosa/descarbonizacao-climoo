import React, { useEffect, useMemo, useState } from 'react';
import { Button, Spin, Alert, Tabs, message } from 'antd';
import { SaveOutlined } from '@ant-design/icons';
import useProjectsStore from './store/useProjectsStore';
import useBauStore from '../bau/store/useBauStore';
import useDriversStore from '../drivers/store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import useTechnologyBankStore from '../../../store/technologyBankStore';
import DecarbonizationDataBar from '../shared/DecarbonizationDataBar';
import { saveCompanyToProject } from '../shared/decarbonizationExport';
import { mergedInitiatives } from './utils/initiativeCatalog';
import ProjectsTab from './components/ProjectsTab';
import CoverageMatrixTab from './components/CoverageMatrixTab';

/**
 * Etapa 5 — Projetos de Descarbonização. 2 abas: Projetos (master-detail) e
 * Matriz de cobertura. As iniciativas vêm do CATÁLOGO GLOBAL (Banco de
 * tecnologias) + iniciativas EXCLUSIVAS da empresa criadas aqui. O abatimento é
 * derivado ao vivo (grupo × abrangência × eficácia), consumindo a emissão por
 * atividade do BAU.
 */
function ProjectsPage() {
    const projects = useProjectsStore((s) => s.projects);
    const bank = useProjectsStore((s) => s.bank);
    const selectedProjectId = useProjectsStore((s) => s.selectedProjectId);
    const loading = useProjectsStore((s) => s.loading);
    const error = useProjectsStore((s) => s.error);
    const loadProjects = useProjectsStore((s) => s.loadProjects);
    const selectProject = useProjectsStore((s) => s.selectProject);
    const addProject = useProjectsStore((s) => s.addProject);
    const patchProject = useProjectsStore((s) => s.patchProject);
    const removeProject = useProjectsStore((s) => s.removeProject);
    const assignActivityToProject = useProjectsStore((s) => s.assignActivityToProject);

    const activities = useBauStore((s) => s.activities);
    const targetYear = useBauStore((s) => s.targetYear);
    const loadActivities = useBauStore((s) => s.loadActivities);
    const drivers = useDriversStore((s) => s.drivers);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);
    const { baseYear, netZeroYear } = usePlanTargetsStore((s) => s.params);
    // Catálogo global compartilhado (Banco de tecnologias) — fonte das iniciativas.
    const technologies = useTechnologyBankStore((s) => s.technologies);

    useEffect(() => {
        loadDrivers().catch(() => {});
        loadActivities().catch(() => {});
        loadProjects().catch(() => message.error('Erro ao carregar projetos.'));
    }, [loadDrivers, loadActivities, loadProjects]);

    // Iniciativas disponíveis = exclusivas da empresa (por CNPJ) + catálogo global.
    const initiatives = useMemo(() => mergedInitiatives(bank, technologies), [bank, technologies]);

    // Contexto de cálculo (reutiliza emissão por atividade do BAU).
    const ctx = useMemo(
        () => ({
            baseYear,
            endYear: netZeroYear,
            activitiesById: Object.fromEntries(activities.map((a) => [a.id, a])),
            driversById: Object.fromEntries(drivers.map((d) => [d.id, d])),
        }),
        [baseYear, netZeroYear, activities, drivers]
    );

    const [saving, setSaving] = useState(false);
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

    const tabs = [
        {
            key: 'projetos',
            label: 'Projetos',
            children: (
                <ProjectsTab
                    projects={projects}
                    selectedProjectId={selectedProjectId}
                    initiatives={initiatives}
                    activities={activities}
                    ctx={ctx}
                    targetYear={targetYear}
                    onSelect={selectProject}
                    onAdd={addProject}
                    onPatch={patchProject}
                    onRemove={removeProject}
                />
            ),
        },
        {
            key: 'cobertura',
            label: 'Matriz de cobertura',
            children: (
                <CoverageMatrixTab
                    activities={activities}
                    projects={projects}
                    initiatives={initiatives}
                    ctx={ctx}
                    baseYear={baseYear}
                    endYear={netZeroYear}
                    onAssign={assignActivityToProject}
                />
            ),
        },
    ];

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <DecarbonizationDataBar />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp;{' '}
                        <span className="text-[#210856] font-medium">Projetos</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Projetos de Descarbonização</h2>
                    <p className="text-sm text-gray-500">
                        Agrupe atividades emissoras e aplique uma iniciativa do banco, com abrangência no tempo. O
                        abatimento = grupo × abrangência × eficácia.
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
                    Salvar no projeto (JSON)
                </Button>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                <Tabs items={tabs} />
            </Spin>
        </div>
    );
}

export default ProjectsPage;
