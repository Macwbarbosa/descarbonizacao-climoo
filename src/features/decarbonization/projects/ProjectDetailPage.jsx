import React, { useEffect, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Empty, Tag, message } from 'antd';
import { ArrowLeftOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import useProjectsStore from './store/useProjectsStore';
import useBauStore from '../bau/store/useBauStore';
import useDriversStore from '../drivers/store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import useTechnologyBankStore from '../../../store/technologyBankStore';
import { mergedInitiatives } from './utils/initiativeCatalog';
import { activitiesForProject, metaNamesOf, projectMetaIds } from '../shared/metaScopes';
import { indicePorAno } from '../drivers/utils/driverIndex';
import { isIntensityType, reductionTypeOf } from '../targets-timeframe/services/sbtiTargetService';
import ProjectEditor from './components/ProjectEditor';
import CoverageMatrixTab from './components/CoverageMatrixTab';

/**
 * Tela cheia de um Projeto (rota `/projects/:id`). Aberta ao clicar numa linha
 * da lista. Mostra o editor do projeto e, abaixo, a Matriz de cobertura JÁ
 * FILTRADA pelos escopos das metas vinculadas ao projeto — com mais espaço.
 */
function ProjectDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const projects = useProjectsStore((s) => s.projects);
    const bank = useProjectsStore((s) => s.bank);
    const loading = useProjectsStore((s) => s.loading);
    const loadProjects = useProjectsStore((s) => s.loadProjects);
    const patchProject = useProjectsStore((s) => s.patchProject);
    const removeProject = useProjectsStore((s) => s.removeProject);

    const activities = useBauStore((s) => s.activities);
    const targetYear = useBauStore((s) => s.targetYear);
    const loadActivities = useBauStore((s) => s.loadActivities);
    const drivers = useDriversStore((s) => s.drivers);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);
    const { baseYear, netZeroYear } = usePlanTargetsStore((s) => s.params);
    const metas = usePlanTargetsStore((s) => s.metas);
    const loadPlanData = usePlanTargetsStore((s) => s.loadPlanData);
    const technologies = useTechnologyBankStore((s) => s.technologies);

    useEffect(() => {
        loadPlanData().catch(() => {});
        loadDrivers().catch(() => {});
        loadActivities().catch(() => {});
        loadProjects().catch(() => message.error('Erro ao carregar projetos.'));
    }, [loadPlanData, loadDrivers, loadActivities, loadProjects]);

    const initiatives = useMemo(() => mergedInitiatives(bank, technologies), [bank, technologies]);
    const metasById = useMemo(() => Object.fromEntries((metas || []).map((m) => [m.id, m])), [metas]);
    const ctx = useMemo(
        () => ({
            baseYear,
            endYear: netZeroYear,
            activitiesById: Object.fromEntries(activities.map((a) => [a.id, a])),
            driversById: Object.fromEntries(drivers.map((d) => [d.id, d])),
        }),
        [baseYear, netZeroYear, activities, drivers]
    );

    const project = projects.find((p) => p.id === id) || null;

    // Inventário restrito aos escopos das metas do projeto (+ atividades já membro).
    const allowedActivities = useMemo(
        () => (project ? activitiesForProject(activities, project, metasById) : activities),
        [activities, project, metasById]
    );
    const metaNames = project ? metaNamesOf(project, metasById) : [];

    // Se o projeto pertence a uma meta de INTENSIDADE, as emissões das atividades
    // são mostradas como indicador (tCO2e ÷ denominador projetado por ano).
    const intensity = useMemo(() => {
        const off = { unit: 'tCO2e', denomByYear: null };
        if (!project) return off;
        const meta = projectMetaIds(project)
            .map((mid) => metasById[mid])
            .find((m) => m && isIntensityType(reductionTypeOf(m)) && m.denominatorDriverId);
        if (!meta) return off;
        const driver = drivers.find((d) => d.id === meta.denominatorDriverId);
        if (!driver) return off;
        const proj = indicePorAno(driver, { baseYear, endYear: netZeroYear }).map((p) => ({
            year: p.year,
            value: driver.baseValue > 0 ? (driver.baseValue * p.index) / 100 : p.index,
        }));
        return { unit: `tCO2e/${driver.unit || 'un.'}`, denomByYear: Object.fromEntries(proj.map((p) => [p.year, p.value])) };
    }, [project, metasById, drivers, baseYear, netZeroYear]);


    const handleRemove = (projectId) => {
        removeProject(projectId);
        message.success('Projeto removido.');
        navigate('/projects');
    };

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 gap-3">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/projects')}
                        className="text-xs text-gray-500 hover:text-[#210856] inline-flex items-center gap-1"
                    >
                        <ArrowLeftOutlined /> Projetos
                    </button>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">
                        {project ? project.name : 'Projeto'}
                    </h2>
                    <div className="mt-1">
                        {metaNames.length > 0 ? (
                            metaNames.map((n) => (
                                <Tag key={n} color="purple" className="rounded-full m-0 mr-1">
                                    {n}
                                </Tag>
                            ))
                        ) : (
                            <span className="text-sm text-gray-400">Sem meta vinculada</span>
                        )}
                    </div>
                </div>
                <div className="flex items-center gap-2">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/projects')}>
                        Voltar
                    </Button>
                </div>
            </div>

            <Spin spinning={loading}>
                {project ? (
                    <ProjectEditor
                        project={project}
                        metas={metas}
                        initiatives={initiatives}
                        ctx={ctx}
                        targetYear={targetYear}
                        onPatch={(patch) => patchProject(project.id, patch)}
                        onRemove={handleRemove}
                        activityGridSlot={
                            <CoverageMatrixTab
                                activities={allowedActivities}
                                projects={projects}
                                initiatives={initiatives}
                                ctx={ctx}
                                baseYear={baseYear}
                                endYear={netZeroYear}
                                currentProjectId={project.id}
                                memberIds={project.memberActivityIds || []}
                                onSetMembers={(ids) => patchProject(project.id, { memberActivityIds: ids })}
                                unit={intensity.unit}
                                denomByYear={intensity.denomByYear}
                            />
                        }
                    />
                ) : (
                    !loading && (
                        <Card>
                            <div className="flex justify-center items-center py-16">
                                <Empty description="Projeto não encontrado.">
                                    <Button
                                        type="primary"
                                        onClick={() => navigate('/projects')}
                                        className="bg-[#210856] border-[#210856]"
                                    >
                                        Voltar para a lista
                                    </Button>
                                </Empty>
                            </div>
                        </Card>
                    )
                )}
            </Spin>
        </div>
    );
}

export default ProjectDetailPage;
