import React, { useEffect, useMemo, useState } from 'react';
import { Button, Table, Tag, Select, Row, Col, Upload, Popconfirm, Tooltip, Tabs, Modal, InputNumber, message } from 'antd';
import { PlusOutlined, UploadOutlined, EditOutlined, DeleteOutlined, DownloadOutlined, ImportOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import { Card, StatCard } from '@/shared/components/ui/Card';
import { useUIStore } from '@/store/uiStore';
import useInventoryStore from './store/useInventoryStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import useProjectsStore from '../projects/store/useProjectsStore';
import { activityToProjectsMap } from '../projects/utils/projectAbatement';
import { useEmissionsStore } from '../../emissions/emissions-table/store/emissionsStore';
import { aggregateByScope, rowsToActivities, emissionsToInventory, activitiesForYear, yearsPresent, SCOPES } from './utils/inventoryAggregate';
import ActivityFormModal from './components/ActivityFormModal';

const SCOPE_COLOR = { 'Escopo 1': '#5B6CB5', 'Escopo 2': '#C98A3A', 'Escopo 3': '#7AA05F' };
const fmt3 = (v) => Number(v).toLocaleString('pt-BR', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

/**
 * Página de Inventário de emissões (por atividade) — fonte única consumida por
 * Metas, BAU e Cenários (que usam o ano-base). Multi-ano: cada ano é uma "aba";
 * dá para importar da Tabela de Emissões (escolhendo o ano), subir planilha
 * (.csv/.xlsx, com colunas grupo e ano) ou cadastrar manualmente.
 */
function InventoryPage() {
    const activities = useInventoryStore((s) => s.activities);
    const years = useInventoryStore((s) => s.years);
    const activeYear = useInventoryStore((s) => s.activeYear);
    const loading = useInventoryStore((s) => s.loading);
    const loadInventory = useInventoryStore((s) => s.loadInventory);
    const addActivity = useInventoryStore((s) => s.addActivity);
    const addActivities = useInventoryStore((s) => s.addActivities);
    const patchActivity = useInventoryStore((s) => s.patchActivity);
    const removeActivity = useInventoryStore((s) => s.removeActivity);
    const removeActivities = useInventoryStore((s) => s.removeActivities);
    const clearYear = useInventoryStore((s) => s.clearYear);
    const setActiveYear = useInventoryStore((s) => s.setActiveYear);
    const addYear = useInventoryStore((s) => s.addYear);
    const removeYear = useInventoryStore((s) => s.removeYear);

    const baseYear = usePlanTargetsStore((s) => s.params.baseYear);
    const recentYear = usePlanTargetsStore((s) => s.params.recentYear);
    const setParam = usePlanTargetsStore((s) => s.setParam);

    // Projetos (para a coluna "Projetos associados"): relação atividade → projeto(s).
    const projects = useProjectsStore((s) => s.projects);
    const loadProjects = useProjectsStore((s) => s.loadProjects);
    const projectsByActivity = useMemo(() => activityToProjectsMap(projects), [projects]);
    const projectNameById = useMemo(() => Object.fromEntries(projects.map((p) => [p.id, p.name])), [projects]);

    // Tabela de Emissões (módulo Emissões) — fonte opcional para preencher o inventário.
    const fetchEmissions = useEmissionsStore((s) => s.fetchEmissions);
    const fetchGroups = useEmissionsStore((s) => s.fetchGroups);
    const groups = useEmissionsStore((s) => s.groups);
    const setSelectedYear = useUIStore((s) => s.setSelectedYear);
    const groupOptions = useMemo(() => (groups || []).map((g) => g.name || g.title).filter(Boolean), [groups]);

    const [scopeFilter, setScopeFilter] = useState('');
    const [modalOpen, setModalOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [importing, setImporting] = useState(false);
    const [importOpen, setImportOpen] = useState(false);
    const [addYearOpen, setAddYearOpen] = useState(false);
    const [yearInput, setYearInput] = useState(baseYear);
    const [selectedRowKeys, setSelectedRowKeys] = useState([]);

    useEffect(() => {
        loadInventory().catch(() => message.error('Erro ao carregar o inventário.'));
        loadProjects().catch(() => {});
        // Busca os grupos do módulo de Emissões para o seletor de Grupo (cadastro de atividade).
        fetchGroups().catch(() => {});
    }, [loadInventory, loadProjects, fetchGroups]);

    // Ano ativo padrão = ano-base do plano.
    useEffect(() => {
        if (activeYear == null && baseYear != null) setActiveYear(baseYear);
    }, [activeYear, baseYear, setActiveYear]);

    const currentYear = activeYear ?? baseYear;
    const tabs = useMemo(() => yearsPresent(activities, baseYear, years), [activities, baseYear, years]);
    const yearActivities = useMemo(() => activitiesForYear(activities, currentYear, baseYear), [activities, currentYear, baseYear]);

    const totals = useMemo(() => aggregateByScope(yearActivities), [yearActivities]);
    const total = totals.scope1 + totals.scope2 + totals.scope3;

    const filtered = scopeFilter ? yearActivities.filter((a) => a.scope === scopeFilter) : yearActivities;

    // Opções de filtro das colunas (valores distintos do ano ativo).
    const categoryFilters = useMemo(
        () => [...new Set(yearActivities.map((a) => a.category))].sort().map((c) => ({ text: c, value: c })),
        [yearActivities]
    );
    const nameFilters = useMemo(
        () => [...new Set(yearActivities.map((a) => a.name))].sort().map((n) => ({ text: n, value: n })),
        [yearActivities]
    );

    const handleSaveActivity = (data) => {
        if (editing) patchActivity(editing.id, data);
        else addActivity(data, currentYear);
        setModalOpen(false);
        setEditing(null);
    };


    // Aplica linhas (objetos com cabeçalho) ao ano ativo (respeita coluna ano por linha).
    const applyRows = (rows) => {
        const { activities: parsed, skipped } = rowsToActivities(rows, () => uuidv4(), currentYear);
        if (parsed.length === 0) {
            message.error('Nenhuma atividade válida. Cabeçalhos: escopo, categoria, atividade, emissao (opcionais: grupo, ano).');
            return;
        }
        addActivities(parsed, currentYear);
        message.success(`${parsed.length} atividade(s) importada(s)${skipped ? ` · ${skipped} linha(s) ignorada(s)` : ''}.`);
    };

    // Upload CSV ou XLSX — parse client-side, sem enviar a lugar nenhum.
    const beforeUpload = (file) => {
        const isXlsx = /\.xlsx?$/i.test(file.name);
        if (isXlsx) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const wb = XLSX.read(e.target.result, { type: 'array' });
                    const ws = wb.Sheets[wb.SheetNames[0]];
                    applyRows(XLSX.utils.sheet_to_json(ws, { defval: '' }));
                } catch (err) {
                    message.error('Falha ao ler a planilha .xlsx.');
                }
            };
            reader.onerror = () => message.error('Falha ao ler o arquivo.');
            reader.readAsArrayBuffer(file);
        } else {
            Papa.parse(file, {
                header: true,
                skipEmptyLines: true,
                complete: (res) => applyRows(res.data),
                error: () => message.error('Falha ao ler o CSV.'),
            });
        }
        return false; // impede upload de rede
    };

    // Baixa um modelo .xlsx com os cabeçalhos esperados (grupo e ano em colunas separadas).
    const handleDownloadTemplate = () => {
        const rows = [
            ['ano', 'grupo', 'escopo', 'categoria', 'atividade', 'emissao'],
            [currentYear, 'Matriz', 'Escopo 1', 'Combustão móvel', 'Diesel (frota própria)', 12000],
            [currentYear, 'Filial SP', 'Escopo 2', 'Energia elétrica', 'Eletricidade adquirida', 8000],
            [currentYear, 'Matriz', 'Escopo 3', 'Compra de bens e serviços', 'Insumos comprados', 30000],
        ];
        const ws = XLSX.utils.aoa_to_sheet(rows);
        ws['!cols'] = [{ wch: 8 }, { wch: 18 }, { wch: 12 }, { wch: 32 }, { wch: 32 }, { wch: 14 }];
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Inventário');
        XLSX.writeFile(wb, 'modelo-inventario-emissoes.xlsx');
    };

    // Preenche o inventário a partir da "Tabela de Emissões" (módulo Emissões) no ano escolhido.
    const handleImportFromEmissions = async () => {
        setImporting(true);
        try {
            setSelectedYear(String(yearInput));
            // Busca emissões + grupos do ano: o grupo vem como ID e precisa virar NOME.
            await Promise.all([fetchEmissions(false).catch(() => {}), fetchGroups().catch(() => {})]);
            const data = useEmissionsStore.getState().emissions;
            const groupNameById = Object.fromEntries(
                (useEmissionsStore.getState().groups || []).map((g) => [g.id, g.name || g.title || ''])
            );
            const resolveGroup = (id) => groupNameById[id] || '';
            const parsed = emissionsToInventory(data, () => uuidv4(), yearInput, resolveGroup);
            if (parsed.length === 0) {
                message.warning(`Nenhum dado na Tabela de Emissões para ${yearInput} (empresa selecionada).`);
                return;
            }
            addActivities(parsed, yearInput);
            setActiveYear(yearInput);
            setImportOpen(false);
            message.success(`${parsed.length} atividade(s) importada(s) da Tabela de Emissões (${yearInput}).`);
        } finally {
            setImporting(false);
        }
    };

    // Exclusão em massa das atividades selecionadas (ano ativo).
    const handleBulkDelete = () => {
        removeActivities(selectedRowKeys);
        message.success(`${selectedRowKeys.length} atividade(s) excluída(s).`);
        setSelectedRowKeys([]);
    };

    // Esvazia o inventário do ano ativo.
    const handleClearYear = () => {
        clearYear(currentYear, baseYear);
        setSelectedRowKeys([]);
        message.success(`Inventário de ${currentYear} limpo.`);
    };

    // Define o ano da aba ativa como ANO-BASE do plano (consumido por Metas/BAU/Cenários).
    const handleSetBaseYear = () => {
        setParam('baseYear', currentYear);
        if (recentYear < currentYear) setParam('recentYear', currentYear);
        message.success(`Ano-base do plano definido como ${currentYear}.`);
    };

    const handleTabEdit = (targetKey, action) => {
        if (action === 'add') {
            setYearInput((tabs[tabs.length - 1] || baseYear) + 1);
            setAddYearOpen(true);
            return;
        }
        const year = Number(targetKey);
        if (year === baseYear) {
            message.info('O ano-base do plano não pode ser removido.');
            return;
        }
        Modal.confirm({
            title: `Remover o ano ${year}?`,
            content: 'As atividades desse ano serão excluídas do inventário.',
            okText: 'Remover',
            okButtonProps: { danger: true },
            cancelText: 'Cancelar',
            onOk: () => removeYear(year, baseYear),
        });
    };

    const columns = [
        {
            title: 'Escopo',
            dataIndex: 'scope',
            key: 'scope',
            width: 110,
            filters: SCOPES.map((s) => ({ text: s, value: s })),
            onFilter: (v, r) => r.scope === v,
            render: (s) => (
                <Tag style={{ borderColor: SCOPE_COLOR[s], color: SCOPE_COLOR[s] }} className="rounded-full">
                    {s}
                </Tag>
            ),
        },
        {
            title: 'Categoria',
            dataIndex: 'category',
            key: 'category',
            width: 240,
            filters: categoryFilters,
            filterSearch: true,
            onFilter: (v, r) => r.category === v,
        },
        {
            title: 'Atividade',
            dataIndex: 'name',
            key: 'name',
            filters: nameFilters,
            filterSearch: true,
            onFilter: (v, r) => r.name === v,
        },
        {
            title: `Emissão ${currentYear} (tCO2e)`,
            dataIndex: 'emission',
            key: 'emission',
            width: 160,
            align: 'right',
            sorter: (a, b) => a.emission - b.emission,
            render: (v) => <span className="tabular-nums">{fmt3(v)}</span>,
        },
        {
            title: 'Projetos associados',
            key: 'projects',
            width: 220,
            render: (_, r) => {
                const ids = projectsByActivity[r.id] || [];
                return ids.length ? (
                    ids.map((pid) => (
                        <Tag key={pid} color="purple" className="rounded-full m-0 mr-1 mb-1 text-[10px]">
                            {projectNameById[pid] || pid}
                        </Tag>
                    ))
                ) : (
                    <span className="text-[12px] text-gray-400">—</span>
                );
            },
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 90,
            align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <Button type="text" icon={<EditOutlined />} onClick={() => { setEditing(r); setModalOpen(true); }} />
                    <Popconfirm title="Excluir atividade?" onConfirm={() => removeActivity(r.id)} okText="Excluir" cancelText="Cancelar">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-3 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp; <span className="text-[#210856] font-medium">Inventário</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Inventário de emissões</h2>
                    <p className="text-sm text-gray-500">
                        Atividades emissoras por ano. Metas, BAU e Cenários usam o ano-base do plano ({baseYear}).
                    </p>
                </div>
            </div>

            <Row gutter={[12, 12]} className="mb-4">
                <Col xs={12} lg={6}><StatCard title={`Total ${currentYear}`} value={fmt3(total)} unit="tCO2e" /></Col>
                <Col xs={12} lg={6}><StatCard title="Escopo 1" value={fmt3(totals.scope1)} unit="tCO2e" /></Col>
                <Col xs={12} lg={6}><StatCard title="Escopo 2" value={fmt3(totals.scope2)} unit="tCO2e" /></Col>
                <Col xs={12} lg={6}><StatCard title="Escopo 3" value={fmt3(totals.scope3)} unit="tCO2e" /></Col>
            </Row>

            <Card>
                {/* Abas por ano (estilo navegador): clique no + para adicionar um ano. */}
                <Tabs
                    type="editable-card"
                    activeKey={String(currentYear)}
                    onChange={(k) => { setActiveYear(Number(k)); setSelectedRowKeys([]); }}
                    onEdit={handleTabEdit}
                    tabBarExtraContent={{
                        right:
                            currentYear === baseYear ? (
                                <Tag color="green" className="rounded-full">ano-base do plano</Tag>
                            ) : (
                                <Tooltip title="Usar este ano como base para Metas, BAU e Cenários">
                                    <Button size="small" onClick={handleSetBaseYear}>
                                        Definir {currentYear} como ano-base
                                    </Button>
                                </Tooltip>
                            ),
                    }}
                    items={tabs.map((y) => ({
                        key: String(y),
                        label: y === baseYear ? `${y} (base)` : String(y),
                        closable: y !== baseYear,
                    }))}
                />

                <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div className="flex items-center gap-2 flex-wrap">
                        <Select
                            value={scopeFilter}
                            onChange={setScopeFilter}
                            style={{ width: 180 }}
                            options={[{ value: '', label: 'Todos os escopos' }, ...SCOPES.map((s) => ({ value: s, label: s }))]}
                        />
                        <span className="text-[11px] text-gray-400">{yearActivities.length} atividades em {currentYear}</span>
                        {selectedRowKeys.length > 0 && (
                            <Popconfirm title={`Excluir ${selectedRowKeys.length} atividade(s) selecionada(s)?`} onConfirm={handleBulkDelete} okText="Excluir" cancelText="Cancelar" okButtonProps={{ danger: true }}>
                                <Button danger size="small" icon={<DeleteOutlined />}>
                                    Excluir selecionadas ({selectedRowKeys.length})
                                </Button>
                            </Popconfirm>
                        )}
                        {yearActivities.length > 0 && (
                            <Popconfirm title={`Limpar todo o inventário de ${currentYear}?`} onConfirm={handleClearYear} okText="Limpar" cancelText="Cancelar" okButtonProps={{ danger: true }}>
                                <Button danger type="text" size="small">
                                    Limpar ano
                                </Button>
                            </Popconfirm>
                        )}
                    </div>
                    <div className="flex items-center gap-2 flex-wrap">
                        <Tooltip title="Preencher a partir da página Tabela de Emissões (módulo Emissões), somando o tCO2e por atividade">
                            <Button icon={<ImportOutlined />} onClick={() => { setYearInput(currentYear); setImportOpen(true); }}>
                                Importar da Tabela de Emissões
                            </Button>
                        </Tooltip>
                        <Tooltip title="Planilha .csv/.xlsx com colunas: escopo, categoria, atividade, emissao (opcionais: grupo, ano)">
                            <Upload accept=".csv,.xlsx,.xls" beforeUpload={beforeUpload} showUploadList={false}>
                                <Button icon={<UploadOutlined />}>Subir planilha</Button>
                            </Upload>
                        </Tooltip>
                        <Tooltip title="Baixar modelo .xlsx para preencher e subir">
                            <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                                Modelo .xlsx
                            </Button>
                        </Tooltip>
                        <Button type="primary" icon={<PlusOutlined />} onClick={() => { setEditing(null); setModalOpen(true); }} className="bg-[#210856] border-[#210856]">
                            Nova atividade
                        </Button>
                    </div>
                </div>

                <Table
                    rowKey="id"
                    rowSelection={{ selectedRowKeys, onChange: setSelectedRowKeys }}
                    dataSource={filtered}
                    columns={columns}
                    loading={loading}
                    pagination={false}
                    size="middle"
                    scroll={{ x: 1000 }}
                    summary={(pageData) => {
                        // Se há linhas SELECIONADAS (checkbox), soma só as selecionadas
                        // (mesmo que filtradas fora da visão); senão, soma o que está visível.
                        const hasSelection = selectedRowKeys.length > 0;
                        const selectedSet = new Set(selectedRowKeys);
                        const rows = hasSelection ? yearActivities.filter((a) => selectedSet.has(a.id)) : pageData;
                        const soma = rows.reduce((t, r) => t + (Number(r.emission) || 0), 0);
                        const filtrado = !hasSelection && pageData.length !== yearActivities.length;
                        const rotulo = hasSelection
                            ? `Total selecionado · ${rows.length} atividade(s)`
                            : `Total${filtrado ? ' (filtrado)' : ''} · ${pageData.length} atividade(s)`;
                        return (
                            <Table.Summary fixed>
                                <Table.Summary.Row className="bg-[#f6f4fc]">
                                    <Table.Summary.Cell index={0} colSpan={4}>
                                        <span className="font-semibold text-[#210856]">{rotulo}</span>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={4} align="right">
                                        <span className="font-semibold tabular-nums text-[#210856]">{fmt3(soma)} tCO2e</span>
                                    </Table.Summary.Cell>
                                    <Table.Summary.Cell index={5} colSpan={2} />
                                </Table.Summary.Row>
                            </Table.Summary>
                        );
                    }}
                />
            </Card>

            <ActivityFormModal
                open={modalOpen}
                activity={editing}
                groupOptions={groupOptions}
                onSave={handleSaveActivity}
                onClose={() => { setModalOpen(false); setEditing(null); }}
            />

            {/* Importar da Tabela de Emissões — escolher o ano */}
            <Modal
                open={importOpen}
                title="Importar da Tabela de Emissões"
                onOk={handleImportFromEmissions}
                onCancel={() => setImportOpen(false)}
                okText="Importar"
                confirmLoading={importing}
                okButtonProps={{ className: 'bg-[#210856] border-[#210856]' }}
            >
                <p className="text-sm text-gray-600 mb-2">
                    Puxa as atividades da página <b>Tabela de Emissões</b> para o ano escolhido (soma o tCO2e por
                    atividade; o grupo entra no nome).
                </p>
                <span className="text-[12px] text-gray-500">Ano</span>
                <InputNumber value={yearInput} onChange={(v) => setYearInput(Number(v) || currentYear)} min={2000} max={2100} style={{ width: '100%' }} />
            </Modal>

            {/* Adicionar um ano (nova aba) */}
            <Modal
                open={addYearOpen}
                title="Adicionar ano ao inventário"
                onOk={() => { addYear(Number(yearInput)); setAddYearOpen(false); }}
                onCancel={() => setAddYearOpen(false)}
                okText="Adicionar"
                okButtonProps={{ className: 'bg-[#210856] border-[#210856]' }}
            >
                <span className="text-[12px] text-gray-500">Ano</span>
                <InputNumber value={yearInput} onChange={(v) => setYearInput(Number(v) || baseYear)} min={2000} max={2100} style={{ width: '100%' }} />
            </Modal>
        </div>
    );
}

export default InventoryPage;
