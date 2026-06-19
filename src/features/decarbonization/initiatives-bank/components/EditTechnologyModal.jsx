import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, InputNumber, Button } from 'antd';

const { TextArea } = Input;

function EditTechnologyModal({ visible, onClose, onSave, technology }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (visible && technology) {
            form.setFieldsValue({
                name: technology.name,
                description: technology.description,
                fullDescription: technology.fullDescription,
                reductionPotential: technology.reductionPotential,
                reference: technology.reference,
                partners: technology.partners
            });
        }
    }, [visible, technology, form]);

    const handleSave = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();
            onSave(technology.id, values);
            onClose();
        } catch (error) {
            // Handle validation error silently
        } finally {
            setLoading(false);
        }
    };

    const handleCancel = () => {
        form.resetFields();
        onClose();
    };

    return (
        <Modal
            title="Editar Tecnologia"
            open={visible}
            onCancel={handleCancel}
            width={600}
            footer={
                <div className="flex justify-end gap-2">
                    <Button
                        key="cancel"
                        onClick={handleCancel}
                        className="h-10"
                    >
                        Cancelar
                    </Button>
                    <Button
                        key="save"
                        type="primary"
                        loading={loading}
                        onClick={handleSave}
                        className="bg-[#210856] hover:bg-[#2d0a6b] border-[#210856] hover:border-[#2d0a6b] h-10"
                    >
                        Salvar Alterações
                    </Button>
                </div>
            }
        >
            <Form
                form={form}
                layout="vertical"
                className="mt-4"
            >
                <Form.Item
                    label="Nome da Tecnologia"
                    name="name"
                    rules={[
                        { required: true, message: 'Por favor, insira o nome da tecnologia!' }
                    ]}
                >
                    <Input
                        placeholder="Ex: Eletrificação de Frota Leve"
                        className="h-10"
                    />
                </Form.Item>

                <Form.Item
                    label="Descrição Curta"
                    name="description"
                >
                    <Input
                        placeholder="Breve descrição para exibição na tabela"
                        className="h-10"
                    />
                </Form.Item>

                <Form.Item
                    label="Descrição Completa"
                    name="fullDescription"
                >
                    <TextArea
                        rows={4}
                        placeholder="Descrição detalhada da tecnologia e implementação"
                        className="resize-none"
                    />
                </Form.Item>

                <Form.Item
                    label="Potencial de Redução (%)"
                    name="reductionPotential"
                    rules={[
                        { required: true, message: 'Por favor, insira o potencial de redução!' }
                    ]}
                >
                    <InputNumber
                        placeholder="0"
                        min={0}
                        max={100}
                        step={0.01}
                        className="w-full h-10"
                        formatter={value => `${value}%`}
                        parser={value => value.replace('%', '')}
                    />
                </Form.Item>

                <Form.Item
                    label="Referência"
                    name="reference"
                >
                    <Input
                        placeholder="URL ou citação de referência"
                        className="h-10"
                    />
                </Form.Item>

                <Form.Item
                    label="Potenciais Parceiros"
                    name="partners"
                >
                    <TextArea
                        rows={3}
                        placeholder="Liste fornecedores, empresas e consultores (uma por linha)"
                        className="resize-none"
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default EditTechnologyModal;
