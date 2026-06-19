import React, { useState, useMemo, useEffect, useRef } from 'react';
import {
    Modal,
    Typography,
    Tabs,
    Form,
    Input,
    Select,
    DatePicker,
    InputNumber,
    Button,
    Row,
    Col,
    message
} from 'antd';
import { PlusOutlined } from '@ant-design/icons';
import { Line } from '@antv/g2plot';
import dayjs from 'dayjs';
import { NumericFormat } from 'react-number-format';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';
import useTechnologyBankStore from '../../../../store/technologyBankStore';
import useInitiativeModalStore from '../store/useInitiativeModalStore';
import { dictionary } from '../../../../utils/constants';
import { useGlobalStore } from '../../../../store/globalStore';

const { Title, Text } = Typography;
const { Option } = Select;
const { TextArea } = Input;

// Tab Components
function DetalhesTab({ form }) {
    const [selectedScope, setSelectedScope] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState(null);

    const {
        getReductionGoals,
        getEmissionInventory
    } = useDecarbonizationSettingsStore();

    // Get users from global store
    const { users, fetchUsers, loading } = useGlobalStore();

    // Get technologies from technology bank store
    const { getTechnologies } = useTechnologyBankStore();
    const technologies = getTechnologies();

    // Initiative modal store
    const {
        detalhes,
        updateDetalhes,
        getTabValidation,
        resetCoverageForYears
    } = useInitiativeModalStore();

    // Get validation state
    const validation = getTabValidation('detalhes');

    // Get data from store
    const reductionGoals = getReductionGoals();
    const emissionsInventory = getEmissionInventory();

    // Função para traduzir os scopes
    const translateScope = (scope) => {
        const scopeTranslations = {
            'scope1_2': 'Escopo 1 e 2',
            'scope3': 'Escopo 3',
            'scope1': 'Escopo 1',
            'scope2': 'Escopo 2'
        };
        return scopeTranslations[scope] || scope;
    };

    // Update form with store data
    useEffect(() => {
        form.setFieldsValue({
            title: detalhes.title,
            projectType: detalhes.projectType,
            associatedGoal: detalhes.associatedGoal,
            scope: detalhes.scope,
            category: detalhes.category,
            activities: detalhes.activities,
            technology: detalhes.technology,
            responsible: detalhes.responsible,
            startDate: detalhes.startDate ? dayjs(detalhes.startDate) : null,
            endDate: detalhes.endDate ? dayjs(detalhes.endDate) : null,
        });

        // Update local state based on store
        setSelectedScope(detalhes.scope);
        setSelectedCategory(detalhes.category);
    }, [detalhes, form]);

    // Carregar usuários quando o componente montar
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    // Atualizar escopo automaticamente quando meta associada mudar (incluindo na inicialização)
    useEffect(() => {
        if (detalhes.associatedGoal) {
            const selectedGoal = reductionGoals.find(goal => goal.id === detalhes.associatedGoal);
            if (selectedGoal) {
                if (selectedGoal.scope === 'scope3' && detalhes.scope !== 'scope3') {
                    // Para scope3: definir automaticamente como scope3
                    setSelectedScope('scope3');
                    updateDetalhes({ scope: 'scope3' });
                    form.setFieldsValue({ scope: 'scope3' });
                } else if (selectedGoal.scope === 'scope1_2') {
                    // Para scope1_2: manter o escopo atual se for scope1 ou scope2, senão limpar
                    if (detalhes.scope !== 'scope1' && detalhes.scope !== 'scope2') {
                        setSelectedScope(null);
                        updateDetalhes({ scope: '' });
                        form.setFieldsValue({ scope: undefined });
                    }
                }
            }
        }
    }, [detalhes.associatedGoal, reductionGoals, detalhes.scope, updateDetalhes, form]);

    // Get unique categories based on selected scope using dictionary constant
    const availableCategories = useMemo(() => {
        if (!selectedScope) return [];

        // Mapear scope técnico para nome no dictionary
        const scopeMap = {
            'scope1': 'Escopo 1',
            'scope2': 'Escopo 2',
            'scope3': 'Escopo 3'
        };

        const scopeName = scopeMap[selectedScope];
        if (!scopeName || !dictionary[scopeName]) return [];

        // Retornar categorias disponíveis no dictionary para o escopo selecionado
        return Object.keys(dictionary[scopeName]).filter(Boolean);
    }, [selectedScope]);

    // Get activities with baseline emissions based on selected scope and category
    const availableActivities = useMemo(() => {
        if (!selectedScope || !selectedCategory) return [];

        // Mapear scope técnico para nome no dictionary
        const scopeMap = {
            'scope1': 'Escopo 1',
            'scope2': 'Escopo 2',
            'scope3': 'Escopo 3'
        };
        const scopeName = scopeMap[selectedScope];

        // Buscar emissões do inventário filtradas por escopo e categoria
        const filteredEmissions = emissionsInventory
            .filter(item =>
                item.scope === scopeName &&
                item.category === selectedCategory
            );

        // Criar array com atividades e suas emissões ano-base
        const activitiesWithEmissions = filteredEmissions.map(item => ({
            id: item.id, // Incluir ID para salvamento
            activity: item.activity,
            emission: item.emission || 0,
            unit: 'tCO2e'
        }));

        // Remover duplicatas baseado na atividade
        const uniqueActivities = activitiesWithEmissions.reduce((acc, current) => {
            const existingActivity = acc.find(item => item.activity === current.activity);
            if (!existingActivity) {
                acc.push(current);
            } else {
                // Se já existe, somar as emissões e manter o primeiro ID encontrado
                existingActivity.emission += current.emission;
            }
            return acc;
        }, []);

        return uniqueActivities.filter(item => item.activity);
    }, [emissionsInventory, selectedScope, selectedCategory]);

    const handleCategoryChange = (value) => {
        setSelectedCategory(value);
        form.setFieldsValue({ activities: undefined });

        // Update store
        updateDetalhes({
            category: value,
            activities: []
        });
    };

    // Função para lidar com mudança manual do escopo (quando permitido)
    const handleScopeChange = (value) => {
        setSelectedScope(value);
        updateDetalhes({ scope: value });

        // Resetar categoria e atividades quando o escopo muda
        setSelectedCategory(null);
        form.setFieldsValue({
            category: undefined,
            activities: undefined
        });
        updateDetalhes({
            category: '',
            activities: []
        });
    };

    // Handle form field changes
    const handleFieldChange = (field, value) => {
        updateDetalhes({ [field]: value });

        // If the associated goal changes, reset coverage for the new year range and set scope automatically
        if (field === 'associatedGoal') {
            const selectedGoal = reductionGoals.find(goal => goal.id === value);
            if (selectedGoal) {
                const { baseYear, targetYear, scope } = selectedGoal;

                // Definir escopo baseado na meta selecionada com nova regra
                if (scope === 'scope3') {
                    // Para scope3: definir Escopo 3 e deixar fixo
                    setSelectedScope('scope3');
                    updateDetalhes({ scope: 'scope3' });
                    form.setFieldsValue({ scope: 'scope3' });
                } else if (scope === 'scope1_2') {
                    // Para scope1_2: limpar escopo para permitir seleção entre Escopo 1 ou Escopo 2
                    setSelectedScope(null);
                    updateDetalhes({ scope: '' });
                    form.setFieldsValue({ scope: undefined });
                }

                // Resetar categoria e atividades quando o escopo muda
                setSelectedCategory(null);
                form.setFieldsValue({
                    category: undefined,
                    activities: undefined
                });
                updateDetalhes({
                    category: '',
                    activities: []
                });

                // Reset coverage for the new year range
                if (baseYear && targetYear) {
                    const years = [];
                    for (let year = baseYear; year <= targetYear; year += 1) {
                        years.push(year);
                    }
                    resetCoverageForYears(years);
                }
            }
        }
    }; const handleDateChange = (field, date) => {
        // Salvar como timestamp (número) ao invés de ISO string
        const dateValue = date ? date.valueOf() : null;
        updateDetalhes({ [field]: dateValue });
    };

    return (
        <div className="p-6">
            <Title level={4} className="mb-6">Informações Gerais</Title>
            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item
                        label="Título da Iniciativa"
                        name="title"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.title ? 'error' : ''}
                        help={validation.errors.title}
                    >
                        <Input
                            placeholder="Nova Iniciativa"
                            className="h-10"
                            onChange={(e) => handleFieldChange('title', e.target.value)}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Tipo de Projeto"
                        name="projectType"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.projectType ? 'error' : ''}
                        help={validation.errors.projectType}
                    >
                        <Input
                            placeholder="Ex: Energia Renovável, Eficiência Energética..."
                            className="h-10"
                            onChange={(e) => handleFieldChange('projectType', e.target.value)}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item
                        label="Meta Associada"
                        name="associatedGoal"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.associatedGoal ? 'error' : ''}
                        help={validation.errors.associatedGoal}
                    >
                        <Select
                            placeholder="Selecione uma meta de redução"
                            className="h-10"
                            allowClear
                            onChange={(value) => handleFieldChange('associatedGoal', value)}
                        >
                            {reductionGoals.map(goal => (
                                <Option key={goal.id} value={goal.id}>
                                    {goal.goalName} ({goal.timeframe === 'short' ? 'Curto' : 'Longo'} Prazo - {translateScope(goal.scope)})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Escopo"
                        name="scope"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.scope ? 'error' : ''}
                        help={validation.errors.scope || (() => {
                            if (!detalhes.associatedGoal) return 'Selecione uma meta primeiro';
                            const selectedGoal = reductionGoals.find(goal => goal.id === detalhes.associatedGoal);
                            if (selectedGoal?.scope === 'scope3') return 'Definido automaticamente pela meta (Escopo 3)';
                            if (selectedGoal?.scope === 'scope1_2') return 'Escolha entre Escopo 1 ou Escopo 2';
                            return '';
                        })()}
                    >
                        {(() => {
                            // Verificar o tipo de meta selecionada
                            const selectedGoal = reductionGoals.find(goal => goal.id === detalhes.associatedGoal);

                            if (!selectedGoal) {
                                // Nenhuma meta selecionada - campo desabilitado
                                return (
                                    <Input
                                        placeholder="Selecione uma meta primeiro"
                                        className="h-10"
                                        disabled
                                        style={{
                                            backgroundColor: '#f5f5f5',
                                            color: '#666',
                                            cursor: 'not-allowed'
                                        }}
                                    />
                                );
                            }

                            if (selectedGoal.scope === 'scope3') {
                                // Meta scope3 - campo fixo com Escopo 3
                                return (
                                    <Select
                                        placeholder="Escopo 3"
                                        className="h-10"
                                        value="scope3"
                                        disabled
                                    >
                                        <Option key="scope3" value="scope3">
                                            Escopo 3
                                        </Option>
                                    </Select>
                                );
                            }

                            if (selectedGoal.scope === 'scope1_2') {
                                // Meta scope1_2 - Select habilitado para escolher entre Escopo 1 ou 2
                                return (
                                    <Select
                                        placeholder="Escolha entre Escopo 1 ou Escopo 2"
                                        className="h-10"
                                        onChange={handleScopeChange}
                                        allowClear
                                        value={selectedScope}
                                    >
                                        <Option key="scope1" value="scope1">
                                            Escopo 1
                                        </Option>
                                        <Option key="scope2" value="scope2">
                                            Escopo 2
                                        </Option>
                                    </Select>
                                );
                            }

                            // Fallback - campo desabilitado
                            return (
                                <Input
                                    placeholder="Escopo não definido"
                                    className="h-10"
                                    disabled
                                    style={{
                                        backgroundColor: '#f5f5f5',
                                        color: '#666',
                                        cursor: 'not-allowed'
                                    }}
                                />
                            );
                        })()}
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item
                        label="Categoria"
                        name="category"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.category ? 'error' : ''}
                        help={validation.errors.category}
                    >
                        <Select
                            placeholder="Selecione a categoria"
                            className="h-10"
                            onChange={handleCategoryChange}
                            disabled={!selectedScope}
                            allowClear
                        >
                            {availableCategories.map(category => (
                                <Option key={category} value={category}>
                                    {category}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Atividade(s)"
                        name="activities"
                    >
                        <Select
                            mode="multiple"
                            placeholder="Selecione atividades com suas emissões ano-base"
                            className="min-h-10"
                            disabled={!selectedScope || !selectedCategory}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option?.children?.[0]?.toLowerCase()?.indexOf(input.toLowerCase()) >= 0
                            }
                            onChange={(value) => handleFieldChange('activities', value)}
                            maxTagCount={0}
                            maxTagPlaceholder={(selectedValues) =>
                                `${selectedValues.length} ${selectedValues.length === 1 ? 'item selecionado' : 'itens selecionados'}`
                            }
                        >
                            {availableActivities.map(activityData => (
                                <Option key={activityData.id} value={activityData.id}>
                                    {activityData.activity} ({activityData.emission.toLocaleString('pt-BR', {
                                        maximumFractionDigits: 2
                                    })} {activityData.unit})
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item
                        label="Tecnologia de Redução"
                        name="technology"
                    >
                        <Select
                            placeholder="Selecione uma tecnologia"
                            className="h-10"
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option?.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                            onChange={(value) => handleFieldChange('technology', value)}
                        >
                            {technologies.map(tech => (
                                <Option key={tech.id} value={tech.id}>
                                    {tech.name} ({tech.reductionPotential}% redução)
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Responsável"
                        name="responsible"
                    >
                        <Select
                            placeholder="Selecione um responsável"
                            className="h-10"
                            onChange={(value) => handleFieldChange('responsible', value)}
                            loading={loading.users}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option?.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                        >
                            {users.map(user => (
                                <Option key={user.id} value={user.id}>
                                    {user.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24}>
                <Col span={12}>
                    <Form.Item
                        label="Data de Início"
                        name="startDate"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.startDate ? 'error' : ''}
                        help={validation.errors.startDate}
                    >
                        <DatePicker
                            className="h-10"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="25/08/2025"
                            onChange={(date) => handleDateChange('startDate', date)}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Data de Término"
                        name="endDate"
                        rules={[{ required: true, message: 'Campo obrigatório' }]}
                        validateStatus={validation.errors.endDate ? 'error' : ''}
                        help={validation.errors.endDate}
                    >
                        <DatePicker
                            className="h-10"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="25/02/2026"
                            onChange={(date) => handleDateChange('endDate', date)}
                        />
                    </Form.Item>
                </Col>
            </Row>
        </div>
    );
}

function AbrangenciaTab() {
    const {
        abrangencia,
        updateCoverageYear,
        detalhes
    } = useInitiativeModalStore();

    const {
        getReductionGoals
    } = useDecarbonizationSettingsStore();

    // Get the selected goal to determine years
    const reductionGoals = getReductionGoals();
    const selectedGoal = reductionGoals.find(goal => goal.id === detalhes.associatedGoal);

    // Generate years based on selected goal
    const getYearsRange = useMemo(() => {
        if (!selectedGoal) {
            // Default years if no goal is selected
            return [2025, 2026];
        }

        const { baseYear, targetYear } = selectedGoal;

        if (!baseYear || !targetYear) {
            return [2025, 2026];
        }

        // Generate all years from base year to target year
        const years = [];
        for (let year = baseYear; year <= targetYear; year += 1) {
            years.push(year);
        }

        return years;
    }, [selectedGoal]);

    const handleCoverageChange = (year, value) => {
        updateCoverageYear(year, value);
    };

    // Initialize coverage for all years if not exists
    useEffect(() => {
        getYearsRange.forEach(year => {
            if (abrangencia.coverage[year] === undefined) {
                updateCoverageYear(year, 0);
            }
        });
    }, [getYearsRange, abrangencia.coverage, updateCoverageYear]);

    return (
        <div className="p-6">
            <Title level={4} className="mb-6">Abrangência por Ano (%)</Title>

            {!selectedGoal && (
                <div className="mb-4 p-4 bg-yellow-50 border border-yellow-200 rounded">
                    <Text type="warning">
                        <strong>Atenção:</strong> Selecione uma meta associada na aba &quot;Detalhes&quot; para definir o período de abrangência correto.
                    </Text>
                </div>
            )}

            {getYearsRange.length <= 8 ? (
                // Layout para até 8 anos - uma linha
                <>
                    <Row gutter={24} className="mb-4">
                        <Col span={6}>
                            <Text strong>Percentual de Abrangência (%)</Text>
                        </Col>
                        {getYearsRange.map(year => (
                            <Col span={Math.max(2, Math.floor(18 / getYearsRange.length))} key={year}>
                                <Text strong className="text-center block">{year}</Text>
                            </Col>
                        ))}
                    </Row>

                    <Row gutter={24} className="mb-6">
                        <Col span={6}>
                            <Text>Abrangência</Text>
                        </Col>
                        {getYearsRange.map(year => (
                            <Col span={Math.max(2, Math.floor(18 / getYearsRange.length))} key={year}>
                                <InputNumber
                                    style={{ width: '100%', height: '40px' }}
                                    min={0}
                                    max={100}
                                    value={abrangencia.coverage[year] || 0}
                                    formatter={value => `${value}%`}
                                    parser={value => value.replace('%', '')}
                                    onChange={(value) => handleCoverageChange(year, value || 0)}
                                />
                            </Col>
                        ))}
                    </Row>
                </>
            ) : (
                // Layout para mais de 8 anos - grade
                <div className="mb-6">
                    <Row gutter={[16, 16]}>
                        {getYearsRange.map(year => (
                            <Col span={4} key={year}>
                                <div className="border border-gray-200 rounded p-3">
                                    <Text strong className="block text-center mb-2">{year}</Text>
                                    <InputNumber
                                        style={{ width: '100%', height: '40px' }}
                                        min={0}
                                        max={100}
                                        value={abrangencia.coverage[year] || 0}
                                        formatter={value => `${value}%`}
                                        parser={value => value.replace('%', '')}
                                        onChange={(value) => handleCoverageChange(year, value || 0)}
                                    />
                                </div>
                            </Col>
                        ))}
                    </Row>
                </div>
            )}
        </div>
    );
}

function TarefasTab() {
    const {
        tarefas,
        updateCurrentTask,
        updateMonthlyTarget,
        updateAnnualTarget,
        addTask,
        removeTask
    } = useInitiativeModalStore();

    const { users, fetchUsers, loading } = useGlobalStore();

    const { currentTask, tasks } = tarefas;

    // Carregar usuários quando o componente montar
    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const handleTaskFieldChange = (field, value) => {
        updateCurrentTask({ [field]: value });
    };

    // Função helper para obter o nome do usuário pelo ID
    const getUserNameById = (userId) => {
        const foundUser = users.find(u => u.id === userId);
        return foundUser ? foundUser.name : userId;
    };

    const handleMonthlyTargetChange = (month, value) => {
        updateMonthlyTarget(month, value || 0);
    };

    const handleAnnualTargetChange = (value) => {
        updateAnnualTarget(value || 0);
    };

    const handleAddTask = () => {
        if (currentTask.taskName.trim()) {
            addTask();
            message.success('Tarefa adicionada com sucesso!');
        } else {
            message.error('Nome da tarefa é obrigatório');
        }
    };

    const handleRemoveTask = (taskId) => {
        removeTask(taskId);
        message.success('Tarefa removida com sucesso!');
    };

    const monthsData = [
        { key: 'jan', label: 'Janeiro' },
        { key: 'fev', label: 'Fevereiro' },
        { key: 'mar', label: 'Março' },
        { key: 'abr', label: 'Abril' },
        { key: 'mai', label: 'Maio' },
        { key: 'jun', label: 'Junho' },
        { key: 'jul', label: 'Julho' },
        { key: 'ago', label: 'Agosto' },
        { key: 'set', label: 'Setembro' },
        { key: 'out', label: 'Outubro' },
        { key: 'nov', label: 'Novembro' },
        { key: 'dez', label: 'Dezembro' },
    ];

    return (
        <div className="p-6">
            <Row gutter={24} className="mb-6">
                <Col span={12}>
                    <Form.Item label="Nome da Tarefa">
                        <Input
                            placeholder="Nome da tarefa"
                            className="h-10"
                            value={currentTask.taskName}
                            onChange={(e) => handleTaskFieldChange('taskName', e.target.value)}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Responsável">
                        <Select
                            placeholder="Selecione um responsável"
                            className="h-10"
                            value={currentTask.taskResponsible}
                            onChange={(value) => handleTaskFieldChange('taskResponsible', value)}
                            loading={loading.users}
                            allowClear
                            showSearch
                            optionFilterProp="children"
                            filterOption={(input, option) =>
                                option?.children.toLowerCase().indexOf(input.toLowerCase()) >= 0
                            }
                        >
                            {users.map(user => (
                                <Option key={user.id} value={user.id}>
                                    {user.name}
                                </Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24} className="mb-6">
                <Col span={12}>
                    <Form.Item label="Data Limite">
                        <DatePicker
                            className="h-10"
                            style={{ width: '100%' }}
                            format="DD/MM/YYYY"
                            placeholder="25/08/2025"
                            value={currentTask.taskDeadline ? dayjs(currentTask.taskDeadline) : null}
                            onChange={(date) => handleTaskFieldChange('taskDeadline', date ? date.valueOf() : null)}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Métrica">
                        <Input
                            placeholder="Ex: Redução de emissões, Economia de energia..."
                            className="h-10"
                            value={currentTask.taskMetric}
                            onChange={(e) => handleTaskFieldChange('taskMetric', e.target.value)}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24} className="mb-6">
                <Col span={12}>
                    <Form.Item label="Meta de Aplicação (%)">
                        <InputNumber
                            style={{ width: '100%', height: '40px' }}
                            min={0}
                            max={100}
                            value={currentTask.applicationTarget}
                            formatter={value => `${value}%`}
                            parser={value => value.replace('%', '')}
                            onChange={(value) => handleTaskFieldChange('applicationTarget', value || 0)}
                        />
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item label="Tipo de Reporte">
                        <div className="flex gap-4">
                            <Button
                                type={currentTask.reportType === 'monthly' ? 'primary' : 'default'}
                                className={currentTask.reportType === 'monthly' ? 'bg-[#210856] hover:bg-[#2d0a6b] h-10' : 'h-10'}
                                onClick={() => handleTaskFieldChange('reportType', 'monthly')}
                            >
                                Reporte Mensal
                            </Button>
                            <Button
                                type={currentTask.reportType === 'annual' ? 'primary' : 'default'}
                                className={currentTask.reportType === 'annual' ? 'bg-[#210856] hover:bg-[#2d0a6b] h-10' : 'h-10'}
                                onClick={() => handleTaskFieldChange('reportType', 'annual')}
                            >
                                Reporte Anual
                            </Button>
                        </div>
                    </Form.Item>
                </Col>
            </Row>

            <Title level={5} className="mb-4">
                {currentTask.reportType === 'monthly' ? 'Metas Mensais (%)' : 'Meta Anual (%)'}
            </Title>

            {currentTask.reportType === 'monthly' ? (
                // Layout for monthly targets
                <>
                    {/* First half of the year */}
                    <Row gutter={16} className="mb-4">
                        {monthsData.slice(0, 6).map((month) => (
                            <Col span={4} key={month.key}>
                                <Text strong>{month.label}</Text>
                            </Col>
                        ))}
                    </Row>
                    <Row gutter={16} className="mb-4">
                        {monthsData.slice(0, 6).map((month) => (
                            <Col span={4} key={month.key}>
                                <InputNumber
                                    style={{ width: '100%', height: '40px', textAlign: 'center' }}
                                    min={0}
                                    max={100}
                                    value={currentTask.monthlyTargets[month.key]}
                                    onChange={(value) => handleMonthlyTargetChange(month.key, value)}
                                />
                            </Col>
                        ))}
                    </Row>

                    {/* Second half of the year */}
                    <Row gutter={16} className="mb-4">
                        {monthsData.slice(6, 12).map((month) => (
                            <Col span={4} key={month.key}>
                                <Text strong>{month.label}</Text>
                            </Col>
                        ))}
                    </Row>
                    <Row gutter={16} className="mb-6">
                        {monthsData.slice(6, 12).map((month) => (
                            <Col span={4} key={month.key}>
                                <InputNumber
                                    style={{ width: '100%', height: '40px', textAlign: 'center' }}
                                    min={0}
                                    max={100}
                                    value={currentTask.monthlyTargets[month.key]}
                                    onChange={(value) => handleMonthlyTargetChange(month.key, value)}
                                />
                            </Col>
                        ))}
                    </Row>
                </>
            ) : (
                // Layout for annual target
                <Row gutter={24} className="mb-6">
                    <Col span={8}>
                        <Form.Item label="Meta Anual">
                            <InputNumber
                                style={{ width: '100%', height: '40px' }}
                                min={0}
                                max={100}
                                value={currentTask.annualTarget}
                                formatter={value => `${value}%`}
                                parser={value => value.replace('%', '')}
                                onChange={handleAnnualTargetChange}
                                placeholder="Meta para o ano todo"
                            />
                        </Form.Item>
                    </Col>
                    <Col span={16}>
                        <div className="p-4 bg-blue-50 border border-blue-200 rounded">
                            <Text type="secondary">
                                <strong>Reporte Anual:</strong> Configure uma única meta percentual que será aplicada ao longo de todo o ano.
                                Esta opção é recomendada para iniciativas com implementação contínua ou quando o monitoramento mensal não é necessário.
                            </Text>
                        </div>
                    </Col>
                </Row>
            )}

            {/* Tasks list */}
            {tasks.length > 0 && (
                <div className="mb-6">
                    <Title level={5}>Tarefas Cadastradas</Title>
                    {tasks.map((task) => (
                        <div key={task.id} className="border rounded p-4 mb-4 bg-gray-50">
                            <div className="flex justify-between items-start">
                                <div>
                                    <Text strong>{task.taskName || task.title}</Text>
                                    <br />
                                    <Text type="secondary">
                                        Responsável: {getUserNameById(task.taskResponsible)} |
                                        Meta: {task.applicationTarget}% |
                                        Métrica: {task.taskMetric} |
                                        Tipo: {task.reportType === 'monthly' ? 'Mensal' : 'Anual'}
                                        {task.reportType === 'annual' && task.annualTarget && (
                                            <> | Meta Anual: {task.annualTarget}%</>
                                        )}
                                    </Text>
                                </div>
                                <Button
                                    danger
                                    size="small"
                                    onClick={() => handleRemoveTask(task.id)}
                                >
                                    Remover
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            <div className="flex justify-between items-center">
                <Text type="secondary">
                    {tasks.length === 0 ? 'Nenhuma tarefa adicionada ainda' : `${tasks.length} tarefa(s) cadastrada(s)`}
                </Text>
                <Button
                    type="default"
                    icon={<PlusOutlined />}
                    className="border-[#9f7aea] text-[#9f7aea] hover:border-[#210856] hover:text-[#210856] h-10"
                    onClick={handleAddTask}
                >
                    Adicionar Tarefa
                </Button>
            </div>
        </div>
    );
}

function InvestimentoTab() {
    const { i18n } = useTranslation();

    const {
        investimento,
        updateInvestimento,
        validateInvestimento,
        getTabValidation
    } = useInitiativeModalStore();

    // Get validation state
    const validation = getTabValidation('investimento');

    // Função para obter separadores baseado no idioma
    const getNumberFormatConfig = () => {
        const language = i18n.language || 'pt_br';

        switch (language) {
            case 'en_us':
                return {
                    thousandSeparator: ',',
                    decimalSeparator: '.',
                    placeholder: '0.00',
                    locale: 'en-US'
                };
            case 'es_es':
                return {
                    thousandSeparator: '.',
                    decimalSeparator: ',',
                    placeholder: '0,00',
                    locale: 'es-ES'
                };
            case 'pt_br':
            default:
                return {
                    thousandSeparator: '.',
                    decimalSeparator: ',',
                    placeholder: '0,00',
                    locale: 'pt-BR'
                };
        }
    };

    const numberFormatConfig = getNumberFormatConfig();

    const handleFieldChange = (field, value) => {
        updateInvestimento({ [field]: value });
        // Validate after change
        setTimeout(() => validateInvestimento(), 100);

        // Debug: verificar estado após update
        setTimeout(() => {
            const { investimento: currentState } = useInitiativeModalStore.getState();
            // eslint-disable-next-line no-console
            console.log('🔧 Current investment state:', currentState);
        }, 200);
    };

    // Check if there's any investment data
    const hasInvestmentData = investimento.investmentType ||
        investimento.investmentValue > 0 ||
        investimento.investmentDescription;

    return (
        <div className="p-6">
            <Title level={4} className="mb-6">Detalhes do Investimento</Title>
            <div className="mb-4">
                <Text type="secondary">
                    {hasInvestmentData
                        ? "Preencha todos os campos obrigatórios para o investimento"
                        : "Preencha os dados de investimento (opcional)"
                    }
                </Text>
            </div>
            <Row gutter={24} className="mb-6">
                <Col span={12}>
                    <Form.Item
                        label="Tipo de Investimento"
                        validateStatus={validation.errors.investmentType ? 'error' : ''}
                        help={validation.errors.investmentType}
                    >
                        <Select
                            placeholder="Selecione o tipo"
                            className="h-10"
                            allowClear
                            value={investimento.investmentType}
                            onChange={(value) => handleFieldChange('investmentType', value)}
                        >
                            <Option value="capex">CAPEX (Capital Expenditure)</Option>
                            <Option value="opex">OPEX (Operational Expenditure)</Option>
                            <Option value="pd">P&D (Pesquisa e Desenvolvimento)</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Valor"
                        validateStatus={validation.errors.investmentValue ? 'error' : ''}
                        help={validation.errors.investmentValue}
                    >
                        <NumericFormat
                            customInput={Input}
                            thousandSeparator={numberFormatConfig.thousandSeparator}
                            decimalSeparator={numberFormatConfig.decimalSeparator}
                            decimalScale={2}
                            fixedDecimalScale
                            allowNegative={false}
                            style={{ height: '40px' }}
                            placeholder={numberFormatConfig.placeholder}
                            value={investimento.investmentValue}
                            onValueChange={(values) => {
                                const { floatValue } = values;
                                handleFieldChange('investmentValue', floatValue || 0);
                            }}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Row gutter={24} className="mb-6">
                <Col span={12}>
                    <Form.Item
                        label="Moeda"
                        validateStatus={validation.errors.currency ? 'error' : ''}
                        help={validation.errors.currency}
                    >
                        <Select
                            placeholder="Selecione a moeda"
                            className="h-10"
                            allowClear
                            value={investimento.currency}
                            onChange={(value) => handleFieldChange('currency', value)}
                        >
                            <Option value="BRL">Real Brasileiro (BRL)</Option>
                            <Option value="USD">Dólar Americano (USD)</Option>
                            <Option value="EUR">Euro (EUR)</Option>
                        </Select>
                    </Form.Item>
                </Col>
                <Col span={12}>
                    <Form.Item
                        label="Ano do Investimento"
                        validateStatus={validation.errors.investmentYear ? 'error' : ''}
                        help={validation.errors.investmentYear}
                    >
                        <InputNumber
                            style={{ width: '100%', height: '40px' }}
                            min={2025}
                            max={2050}
                            value={investimento.investmentYear}
                            onChange={(value) => handleFieldChange('investmentYear', value)}
                            placeholder={new Date().getFullYear()}
                        />
                    </Form.Item>
                </Col>
            </Row>

            <Form.Item label="Descrição do Investimento">
                <TextArea
                    rows={4}
                    placeholder="Descreva os detalhes do investimento, justificativa, benefícios esperados, etc."
                    style={{ minHeight: '100px' }}
                    value={investimento.investmentDescription}
                    onChange={(e) => handleFieldChange('investmentDescription', e.target.value)}
                />
            </Form.Item>
        </div>
    );
}

function GraficoTab() {
    const chartRef = useRef(null);
    const chartInstanceRef = useRef(null);

    const {
        detalhes,
        abrangencia
    } = useInitiativeModalStore();

    const {
        getEmissionInventory
    } = useDecarbonizationSettingsStore();

    // Get technology data
    const { getTechnologies } = useTechnologyBankStore();
    const technologies = getTechnologies();

    // Get emissions data
    const emissionsInventory = getEmissionInventory();

    // Get projections store
    const store = useDecarbonizationSettingsStore();

    // Calculate chart data
    const chartData = useMemo(() => {
        if (!detalhes.activities || !detalhes.technology || !abrangencia.coverage) {
            return [];
        }

        // Get selected technology
        const selectedTechnology = technologies.find(tech => tech.id === detalhes.technology);
        const reductionPercentage = selectedTechnology?.reductionPotential || 0;

        // Calculate projection for a specific activity and year
        const getEmissionProjectionForActivity = (activityId, year) => {
            const emission = emissionsInventory.find(item => item.id === activityId);
            if (!emission || !emission.anchorage) {
                return emission?.emission || 0; // Return base emission if no projection
            }

            // Find the anchorage parameter from projections
            const projections = store.getProjectionParameters();
            const anchorageParam = projections.find(p => p.id === emission.anchorage);

            if (!anchorageParam) {
                return emission?.emission || 0; // Return base emission if no anchorage found
            }

            // Calculate projected emission for the year
            const baseEmission = emission.emission || 0;
            let projectedValue = baseEmission;

            // Apply year-over-year variations from base year to target year
            // Obter anos dinamicamente das metas de redução
            const { reductionGoals = [] } = store;
            const safeReductionGoals = Array.isArray(reductionGoals) ? reductionGoals : [];

            let baseYear = 2025; // fallback
            if (safeReductionGoals.length > 0) {
                const baseYears = safeReductionGoals.map(goal =>
                    goal.baseline_year || goal.baseYear || 2025
                );
                baseYear = Math.min(...baseYears);
            }

            for (let y = baseYear; y < year; y += 1) {
                const currentParamValue = anchorageParam.values[y + 1] || 0;
                const previousParamValue = anchorageParam.values[y] || 0;

                // Calculate variation percentage
                let variation = 0;
                if (previousParamValue === 0) {
                    variation = currentParamValue === 0 ? 0 : 100;
                } else {
                    variation = ((currentParamValue - previousParamValue) / previousParamValue) * 100;
                }

                // Apply variation to projected value
                projectedValue *= (1 + variation / 100);
            }

            return projectedValue;
        };

        const data = [];

        // Generate data for each year in coverage
        Object.entries(abrangencia.coverage).forEach(([year, coverage]) => {
            const yearNum = parseInt(year, 10);
            const coverageValue = coverage || 0;

            // Calculate consolidated base emissions for all selected activities for this year
            const consolidatedBaseEmissions = detalhes.activities.reduce((total, activityName) => (
                total + getEmissionProjectionForActivity(activityName, yearNum)
            ), 0);

            // Base emissions (red line) - consolidated projection for the year
            data.push({
                year: yearNum,
                value: consolidatedBaseEmissions,
                category: 'Emissão Base (tCO2e)',
                type: 'baseline'
            });

            // Emissions with decarbonization (green line)
            // Formula: base emissions * coverage * (1 - reduction percentage)
            const reducedEmissions = consolidatedBaseEmissions * (coverageValue / 100) * (reductionPercentage / 100);
            const finalEmissions = consolidatedBaseEmissions - reducedEmissions;

            data.push({
                year: yearNum,
                value: Math.max(0, finalEmissions),
                category: 'Emissão com Descarbonização (tCO2e)',
                type: 'reduced'
            });
        });

        return data.sort((a, b) => a.year - b.year);
    }, [detalhes, abrangencia.coverage, technologies, emissionsInventory, store]);

    // Initialize chart
    useEffect(() => {
        if (!chartRef.current || chartData.length === 0) return;

        // Destroy existing chart
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
        }

        // Create new chart
        const line = new Line(chartRef.current, {
            data: chartData,
            xField: 'year',
            yField: 'value',
            seriesField: 'category',
            smooth: true,
            animation: false, // Disable animations to prevent errors
            color: ['#ff4d4f', '#52c41a'],
            lineStyle: {
                lineWidth: 3,
            },
            point: {
                size: 5,
                shape: 'circle',
                style: {
                    fill: 'white',
                    stroke: '#999',
                    lineWidth: 2,
                },
            },
            yAxis: {
                title: {
                    text: 'Emissões (tCO2e)',
                    style: {
                        fontSize: 12,
                        fontWeight: 'bold',
                    },
                },
                label: {
                    formatter: (v) => `${Number(v).toLocaleString('pt-BR', {
                        maximumFractionDigits: 2
                    })}`,
                },
            },
            xAxis: {
                title: {
                    text: 'Ano',
                    style: {
                        fontSize: 12,
                        fontWeight: 'bold',
                    },
                },
                type: 'linear',
                min: Math.min(...chartData.map(d => d.year)) - 0.5,
                max: Math.max(...chartData.map(d => d.year)) + 0.5,
            },
            legend: {
                position: 'bottom',
                fontSize: 10,
            },
            tooltip: {
                formatter: (datum) => ({
                    name: datum.category,
                    value: `${Number(datum.value).toLocaleString('pt-BR', {
                        maximumFractionDigits: 2
                    })} tCO2e`,
                }),
            },
        });

        line.render();
        chartInstanceRef.current = line;
    }, [chartData]);

    // Cleanup chart on unmount
    useEffect(() => () => {
        if (chartInstanceRef.current) {
            chartInstanceRef.current.destroy();
            chartInstanceRef.current = null;
        }
    }, []);

    return (
        <div className="p-6">
            <Title level={4} className="text-[#210856] mb-4">
                Projeção de Emissões
            </Title>

            <Text className="text-gray-600 mb-6 block">
                Visualização do impacto da iniciativa de descarbonização nas emissões ao longo dos anos.
            </Text>

            {chartData.length === 0 ? (
                <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <Text type="secondary">
                        Configure os detalhes da iniciativa e a abrangência para visualizar o gráfico.
                    </Text>
                </div>
            ) : (
                <div>
                    <div
                        ref={chartRef}
                        style={{
                            height: '400px',
                            width: '100%',
                            position: 'relative'
                        }}
                    />
                </div>
            )}
        </div>
    );
}

function AddInitiativeModal({ visible, onClose, selectedScenarioId }) {
    const [form] = Form.useForm();
    const [currentTab, setCurrentTab] = useState('detalhes');

    // Stores
    const { addInitiativeToScenario, updateInitiativeInScenario, getActiveScenario, getScenarios } = useDecarbonizationSettingsStore();
    const {
        currentInitiative,
        resetForm,
        getCompleteInitiative,
        validateDetalhes,
        validateInvestimento,
        setLoading,
        loading
    } = useInitiativeModalStore();

    // Usar o cenário selecionado ou fallback para o cenário ativo
    const activeScenario = getActiveScenario();
    const scenarios = getScenarios();

    // Check if we're in edit mode
    const isEditMode = !!currentInitiative;

    // Determinar o cenário alvo baseado no contexto
    let targetScenario;
    if (isEditMode && currentInitiative?.scenarioId) {
        // Para edição, usar o cenário da iniciativa
        targetScenario = scenarios.find(s => s.id === currentInitiative.scenarioId);
    } else if (selectedScenarioId) {
        // Para criação com cenário selecionado
        targetScenario = scenarios.find(s => s.id === selectedScenarioId);
    } else {
        // Fallback para cenário ativo
        targetScenario = activeScenario;
    }

    // Reset form when modal opens/closes (but not when editing)
    useEffect(() => {
        if (visible && !isEditMode) {
            resetForm();
        }
    }, [visible, resetForm, isEditMode]);

    const tabs = [
        {
            key: 'detalhes',
            label: 'Detalhes',
            children: <DetalhesTab form={form} />
        },
        {
            key: 'abrangencia',
            label: 'Abrangência',
            children: <AbrangenciaTab />
        },
        {
            key: 'tarefas',
            label: 'Tarefas',
            children: <TarefasTab />
        },
        {
            key: 'investimento',
            label: 'Investimento',
            children: <InvestimentoTab />
        },
        {
            key: 'grafico',
            label: 'Gráfico',
            children: <GraficoTab />
        }
    ];

    const getCurrentTabIndex = () => tabs.findIndex(tab => tab.key === currentTab);
    const isLastTab = getCurrentTabIndex() === tabs.length - 1;

    const handleSaveAndContinue = async () => {
        setLoading(true);

        try {
            // Validate current tab
            if (currentTab === 'detalhes') {
                const isValid = validateDetalhes();
                if (!isValid) {
                    message.error('Por favor, preencha todos os campos obrigatórios na aba Detalhes.');
                    setLoading(false);
                    return;
                }
            }

            // Validate investment tab before final save
            if (currentTab === 'investimento' || isLastTab) {
                const isInvestmentValid = validateInvestimento();
                if (!isInvestmentValid) {
                    message.error('Por favor, corrija os dados de investimento antes de continuar.');
                    setLoading(false);
                    return;
                }
            }

            if (isLastTab) {
                // Save initiative to scenario
                const completeInitiative = getCompleteInitiative();

                // Debug: verificar o estado do targetScenario
                // eslint-disable-next-line no-console
                console.log('🐛 Debug save initiative:');
                // eslint-disable-next-line no-console
                console.log('  - isEditMode:', isEditMode);
                // eslint-disable-next-line no-console
                console.log('  - currentInitiative:', currentInitiative);
                // eslint-disable-next-line no-console
                console.log('  - selectedScenarioId:', selectedScenarioId);
                // eslint-disable-next-line no-console
                console.log('  - scenarios available:', scenarios);
                // eslint-disable-next-line no-console
                console.log('  - targetScenario:', targetScenario);

                if (targetScenario) {
                    if (isEditMode) {
                        // Update existing initiative
                        await updateInitiativeInScenario(completeInitiative.id, completeInitiative);
                        message.success('Iniciativa atualizada com sucesso!');
                    } else {
                        // Create new initiative
                        await addInitiativeToScenario(targetScenario.id, completeInitiative);
                        message.success('Iniciativa criada com sucesso!');
                    }
                    onClose();
                    resetForm();
                } else {
                    message.error('Nenhum cenário encontrado para associar a iniciativa.');
                }
            } else {
                // Move to next tab
                const nextTabIndex = getCurrentTabIndex() + 1;
                if (nextTabIndex < tabs.length) {
                    setCurrentTab(tabs[nextTabIndex].key);
                }
                message.success('Dados salvos! Prossiga para a próxima aba.');
            }
        } catch (error) {
            // eslint-disable-next-line no-console
            console.error('🛑 Erro ao salvar iniciativa — payload:', error?.config?.data);
            // eslint-disable-next-line no-console
            console.error('🛑 Erro ao salvar iniciativa — response:', error?.response?.data);

            const data = error?.response?.data;
            let detail = '';
            if (Array.isArray(data?.detail)) {
                detail = data.detail
                    .map(d => `${(d.loc || []).slice(1).join('.')}: ${d.msg}`)
                    .join('; ');
            } else if (typeof data?.detail === 'string') {
                detail = data.detail;
            } else if (typeof data?.message === 'string') {
                detail = data.message;
            } else if (typeof data === 'string') {
                detail = data;
            }

            if (detail) {
                message.error(`Erro ao salvar iniciativa: ${detail}`);
            } else if (error.message) {
                message.error(`Erro ao salvar iniciativa: ${error.message}`);
            } else {
                message.error('Erro ao salvar iniciativa. Tente novamente.');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleClose = () => {
        resetForm();
        onClose();
    };

    return (
        <Modal
            title={isEditMode ? "Editar Iniciativa" : "Nova Iniciativa"}
            open={visible}
            onCancel={handleClose}
            width={1200}
            destroyOnClose
            centered
            footer={
                <div className="flex justify-end gap-3">
                    <Button
                        onClick={handleClose}
                        style={{ height: '40px' }}
                    >
                        Cancelar
                    </Button>
                    <Button
                        type="primary"
                        className="bg-[#210856] hover:bg-[#2d0a6b] border-[#210856] hover:border-[#2d0a6b]"
                        onClick={handleSaveAndContinue}
                        loading={loading}
                        style={{ height: '40px' }}
                    >
                        {(() => {
                            if (isLastTab) {
                                return isEditMode ? 'Atualizar' : 'Concluir';
                            }
                            return 'Salvar e Continuar';
                        })()}
                    </Button>
                </div>
            }
        >
            <Form form={form} layout="vertical">
                <Tabs
                    activeKey={currentTab}
                    onChange={setCurrentTab}
                    items={tabs}
                    tabBarStyle={{ marginBottom: 0 }}
                />
            </Form>
        </Modal>
    );
}

export default AddInitiativeModal;
