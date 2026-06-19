import React, { useState } from 'react';
import { Modal, Form, Input, Button, message } from 'antd';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';

function CreateScenarioModal({ visible, onClose }) {
    const [form] = Form.useForm();
    const [loading, setLoading] = useState(false);
    const { addScenario } = useDecarbonizationSettingsStore();

    const handleSubmit = async () => {
        try {
            setLoading(true);
            const values = await form.validateFields();

            // Create the scenario
            await addScenario({
                name: values.scenarioName,
            });

            message.success('Cenário criado com sucesso!');
            form.resetFields();
            onClose();
        } catch (error) {
            if (error.errorFields) {
                // Form validation error
                return;
            }
            message.error(`Erro ao criar cenário: ${error.message || 'Erro desconhecido'}`);
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
            title="Criar Novo Cenário"
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
                        Criar Cenário
                    </Button>
                </div>
            }
            destroyOnClose
            centered
        >
            <Form
                form={form}
                layout="vertical"
                preserve={false}
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

export default CreateScenarioModal;
