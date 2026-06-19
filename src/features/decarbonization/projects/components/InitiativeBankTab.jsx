import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Table, Button, Tag, Tooltip, Popconfirm } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, FileTextOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import InitiativeFormModal from './InitiativeFormModal';
import InitiativeMemorialModal from './InitiativeMemorialModal';

const money = (v, c = 'BRL') => `${c} ${Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}`;

/** Aba "Banco de iniciativas": biblioteca de templates (eficácia, financeiro, memorial). */
function InitiativeBankTab({ bank, onAdd, onPatch, onRemove }) {
    const [formOpen, setFormOpen] = useState(false);
    const [editing, setEditing] = useState(null);
    const [memorial, setMemorial] = useState(null);

    const openNew = () => {
        setEditing(null);
        setFormOpen(true);
    };
    const openEdit = (rec) => {
        setEditing(rec);
        setFormOpen(true);
    };
    const handleSave = (data) => {
        if (editing?.id) {
            onPatch(editing.id, data);
        } else {
            const id = onAdd();
            onPatch(id, data);
        }
        setFormOpen(false);
        setEditing(null);
    };

    const columns = [
        { title: 'Iniciativa', dataIndex: 'name', key: 'name', render: (t, r) => (
            <div>
                <div className="font-medium text-[#210856]">{t}</div>
                <div className="text-[11px] text-gray-500">{r.description}</div>
            </div>
        ) },
        { title: 'Eficácia', dataIndex: 'efficacy', key: 'efficacy', width: 90, align: 'right', render: (v) => <b className="text-green-700">{v}%</b> },
        {
            title: 'Financeiro',
            key: 'finance',
            width: 220,
            render: (_, r) => (
                <div className="text-[12px] text-gray-600">
                    CAPEX {money(r.finance?.capex, r.finance?.currency)} · OPEX {money(r.finance?.opex, r.finance?.currency)}/ano
                    <div className="text-[11px] text-gray-400">R$/tCO₂e: derivado por projeto (MACC)</div>
                </div>
            ),
        },
        {
            title: 'Aplicabilidade',
            key: 'applic',
            width: 200,
            render: (_, r) => (
                <div>
                    {(r.applicability?.scopes || []).map((s) => <Tag color="blue" key={s}>{s}</Tag>)}
                    {(r.applicability?.categories || []).slice(0, 2).map((c) => <Tag key={c}>{c}</Tag>)}
                    {(r.applicability?.categories || []).length > 2 && <Tag>+{r.applicability.categories.length - 2}</Tag>}
                </div>
            ),
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 130,
            align: 'center',
            render: (_, r) => (
                <div className="flex items-center justify-center gap-1">
                    <Tooltip title="Memorial / financeiro"><Button type="text" icon={<FileTextOutlined />} onClick={() => setMemorial(r)} /></Tooltip>
                    <Tooltip title="Editar"><Button type="text" icon={<EditOutlined />} onClick={() => openEdit(r)} /></Tooltip>
                    <Popconfirm title="Excluir iniciativa?" onConfirm={() => onRemove(r.id)} okText="Excluir" cancelText="Cancelar">
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </div>
            ),
        },
    ];

    return (
        <Card>
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-base font-semibold text-[#210856]">Banco de iniciativas</h3>
                <Button type="primary" icon={<PlusOutlined />} onClick={openNew} className="bg-[#210856] border-[#210856]">
                    Nova iniciativa
                </Button>
            </div>
            <Table rowKey="id" dataSource={bank} columns={columns} pagination={false} size="middle" />

            <InitiativeFormModal
                open={formOpen}
                initiative={editing}
                onSave={handleSave}
                onClose={() => {
                    setFormOpen(false);
                    setEditing(null);
                }}
            />
            <InitiativeMemorialModal open={!!memorial} initiative={memorial} onClose={() => setMemorial(null)} />
        </Card>
    );
}

InitiativeBankTab.propTypes = {
    bank: PropTypes.arrayOf(PropTypes.object).isRequired, // eslint-disable-line react/forbid-prop-types
    onAdd: PropTypes.func.isRequired,
    onPatch: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
};

export default InitiativeBankTab;
