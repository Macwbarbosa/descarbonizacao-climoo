import React, { useEffect } from 'react';
import PropTypes from 'prop-types';
import { Modal, Form, Input, InputNumber, Select, Row, Col, Divider } from 'antd';
import { SCOPES } from '../../bau/utils/bauProjection';

const { TextArea } = Input;

/** Modal de criação/edição de uma iniciativa do banco (eficácia, aplicabilidade, memorial, financeiro). */
function InitiativeFormModal({ open, initiative, onSave, onClose }) {
    const [form] = Form.useForm();

    useEffect(() => {
        if (open && initiative) {
            form.setFieldsValue({
                name: initiative.name,
                description: initiative.description,
                fullDescription: initiative.fullDescription,
                efficacy: initiative.efficacy,
                scopes: initiative.applicability?.scopes || [],
                categories: initiative.applicability?.categories || [],
                memorial: initiative.memorial,
                capex: initiative.finance?.capex || 0,
                opex: initiative.finance?.opex || 0,
                revenues: initiative.finance?.revenues || 0,
                savings: initiative.finance?.savings || 0,
                currency: initiative.finance?.currency || 'BRL',
                lifetimeYears: initiative.finance?.lifetimeYears || 10,
            });
        }
    }, [open, initiative, form]);

    const handleOk = async () => {
        const v = await form.validateFields();
        onSave({
            name: v.name,
            description: v.description || '',
            fullDescription: v.fullDescription || '',
            efficacy: Number(v.efficacy) || 0,
            applicability: { scopes: v.scopes || [], categories: v.categories || [] },
            memorial: v.memorial || '',
            finance: {
                capex: Number(v.capex) || 0,
                opex: Number(v.opex) || 0,
                revenues: Number(v.revenues) || 0,
                savings: Number(v.savings) || 0,
                currency: v.currency || 'BRL',
                lifetimeYears: Number(v.lifetimeYears) || 10,
            },
        });
    };

    return (
        <Modal
            open={open}
            title={initiative ? 'Editar iniciativa' : 'Nova iniciativa'}
            onOk={handleOk}
            onCancel={onClose}
            okText="Salvar"
            okButtonProps={{ className: 'bg-[#210856] border-[#210856]' }}
            width={720}
            destroyOnClose
        >
            <Form form={form} layout="vertical" className="mt-2">
                <Row gutter={12}>
                    <Col span={16}>
                        <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome' }]}>
                            <Input />
                        </Form.Item>
                    </Col>
                    <Col span={8}>
                        <Form.Item name="efficacy" label="Eficácia (%)" rules={[{ required: true }]}>
                            <InputNumber min={0} max={100} style={{ width: '100%' }} />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="description" label="Descrição curta">
                    <Input />
                </Form.Item>
                <Form.Item name="fullDescription" label="Descrição completa">
                    <TextArea rows={2} />
                </Form.Item>
                <Row gutter={12}>
                    <Col span={12}>
                        <Form.Item name="scopes" label="Escopos elegíveis">
                            <Select mode="multiple" options={SCOPES.map((s) => ({ value: s, label: s }))} />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item name="categories" label="Categorias elegíveis">
                            <Select mode="tags" placeholder="digite as categorias" />
                        </Form.Item>
                    </Col>
                </Row>
                <Form.Item name="memorial" label="Memorial de cálculo (emissões e abatimento)">
                    <TextArea rows={3} />
                </Form.Item>

                <Divider orientation="left" orientationMargin={0}>
                    <span className="text-xs text-gray-500">Financeiro</span>
                </Divider>
                <Row gutter={12}>
                    <Col span={6}><Form.Item name="capex" label="CAPEX"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item name="opex" label="OPEX (a.a.)"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item name="revenues" label="Receitas"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                    <Col span={6}><Form.Item name="savings" label="Economias"><InputNumber min={0} style={{ width: '100%' }} /></Form.Item></Col>
                </Row>
                <Row gutter={12}>
                    <Col span={6}><Form.Item name="currency" label="Moeda"><Input /></Form.Item></Col>
                    <Col span={6}><Form.Item name="lifetimeYears" label="Vida útil (anos)"><InputNumber min={1} style={{ width: '100%' }} /></Form.Item></Col>
                </Row>
            </Form>
        </Modal>
    );
}

InitiativeFormModal.propTypes = {
    open: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    initiative: PropTypes.object,
    onSave: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

InitiativeFormModal.defaultProps = { initiative: null };

export default InitiativeFormModal;
