import React, { useState, useEffect } from 'react';
import {
    Card,
    Typography,
    Button,
    Empty,
    Table,
    Modal,
    Form,
    Input,
    Row,
    Col,
    message
} from 'antd';
import { DeleteOutlined, PlusOutlined, EditOutlined, SearchOutlined } from '@ant-design/icons';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';

const { Title, Text } = Typography;

function ProjectionsStep({ currentStep, totalSteps, onNext, onPrev }) {
    const { i18n } = useTranslation();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [editingParameter, setEditingParameter] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [form] = Form.useForm();

    // Função para obter configurações de formato baseadas no idioma
    const getNumericFormatConfig = () => {
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
    };

    // Função para converter valor para formato padrão (sempre com ponto decimal)
    const convertToStandardFormat = (value, language) => {
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
    };

    // Função para formatar valor para exibição baseado no idioma
    const formatValueForDisplay = (value) => {
        if (!value && value !== 0) return '';

        const language = i18n.language || 'pt-br';
        const numValue = Number(value);

        if (language.startsWith('en')) {
            return numValue.toString();
        }

        // Para português, converter ponto para vírgula na exibição
        return numValue.toString().replace('.', ',');
    };

    // Função para formatar números grandes com separadores de milhares
    const formatNumberWithSeparators = (value) => {
        if (!value && value !== 0) return '';

        const language = i18n.language || 'pt-br';
        const numValue = Number(value);

        if (Number.isNaN(numValue)) return '';

        if (language.startsWith('en')) {
            // Para inglês: 447,081,000.00
            return numValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        // Para português: 447.081.000,00
        return numValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // Zustand store
    const store = useDecarbonizationSettingsStore();
    const {
        projections = [],
        reductionGoals = [],
        addProjectionParameter,
        updateProjectionParameter,
        removeProjectionParameter,
        loadProjectionParameters,
        loading
    } = store;

    // Carregar dados ao montar o componente
    useEffect(() => {
        loadProjectionParameters();
    }, [loadProjectionParameters]);

    // Garantir que projections seja sempre um array
    const safeProjections = Array.isArray(projections) ? projections : [];
    const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

    // Calcular anos dinamicamente baseados nas metas de redução
    const getYearColumns = () => {
        if (safeReductionGoals.length === 0) {
            // Se não há metas, usar período padrão 2025-2035
            const years = [];
            for (let year = 2025; year <= 2035; year += 1) {
                years.push(year);
            }
            return years;
        }

        // Encontrar menor ano base e maior ano meta das metas de redução
        const baseYears = safeReductionGoals.map(goal =>
            goal.baseline_year || goal.baseYear || 2025
        );
        const targetYears = safeReductionGoals.map(goal =>
            goal.target_year || goal.targetYear || 2035
        );

        const minBaseYear = Math.min(...baseYears);
        const maxTargetYear = Math.max(...targetYears);

        const years = [];
        for (let year = minBaseYear; year <= maxTargetYear; year += 1) {
            years.push(year);
        }
        return years;
    };

    const years = getYearColumns();

    // Obter período para exibir na descrição
    const getProjectionPeriod = () => {
        if (years.length === 0) return "2025 a 2035";
        const minYear = Math.min(...years);
        const maxYear = Math.max(...years);
        return `${minYear} a ${maxYear}`;
    };

    // Calcular variação percentual
    const calculateVariation = (currentValue, previousValue) => {
        if (previousValue === 0) {
            if (currentValue === 0) return 0;
            return 100;
        }
        return ((currentValue - previousValue) / previousValue) * 100;
    };

    // Remover parâmetro
    const handleRemoveParameter = async (parameterId) => {
        try {
            await removeProjectionParameter(parameterId);
            message.success('Parâmetro removido com sucesso!');
        } catch (error) {
            message.error('Erro ao remover parâmetro. Tente novamente.');
        }
    };

    // === FUNÇÕES DO MODAL ===

    // Abrir modal para adicionar novo parâmetro
    const handleOpenModal = () => {
        setEditingParameter(null);
        form.resetFields();
        // Inicializar com valores padrão de 0 para todos os anos
        const initialValues = { name: '', comments: '' };
        years.forEach(year => {
            initialValues[year] = 0;
        });
        form.setFieldsValue(initialValues);
        setIsModalVisible(true);
    };

    // Abrir modal para editar parâmetro existente
    const handleEditParameter = (parameter) => {
        setEditingParameter(parameter);

        // Garantir que os valores estão sendo definidos corretamente
        const formData = {
            name: parameter.name || parameter.parameter || '',
            comments: parameter.comments || ''
        };

        // Usar parameter.values se disponível, senão usar os valores espalhados no record
        const values = parameter.values || parameter;

        // Adicionar valores dos anos individualmente com formatação correta
        years.forEach(year => {
            const rawValue = values[year] ?? 0;
            // Garantir que os valores sejam exibidos com a formatação correta do locale
            formData[year] = formatValueForDisplay(rawValue);
        });

        form.setFieldsValue(formData);
        setIsModalVisible(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setIsModalVisible(false);
        setEditingParameter(null);
        form.resetFields();
    };

    // Salvar parâmetro (criar ou editar)
    const handleSaveParameter = async () => {
        try {
            const values = await form.validateFields();

            const parameterData = {
                name: values.name,
                comments: values.comments || '',
                values: {}
            };

            // Adicionar valores dos anos com conversão para formato padrão
            years.forEach(year => {
                const value = values[year] ?? 0;
                // Garantir que o valor seja convertido para o formato padrão (com ponto decimal)
                parameterData.values[year] = typeof value === 'string'
                    ? parseFloat(convertToStandardFormat(value)) || 0
                    : parseFloat(value) || 0;
            });

            if (editingParameter) {
                // Editar parâmetro existente
                await updateProjectionParameter(editingParameter.id, parameterData);
                message.success('Parâmetro atualizado com sucesso!');
            } else {
                // Adicionar novo parâmetro
                await addProjectionParameter(parameterData);
                message.success('Parâmetro adicionado com sucesso!');
            }

            handleCloseModal();
        } catch (error) {
            // Erros de validação serão mostrados automaticamente pelo Form
            if (error.name !== 'ValidateError') {
                message.error('Erro ao salvar parâmetro. Tente novamente.');
            }
        }
    };

    // Função para filtrar parâmetros baseado na pesquisa
    const getFilteredParameters = () => {
        let filteredParameters;

        if (!searchText.trim()) {
            filteredParameters = safeProjections;
        } else {
            const searchLower = searchText.toLowerCase();
            filteredParameters = safeProjections.filter(param =>
                param.name?.toLowerCase().includes(searchLower) ||
                param.comments?.toLowerCase().includes(searchLower)
            );
        }

        // Ordenar por updatedAt (mais recente primeiro)
        // Para itens sem updatedAt, colocar no final
        return filteredParameters.sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
            const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
            return dateB - dateA; // Descending order (mais recente primeiro)
        });
    };

    const handleSearchChange = (e) => {
        setSearchText(e.target.value);
    };

    // Função para processar dados colados diretamente no primeiro campo
    const handlePasteInFirstField = (e) => {
        e.preventDefault();

        // Obter dados colados
        const pastedData = e.clipboardData.getData('text');

        if (!pastedData.trim()) return;

        // Processar dados da mesma forma que na área de paste
        const trimmedData = pastedData.trim();
        let values = [];

        if (trimmedData.includes('\t')) {
            // Dados separados por tab (copiados do Excel)
            values = trimmedData.split('\t').map(val => val.trim());
        } else if (trimmedData.includes(',')) {
            // Dados separados por vírgula
            values = trimmedData.split(',').map(val => val.trim());
        } else if (trimmedData.includes(' ')) {
            // Dados separados por espaço
            values = trimmedData.split(/\s+/).map(val => val.trim());
        } else {
            // Um único valor - permitir que seja aplicado apenas ao primeiro campo
            values = [trimmedData];
        }

        // Filtrar valores vazios e converter para números
        const validValues = values.filter(val => val !== '').map(val => {
            // Remover caracteres não numéricos exceto vírgula e ponto
            const cleanVal = val.replace(/[^\d.,-]/g, '');
            return convertToStandardFormat(cleanVal);
        }).filter(val => val !== undefined && !Number.isNaN(val));

        if (validValues.length === 0) {
            message.warning('Nenhum valor numérico válido foi encontrado nos dados colados.');
            return;
        }

        // Se há múltiplos valores, distribuir pelos campos dos anos
        if (validValues.length > 1) {
            const formValues = {};
            years.forEach((year, index) => {
                if (index < validValues.length) {
                    formValues[year] = validValues[index];
                }
            });

            form.setFieldsValue(formValues);
            message.success(`${Object.keys(formValues).length} valores aplicados automaticamente!`);
        } else {
            // Se há apenas um valor, aplicar apenas ao primeiro campo
            const firstYear = years[0];
            form.setFieldValue(firstYear, validValues[0]);
        }
    };

    // Preparar dados para a tabela superior (valores absolutos) - sem linha de adição
    const getAbsoluteTableData = () => getFilteredParameters().map(param => ({
        key: param.id,
        id: param.id,
        parameter: param.name,
        comments: param.comments,
        values: param.values, // Manter a estrutura original
        ...param.values // Espalhar para as colunas da tabela
    }));

    // Preparar dados para a tabela inferior (variações percentuais)
    const getVariationTableData = () => getFilteredParameters().map(param => {
        const row = {
            key: `${param.id}_variation`,
            parameter: param.name,
            comments: param.comments
        };

        // Adicionar primeira coluna (primeiro ano) sempre como 0.0%
        const firstYear = years[0];
        if (i18n.language && i18n.language.startsWith('en')) {
            row[firstYear] = '0.00%';
        } else {
            row[firstYear] = '0,00%';
        }

        // Calcular variações ano a ano
        for (let i = 1; i < years.length; i += 1) {
            const currentYear = years[i];
            const previousYear = years[i - 1];
            const currentValue = param.values[currentYear] || 0;
            const previousValue = param.values[previousYear] || 0;

            const variation = calculateVariation(currentValue, previousValue);

            // Formatar percentual baseado no locale
            const formattedVariation = i18n.language && i18n.language.startsWith('en')
                ? variation.toFixed(2)
                : variation.toFixed(2).replace('.', ',');

            row[currentYear] = `${variation > 0 ? '+' : ''}${formattedVariation}%`;
        }

        return row;
    });

    // Configuração das colunas para tabela (não editável inline)
    const getTableColumns = () => {
        const baseColumns = [
            {
                title: 'Parâmetro',
                dataIndex: 'parameter',
                key: 'parameter',
                width: 200,
                fixed: 'left',
                render: (text) => (
                    <div className="font-medium text-[#210856]">
                        {text}
                    </div>
                )
            },
            {
                title: 'Comentários',
                dataIndex: 'comments',
                key: 'comments',
                width: 200,
                fixed: 'left',
                render: (text) => (
                    <span className="text-sm text-gray-700">
                        {text || '-'}
                    </span>
                )
            }
        ];

        const yearColumns = years.map(year => ({
            title: year.toString(),
            dataIndex: year,
            key: year,
            width: 140,
            align: 'center',
            render: (value) => (
                <span className="font-medium" style={{ whiteSpace: 'nowrap' }}>
                    {formatNumberWithSeparators(value) || '0,00'}
                </span>
            )
        }));

        const actionColumn = {
            title: 'Ações',
            key: 'actions',
            width: 80,
            align: 'center',
            fixed: 'right',
            render: (_, record) => (
                <div className="flex items-center justify-center space-x-1">
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        size="small"
                        className="text-gray-500 hover:text-[#210856]"
                        onClick={() => handleEditParameter(record)}
                        title="Editar parâmetro"
                    />
                    <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveParameter(record.id)}
                        title="Excluir parâmetro"
                    />
                </div>
            )
        };

        return [...baseColumns, ...yearColumns, actionColumn];
    };

    // Configuração das colunas para tabela de variação (não editável)
    const getVariationTableColumns = () => {
        const baseColumns = [
            {
                title: 'Parâmetro',
                dataIndex: 'parameter',
                key: 'parameter',
                width: 200,
                fixed: 'left',
            },
            {
                title: 'Comentários',
                dataIndex: 'comments',
                key: 'comments',
                width: 200,
                fixed: 'left',
            }
        ];

        const yearColumns = years.map(year => ({
            title: year.toString(),
            dataIndex: year,
            key: year,
            width: 120,
            align: 'center',
            render: (value) => {
                if (!value) return <span />;

                // Verificar se é positivo, negativo ou neutro
                if (value.includes('+')) {
                    return <span style={{ color: '#52c41a', whiteSpace: 'nowrap' }}>{value}</span>;
                }
                if (value.includes('-')) {
                    return <span style={{ color: '#f5222d', whiteSpace: 'nowrap' }}>{value}</span>;
                }
                // Valores neutros (0,0% ou 0.0%)
                return <span style={{ color: '#666', whiteSpace: 'nowrap' }}>{value}</span>;
            }
        }));

        return [...baseColumns, ...yearColumns];
    };

    return (
        <div className="space-y-6">
            {/* Header com título, descrição e botões de navegação */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
                <div className="flex-1 lg:mr-6">
                    <Title level={3} className="text-[#210856] mb-3">
                        Passo 2: Projeções
                    </Title>
                    <Text type="secondary" className="text-base leading-relaxed">
                        Defina os parâmetros de crescimento e suas projeções para o período de {getProjectionPeriod()}. Estes parâmetros serão utilizados para calcular as emissões futuras.
                    </Text>
                </div>
                <div className="flex space-x-3 flex-shrink-0">
                    <Button
                        disabled={currentStep === 0}
                        onClick={onPrev}
                        className="h-10 px-6"
                        size="large"
                    >
                        Anterior
                    </Button>
                    <Button
                        type="primary"
                        onClick={onNext}
                        disabled={currentStep === totalSteps - 1}
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                        size="large"
                    >
                        Próximo
                    </Button>
                </div>
            </div>

            <Card className="mt-6">
                {safeProjections.length > 0 ? (
                    <>
                        {/* Search Bar e Botão Novo Parâmetro na mesma linha */}
                        <div className="flex flex-col sm:flex-row gap-4 items-stretch sm:items-center justify-between mb-6">
                            <div className="flex-1 max-w-md">
                                <Input
                                    placeholder="Pesquisar parâmetros..."
                                    value={searchText}
                                    onChange={handleSearchChange}
                                    style={{ height: '40px' }}
                                    className="text-base"
                                    prefix={<SearchOutlined className="text-gray-400" />}
                                    allowClear
                                />
                            </div>
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleOpenModal}
                                className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6 flex-shrink-0"
                                size="large"
                            >
                                Novo Parâmetro
                            </Button>
                        </div>

                        {/* Tabela de valores absolutos */}
                        <Table
                            dataSource={getAbsoluteTableData()}
                            columns={getTableColumns()}
                            loading={loading}
                            pagination={false}
                            scroll={{ x: 1200 }}
                            className="projections-table"
                            locale={{
                                emptyText: searchText ?
                                    `Nenhum parâmetro encontrado para "${searchText}"` :
                                    'Nenhum parâmetro cadastrado'
                            }}
                        />
                    </>
                ) : (
                    <div className="flex justify-center items-center py-16">
                        <Empty
                            description="Nenhum parâmetro cadastrado ainda. Comece definindo os parâmetros de crescimento para suas projeções."
                            className="py-8"
                        >
                            <div className='flex justify-center'>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleOpenModal}
                                    className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                                    size="large"
                                >
                                    Adicionar Primeiro Parâmetro
                                </Button>
                            </div>
                        </Empty>
                    </div>
                )}
            </Card>

            {/* Card separado para Variação Percentual */}
            {safeProjections.length > 0 && (
                <Card className="mt-6">
                    <div className="mb-4">
                        <Title level={4} className="text-[#210856] mb-2">
                            Variação Percentual
                        </Title>
                        <Text type="secondary" className="text-base">
                            Variações calculadas automaticamente com base nos valores de projeção para o período de {getProjectionPeriod()}. Estes percentuais são utilizados no Passo 3 para projetar as emissões ao longo do tempo.
                        </Text>
                    </div>

                    <Table
                        dataSource={getVariationTableData()}
                        columns={getVariationTableColumns()}
                        loading={loading}
                        pagination={false}
                        scroll={{ x: 1200 }}
                        className="variations-table"
                        locale={{
                            emptyText: searchText ? (
                                <Empty
                                    description={`Nenhum parâmetro encontrado para "${searchText}"`}
                                    className="py-8"
                                />
                            ) : (
                                <Empty
                                    description="Nenhum parâmetro de projeção configurado"
                                    className="py-16"
                                >
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleOpenModal}
                                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                                        size="large"
                                    >
                                        Novo Parâmetro
                                    </Button>
                                </Empty>
                            )
                        }}
                    />
                </Card>
            )}

            {/* Modal para adicionar/editar parâmetro */}
            <Modal
                title={editingParameter ? "Editar Parâmetro de Projeção" : "Adicionar Parâmetro de Projeção"}
                open={isModalVisible}
                onCancel={handleCloseModal}
                footer={
                    <div className="flex justify-end space-x-2">
                        <Button
                            key="cancel"
                            onClick={handleCloseModal}
                            style={{ height: '40px' }}
                        >
                            Cancelar
                        </Button>
                        <Button
                            key="save"
                            type="primary"
                            onClick={handleSaveParameter}
                            className="bg-[#210856] border-[#210856]"
                            style={{ height: '40px' }}
                        >
                            {editingParameter ? "Atualizar" : "Adicionar"}
                        </Button>
                    </div>
                }
                width={800}
                destroyOnClose
            >
                <Form
                    form={form}
                    layout="vertical"
                    className="mt-4"
                >
                    <Row gutter={16}>
                        <Col span={12}>
                            <Form.Item
                                label="Nome do Parâmetro"
                                name="name"
                                rules={[
                                    { required: true, message: 'Por favor, insira o nome do parâmetro' },
                                    { min: 2, message: 'O nome deve ter pelo menos 2 caracteres' }
                                ]}
                            >
                                <Input
                                    placeholder="Ex: Crescimento da produção"
                                    style={{ height: '40px' }}
                                />
                            </Form.Item>
                        </Col>
                        <Col span={12}>
                            <Form.Item
                                label="Comentários"
                                name="comments"
                            >
                                <Input
                                    placeholder="Comentários sobre o parâmetro..."
                                    style={{ height: '40px' }}
                                />
                            </Form.Item>
                        </Col>
                    </Row>

                    <Row gutter={[16, 16]}>
                        {years.map((year, index) => (
                            <Col span={6} key={year}>
                                <Form.Item
                                    label={year.toString()}
                                    name={year}
                                    initialValue={0}
                                >
                                    <NumericFormat
                                        thousandSeparator={getNumericFormatConfig().thousandSeparator}
                                        decimalSeparator={getNumericFormatConfig().decimalSeparator}
                                        allowNegative={getNumericFormatConfig().allowNegative}
                                        placeholder={getNumericFormatConfig().placeholder}
                                        customInput={Input}
                                        style={{ width: '100%', height: '40px' }}
                                        className="numeric-input"
                                        onValueChange={(values) => {
                                            const { value } = values;
                                            const standardValue = convertToStandardFormat(value);
                                            form.setFieldValue(year, standardValue);
                                        }}
                                        onPaste={index === 0 ? handlePasteInFirstField : undefined}
                                    />
                                </Form.Item>
                            </Col>
                        ))}
                    </Row>
                </Form>
            </Modal>
        </div>
    );
}

export default ProjectionsStep;
