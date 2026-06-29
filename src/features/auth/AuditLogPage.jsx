import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Table, Button, Select, Input } from 'antd';
import { ReloadOutlined, ArrowLeftOutlined, SearchOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import { fetchAudit } from '@/features/decarbonization/shared/decarbonizationAudit';
import { formatCnpj } from '@/features/decarbonization/shared/decarbonizationStorage';

const fmtDateTime = (iso) => {
    try {
        return new Date(iso).toLocaleString('pt-BR', { dateStyle: 'short', timeStyle: 'short' });
    } catch (e) {
        return iso || '—';
    }
};

/**
 * Página de Histórico de alterações (somente leitura) — quem mudou O QUE, em
 * qual empresa e quando. Acesso restrito ao administrador (gate na rota do App).
 */
function AuditLogPage() {
    const navigate = useNavigate();
    const [rows, setRows] = useState([]);
    const [loading, setLoading] = useState(false);
    const [cnpjFilter, setCnpjFilter] = useState('');
    const [userFilter, setUserFilter] = useState('');
    const [q, setQ] = useState('');

    const load = async () => {
        setLoading(true);
        const data = await fetchAudit({ limit: 1000 });
        setRows(data);
        setLoading(false);
    };

    useEffect(() => {
        load();
    }, []);

    const empresas = useMemo(() => {
        const seen = {};
        rows.forEach((r) => { if (r.cnpj) seen[r.cnpj] = r.empresa || formatCnpj(r.cnpj); });
        return Object.entries(seen).map(([cnpj, label]) => ({ cnpj, label }));
    }, [rows]);
    const usuarios = useMemo(() => [...new Set(rows.map((r) => r.user_email).filter(Boolean))], [rows]);

    const query = q.trim().toLowerCase();
    const filtered = useMemo(
        () =>
            rows.filter((r) => {
                if (cnpjFilter && r.cnpj !== cnpjFilter) return false;
                if (userFilter && r.user_email !== userFilter) return false;
                if (query) {
                    const hay = `${r.empresa || ''} ${r.user_email || ''} ${(r.changes || []).join(' ')}`.toLowerCase();
                    if (!hay.includes(query)) return false;
                }
                return true;
            }),
        [rows, cnpjFilter, userFilter, query]
    );

    const columns = [
        {
            title: 'Quando',
            dataIndex: 'created_at',
            key: 'created_at',
            width: 150,
            render: (v) => <span className="tabular-nums">{fmtDateTime(v)}</span>,
        },
        {
            title: 'Usuário',
            dataIndex: 'user_email',
            key: 'user_email',
            width: 200,
            render: (v) => v || <span className="text-gray-400">—</span>,
        },
        {
            title: 'Empresa',
            key: 'empresa',
            width: 200,
            render: (_, r) => (
                <div>
                    <div className="truncate">{r.empresa || '—'}</div>
                    {r.cnpj && <div className="text-[11px] text-gray-400">{formatCnpj(r.cnpj)}</div>}
                </div>
            ),
        },
        {
            title: 'Alterações',
            key: 'changes',
            render: (_, r) => {
                const list = Array.isArray(r.changes) ? r.changes : [];
                if (list.length === 0) return <span className="text-gray-400">salvamento (sem detalhe)</span>;
                return (
                    <div className="text-[13px]">
                        {list[0]}
                        {list.length > 1 && <span className="text-gray-400"> · +{list.length - 1}</span>}
                    </div>
                );
            },
        },
    ];

    const expandable = {
        expandedRowRender: (r) => {
            const list = Array.isArray(r.changes) ? r.changes : [];
            if (list.length === 0) return <span className="text-xs text-gray-400">Sem alterações detalhadas.</span>;
            return (
                <ul className="list-disc pl-5 my-1 text-[13px] text-gray-700 space-y-0.5">
                    {list.map((c, i) => (
                        // eslint-disable-next-line react/no-array-index-key
                        <li key={i}>{c}</li>
                    ))}
                </ul>
            );
        },
        rowExpandable: (r) => Array.isArray(r.changes) && r.changes.length > 0,
    };

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4 gap-3">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/inventory')}
                        className="text-xs text-gray-500 hover:text-[#210856] inline-flex items-center gap-1"
                    >
                        <ArrowLeftOutlined /> Voltar
                    </button>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Histórico de alterações</h2>
                    <p className="text-sm text-gray-500">
                        Registro de quem alterou o quê, em qual empresa e quando. Somente leitura.
                    </p>
                </div>
                <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                    Atualizar
                </Button>
            </div>

            <Card>
                <div className="flex items-center gap-2 mb-3 flex-wrap">
                    <Input
                        prefix={<SearchOutlined className="text-gray-400" />}
                        placeholder="Buscar na descrição, empresa ou usuário…"
                        allowClear
                        value={q}
                        onChange={(e) => setQ(e.target.value)}
                        style={{ maxWidth: 340 }}
                    />
                    <Select
                        value={cnpjFilter}
                        onChange={setCnpjFilter}
                        style={{ minWidth: 220 }}
                        showSearch
                        optionFilterProp="label"
                        options={[{ value: '', label: 'Todas as empresas' }, ...empresas.map((e) => ({ value: e.cnpj, label: e.label }))]}
                    />
                    <Select
                        value={userFilter}
                        onChange={setUserFilter}
                        style={{ minWidth: 220 }}
                        showSearch
                        optionFilterProp="label"
                        options={[{ value: '', label: 'Todos os usuários' }, ...usuarios.map((u) => ({ value: u, label: u }))]}
                    />
                    <span className="text-[11px] text-gray-400">{filtered.length} registro(s)</span>
                </div>

                <Table
                    rowKey={(r) => r.id || `${r.cnpj}-${r.created_at}`}
                    columns={columns}
                    dataSource={filtered}
                    loading={loading}
                    expandable={expandable}
                    size="middle"
                    pagination={{ pageSize: 25, showSizeChanger: true }}
                    scroll={{ x: 760 }}
                />
            </Card>
        </div>
    );
}

export default AuditLogPage;
