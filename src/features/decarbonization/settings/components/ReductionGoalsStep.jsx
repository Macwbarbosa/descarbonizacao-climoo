import React, { useState, useEffect } from 'react';
import {
    Card,
    Typography,
    Button,
    Modal,
    Form,
    Input,
    Select,
    Row,
    Col,
    Radio,
    Tooltip,
    Tag,
    Table,
    Empty,
    message
} from 'antd';
import {
    PlusOutlined,
    EditOutlined,
    DeleteOutlined,
    CalendarOutlined,
    SearchOutlined
} from '@ant-design/icons';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';

const { Title, Text } = Typography;

function ReductionGoalsStep({ currentStep, totalSteps, onNext, onPrev }) {
    const { i18n } = useTranslation();
    const [isModalVisible, setIsModalVisible] = useState(false);
    const [form] = Form.useForm();
    const [goalType, setGoalType] = useState('');
    const [timeframe, setTimeframe] = useState('');
    const [baseYear, setBaseYear] = useState(null);
    const [isFormValid, setIsFormValid] = useState(false);
    const [editingGoal, setEditingGoal] = useState(null);
    const [searchText, setSearchText] = useState('');
    const [filterType, setFilterType] = useState('');
    const [filterScope, setFilterScope] = useState('');

    // Zustand store
    const {
        reductionGoals,
        addReductionGoal,
        removeReductionGoal,
        updateReductionGoal,
        loadReductionGoals,
        loading
    } = useDecarbonizationSettingsStore();

    const currentYear = new Date().getFullYear();

    // Função para obter configurações de formato baseadas no idioma
    const getNumericFormatConfig = () => {
        const language = i18n.language || 'pt-br';

        if (language.startsWith('en')) {
            return {
                thousandSeparator: ',',
                decimalSeparator: '.',
                placeholder: '90.00'
            };
        }

        // Default para pt-br
        return {
            thousandSeparator: '.',
            decimalSeparator: ',',
            placeholder: '90,00'
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

    // Load data on component mount
    useEffect(() => {
        loadReductionGoals();
    }, [loadReductionGoals]);

    const goalTypes = [
        { label: 'Meta de intensidade', value: 'intensity' },
        { label: 'Meta de redução absoluta', value: 'absolute' },
        { label: 'Meta de engajamento', value: 'engagement' }
    ];

    const sectors = [
        { label: 'Construção', value: 'construction' },
        { label: 'Agricultura', value: 'agriculture' },
        { label: 'Educação', value: 'education' },
        { label: 'Tecnologia', value: 'technology' },
        { label: 'Manufatura', value: 'manufacturing' },
        { label: 'Serviços Financeiros', value: 'financial_services' },
        { label: 'Saúde', value: 'healthcare' },
        { label: 'Transporte', value: 'transportation' },
        { label: 'Energia', value: 'energy' },
        { label: 'Varejo', value: 'retail' },
        { label: 'Indústria', value: 'industry' }
    ];

    const getScopeOptions = (type) => {
        if (type === 'intensity') {
            return [{ label: 'Escopo 3', value: 'scope3' }];
        }
        return [
            { label: 'Escopos 1 e 2', value: 'scope1_2' },
            { label: 'Escopo 3', value: 'scope3' }
        ];
    };

    // Opções para o filtro de escopo (todas as opções disponíveis)
    const getAllScopeOptions = () => [
        { label: 'Escopos 1 e 2', value: 'scope1_2' },
        { label: 'Escopo 3', value: 'scope3' }
    ];

    const getBaseYearOptions = () => {
        const years = [];
        for (let year = 2019; year <= currentYear; year += 1) {
            years.push(year);
        }
        return years;
    };

    const getTargetYearOptions = (selectedBaseYear, selectedTimeframe) => {
        if (!selectedBaseYear) return [];

        const years = [];
        const startYear = selectedBaseYear + 1;

        if (selectedTimeframe === 'short') {
            // Curto prazo: até 2035
            const endYear = Math.min(2035, startYear + 20); // Máximo até 2035
            for (let year = startYear; year <= endYear; year += 1) {
                years.push(year);
            }
        } else if (selectedTimeframe === 'long') {
            // Longo prazo: até 2050
            const endYear = Math.min(2050, startYear + 40); // Máximo até 2050
            for (let year = startYear; year <= endYear; year += 1) {
                years.push(year);
            }
        }

        return years;
    };

    const getDefaultTargetYear = (selectedBaseYear, selectedTimeframe) => {
        if (!selectedBaseYear) return null;

        if (selectedTimeframe === 'short') {
            // Curto prazo: ano seguinte, mas não ultrapassar 2035
            return Math.min(2035, selectedBaseYear + 1);
        }
        if (selectedTimeframe === 'long') {
            // Longo prazo: 10 anos à frente, mas não ultrapassar 2050
            return Math.min(2050, selectedBaseYear + 10);
        }

        return null;
    };

    useEffect(() => {
        if (baseYear && timeframe && !editingGoal) {
            // Só aplica ano alvo padrão quando não está editando
            const defaultYear = getDefaultTargetYear(baseYear, timeframe);
            form.setFieldsValue({ targetYear: defaultYear });
        }
    }, [baseYear, timeframe, form, editingGoal]);

    useEffect(() => {
        if (goalType && !editingGoal) {
            // Só aplica valores padrão quando não está editando
            if (goalType === 'intensity') {
                form.setFieldsValue({ scope: 'scope3' });
            } else {
                form.setFieldsValue({ scope: undefined });
            }
        }
    }, [goalType, form, editingGoal]);

    // Monitor form field changes to enable/disable submit button
    useEffect(() => {
        const checkFormValidity = () => {
            const fieldsToCheck = ['goalName', 'timeframe', 'goalType', 'scope', 'baseYear', 'targetYear', 'sector', 'reductionValue'];
            const values = form.getFieldsValue(fieldsToCheck);

            const isValid = fieldsToCheck.every(field => {
                const value = values[field];
                return value !== undefined && value !== null && value !== '';
            });

            setIsFormValid(isValid);
        };

        // Initial check
        checkFormValidity();

        // Watch for form changes
        const interval = setInterval(checkFormValidity, 300);

        return () => clearInterval(interval);
    }, [form, isModalVisible]);

    // Função para determinar se o campo de redução deve ser bloqueado e com qual valor
    const getReductionValueSettings = (selectedGoalType, selectedTimeframe) => {
        // Regra 1: Curto Prazo + Meta de intensidade = 90% bloqueado
        if (selectedTimeframe === 'short' && selectedGoalType === 'intensity') {
            return { value: 90, disabled: true };
        }

        // Regra 2: Longo Prazo + Meta de intensidade = 90% bloqueado
        if (selectedTimeframe === 'long' && selectedGoalType === 'intensity') {
            return { value: 90, disabled: true };
        }

        // Regra 3: Longo Prazo + Meta de redução absoluta = 90% bloqueado
        if (selectedTimeframe === 'long' && selectedGoalType === 'absolute') {
            return { value: 90, disabled: true };
        }

        // Caso contrário, campo liberado
        return { value: undefined, disabled: false };
    };

    const handleAddGoal = () => {
        setEditingGoal(null);
        setIsModalVisible(true);
        // Definir valores padrão
        const defaultTimeframe = 'short';
        const defaultGoalType = 'intensity';
        const defaultBaseYear = currentYear;
        const defaultTargetYear = getDefaultTargetYear(defaultBaseYear, defaultTimeframe);

        setTimeframe(defaultTimeframe);
        setGoalType(defaultGoalType);
        setBaseYear(defaultBaseYear);

        // Aplicar regras de valor da meta baseado nos valores padrão
        const reductionSettings = getReductionValueSettings(defaultGoalType, defaultTimeframe);

        // Definir valores no form
        form.setFieldsValue({
            timeframe: defaultTimeframe,
            goalType: defaultGoalType,
            baseYear: defaultBaseYear,
            targetYear: defaultTargetYear,
            scope: 'scope3', // Para meta de intensidade
            reductionValue: reductionSettings.value
        });
    };

    const handleEditGoal = (goal) => {
        setEditingGoal(goal);
        setIsModalVisible(true);

        // Configurar estados locais
        setTimeframe(goal.timeframe);
        setGoalType(goal.goalType);
        setBaseYear(goal.baseYear);

        // Preencher o formulário com os dados da meta
        form.setFieldsValue({
            goalName: goal.goalName,
            timeframe: goal.timeframe,
            goalType: goal.goalType,
            scope: goal.scope,
            baseYear: goal.baseYear,
            targetYear: goal.targetYear,
            sector: goal.sector,
            reductionValue: goal.reductionValue
        });
    };

    const handleModalOk = async () => {
        try {
            const values = await form.validateFields();

            // Garantir que reductionValue seja sempre um número
            if (values.reductionValue !== undefined && values.reductionValue !== null) {
                values.reductionValue = convertToStandardFormat(values.reductionValue);
            }

            if (editingGoal) {
                // Modo edição - atualizar meta existente
                await updateReductionGoal(editingGoal.id, values);
                message.success('Meta atualizada com sucesso!');
            } else {
                // Modo criação - adicionar nova meta
                await addReductionGoal(values);
                message.success('Meta criada com sucesso!');
            }

            // Recarregar dados do backend para garantir sincronização
            await loadReductionGoals();

            form.resetFields();
            setIsModalVisible(false);
            setGoalType('');
            setTimeframe('');
            setBaseYear(null);
            setIsFormValid(false);
            setEditingGoal(null);
        } catch (error) {
            if (error.errorFields) {
                // Validation failed - form will show errors automatically
                return;
            }
            // API error
            message.error('Erro ao salvar meta. Tente novamente.');
        }
    };

    const handleModalCancel = () => {
        form.resetFields();
        setIsModalVisible(false);
        setGoalType('');
        setTimeframe('');
        setBaseYear(null);
        setIsFormValid(false);
        setEditingGoal(null);
    };

    const handleGoalTypeChange = (value) => {
        setGoalType(value);

        if (!editingGoal) {
            // Só aplica valores padrão quando não está editando
            // Aplicar regras de valor da meta baseado no tipo e prazo
            const reductionSettings = getReductionValueSettings(value, timeframe);

            if (value === 'intensity') {
                form.setFieldsValue({
                    reductionValue: reductionSettings.value,
                    scope: 'scope3'
                });
            } else {
                form.setFieldsValue({
                    reductionValue: reductionSettings.value,
                    scope: undefined
                });
            }
        } else {
            // Durante edição, só ajusta o escopo se o atual não for válido
            const currentScope = form.getFieldValue('scope');
            const validScopes = getScopeOptions(value).map(option => option.value);

            if (!validScopes.includes(currentScope)) {
                form.setFieldsValue({
                    scope: value === 'intensity' ? 'scope3' : undefined
                });
            }
        }
    };

    const handleTimeframeChange = (e) => {
        const newTimeframe = e.target.value;
        setTimeframe(newTimeframe);

        if (!editingGoal) {
            // Só aplica valores padrão quando não está editando
            // Aplicar regras de valor da meta baseado no tipo e prazo
            const reductionSettings = getReductionValueSettings(goalType, newTimeframe);
            form.setFieldsValue({ reductionValue: reductionSettings.value });

            // Atualizar o ano meta baseado no prazo selecionado
            if (baseYear) {
                const defaultTargetYear = getDefaultTargetYear(baseYear, newTimeframe);
                form.setFieldsValue({ targetYear: defaultTargetYear });
            }
        }
    };

    const handleBaseYearChange = (value) => {
        setBaseYear(value);

        if (!editingGoal) {
            // Só aplica ano alvo padrão quando não está editando
            // Atualizar o ano meta baseado no ano base e prazo selecionados
            if (timeframe) {
                const defaultTargetYear = getDefaultTargetYear(value, timeframe);
                form.setFieldsValue({ targetYear: defaultTargetYear });
            }
        }
    };

    const getHelpText = (currentGoalType, currentTimeframe) => {
        const settings = getReductionValueSettings(currentGoalType, currentTimeframe);
        if (settings.disabled) {
            return (
                <div className="text-blue-600">
                    <span>Valor automático definido pelas regras: 90%</span>
                </div>
            );
        }
        return "Digite o percentual de redução desejado (0-100%)";
    };

    const handleRemoveGoal = async (goalId) => {
        try {
            await removeReductionGoal(goalId);
            message.success('Meta removida com sucesso!');

            // Recarregar dados do backend para garantir sincronização
            await loadReductionGoals();
        } catch (error) {
            message.error('Erro ao remover meta. Tente novamente.');
        }
    };

    // Função para filtrar metas baseado na pesquisa e filtros
    const getFilteredGoals = () => {
        let filteredGoals = reductionGoals;

        // Filtro por texto de pesquisa
        if (searchText.trim()) {
            const searchLower = searchText.toLowerCase();
            filteredGoals = filteredGoals.filter(goal => {
                const sectorLabel = sectors.find(s => s.value === goal.sector)?.label || goal.sector;
                return goal.goalName?.toLowerCase().includes(searchLower) ||
                    sectorLabel?.toLowerCase().includes(searchLower) ||
                    goalTypes.find(type => type.value === goal.goalType)?.label?.toLowerCase().includes(searchLower);
            });
        }

        // Filtro por tipo
        if (filterType) {
            filteredGoals = filteredGoals.filter(goal => goal.goalType === filterType);
        }

        // Filtro por escopo
        if (filterScope) {
            filteredGoals = filteredGoals.filter(goal => goal.scope === filterScope);
        }

        // Ordenar por updatedAt (mais recente primeiro)
        // Para itens sem updatedAt, colocar no final
        return filteredGoals.sort((a, b) => {
            const dateA = a.updatedAt ? new Date(a.updatedAt) : new Date(0);
            const dateB = b.updatedAt ? new Date(b.updatedAt) : new Date(0);
            return dateB - dateA; // Descending order (mais recente primeiro)
        });
    };

    const handleSearchChange = (e) => {
        setSearchText(e.target.value);
    };

    const handleTypeFilterChange = (value) => {
        setFilterType(value);
    };

    const handleScopeFilterChange = (value) => {
        setFilterScope(value);
    };

    return (
        <div className="space-y-6">
            {/* Header com título, descrição e botões de navegação */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
                <div className="flex-1 lg:mr-6">
                    <Title level={3} className="text-[#210856] mb-3">
                        Passo 1: Metas de Redução
                    </Title>
                    <Text type="secondary" className="text-base leading-relaxed">
                        Defina as metas de redução de emissões para sua organização. Configure o tipo, escopo, período e percentual de redução desejado.
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

            {/* Goals Overview */}
            {reductionGoals.length > 0 && (
                <Row gutter={[16, 16]}>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                {reductionGoals.length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Metas Configuradas
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                                {reductionGoals.filter(goal => goal.goalType === 'absolute').length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Metas Absolutas
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-purple-600 mb-1">
                                {reductionGoals.filter(goal => goal.goalType === 'intensity').length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Metas de Intensidade
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12} md={6}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-orange-600 mb-1">
                                {reductionGoals.filter(goal => goal.goalType === 'engagement').length}
                            </div>
                            <div className="text-sm text-gray-600">
                                Metas de Engajamento
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            {/* Goals List */}
            {reductionGoals.length > 0 ? (
                <Card className="border-0 shadow-sm">
                    {/* Filtros e Botão Nova Meta */}
                    <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center justify-between mb-6">
                        {/* Filtros: Search, Tipo e Escopo */}
                        <div className="flex flex-col sm:flex-row gap-3 flex-1">
                            <div className="flex-1 max-w-md">
                                <Input
                                    placeholder="Pesquisar metas..."
                                    value={searchText}
                                    onChange={handleSearchChange}
                                    style={{
                                        height: '40px',
                                        display: 'flex',
                                        alignItems: 'center'
                                    }}
                                    className="flex items-center search-input"
                                    prefix={<SearchOutlined className="text-gray-400" />}
                                    allowClear
                                />
                            </div>
                            <div className="w-full sm:w-48">
                                <Select
                                    placeholder="Filtrar por tipo"
                                    value={filterType || undefined}
                                    onChange={handleTypeFilterChange}
                                    style={{ width: '100%', height: '40px' }}
                                    allowClear
                                >
                                    {goalTypes.map(type => (
                                        <Select.Option key={type.value} value={type.value}>
                                            {type.label}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                            <div className="w-full sm:w-48">
                                <Select
                                    placeholder="Filtrar por escopo"
                                    value={filterScope || undefined}
                                    onChange={handleScopeFilterChange}
                                    style={{ width: '100%', height: '40px' }}
                                    allowClear
                                >
                                    {getAllScopeOptions().map(scope => (
                                        <Select.Option key={scope.value} value={scope.value}>
                                            {scope.label}
                                        </Select.Option>
                                    ))}
                                </Select>
                            </div>
                        </div>

                        {/* Botão Nova Meta */}
                        <Button
                            type="primary"
                            icon={<PlusOutlined />}
                            onClick={handleAddGoal}
                            className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6 flex-shrink-0"
                            size="large"
                        >
                            Nova Meta
                        </Button>
                    </div>

                    <Table
                        dataSource={getFilteredGoals().map(goal => ({
                            ...goal,
                            key: goal.id
                        }))}
                        loading={loading}
                        pagination={false}
                        className="goals-table"
                        scroll={{ x: 800 }}
                        locale={{
                            emptyText: (searchText || filterType || filterScope) ? (
                                <Empty
                                    description="Nenhuma meta encontrada com os filtros aplicados"
                                    className="py-8"
                                />
                            ) : (
                                <Empty
                                    description="Nenhuma meta de redução configurada"
                                    className="py-16"
                                >
                                    <Button
                                        type="primary"
                                        icon={<PlusOutlined />}
                                        onClick={handleAddGoal}
                                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                                        size="large"
                                    >
                                        Nova Meta
                                    </Button>
                                </Empty>
                            )
                        }}
                        columns={[
                            {
                                title: 'Nome da Meta',
                                dataIndex: 'goalName',
                                key: 'goalName',
                                width: 200,
                                fixed: 'left',
                                render: (text) => (
                                    <div className="font-medium text-[#210856]">
                                        {text}
                                    </div>
                                )
                            },
                            {
                                title: 'Tipo',
                                dataIndex: 'goalType',
                                key: 'goalType',
                                width: 120,
                                render: (type) => {
                                    const getTypeColor = (typeValue) => {
                                        if (typeValue === 'absolute') return 'green';
                                        if (typeValue === 'intensity') return 'purple';
                                        return 'orange';
                                    };

                                    const label = goalTypes.find(t => t.value === type)?.label || type;
                                    return (
                                        <Tag color={getTypeColor(type)}>
                                            {label}
                                        </Tag>
                                    );
                                }
                            },
                            {
                                title: 'Escopo',
                                dataIndex: 'scope',
                                key: 'scope',
                                width: 80,
                                render: (scope, record) => (
                                    <Tag color="blue">
                                        {getScopeOptions(record.goalType).find(s => s.value === scope)?.label || scope}
                                    </Tag>
                                )
                            },
                            {
                                title: 'Período',
                                key: 'period',
                                width: 80,
                                render: (_, record) => (
                                    <div className="flex items-center space-x-1">
                                        <CalendarOutlined className="text-gray-400 text-xs" />
                                        <span className="text-sm">
                                            {record.baseYear} - {record.targetYear}
                                        </span>
                                    </div>
                                )
                            },
                            {
                                title: 'Meta de Redução',
                                dataIndex: 'reductionValue',
                                key: 'reductionValue',
                                width: 90,
                                render: (value) => (
                                    <div className="font-semibold text-green-600 text-base">
                                        {formatValueForDisplay(value)}%
                                    </div>
                                )
                            },
                            {
                                title: 'Setor',
                                dataIndex: 'sector',
                                key: 'sector',
                                width: 80,
                                render: (sector) => {
                                    const sectorLabel = sectors.find(s => s.value === sector)?.label || sector;
                                    return (
                                        <span className="text-sm text-gray-700">
                                            {sectorLabel}
                                        </span>
                                    );
                                }
                            },
                            {
                                title: 'Prazo',
                                dataIndex: 'timeframe',
                                key: 'timeframe',
                                width: 80,
                                render: (tf) => (
                                    <span className="text-sm text-gray-700">
                                        {tf === 'short' ? 'Curto Prazo' : 'Longo Prazo'}
                                    </span>
                                )
                            },
                            {
                                title: 'Ações',
                                key: 'actions',
                                width: 40,
                                align: 'center',
                                fixed: 'right',
                                render: (_, record) => (
                                    <div className="flex items-center justify-center space-x-1">
                                        <Tooltip title="Editar meta">
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                size="small"
                                                className="text-gray-500 hover:text-[#210856]"
                                                onClick={() => handleEditGoal(record)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="Remover meta">
                                            <Button
                                                type="text"
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                className="text-gray-500 hover:text-red-500"
                                                onClick={() => handleRemoveGoal(record.id)}
                                            />
                                        </Tooltip>
                                    </div>
                                )
                            }
                        ]}
                    />
                </Card>
            ) : (
                <Card>
                    <div className="flex justify-center items-center py-16">
                        <Empty
                            description="Nenhuma meta de redução configurada. Comece definindo suas metas de descarbonização."
                            className="py-8"
                        >
                            <div className='flex justify-center'>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleAddGoal}
                                    className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                                    size="large"
                                >
                                    Nova Meta
                                </Button>
                            </div>
                        </Empty>
                    </div>
                </Card>
            )}

            <Modal
                title={editingGoal ? "Editar Meta de Redução" : "Nova Meta de Redução"}
                open={isModalVisible}
                onOk={null}
                onCancel={handleModalCancel}
                width={800}
                centered
                className="modern-modal"
                footer={
                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <Button
                            onClick={handleModalCancel}
                            className="h-10 px-6"
                        >
                            Cancelar
                        </Button>
                        <Button
                            type="primary"
                            onClick={handleModalOk}
                            disabled={!isFormValid}
                            loading={loading}
                            className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                        >
                            {editingGoal ? "Salvar Alterações" : "Criar Meta"}
                        </Button>
                    </div>
                }
            >
                <div className="">
                    <Form
                        form={form}
                        layout="vertical"
                        className="space-y-4"
                    >
                        {/* Nome da Meta */}
                        <Card className="border-0 mb-6" style={{ boxShadow: 'none' }}>
                            <Form.Item
                                label={
                                    <span className="text-base font-medium text-gray-700">
                                        Nome da Meta
                                    </span>
                                }
                                name="goalName"
                                rules={[{ required: true, message: 'Digite o nome da meta' }]}
                                className="mb-0"
                            >
                                <Input
                                    placeholder="Ex: Redução de emissões de escopo 1 e 2"
                                    className='text-base'
                                    style={{ height: '40px' }}
                                />
                            </Form.Item>
                        </Card>

                        {/* Configurações Gerais */}
                        <Card
                            title={
                                <span className="text-base font-medium text-gray-700">
                                    Configurações da Meta
                                </span>
                            }
                            className="border border-gray-200"
                            style={{ boxShadow: 'none' }}
                        >
                            <Row gutter={[24, 24]}>
                                <Col span={24}>
                                    <Form.Item
                                        label="Prazo da Meta"
                                        name="timeframe"
                                        rules={[{ required: true, message: 'Selecione o prazo' }]}
                                    >
                                        <Radio.Group
                                            onChange={handleTimeframeChange}
                                            className="w-full"
                                        >
                                            <Row gutter={16}>
                                                <Col span={12}>
                                                    <Radio.Button
                                                        value="short"
                                                        className="w-full h-12 flex items-center justify-center text-center"
                                                    >
                                                        <div>
                                                            <div className="font-medium">Curto Prazo</div>
                                                            <div className="text-xs text-gray-500">Até 2035</div>
                                                        </div>
                                                    </Radio.Button>
                                                </Col>
                                                <Col span={12}>
                                                    <Radio.Button
                                                        value="long"
                                                        className="w-full h-12 flex items-center justify-center text-center"
                                                    >
                                                        <div>
                                                            <div className="font-medium">Longo Prazo</div>
                                                            <div className="text-xs text-gray-500">Até 2050</div>
                                                        </div>
                                                    </Radio.Button>
                                                </Col>
                                            </Row>
                                        </Radio.Group>
                                    </Form.Item>
                                </Col>
                            </Row>

                            <Row gutter={[24, 16]}>
                                <Col span={12}>
                                    <Form.Item
                                        label="Tipo de Meta"
                                        name="goalType"
                                        rules={[{ required: true, message: 'Selecione o tipo' }]}
                                    >
                                        <Select
                                            placeholder="Selecione o tipo de meta"
                                            onChange={handleGoalTypeChange}
                                            style={{ height: '40px' }}
                                        >
                                            {goalTypes.map(type => (
                                                <Select.Option key={type.value} value={type.value}>
                                                    {type.label}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={12}>
                                    <Form.Item
                                        label="Escopo"
                                        name="scope"
                                        rules={[{ required: true, message: 'Selecione o escopo' }]}
                                    >
                                        <Select
                                            placeholder="Selecione o escopo"
                                            disabled={goalType === 'intensity'}
                                            style={{ height: '40px' }}
                                        >
                                            {getScopeOptions(goalType).map(scope => (
                                                <Select.Option key={scope.value} value={scope.value}>
                                                    {scope.label}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Período e Setor */}
                        <Card
                            title={
                                <span className="text-base font-medium text-gray-700">
                                    Período e Contexto
                                </span>
                            }
                            className="border border-gray-200"
                            style={{ boxShadow: 'none' }}
                        >
                            <Row gutter={[24, 16]}>
                                <Col span={8}>
                                    <Form.Item
                                        label="Ano Base"
                                        name="baseYear"
                                        rules={[{ required: true, message: 'Selecione o ano base' }]}
                                    >
                                        <Select
                                            placeholder="Ano base"
                                            onChange={handleBaseYearChange}
                                            style={{ height: '40px' }}
                                        >
                                            {getBaseYearOptions().map(year => (
                                                <Select.Option key={year} value={year}>
                                                    {year}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        label="Ano Meta"
                                        name="targetYear"
                                        rules={[{ required: true, message: 'Selecione o ano meta' }]}
                                    >
                                        <Select
                                            placeholder="Ano meta"
                                            style={{ height: '40px' }}
                                        >
                                            {getTargetYearOptions(baseYear, timeframe).map(year => (
                                                <Select.Option key={year} value={year}>
                                                    {year}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                                <Col span={8}>
                                    <Form.Item
                                        label="Setor"
                                        name="sector"
                                        rules={[{ required: true, message: 'Selecione o setor' }]}
                                    >
                                        <Select
                                            placeholder="Setor de atividade"
                                            style={{ height: '40px' }}
                                        >
                                            {sectors.map(sector => (
                                                <Select.Option key={sector.value} value={sector.value}>
                                                    {sector.label}
                                                </Select.Option>
                                            ))}
                                        </Select>
                                    </Form.Item>
                                </Col>
                            </Row>
                        </Card>

                        {/* Meta de Redução */}
                        <Card
                            title={
                                <span className="text-base font-medium text-gray-700">
                                    Meta de Redução
                                </span>
                            }
                            className="border border-gray-200"
                            style={{ boxShadow: 'none' }}
                        >
                            <Form.Item
                                label="Percentual de Redução"
                                name="reductionValue"
                                rules={[{ required: true, message: 'Digite o valor da meta' }]}
                                help={getHelpText(goalType, timeframe)}
                            >
                                <div style={{ position: 'relative' }}>
                                    <NumericFormat
                                        thousandSeparator={getNumericFormatConfig().thousandSeparator}
                                        decimalSeparator={getNumericFormatConfig().decimalSeparator}
                                        allowNegative={false}
                                        placeholder={getNumericFormatConfig().placeholder}
                                        disabled={getReductionValueSettings(goalType, timeframe).disabled}
                                        value={formatValueForDisplay(form.getFieldValue('reductionValue'))}
                                        style={{
                                            width: '100%',
                                            height: '40px',
                                            backgroundColor: 'transparent',
                                            border: 'solid 1px #D9D9D9',
                                            borderRadius: '6px',
                                            padding: '4px 35px 4px 10px',
                                        }}
                                        isAllowed={(values) => {
                                            const { floatValue } = values;
                                            return floatValue === undefined || (floatValue >= 0 && floatValue <= 100);
                                        }}
                                        onValueChange={(values) => {
                                            const { value } = values;
                                            // Converter para formato padrão (ponto decimal) antes de salvar
                                            const standardValue = convertToStandardFormat(value);
                                            form.setFieldValue('reductionValue', standardValue);
                                        }}
                                    />
                                    <span
                                        style={{
                                            position: 'absolute',
                                            right: '10px',
                                            top: '50%',
                                            transform: 'translateY(-50%)',
                                            color: '#666',
                                            fontSize: '14px'
                                        }}
                                    >
                                        %
                                    </span>
                                </div>
                            </Form.Item>
                        </Card>
                    </Form>
                </div>
            </Modal>
        </div>
    );
}

export default ReductionGoalsStep;
