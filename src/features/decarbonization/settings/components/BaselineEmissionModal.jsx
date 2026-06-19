import React, { useState, useEffect, useCallback } from 'react';
import {
    Modal,
    Form,
    Select,
    Input,
    Button,
    Row,
    Col
} from 'antd';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';

// Definir escopos e categorias
const SCOPES = {
    "Escopo 1": [
        "Atividades agrícolas",
        "Combustão estacionária",
        "Combustão móvel",
        "Efluentes",
        "Emissões fugitivas",
        "Emissões fugitivas não quioto",
        "Mudança no Uso do Solo",
        "Processos industriais",
        "Resíduos"
    ],
    "Escopo 2": [
        "Energia elétrica - Método baseado na Localização",
        "Energia elétrica - Método baseado no mercado"
    ],
    "Escopo 3": [
        "Compra de bens e serviços",
        "Bens de capital",
        "Outras emissões do ciclo de vida de combustíveis e eletricidade",
        "Transporte e Distribuição (upstream)",
        "Resíduos",
        "Viagens a negócios",
        "Deslocamento de funcionários",
        "Bens arrendados (upstream)",
        "Transporte e Distribuição (downstream)",
        "Processamento de produtos vendidos",
        "Uso de bens e serviços vendidos",
        "Tratamento de fim de vida dos produtos vendidos",
        "Bens arrendados (a organização como arrendadora)",
        "Franquias",
        "Investimentos",
        "Outras emissões não categorizadas no Escopo 3"
    ]
};

