import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Switch, Button, Tag, Select, Tooltip, Empty } from 'antd';
import { SettingOutlined, DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import { abatementInYear } from '../../projects/utils/projectAbatement';
import ProjectOverrideModal from './ProjectOverrideModal';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

const scopesOf = (project, activitiesById) => {
    const set = new Set((project.memberActivityIds || []).map((id) => activitiesById[id]?.scope).filter(Boolean));
    return [...set];
};

/** Coluna esquerda: Projetos do cenário (liga/desliga, resumo, override, adicionar). */
function ScenarioProjectsColumn({ scenario, projects, initiativesById, ctx, targetYear, onToggle, onUpsertItem, onRemoveItem }) {
    const [overrideFor, setOverrideFor] = useState(null);
    const projectsById = Object.fromEntries(projects.map((p) => [p.id, p]));

    const itemsResolved = (scenario?.items || [])
        .map((it) => ({ item: it, project: projectsById[it.projetoId] }))
        .filter((x) => x.project);
    const availableToAdd = projects.filter((p) => !(scenario?.items || []).some((it) => it.projetoId === p.id));

    const overrideProject = overrideFor ? projectsById[overrideFor] : null;
    const overrideItem = overrideFor ? (scenario.items || []).find((it) => it.projetoId === overrideFor) : null;

    return (
        <Card>
            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Projetos no cenário</span>
                <span className="text-[11px] text-gray-400">{itemsResolved.length}</span>
            </div>


            <div className="space-y-2">
                {itemsResolved.length === 0 && (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum projeto. Adicione abaixo." />
                )}
                {itemsResolved.map(({ item, project }) => {
                    const initiative = initiativesById[project.initiativeId] || null;
                    // Abatimento POTENCIAL do projeto (soma das reduções das suas atividades).
                    // Na cascata esse valor pode ser limitado pelo cap de dupla contagem.
                    const abat = abatementInYear(project, targetYear, initiative, ctx, item.overrides);
                    const hasOverride = !!item.overrides;
                    return (
                        <div key={project.id} className={`rounded-lg border p-3 ${item.included ? 'border-[#210856]' : 'border-gray-200 opacity-70'}`}>
                            <div className="flex items-start justify-between gap-2">
                                <span className="text-sm font-semibold text-[#210856] break-words leading-snug">{project.name}</span>
                                <Switch size="small" checked={item.included} onChange={(c) => onToggle(project.id, c)} className="mt-0.5 shrink-0" />
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">
                                {scopesOf(project, ctx.activitiesById).map((s) => <Tag key={s} className="rounded-full m-0 mr-1 text-[10px]">{s}</Tag>)}
                                {(project.memberActivityIds || []).length} ativ. · −{fmt(abat)} tCO2e em {targetYear}
                                {hasOverride && <Tag color="purple" className="rounded-full ml-1 text-[10px]">override</Tag>}
                            </div>
                            <div className="flex items-center gap-1 mt-2">
                                <Tooltip title="Override de abrangência/tempo neste cenário">
                                    <Button size="small" icon={<SettingOutlined />} onClick={() => setOverrideFor(project.id)}>Override</Button>
                                </Tooltip>
                                <Button size="small" type="text" danger icon={<DeleteOutlined />} onClick={() => onRemoveItem(project.id)} />
                            </div>
                        </div>
                    );
                })}
            </div>

            <div className="mt-3">
                <Select
                    placeholder="+ adicionar projeto"
                    value={null}
                    style={{ width: '100%' }}
                    disabled={availableToAdd.length === 0}
                    options={availableToAdd.map((p) => ({ value: p.id, label: p.name }))}
                    onChange={(pid) => pid && onUpsertItem(pid, { included: true })}
                    suffixIcon={<PlusOutlined />}
                />
            </div>

            <ProjectOverrideModal
                open={!!overrideFor}
                project={overrideProject}
                item={overrideItem}
                baseYear={ctx.baseYear}
                endYear={ctx.endYear}
                onSave={(overrides) => onUpsertItem(overrideFor, { overrides })}
                onClear={() => onUpsertItem(overrideFor, { overrides: undefined })}
                onClose={() => setOverrideFor(null)}
            />
        </Card>
    );
}

ScenarioProjectsColumn.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    scenario: PropTypes.object,
    projects: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    // eslint-disable-next-line react/forbid-prop-types
    initiativesById: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    ctx: PropTypes.object.isRequired,
    targetYear: PropTypes.number.isRequired,
    onToggle: PropTypes.func.isRequired,
    onUpsertItem: PropTypes.func.isRequired,
    onRemoveItem: PropTypes.func.isRequired,
};

ScenarioProjectsColumn.defaultProps = { scenario: null };

export default ScenarioProjectsColumn;
