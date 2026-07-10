import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, InputNumber, Select, AutoComplete } from 'antd';
import { SCOPES, categoriesForScope, activityNameWithGroup } from '../utils/inventoryAggregate';

/** Separa "Grupo | Atividade" em { group, activity } (grupo é opcional). */
const splitGroup = (name = '') => {
    const idx = name.indexOf(' | ');
    if (idx === -1) return { group: undefined, activity: name };
    return { group: name.slice(0, idx).trim(), activity: name.slice(idx + 3).trim() };
};

/** Modal de cadastro/edição de uma atividade do inventário. */
function ActivityFormModal({ open, activity, groupOptions, onSave, onClose }) {
    const [form] = Form.useForm();
    const scope = Form.useWatch('scope', form);
    const [editingCategory, setEditingCategory] = useState(undefined);

    useEffect(() => {
        if (open) {
            const { group, activity: bareName } = splitGroup(activity?.name || '');
            form.setFieldsValue({
                scope: activity?.scope || 'Escopo 1',
                category: activity?.category || undefined,
                group: group || undefined,
                name: bareName || '',
                emission: activity?.emission ?? 0,
            });
            setEditingCategory(activity?.category);
        }
    }, [open, activity, form]);

    const handleScopeChange = (value) => {
        const current = form.getFieldValue('category');
        if (current && !categoriesForScope(value).includes(current)) form.setFieldsValue({ category: undefined });
    };

    // Categorias do escopo (mesma regra do módulo de Emissões); inclui a atual se
    // não estiver na lista (ex.: importada da Tabela de Emissões com nome livre).
    const categoryOptions = (() => {
        const list = categoriesForScope(scope);
        const opts = list.map((c) => ({ value: c, label: c }));
        if (editingCategory && !list.includes(editingCategory)) opts.unshift({ value: editingCategory, label: `${editingCategory} (importada)` });
        return opts;
    })();

    // Grupos vindos do módulo de Emissões; inclui o atual se não estiver na lista.
    const groupSelectOptions = (() => {
        const list = groupOptions || [];
        const current = splitGroup(activity?.name || '').group;
        const opts = list.map((g) => ({ value: g, label: g }));
        if (current && !list.includes(current)) opts.unshift({ value: current, label: current });
        return opts;
    })();

    const handleOk = async () => {
        const v = await form.validateFields();
        onSave({
            scope: v.scope,
            category: v.category,
            name: activityNameWithGroup(v.group, v.name),
            emission: Number(v.emission) || 0,
        });
    };

    return (
        <Modal
            open={open}
            title={activity ? 'Editar atividade' : 'Nova atividade'}
            onOk={handleOk}
            onCancel={onClose}
            okText="Salvar"
            okButtonProps={{ className: 'bg-[#210856] border-[#210856]' }}
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-2">
                <Form.Item name="scope" label="Escopo" rules={[{ required: true }]}>
                    <Select options={SCOPES.map((s) => ({ value: s, label: s }))} onChange={handleScopeChange} />
                </Form.Item>
                <Form.Item name="category" label="Categoria" rules={[{ required: true, message: 'Selecione a categoria' }]}>
                    <Select
                        placeholder="Selecione a categoria do escopo"
                        options={categoryOptions}
                        showSearch
                        optionFilterProp="label"
                        notFoundContent="Selecione um escopo primeiro"
                    />
                </Form.Item>
                <Form.Item
                    name="group"
                    label="Grupo"
                    tooltip="Sugestões dos grupos do módulo de Emissões — você também pode digitar um grupo novo. Entra no nome como “Grupo | Atividade”."
                >
                    <AutoComplete
                        placeholder="Selecione ou digite o grupo (opcional)"
                        options={groupSelectOptions}
                        allowClear
                        filterOption={(input, option) =>
                            String(option?.value ?? '').toLowerCase().includes(input.toLowerCase())
                        }
                    />
                </Form.Item>
                <Form.Item name="name" label="Atividade" rules={[{ required: true, message: 'Informe a atividade' }]}>
                    <Input placeholder="Ex.: Diesel – frota" />
                </Form.Item>
                <Form.Item name="emission" label="Emissão do ano-base (tCO2e)" rules={[{ required: true }]}>
                    <InputNumber min={0} style={{ width: '100%' }} />
                </Form.Item>
            </Form>
        </Modal>
    );
}

ActivityFormModal.propTypes = {
    open: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    activity: PropTypes.object,
    groupOptions: PropTypes.arrayOf(PropTypes.string),
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

ActivityFormModal.defaultProps = { activity: null, groupOptions: [] };

export default ActivityFormModal;
