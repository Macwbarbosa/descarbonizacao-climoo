import React, { useState, useEffect } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';

function EditScenarioModal({ visible, onClose, scenario }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { updateScenario } = useDecarbonizationSettingsStore();

    // Preencher o formulário quando o modal abrir ou o cenário mudar
    useEffect(() => {
        if (visible && scenario) {
            // Usar setTimeout para garantir que o DOM esteja pronto
            setTimeout(() => {
                form.setFieldsValue({
                    scenarioName: scenario.name
                });
            }, 0);
        } else if (!visible) {
            // Limpar o formulário quando o modal fechar
            form.resetFields();
        }
    }, [visible, scenario, form]);

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();

            // Update the scenario
            await updateScenario(scenario.id, {
                name: values.scenarioName,
            });

            message.success('Cenário atualizado com sucesso!');
            onClose();
        } catch (error) {
            if (error.errorFields) {
                // Form validation error
                return;
            }
            message.error(`Erro ao atualizar cenário: ${error.message || 'Erro desconhecido'}`);
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
            title="Editar Cenário"
            open={visible}
            onCancel={handleCancel}
            width={500}
            footer={
                <div className="flex justify-end gap-3">
                    <Button
                        key="cancel"
                        onClick={handleCancel}
                        style={{ height: '40px' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        key="submit"
                        type="primary"
                        loading={loading}
                        onClick={handleSubmit}
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b]"
                        style={{ height: '40px' }}
                    >
                        Salvar Alterações
                    </Button>
                </div>
            }
            centered
        >
            <Form
                form={form}
                layout="vertical"
                preserve
                initialValues={{
                    scenarioName: scenario?.name || ''
                }}
            >
                <Form.Item
                    label="Nome do Cenário"
                    name="scenarioName"
                    rules={[
                        { required: true, message: 'Por favor, informe o nome do cenário' },
                        { min: 2, message: 'O nome deve ter pelo menos 2 caracteres' },
                        { max: 100, message: 'O nome deve ter no máximo 100 caracteres' },
                    ]}
                >
                    <Input
                        placeholder="Ex: Plano Base, Cenário Agressivo"
                        autoFocus
                        onPressEnter={handleSubmit}
                        style={{ height: '40px' }}
                    />
                </Form.Item>
            </Form>
        </Modal>
    );
}

export default EditScenarioModal;