function BaselineEmissionModal({
    visible,
    onCancel,
    onSubmit,
    initialData = null,
    reductionGoals = [],
    projections = [],
    loading = false
}) {
    const { i18n } = useTranslation();
    const [form] = Form.useForm();
    const [selectedScope, setSelectedScope] = useState('');

    // Função para obter configurações de formato baseadas no idioma
    const getNumericFormatConfig = useCallback(() => {
        const language = i18n.language || 'pt-br';

        if (language.startsWith('en')) {
            return {
                thousandSeparator: ',',
                decimalSeparator: '.',
                placeholder: '0.00'
            };
        }

        // Default para pt-br
        return {
            thousandSeparator: '.',
            decimalSeparator: ',',
            placeholder: '0,00'
        };
    }, [i18n.language]);

    // Função para converter valor para formato padrão (sempre com ponto decimal)
    const convertToStandardFormat = useCallback((value, language) => {
        if (!value && value !== 0) return undefined;

        const lang = language || i18n.language || 'pt-br';
        let stringValue = String(value);

        if (lang.startsWith('en')) {
            // Para inglês, já está no formato correto
            const parsed = parseFloat(stringValue);
            return Number.isNaN(parsed) ? undefined : parsed;
        }

        // Para português, converter vírgula para ponto
        stringValue = stringValue.replace(',', '.');
        const parsed = parseFloat(stringValue);
        return Number.isNaN(parsed) ? undefined : parsed;
    }, [i18n.language]);

    // Função para formatar valor para exibição baseado no idioma
    const formatValueForDisplay = useCallback((value) => {
        if (!value && value !== 0) return '';

        const language = i18n.language || 'pt-br';
        const numValue = Number(value);

        if (language.startsWith('en')) {
            return numValue.toString();
        }

        // Para português, converter ponto para vírgula na exibição
        return numValue.toString().replace('.', ',');
    }, [i18n.language]);

    // Resetar form quando modal abrir/fechar
    useEffect(() => {
        if (visible) {
            if (initialData) {
                // Modo edição - preencher form com dados existentes
                form.setFieldsValue({
                    scope: initialData.scope,
                    category: initialData.category,
                    activity: initialData.activity,
                    emission: formatValueForDisplay(initialData.emission),
                    goal: initialData.goal,
                    anchorage: initialData.anchorage
                });
                setSelectedScope(initialData.scope);
            } else {
                // Modo criação - limpar form
                form.resetFields();
                setSelectedScope('');
            }
        }
    }, [visible, initialData, form, formatValueForDisplay]);

    // Obter categorias baseado no escopo selecionado
    const getCategoriesForScope = (scope) => SCOPES[scope] || [];

    // Submeter formulário
    const handleSubmit = async () => {
        try {
            const values = await form.validateFields();

            // Converter valor da emissão para formato padrão
            const submissionData = {
                ...values,
                emission: typeof values.emission === 'string'
                    ? parseFloat(convertToStandardFormat(values.emission)) || 0
                    : parseFloat(values.emission) || 0
            };

            await onSubmit(submissionData);
        } catch (error) {
            // Erro de validação do form - ignorar
        }
    };

    // Quando escopo muda, limpar categoria
    const handleScopeChange = (value) => {
        setSelectedScope(value);
        form.setFieldValue('category', undefined);
    };

    const title = initialData ? 'Editar Fonte de Emissão' : 'Adicionar Fonte de Emissão';

    return (
        <Modal
            title={title}
            open={visible}
            onCancel={onCancel}
            width={600}
            footer={
                <div className="flex justify-end gap-3">
                    <Button
                        key="cancel"
                        onClick={onCancel}
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
                        {initialData ? 'Atualizar' : 'Adicionar'}
                    </Button>
                </div>
            }
            destroyOnClose
        >
            <Form
                form={form}
                layout="vertical"
                requiredMark={false}
                className="mt-4"
            >
                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="scope"
                            label="Escopo"
                            rules={[
                                { required: true, message: 'Selecione o escopo' }
                            ]}
                        >
                            <Select
                                placeholder="Selecione o escopo"
                                onChange={handleScopeChange}
                                style={{ height: 40 }}
                                options={Object.keys(SCOPES).map(scope => ({
                                    label: scope,
                                    value: scope
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="category"
                            label="Categoria"
                            rules={[
                                { required: true, message: 'Selecione a categoria' }
                            ]}
                        >
                            <Select
                                placeholder="Selecione a categoria"
                                disabled={!selectedScope}
                                style={{ height: 40 }}
                                options={getCategoriesForScope(selectedScope).map(cat => ({
                                    label: cat,
                                    value: cat
                                }))}
                            />
                        </Form.Item>
                    </Col>
                </Row>

                <Form.Item
                    name="activity"
                    label="Atividade"
                    rules={[
                        { required: true, message: 'Digite a descrição da atividade' }
                    ]}
                >
                    <Input
                        placeholder="Descrição da atividade"
                        style={{ height: 40 }}
                    />
                </Form.Item>

                <Form.Item
                    name="emission"
                    label="Emissão (tCO2e)"
                    rules={[
                        { required: true, message: 'Digite o valor da emissão' },
                        {
                            validator: (_, value) => {
                                if (!value && value !== 0) {
                                    return Promise.reject(new Error('Digite o valor da emissão'));
                                }
                                const numValue = convertToStandardFormat(value);
                                if (numValue === undefined || numValue < 0) {
                                    return Promise.reject(new Error('Valor deve ser maior ou igual a zero'));
                                }
                                return Promise.resolve();
                            }
                        }
                    ]}
                >
                    <NumericFormat
                        thousandSeparator={getNumericFormatConfig().thousandSeparator}
                        decimalSeparator={getNumericFormatConfig().decimalSeparator}
                        placeholder={getNumericFormatConfig().placeholder}
                        customInput={Input}
                        style={{ width: '100%', height: 40 }}
                        className="numeric-input"
                        onValueChange={(values) => {
                            const { value } = values;
                            const standardValue = convertToStandardFormat(value);
                            form.setFieldValue('emission', standardValue);
                        }}
                    />
                </Form.Item>

                <Row gutter={16}>
                    <Col span={12}>
                        <Form.Item
                            name="goal"
                            label="Meta Associada (Opcional)"
                        >
                            <Select
                                placeholder="Selecionar meta"
                                allowClear
                                style={{ height: 40 }}
                                options={reductionGoals.map(goal => ({
                                    label: goal.goalName || goal.name || `Meta ${goal.id}`,
                                    value: goal.id
                                }))}
                            />
                        </Form.Item>
                    </Col>
                    <Col span={12}>
                        <Form.Item
                            name="anchorage"
                            label="Ancoragem (Opcional)"
                        >
                            <Select
                                placeholder="Selecionar projeção"
                                allowClear
                                style={{ height: 40 }}
                                options={projections.map(proj => ({
                                    label: proj.name,
                                    value: proj.id
                                }))}
                            />
                        </Form.Item>
                    </Col>
                </Row>
            </Form>
        </Modal>
    );
}

export default BaselineEmissionModal;
