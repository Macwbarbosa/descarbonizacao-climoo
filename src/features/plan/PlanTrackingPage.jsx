import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Avatar,
    Button,
    Card,
    Checkbox,
    DatePicker,
    Empty,
    Input,
    Popconfirm,
    Progress,
    Select,
    Spin,
    Tag,
    Typography,
    message,
} from 'antd';
import {
    CalendarOutlined,
    CheckCircleFilled,
    CheckSquareOutlined,
    DeleteOutlined,
    DownOutlined,
    PlusOutlined,
    RightOutlined,
    SaveOutlined,
    TeamOutlined,
    UserOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { Link } from 'react-router-dom';

import { useAuthStore } from '@/features/auth/shared/store/authStore';
import { formatCnpj } from '@/features/decarbonization/shared/decarbonizationStorage';
import { listCompanyUsers } from '@/features/admin/companiesAPI';
import { getPlan, savePlan, emptyPlan, deriveStatus, effectiveStatus } from './planAPI';
import { statusMeta, STATUS_OPTIONS } from './status';
import PlanGantt from './components/PlanGantt';

const { Title, Text, Paragraph } = Typography;

const MONTHS_PT = ['janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho', 'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro'];

/** 'YYYY-MM' → 'julho de 2026'. */
const kickoffLabel = (ym) => {
    const m = /^(\d{4})-(\d{2})$/.exec(String(ym || ''));
    if (!m) return '';
    return `${MONTHS_PT[Number(m[2]) - 1]} de ${m[1]}`;
};

/** 'YYYY-MM-DD' → 'DD/MM/YYYY'. */
const formatDate = (d) => {
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(d || ''));
    return m ? `${m[3]}/${m[2]}/${m[1]}` : '';
};

const uid = () => `t-${Math.random().toString(36).slice(2, 9)}`;

/** Chip de status (Concluído / Em andamento / Não iniciado). */
function StatusChip({ status }) {
    const meta = statusMeta(status);
    return (
        <span
            className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
            style={{ background: meta.chipBg, color: meta.chipText }}
        >
            {status === 'concluido' && <CheckCircleFilled />}
            {meta.label}
        </span>
    );
}

/** Card de uma etapa (número, título, status, tarefas, prazo). Clicável = expande. */
function StageCard({ index, stage, expanded, onToggle }) {
    const status = effectiveStatus(stage);
    const done = status === 'concluido';
    const active = status === 'andamento';
    const bg = done ? '#210856' : active ? '#f4effd' : '#f1f2f6';
    const numColor = done ? '#fff' : '#210856';
    const titleColor = done ? '#fff' : '#210856';
    const period =
        stage.startDate || stage.endDate
            ? [stage.startDate, stage.endDate].filter(Boolean).map(formatDate).join(' → ')
            : null;
    const tasksDone = stage.tasks.filter((t) => t.done).length;

    return (
        <button
            type="button"
            onClick={() => onToggle(index)}
            className="text-left rounded-2xl p-4 h-full w-full border-0 cursor-pointer hover:shadow-md transition-shadow"
            style={{ background: bg, outline: expanded ? '2px solid #9354e0' : 'none', outlineOffset: 2 }}
        >
            <div className="flex items-start justify-between">
                <span className="text-2xl font-bold" style={{ color: numColor }}>
                    {String(index + 1).padStart(2, '0')}
                </span>
                <span style={{ color: done ? '#c9bdf0' : '#9385c4' }}>
                    {expanded ? <DownOutlined /> : <RightOutlined />}
                </span>
            </div>
            <div className="mt-2 font-semibold leading-snug" style={{ color: titleColor }}>
                {stage.title}
            </div>
            <div className="mt-2 flex flex-col gap-1">
                <StatusChip status={status} />
                {stage.tasks.length > 0 && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: done ? '#d7cef2' : '#7c6bb0' }}>
                        <CheckSquareOutlined /> {tasksDone}/{stage.tasks.length} tarefas
                    </span>
                )}
                {stage.note && (
                    <span className="text-[11px]" style={{ color: done ? '#d7cef2' : '#7c6bb0' }}>
                        {stage.note}
                    </span>
                )}
                {period && (
                    <span className="text-[11px] flex items-center gap-1" style={{ color: done ? '#c9bdf0' : '#8a7bbf' }}>
                        <CalendarOutlined /> {period}
                    </span>
                )}
            </div>
        </button>
    );
}

