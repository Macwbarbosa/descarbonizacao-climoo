import React from 'react';
import PropTypes from 'prop-types';
import { Input, InputNumber, Select, Button, Empty, Tag } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { v4 as uuidv4 } from 'uuid';
import { SCOPE3_MIN_COVERAGE_PCT } from '../services/sbtiTargetService';

const num = (v) => Number(v || 0).toLocaleString('pt-BR', { maximumFractionDigits: 0 });
const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';

/**
 * Editor da lista de fornecedores/clientes engajados. Cada linha: nome, tipo
 * (fornecedor/cliente), CATEGORIA do Escopo 3 e a emissão associada (tCO2e,
 * ano-base). As emissões cobertas pela meta de engajamento são a SOMA dessas
 * emissões, e o % do Escopo 3 é calculado a partir do total do inventário.
 * Em metas combinadas, a emissão é descontada da categoria na cobertura de
 * redução (evita dupla contagem).
 */
function EngagementPartnersEditor({ partners, scope3Total, categoryOptions, disabled, onChange }) {
    const list = Array.isArray(partners) ? partners : [];
    const covered = list.reduce((t, p) => t + (Number(p.emission) || 0), 0);
    const coveragePct = scope3Total > 0 ? (covered / scope3Total) * 100 : 0;
    const meets67 = coveragePct >= SCOPE3_MIN_COVERAGE_PCT;

    const patch = (id, field, value) => onChange(list.map((p) => (p.id === id ? { ...p, [field]: value } : p)));
    const add = () =>
        onChange([...list, { id: uuidv4(), name: '', kind: 'fornecedor', category: undefined, emission: 0 }]);
    const remove = (id) => onChange(list.filter((p) => p.id !== id));

    return (
        <div>
            <div className="flex items-center justify-between mb-2">
                <span className={`${labelCls} !mb-0`}>Fornecedores / clientes engajados</span>
                <Button size="small" icon={<PlusOutlined />} onClick={add} disabled={disabled}>
                    Adicionar
                </Button>
            </div>

            {list.length === 0 ? (
                <Empty
                    image={Empty.PRESENTED_IMAGE_SIMPLE}
                    description="Nenhum parceiro cadastrado. Adicione os fornecedores/clientes que serão engajados."
                />
            ) : (
                <div className="flex flex-col gap-2">
                    {/* Cabeçalho */}
                    <div className="hidden sm:grid grid-cols-[1fr_130px_1fr_150px_40px] gap-2 text-[10px] uppercase tracking-wide text-gray-400">
                        <span>Nome</span>
                        <span>Tipo</span>
                        <span>Categoria (Escopo 3)</span>
                        <span>Emissão (tCO2e)</span>
                        <span />
                    </div>
                    {list.map((p) => (
                        <div key={p.id} className="grid grid-cols-2 sm:grid-cols-[1fr_130px_1fr_150px_40px] gap-2 items-center">
                            <Input
                                value={p.name}
                                placeholder="Ex.: Fornecedor A"
                                onChange={(e) => patch(p.id, 'name', e.target.value)}
                                disabled={disabled}
                            />
                            <Select
                                value={p.kind}
                                onChange={(v) => patch(p.id, 'kind', v)}
                                disabled={disabled}
                                options={[
                                    { value: 'fornecedor', label: 'Fornecedor' },
                                    { value: 'cliente', label: 'Cliente' },
                                ]}
                            />
                            <Select
                                value={p.category}
                                onChange={(v) => patch(p.id, 'category', v)}
                                disabled={disabled}
                                placeholder="Categoria"
                                showSearch
                                optionFilterProp="label"
                                options={categoryOptions}
                                notFoundContent="Sem categorias de Escopo 3 no inventário"
                            />
                            <InputNumber
                                value={p.emission}
                                min={0}
                                className="w-full"
                                controls={false}
                                formatter={(v) => `${v}`.replace(/\B(?=(\d{3})+(?!\d))/g, '.')}
                                parser={(v) => `${v}`.replace(/\./g, '')}
                                onChange={(v) => patch(p.id, 'emission', v || 0)}
                                disabled={disabled}
                            />
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => remove(p.id)}
                                disabled={disabled}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Resumo: emissões cobertas + % do Escopo 3 */}
            <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-sm">
                <span className="text-gray-500">Emissões cobertas:</span>
                <b className="text-[#210856] tabular-nums">{num(covered)} tCO2e</b>
                {scope3Total > 0 && (
                    <>
                        <span className="text-gray-300">·</span>
                        <span className="text-gray-500">do Escopo 3:</span>
                        <b className="tabular-nums">{coveragePct.toFixed(0)}%</b>
                        <Tag color={meets67 ? 'green' : 'orange'} className="rounded-full">
                            {meets67 ? `≥ ${SCOPE3_MIN_COVERAGE_PCT}%` : `< ${SCOPE3_MIN_COVERAGE_PCT}%`}
                        </Tag>
                    </>
                )}
            </div>
        </div>
    );
}

EngagementPartnersEditor.propTypes = {
    partners: PropTypes.arrayOf(PropTypes.object),
    scope3Total: PropTypes.number,
    categoryOptions: PropTypes.arrayOf(PropTypes.object),
    disabled: PropTypes.bool,
    onChange: PropTypes.func.isRequired,
};

EngagementPartnersEditor.defaultProps = {
    partners: [],
    scope3Total: 0,
    categoryOptions: [],
    disabled: false,
};

export default EngagementPartnersEditor;
