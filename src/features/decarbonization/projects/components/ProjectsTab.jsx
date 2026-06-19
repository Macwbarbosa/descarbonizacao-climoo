import React from 'react';
import PropTypes from 'prop-types';
import { Button, Row, Col, Empty, Tag } from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import { abatementInYear } from '../utils/projectAbatement';
import ProjectEditor from './ProjectEditor';

const fmt = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/** Aba "Projetos" em master-detail: lista à esquerda, editor à direita. */
function ProjectsTab({ projects, selectedProjectId, initiatives, activities, ctx, targetYear, onSelect, onAdd, onPatch, onRemove }) {
    const selected = projects.find((p) => p.id === selectedProjectId) || null;
    const initiativeName = (id) => initiatives.find((i) => i.id === id)?.name || '—';

    return (
        <Row gutter={16}>
            <Col xs={24} lg={8} xl={7}>
                <Card>
                    <div className="flex items-center justify-between mb-2">
                        <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Projetos</span>
                        <span className="text-[11px] text-gray-400">{projects.length}</span>
                    </div>
                    <div className="space-y-2">
                        {projects.map((p) => {
                            const sel = p.id === selectedProjectId;
                            const initiative = initiatives.find((i) => i.id === p.initiativeId) || null;
                            const abat = abatementInYear(p, targetYear, initiative, ctx);
                            return (
                                <button
                                    type="button"
                                    key={p.id}
                                    onClick={() => onSelect(p.id)}
                                    className={`w-full text-left rounded-lg border p-3 transition-colors ${
                                        sel ? 'border-[#210856] bg-[#210856]/5' : 'border-gray-200 hover:border-gray-300'
                                    }`}
                                    aria-pressed={sel}
                                >
                                    <div className="font-semibold text-sm text-[#210856] break-words leading-snug">{p.name}</div>
                                    <div className="text-[11px] text-gray-500 mt-0.5 break-words">{initiativeName(p.initiativeId)}</div>
                                    <div className="flex items-center justify-between mt-1.5">
                                        <Tag className="rounded-full m-0 text-[10px]">{(p.memberActivityIds || []).length} ativ.</Tag>
                                        <span className="text-[11px] text-gray-500">−{fmt(abat)} tCO2e em {targetYear}</span>
                                    </div>
                                </button>
                            );
                        })}
                    </div>
                    <Button type="dashed" icon={<PlusOutlined />} onClick={onAdd} block className="mt-3 text-[#210856]">
                        Novo projeto
                    </Button>
                </Card>
            </Col>

            <Col xs={24} lg={16} xl={17}>
                <Card>
                    {selected ? (
                        <ProjectEditor
                            project={selected}
                            initiatives={initiatives}
                            activities={activities}
                            ctx={ctx}
                            targetYear={targetYear}
                            onPatch={(patch) => onPatch(selected.id, patch)}
                            onRemove={onRemove}
                        />
                    ) : (
                        <div className="py-16 flex justify-center">
                            <Empty description="Nenhum projeto selecionado.">
                                <Button type="primary" icon={<PlusOutlined />} onClick={onAdd} className="bg-[#210856] border-[#210856]">
                                    Novo projeto
                                </Button>
                            </Empty>
                        </div>
                    )}
                </Card>
            </Col>
        </Row>
    );
}

ProjectsTab.propTypes = {
    projects: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    selectedProjectId: PropTypes.string,
    initiatives: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    activities: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    // eslint-disable-next-line react/forbid-prop-types
    ctx: PropTypes.object.isRequired,
    targetYear: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
    onPatch: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
};

ProjectsTab.defaultProps = { selectedProjectId: null };

export default ProjectsTab;