/** Painel de detalhe da etapa expandida (edição inline + tarefas indentadas). */
function StageDetail({ index, stage, canEdit, canRemove, onChange, onRemove, onClose }) {
    const [newTask, setNewTask] = useState('');
    const status = effectiveStatus(stage);
    const tasksDone = stage.tasks.filter((t) => t.done).length;

    const addTask = () => {
        const title = newTask.trim();
        if (!title) return;
        onChange({ tasks: [...stage.tasks, { id: uid(), title, done: false }] });
        setNewTask('');
    };
    const toggleTask = (id) => onChange({ tasks: stage.tasks.map((t) => (t.id === id ? { ...t, done: !t.done } : t)) });
    const removeTask = (id) => onChange({ tasks: stage.tasks.filter((t) => t.id !== id) });

    return (
        <Card
            className="mt-3"
            styles={{ body: { padding: 20 } }}
            style={{ borderColor: '#e4d9fb' }}
        >
            <div className="flex items-center justify-between mb-3">
                <Text strong className="text-[#210856]">
                    Etapa {index + 1} — detalhes
                </Text>
                <Button type="text" size="small" onClick={onClose}>
                    Recolher
                </Button>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Coluna esquerda: metadados */}
                <div className="flex flex-col gap-3">
                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Nome da etapa</label>
                        <Input
                            value={stage.title}
                            onChange={(e) => onChange({ title: e.target.value })}
                            disabled={!canEdit}
                        />
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Status</label>
                        {stage.tasks.length > 0 ? (
                            <div className="flex items-center gap-2">
                                <StatusChip status={status} />
                                <Text type="secondary" className="text-xs">
                                    definido pelas tarefas ({tasksDone}/{stage.tasks.length})
                                </Text>
                            </div>
                        ) : (
                            <Select
                                value={stage.status}
                                onChange={(v) => onChange({ status: v })}
                                options={STATUS_OPTIONS}
                                disabled={!canEdit}
                                style={{ width: '100%' }}
                            />
                        )}
                    </div>

                    <div className="flex gap-3">
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Data de início</label>
                            <DatePicker
                                format="DD/MM/YYYY"
                                allowClear
                                className="w-full"
                                placeholder="dd/mm/aaaa"
                                disabled={!canEdit}
                                value={stage.startDate ? dayjs(stage.startDate) : null}
                                onChange={(d) => onChange({ startDate: d ? d.format('YYYY-MM-DD') : null })}
                            />
                        </div>
                        <div className="flex-1">
                            <label className="block text-xs text-gray-500 mb-1">Data de fim (prazo)</label>
                            <DatePicker
                                format="DD/MM/YYYY"
                                allowClear
                                className="w-full"
                                placeholder="dd/mm/aaaa"
                                disabled={!canEdit}
                                value={stage.endDate ? dayjs(stage.endDate) : null}
                                onChange={(d) => onChange({ endDate: d ? d.format('YYYY-MM-DD') : null })}
                            />
                        </div>
                    </div>

                    <div>
                        <label className="block text-xs text-gray-500 mb-1">Observação (opcional)</label>
                        <Input
                            placeholder="Ex.: responsável, marco, “ainda em 2026”"
                            value={stage.note}
                            onChange={(e) => onChange({ note: e.target.value })}
                            disabled={!canEdit}
                        />
                    </div>
                </div>

                {/* Coluna direita: tarefas (checklist indentada) */}
                <div>
                    <label className="block text-xs text-gray-500 mb-1">
                        Tarefas — marque para concluir a etapa
                    </label>
                    {stage.tasks.length > 0 ? (
                        <ul className="list-none m-0 p-0 pl-4 border-l-2 border-[#e4d9fb] flex flex-col gap-1.5">
                            {stage.tasks.map((t) => (
                                <li key={t.id} className="flex items-center gap-2 group">
                                    <Checkbox checked={t.done} disabled={!canEdit} onChange={() => toggleTask(t.id)}>
                                        <span className={t.done ? 'line-through text-gray-400' : 'text-gray-700'}>
                                            {t.title}
                                        </span>
                                    </Checkbox>
                                    {canEdit && (
                                        <Button
                                            type="text"
                                            size="small"
                                            danger
                                            icon={<DeleteOutlined />}
                                            className="ml-auto opacity-0 group-hover:opacity-100"
                                            onClick={() => removeTask(t.id)}
                                        />
                                    )}
                                </li>
                            ))}
                        </ul>
                    ) : (
                        <Text type="secondary" className="text-xs block mb-2">
                            Nenhuma tarefa cadastrada ainda.
                        </Text>
                    )}

                    {canEdit && (
                        <div className="flex gap-2 mt-3">
                            <Input
                                placeholder="Nova tarefa (ex.: Coletar dados de energia)"
                                value={newTask}
                                onChange={(e) => setNewTask(e.target.value)}
                                onPressEnter={addTask}
                            />
                            <Button icon={<PlusOutlined />} onClick={addTask}>
                                Adicionar
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {canEdit && canRemove && (
                <div className="mt-4 pt-3 border-t border-gray-100">
                    <Popconfirm
                        title="Remover esta etapa?"
                        description="A etapa e suas tarefas serão excluídas ao salvar."
                        okText="Remover"
                        okButtonProps={{ danger: true }}
                        onConfirm={onRemove}
                    >
                        <Button danger size="small" icon={<DeleteOutlined />}>
                            Remover etapa
                        </Button>
                    </Popconfirm>
                </div>
            )}
        </Card>
    );
}

export default function PlanTrackingPage() {
    const isAdmin = useAuthStore((s) => s.role === 'admin');
    const canEditFlag = useAuthStore((s) => Boolean(s.profile?.can_edit_plan));
    const selectedCompany = useAuthStore((s) => s.user?.selectedCompany);
    const companyId = selectedCompany?.id || null;
    const canEdit = isAdmin || canEditFlag;

    const [plan, setPlan] = useState(emptyPlan());
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [dirty, setDirty] = useState(false);
    const [expandedIdx, setExpandedIdx] = useState(null);

    useEffect(() => {
        let cancelled = false;
        if (!companyId) {
            setLoading(false);
            return undefined;
        }
        setLoading(true);
        (async () => {
            try {
                const [p, u] = await Promise.all([getPlan(companyId), listCompanyUsers(companyId)]);
                if (cancelled) return;
                setPlan(p);
                setUsers(u);
                setDirty(false);
                setExpandedIdx(null);
            } catch (e) {
                if (!cancelled) message.error(e.message);
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => {
            cancelled = true;
        };
    }, [companyId]);

    const progress = useMemo(() => {
        const total = plan.stages.length || 1;
        const done = plan.stages.filter((s) => effectiveStatus(s) === 'concluido').length;
        return { done, total, pct: Math.round((done / total) * 100) };
    }, [plan]);

    const mutate = (next) => {
        setPlan(next);
        setDirty(true);
    };

    const updateStage = (idx, patch) =>
        mutate({ ...plan, stages: plan.stages.map((s, i) => (i === idx ? { ...s, ...patch } : s)) });

    const removeStage = (idx) => {
        mutate({ ...plan, stages: plan.stages.filter((_, i) => i !== idx) });
        setExpandedIdx(null);
    };

    const addStage = () => {
        const stages = [
            ...plan.stages,
            { id: `etapa-${Date.now()}`, title: 'Nova etapa', status: 'nao_iniciado', note: '', startDate: null, endDate: null, tasks: [] },
        ];
        mutate({ ...plan, stages });
        setExpandedIdx(stages.length - 1);
    };

    const setKickoff = (d) => mutate({ ...plan, kickoff: d ? d.format('YYYY-MM') : null });

    if (!companyId) {
        return (
            <div className="max-w-2xl">
                <Alert
                    type="info"
                    showIcon
                    message="Selecione uma empresa"
                    description={
                        isAdmin
                            ? 'Escolha uma empresa no seletor do topo (ou em Administração → Empresas) para ver o acompanhamento do plano.'
                            : 'Seu usuário ainda não está vinculado a uma empresa. Fale com o administrador.'
                    }
                />
            </div>
        );
    }

    if (loading) {
        return (
            <div className="flex justify-center py-20">
                <Spin size="large" />
            </div>
        );
    }

    return (
        <div className="w-full">
            {/* Cabeçalho */}
            <div className="flex flex-wrap items-start justify-between gap-3 mb-1">
                <div>
                    <Title level={3} className="!mb-0 climoo-heading !text-[#210856]">
                        {selectedCompany.company}
                    </Title>
                    <Text type="secondary">
                        Plano de Descarbonização · CNPJ {formatCnpj(selectedCompany.cnpj)}
                        {plan.kickoff && ` · início em ${kickoffLabel(plan.kickoff)}`}
                    </Text>
                </div>
                <div className="flex items-center gap-2">
                    {canEdit && (
                        <DatePicker
                            picker="month"
                            allowClear
                            placeholder="Mês de início"
                            value={plan.kickoff ? dayjs(`${plan.kickoff}-01`) : null}
                            onChange={setKickoff}
                            suffixIcon={<CalendarOutlined />}
                        />
                    )}
                    {canEdit && (
                        <Button type="primary" icon={<SaveOutlined />} loading={saving} disabled={!dirty} onClick={handleSaveClick}>
                            {dirty ? 'Salvar alterações' : 'Salvo'}
                        </Button>
                    )}
                </div>
            </div>

            {!canEdit && (
                <Alert
                    className="mb-4 mt-2"
                    type="info"
                    showIcon
                    message="Você está visualizando o acompanhamento (somente leitura). Para editar, peça permissão ao administrador."
                />
            )}

            {/* Resumo de progresso */}
            <Card className="my-4">
                <div className="flex flex-wrap items-center gap-6">
                    <Progress type="circle" percent={progress.pct} size={92} strokeColor="#0E7C66" />
                    <div>
                        <Text strong style={{ fontSize: 16 }} className="text-[#210856]">
                            {progress.done} de {progress.total} etapas concluídas
                        </Text>
                        <Paragraph type="secondary" className="!mb-0">
                            Etapas do método Climoo — do diagnóstico do inventário à submissão SBTi.
                        </Paragraph>
                        <div className="mt-2 flex flex-wrap gap-3 text-xs text-gray-500">
                            <Link to="/inventory" className="text-[#341472] hover:text-[#9354e0]">Abrir Inventário →</Link>
                            <Link to="/targets" className="text-[#341472] hover:text-[#9354e0]">Metas →</Link>
                            <Link to="/bau" className="text-[#341472] hover:text-[#9354e0]">Projeção BAU →</Link>
                            <Link to="/scenarios" className="text-[#341472] hover:text-[#9354e0]">Cenários →</Link>
                        </div>
                    </div>
                </div>
            </Card>

            {/* Etapas */}
            <div className="flex items-center justify-between mb-2">
                <Text strong className="text-[#210856]" style={{ fontSize: 15 }}>
                    Etapas do plano
                </Text>
                {canEdit && (
                    <Button size="small" icon={<PlusOutlined />} onClick={addStage}>
                        Adicionar etapa
                    </Button>
                )}
            </div>
            <div className="grid gap-3 grid-cols-2 md:grid-cols-3 xl:grid-cols-4">
                {plan.stages.map((s, i) => (
                    <StageCard
                        key={s.id}
                        index={i}
                        stage={s}
                        expanded={expandedIdx === i}
                        onToggle={(idx) => setExpandedIdx((cur) => (cur === idx ? null : idx))}
                    />
                ))}
            </div>

            {/* Detalhe da etapa expandida */}
            {expandedIdx != null && plan.stages[expandedIdx] && (
                <StageDetail
                    index={expandedIdx}
                    stage={plan.stages[expandedIdx]}
                    canEdit={canEdit}
                    canRemove={plan.stages.length > 1}
                    onChange={(patch) => updateStage(expandedIdx, patch)}
                    onRemove={() => removeStage(expandedIdx)}
                    onClose={() => setExpandedIdx(null)}
                />
            )}

            {/* Cronograma */}
            <Card className="mt-6" title={<span className="text-[#210856] font-semibold">Cronograma de implementação</span>}>
                <PlanGantt stages={plan.stages} />
                {canEdit && (
                    <Text type="secondary" className="text-xs">
                        Defina a data de início e fim de cada etapa clicando no card correspondente.
                    </Text>
                )}
            </Card>

            {/* Usuários da empresa */}
            <Card
                className="mt-6"
                title={
                    <span className="text-[#210856] font-semibold flex items-center gap-2">
                        <TeamOutlined /> Usuários da empresa
                    </span>
                }
                extra={
                    isAdmin && (
                        <Link to="/admin" className="text-[#341472] hover:text-[#9354e0] text-sm">
                            Gerenciar em Administração →
                        </Link>
                    )
                }
            >
                {users.length ? (
                    <div className="flex flex-col divide-y divide-gray-100">
                        {users.map((u) => (
                            <div key={u.id} className="flex items-center gap-3 py-2">
                                <Avatar style={{ background: '#210856' }} icon={<UserOutlined />} />
                                <div className="flex-1">
                                    <div className="text-sm text-gray-800">{u.name || u.email}</div>
                                    <div className="text-xs text-gray-400">{u.email}</div>
                                </div>
                                {u.role === 'admin' && <Tag color="#210856">admin</Tag>}
                                {u.role !== 'admin' && u.can_edit_plan && <Tag color="purple">edita o plano</Tag>}
                            </div>
                        ))}
                    </div>
                ) : (
                    <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="Nenhum usuário vinculado a esta empresa." />
                )}
            </Card>
        </div>
    );

    async function handleSaveClick() {
        setSaving(true);
        try {
            await savePlan(companyId, plan);
            setDirty(false);
            message.success('Acompanhamento salvo.');
        } catch (e) {
            message.error(e.message);
        } finally {
            setSaving(false);
        }
    }
}
