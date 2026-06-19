import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Card, Typography, Button, Table, Empty, Modal, message, Tag, Tooltip } from 'antd';
import { PlusOutlined, MinusOutlined, EditOutlined, DeleteOutlined } from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';
import useInitiativeModalStore from '../store/useInitiativeModalStore';
import CreateScenarioModal from './CreateScenarioModal';
import AddInitiativeModal from './AddInitiativeModal';
import EditScenarioModal from './EditScenarioModal';

const { Title, Text } = Typography;

// Componente para o ícone de expansão
function ExpandIcon({ expanded, onExpand, record }) {
    return (
        <Button
            type="text"
            size="small"
            icon={expanded ? <MinusOutlined /> : <PlusOutlined />}
            onClick={e => onExpand(record, e)}
            className="text-blue-600"
        />
    );
}

function DecarbonizationProjectsStep({ currentStep, totalSteps, onNext, onPrev }) {
    const { t } = useTranslation();

    const [createScenarioModalVisible, setCreateScenarioModalVisible] = useState(false);
    const [editScenarioModalVisible, setEditScenarioModalVisible] = useState(false);
    const [selectedScenario, setSelectedScenario] = useState(null);
    const [addInitiativeModalVisible, setAddInitiativeModalVisible] = useState(false);
    const [expandedRowKeys, setExpandedRowKeys] = useState([]);
    const [selectedScenarioForInitiative, setSelectedScenarioForInitiative] = useState(null);

    const {
        getScenarios,
        getAllInitiatives,
        removeInitiativeFromScenario,
        loadScenarios,
        loadInitiatives,
        removeScenario
    } = useDecarbonizationSettingsStore();

    const { loadInitiative } = useInitiativeModalStore();

    const scenarios = getScenarios();
    const initiatives = getAllInitiatives();

    // Load data on component mount
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadScenarios();
                await loadInitiatives();
            } catch (error) {
                message.error(`Erro ao carregar dados: ${error.message}`);
            }
        };

        loadData();
    }, [loadScenarios, loadInitiatives]);

    const handleCreateScenario = () => {
        setCreateScenarioModalVisible(true);
    };

    const handleCloseCreateScenario = () => {
        setCreateScenarioModalVisible(false);
    };

    const handleAddInitiative = useCallback((scenarioId = null) => {
        // Armazenar o cenário selecionado para a nova iniciativa
        if (scenarioId) {
            setSelectedScenarioForInitiative(scenarioId);
        }
        setAddInitiativeModalVisible(true);
    }, []);

    const handleEditInitiative = useCallback((initiative) => {
        // Carrega os dados da iniciativa no store do modal
        loadInitiative(initiative);
        // Define o cenário da iniciativa para edição
        setSelectedScenarioForInitiative(initiative.scenarioId);
        // Abre o modal para edição
        setAddInitiativeModalVisible(true);
    }, [loadInitiative]);

    const handleDeleteInitiative = useCallback(async (initiativeId) => {
        try {
            // Como agora não temos activeScenarioId, vamos usar null como primeiro parâmetro
            // O método removeInitiativeFromScenario vai ser ajustado para trabalhar apenas com o ID da iniciativa
            await removeInitiativeFromScenario(null, initiativeId);
            message.success('Iniciativa excluída com sucesso!');
        } catch (error) {
            message.error(`Erro ao excluir iniciativa: ${error.message}`);
        }
    }, [removeInitiativeFromScenario]);

    const handleCloseAddInitiative = () => {
        setAddInitiativeModalVisible(false);
        setSelectedScenarioForInitiative(null);
    };

    // Função para editar cenário
    const handleEditScenario = useCallback((scenario) => {
        setSelectedScenario(scenario);
        setEditScenarioModalVisible(true);
    }, []);

    // Função para fechar modal de edição
    const handleCloseEditScenario = () => {
        setEditScenarioModalVisible(false);
        setSelectedScenario(null);
    };

    // Função para excluir cenário (sem modal de confirmação)
    const handleDeleteScenario = useCallback(async (scenarioId) => {
        // Verificar se há iniciativas associadas ao cenário
        const scenarioInitiatives = initiatives.filter(init =>
            init && init.scenarioId && String(init.scenarioId) === String(scenarioId)
        );

        if (scenarioInitiatives.length > 0) {
            Modal.warning({
                title: 'Não é possível excluir o cenário',
                content: `Este cenário possui ${scenarioInitiatives.length} iniciativa${scenarioInitiatives.length !== 1 ? 's' : ''} associada${scenarioInitiatives.length !== 1 ? 's' : ''}. Por favor, exclua todas as iniciativas antes de excluir o cenário.`,
                okText: 'Entendi',
                centered: true,
            });
            return;
        }

        try {
            await removeScenario(scenarioId);
            message.success('Cenário excluído com sucesso!');
        } catch (error) {
            message.error(`Erro ao excluir cenário: ${error.message}`);
        }
    }, [removeScenario, initiatives]);

    // Renderizar quando não há cenários
    const scenarioColumns = useMemo(() => [
        {
            title: 'Nome do Cenário',
            dataIndex: 'name',
            key: 'name',
            render: (text, record) => (
                <div className="flex items-center gap-2">
                    <Text strong className="text-[#210856]">{text}</Text>
                    {record.isActive && (
                        <Tag color="green">Ativo</Tag>
                    )}
                </div>
            ),
        },
        {
            title: 'Descrição',
            dataIndex: 'description',
            key: 'description',
            render: (text) => text || 'Sem descrição',
        },
        {
            title: 'Iniciativas',
            key: 'initiatives',
            render: (_, record) => {
                const scenarioInitiatives = initiatives.filter(init => init.scenarioId === record.id);
                return (
                    <Tag color="blue">
                        {scenarioInitiatives.length} iniciativa{scenarioInitiatives.length !== 1 ? 's' : ''}
                    </Tag>
                );
            },
        },
        {
            title: 'Data de Criação',
            dataIndex: 'createdAt',
            key: 'createdAt',
            render: (timestamp) => {
                if (!timestamp) return 'Não informado';
                return new Date(timestamp * 1000).toLocaleDateString('pt-BR');
            },
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 80,
            align: 'center',
            fixed: 'right',
            render: (_, record) => (
                <div className="flex items-center justify-center space-x-1">
                    <Tooltip title="Editar cenário">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            size="small"
                            className="text-gray-500 hover:text-[#210856]"
                            onClick={() => handleEditScenario(record)}
                        />
                    </Tooltip>
                    <Tooltip title="Excluir cenário">
                        <Button
                            type="text"
                            icon={<DeleteOutlined />}
                            size="small"
                            className="text-gray-500 hover:text-red-500"
                            onClick={() => handleDeleteScenario(record.id)}
                        />
                    </Tooltip>
                </div>
            ),
        },
    ], [initiatives, handleDeleteScenario, handleEditScenario]);

    // Função para renderizar conteúdo expandido (iniciativas do cenário)
    const expandedRowRender = useCallback((record) => {
        // Filtrar iniciativas do cenário com verificações mais robustas
        const scenarioInitiatives = initiatives.filter(init =>
            init && init.scenarioId && String(init.scenarioId) === String(record.id)
        );

        return (
            <div className="p-4 bg-gray-50">
                <div className="flex justify-between items-center mb-4">
                    <Text strong>Iniciativas do Cenário: {record.name}</Text>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => handleAddInitiative(record.id)}
                        className="bg-[#210856] hover:bg-[#2d0a6b] border-[#210856] hover:border-[#2d0a6b]"
                    >
                        Adicionar Iniciativa
                    </Button>
                </div>

                {scenarioInitiatives.length === 0 ? (
                    <div className="text-center py-8">
                        <Empty
                            description="Nenhuma iniciativa cadastrada neste cenário"
                            image={Empty.PRESENTED_IMAGE_SIMPLE}
                        />
                    </div>
                ) : (
                    <Table
                        columns={[
                            {
                                title: 'Título',
                                dataIndex: 'title',
                                key: 'title',
                                width: '20%',
                                render: (text) => (
                                    <div>
                                        <Text strong className="text-sm">{text}</Text>
                                    </div>
                                ),
                            },
                            {
                                title: 'Tipo de Projeto',
                                dataIndex: 'projectType',
                                key: 'projectType',
                                width: '20%',
                                render: (text) => (
                                    <div>
                                        <Text className="text-sm">{text}</Text>
                                    </div>
                                ),
                            },
                            {
                                title: 'Escopo',
                                dataIndex: 'scope',
                                key: 'scope',
                                width: 120,
                                render: (scope) => (
                                    <Text className="text-sm">{t(scope) || 'Não informado'}</Text>
                                ),
                            },
                            {
                                title: 'Categoria',
                                dataIndex: 'category',
                                key: 'category',
                                width: 180,
                                render: (category) => (
                                    <Text className="text-sm">{category || 'Não informado'}</Text>
                                ),
                            },
                            {
                                title: 'Responsável',
                                dataIndex: 'responsible',
                                key: 'responsible',
                                width: 150,
                                render: (responsible) => (
                                    <Text className="text-sm">{responsible || 'Não informado'}</Text>
                                ),
                            },
                            {
                                title: 'Período',
                                key: 'period',
                                width: 200,
                                render: (_, initiative) => (
                                    <Text className="text-sm">
                                        {initiative.startDate && initiative.endDate
                                            ? `${new Date(initiative.startDate).toLocaleDateString('pt-BR')} - ${new Date(initiative.endDate).toLocaleDateString('pt-BR')}`
                                            : 'Não informado'
                                        }
                                    </Text>
                                ),
                            },
                            {
                                title: 'Investimento',
                                key: 'investment',
                                width: 150,
                                render: (_, initiative) => (
                                    initiative.investment?.totalAmount ? (
                                        <div>
                                            {initiative.investment?.type && (
                                                <span>
                                                    <Text className="text-sm font-medium text-gray-500">
                                                        {initiative.investment?.type?.toUpperCase()}
                                                    </Text>
                                                    <Text> - </Text>
                                                </span>
                                            )}

                                            <Text className="text-sm font-medium text-green-600">
                                                {new Intl.NumberFormat('pt-BR', {
                                                    style: 'currency',
                                                    currency: initiative.investment.currency || 'BRL'
                                                }).format(initiative.investment.totalAmount)}
                                            </Text>
                                        </div>
                                    ) : (
                                        <Text className="text-sm text-gray-500">Sem investimento</Text>
                                    )
                                ),
                            },
                            {
                                title: 'Ações',
                                key: 'actions',
                                width: 80,
                                align: 'center',
                                fixed: 'right',
                                render: (_, initiative) => (
                                    <div className="flex justify-center items-center space-x-1">
                                        <Tooltip title="Editar iniciativa">
                                            <Button
                                                type="text"
                                                icon={<EditOutlined />}
                                                size="small"
                                                className="text-gray-500 hover:text-[#210856]"
                                                onClick={() => handleEditInitiative(initiative)}
                                            />
                                        </Tooltip>
                                        <Tooltip title="Excluir iniciativa">
                                            <Button
                                                type="text"
                                                icon={<DeleteOutlined />}
                                                size="small"
                                                className="text-gray-500 hover:text-red-500"
                                                onClick={() => handleDeleteInitiative(initiative.id)}
                                            />
                                        </Tooltip>
                                    </div>
                                ),
                            },
                        ]}
                        dataSource={scenarioInitiatives}
                        rowKey="id"
                        pagination={false}
                        size="small"
                        className="initiatives-table"
                        scroll={{ x: 800 }}
                    />
                )}
            </div>
        );
    }, [initiatives, handleAddInitiative, t, handleEditInitiative, handleDeleteInitiative]);

    // Configuração de expansão da tabela
    const expandableConfig = useMemo(() => ({
        expandedRowKeys,
        expandedRowRender,
        onExpand: (expanded, record) => {
            setExpandedRowKeys(expanded ? [record.id] : []);
        },
        expandRowByClick: false,
        expandIcon: ExpandIcon
    }), [expandedRowKeys, expandedRowRender]);

    // Renderizar quando não há cenários
    const renderEmptyState = () => (
        <Empty
            description="Nenhum cenário de descarbonização configurado"
            className="py-16"
        >
            <Button
                type="primary"
                icon={<PlusOutlined />}
                onClick={handleCreateScenario}
                className="bg-[#210856] hover:bg-[#2d0a6b] border-[#210856] hover:border-[#2d0a6b] h-10 px-6"
                size="large"
            >
                Novo Cenário
            </Button>
        </Empty>
    );

    return (
        <div className="space-y-6">
            {/* Header com título, descrição e botões de navegação */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
                <div className="flex-1 lg:mr-6">
                    <Title level={3} className="text-[#210856] mb-3">
                        Passo 4: Projetos de Descarbonização
                    </Title>
                    <Text type="secondary" className="text-base leading-relaxed">
                        Crie cenários e defina as iniciativas de descarbonização para atingir suas metas.
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
                <div className="mb-6">
                    <div className="flex justify-end items-center">
                        {scenarios.length > 0 && (
                            <Button
                                type="primary"
                                icon={<PlusOutlined />}
                                onClick={handleCreateScenario}
                                className="bg-[#210856] hover:bg-[#2d0a6b] border-[#210856] hover:border-[#2d0a6b]"
                                style={{ height: '40px' }}
                            >
                                Criar Cenário
                            </Button>
                        )}
                    </div>
                </div>

                {scenarios.length === 0 ? (
                    renderEmptyState()
                ) : (
                    <Table
                        columns={scenarioColumns}
                        dataSource={scenarios}
                        rowKey="id"
                        expandable={expandableConfig}
                        pagination={false}
                        size="middle"
                        className="scenarios-table"
                    />
                )}
            </Card>

            {/* Modals */}
            <CreateScenarioModal
                visible={createScenarioModalVisible}
                onClose={handleCloseCreateScenario}
            />

            <EditScenarioModal
                visible={editScenarioModalVisible}
                onClose={handleCloseEditScenario}
                scenario={selectedScenario}
            />

            <AddInitiativeModal
                visible={addInitiativeModalVisible}
                onClose={handleCloseAddInitiative}
                selectedScenarioId={selectedScenarioForInitiative}
            />
        </div>
    );
}

export default DecarbonizationProjectsStep;
