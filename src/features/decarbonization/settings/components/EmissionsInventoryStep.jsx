import React, { useState, useMemo, useEffect } from 'react';
import {
    Card,
    Typography,
    Button,
    Empty,
    Table,
    Select,
    message,
    Input,
    Row,
    Col,
    Space
} from 'antd';
import {
    DownloadOutlined,
    UploadOutlined,
    PlusOutlined,
    DeleteOutlined,
    LineChartOutlined,
    EditOutlined
} from '@ant-design/icons';
import { useTranslation } from 'react-i18next';
import useDecarbonizationSettingsStore from '../store/useDecarbonizationSettingsStore';
import { downloadEmissionsTemplate, parseEmissionsCSV } from '../utils/emissionsFileUtils';
import EmissionProjectionModal from './EmissionProjectionModal';
import BaselineEmissionModal from './BaselineEmissionModal';

const { Title, Text } = Typography;

function EmissionsInventoryStep({ currentStep, totalSteps, onNext, onPrev }) {
    const { i18n } = useTranslation();

    // Função para formatar números com separadores de milhares
    const formatNumberWithSeparators = (value) => {
        if (!value && value !== 0) return '';

        const language = i18n.language || 'pt-br';
        const numValue = Number(value);

        if (Number.isNaN(numValue)) return '';

        if (language.startsWith('en')) {
            // Para inglês: 447,081.00
            return numValue.toLocaleString('en-US', {
                minimumFractionDigits: 2,
                maximumFractionDigits: 2
            });
        }

        // Para português: 447.081,00
        return numValue.toLocaleString('pt-BR', {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        });
    };

    // States para modal
    const [modalVisible, setModalVisible] = useState(false);
    const [editingItem, setEditingItem] = useState(null);

    // Filtros
    const [scopeFilter, setScopeFilter] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('');
    const [activityFilter, setActivityFilter] = useState('');

    // Modal de projeção
    const [projectionModalVisible, setProjectionModalVisible] = useState(false);
    const [selectedEmissionItem, setSelectedEmissionItem] = useState(null);

    // Zustand store
    const store = useDecarbonizationSettingsStore();
    const {
        emissionsInventory = [],
        reductionGoals = [],
        projections = [],
        loading,
        loadBaselineEmissions,
        addBaselineEmission,
        updateBaselineEmission,
        removeBaselineEmission
    } = store;

    // Carregar dados quando componente montar
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadBaselineEmissions();
            } catch (error) {
                message.error('Erro ao carregar emissões baseline');
            }
        };

        loadData();
    }, [loadBaselineEmissions]);

    // Garantir que arrays sejam sempre válidos
    const safeEmissions = useMemo(() =>
        Array.isArray(emissionsInventory) ? emissionsInventory : [],
        [emissionsInventory]
    );
    const safeGoals = Array.isArray(reductionGoals) ? reductionGoals : [];
    const safeProjections = Array.isArray(projections) ? projections : [];

    // Filtrar emissões
    const filteredEmissions = useMemo(() =>
        safeEmissions.filter(item => {
            const matchesScope = !scopeFilter || item.scope === scopeFilter;
            const matchesCategory = !categoryFilter || item.category === categoryFilter;
            const matchesActivity = !activityFilter || item.activity?.toLowerCase().includes(activityFilter.toLowerCase());

            return matchesScope && matchesCategory && matchesActivity;
        }), [safeEmissions, scopeFilter, categoryFilter, activityFilter]);

    // Calcular resumo
    const summary = useMemo(() => {
        const total = filteredEmissions.reduce((sum, item) => sum + (item.emission || 0), 0);
        const mapped = filteredEmissions.length;

        return { total, mapped };
    }, [filteredEmissions]);

    // Abrir modal para adicionar nova emissão
    const handleOpenAddModal = () => {
        setEditingItem(null);
        setModalVisible(true);
    };

    // Abrir modal para editar emissão existente
    const handleOpenEditModal = (item) => {
        setEditingItem(item);
        setModalVisible(true);
    };

    // Fechar modal
    const handleCloseModal = () => {
        setModalVisible(false);
        setEditingItem(null);
    };

    // Submeter dados do modal (adicionar ou editar)
    const handleModalSubmit = async (formData) => {
        try {
            if (editingItem) {
                // Modo edição
                await updateBaselineEmission(editingItem.id, formData);
                message.success('Emissão atualizada com sucesso!');
            } else {
                // Modo criação
                await addBaselineEmission(formData);
                message.success('Emissão adicionada com sucesso!');
            }
            handleCloseModal();
        } catch (error) {
            message.error(error.message || 'Erro ao salvar emissão');
        }
    };

    // Remover item
    const handleRemoveItem = async (itemId) => {
        try {
            await removeBaselineEmission(itemId);
            message.success('Emissão removida com sucesso!');
        } catch (error) {
            message.error(error.message || 'Erro ao remover emissão');
        }
    };

    // Abrir modal de projeção
    const handleOpenProjectionModal = (emissionItem) => {
        setSelectedEmissionItem(emissionItem);
        setProjectionModalVisible(true);
    };

    // Fechar modal de projeção
    const handleCloseProjectionModal = () => {
        setProjectionModalVisible(false);
        setSelectedEmissionItem(null);
    };

    // Gerar modelo Excel para download
    const handleDownloadTemplate = () => {
        downloadEmissionsTemplate('modelo_inventario_emissoes.xlsx', safeGoals, safeProjections);
        message.success('Modelo baixado com sucesso!');
    };

    // Processar arquivo importado
    const handleFileImport = async (file) => {
        try {
            const emissionItems = await parseEmissionsCSV(file, safeGoals, safeProjections);

            if (emissionItems.length === 0) {
                message.warning('Nenhum item válido encontrado no arquivo');
                return;
            }

            message.loading('Importando dados...', 0); // Loading infinito

            let successCount = 0;
            let errorCount = 0;
            const errors = [];

            // Usar Promise.allSettled para processar todos os itens
            const results = await Promise.allSettled(
                emissionItems.map(async (item, index) => {
                    try {
                        await addBaselineEmission(item);
                        return { success: true, index };
                    } catch (error) {
                        const errorMessage = error.message || 'Erro ao cadastrar';
                        const errorObj = new Error(`Linha ${index + 2}: ${errorMessage}`);
                        errorObj.index = index;
                        throw errorObj;
                    }
                })
            );

            // Processar resultados
            results.forEach((result) => {
                if (result.status === 'fulfilled') {
                    successCount += 1;
                } else {
                    errorCount += 1;
                    errors.push(result.reason.message);
                }
            });

            // Fazer GET para atualizar os dados
            await loadBaselineEmissions();

            message.destroy(); // Remove loading

            // Mostrar resultado da importação
            if (errorCount === 0) {
                message.success(`${successCount} itens importados com sucesso!`);
            } else if (successCount === 0) {
                message.error(`Falha ao importar todos os itens. Erros: ${errors.slice(0, 3).join(', ')}${errors.length > 3 ? '...' : ''}`);
            } else {
                message.warning(`${successCount} itens importados com sucesso, ${errorCount} falharam. Primeiros erros: ${errors.slice(0, 2).join(', ')}`);
            }

        } catch (error) {
            message.destroy(); // Remove loading se houver
            message.error(`Erro ao processar arquivo: ${error.message}`);
        }
    };

    // Preparar dados para a tabela
    const getTableData = () => filteredEmissions.map(item => ({
        key: item.id,
        id: item.id,
        scope: item.scope,
        category: item.category,
        activity: item.activity,
        emission: item.emission,
        goal: item.goal,
        anchorage: item.anchorage
    }));

    // Configuração das colunas da tabela
    const getTableColumns = () => [
        {
            title: 'Escopo',
            dataIndex: 'scope',
            key: 'scope',
            width: 100,
        },
        {
            title: 'Categoria',
            dataIndex: 'category',
            key: 'category',
            width: 200,
        },
        {
            title: 'Atividade',
            dataIndex: 'activity',
            key: 'activity',
            width: 200,
        },
        {
            title: 'Emissão tCO2e',
            dataIndex: 'emission',
            key: 'emission',
            width: 150,
            render: (value) => (
                <span style={{ whiteSpace: 'nowrap' }}>
                    {formatNumberWithSeparators(value) || '0,00'}
                </span>
            )
        },
        {
            title: 'Meta',
            dataIndex: 'goal',
            key: 'goal',
            width: 150,
            render: (value) => {
                if (!value) return '-';
                const goal = safeGoals.find(g => g.id === value);
                return goal?.goalName || goal?.name || `Meta ${value}`;
            }
        },
        {
            title: 'Ancoragem',
            dataIndex: 'anchorage',
            key: 'anchorage',
            width: 120,
            render: (value) => {
                if (!value) return '-';
                const projection = safeProjections.find(p => p.id === value);
                return projection?.name || `${value}`;
            }
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 80,
            align: 'center',
            fixed: 'right',
            render: (_, record) => (
                <Space size="small">
                    <Button
                        type="text"
                        size="small"
                        icon={<LineChartOutlined />}
                        onClick={() => handleOpenProjectionModal(record)}
                        title="Ver Projeção"
                        disabled={!record.anchorage}
                    />
                    <Button
                        type="text"
                        size="small"
                        icon={<EditOutlined />}
                        onClick={() => handleOpenEditModal(record)}
                        title="Editar"
                    />
                    <Button
                        type="text"
                        danger
                        size="small"
                        icon={<DeleteOutlined />}
                        onClick={() => handleRemoveItem(record.id)}
                        title="Excluir"
                    />
                </Space>
            )
        }
    ];

    return (
        <div className="space-y-6">
            {/* Header com título, descrição e botões de navegação */}
            <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center mb-8 space-y-4 lg:space-y-0">
                <div className="flex-1 lg:mr-6">
                    <Title level={3} className="text-[#210856] mb-3">
                        Passo 3: Emissões Ano-Base
                    </Title>
                    <Text type="secondary" className="text-base leading-relaxed">
                        Importe ou cadastre o inventário de emissões do ano base. Configure as atividades, escopos e valores de emissão para estabelecer a linha de base.
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

            {/* Cards de Resumo */}
            {safeEmissions.length > 0 && (
                <Row gutter={[16, 16]} className="mb-6">
                    <Col xs={24} sm={12}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-blue-600 mb-1">
                                {summary.total.toFixed(2)}
                            </div>
                            <div className="text-sm text-gray-600">
                                Emissões Totais (tCO2e)
                            </div>
                        </Card>
                    </Col>
                    <Col xs={24} sm={12}>
                        <Card className="border-0 shadow-sm text-center">
                            <div className="text-2xl font-bold text-green-600 mb-1">
                                {summary.mapped}
                            </div>
                            <div className="text-sm text-gray-600">
                                Fontes Mapeadas
                            </div>
                        </Card>
                    </Col>
                </Row>
            )}

            <Card className="mt-6">
                {safeEmissions.length > 0 ? (
                    <>
                        <div className="flex justify-between items-center mb-6">
                            {/* Filtros */}
                            <div className="flex gap-3">
                                <Input
                                    placeholder="Filtrar por atividade"
                                    value={activityFilter}
                                    onChange={(e) => setActivityFilter(e.target.value)}
                                    allowClear
                                    style={{ width: 200, height: 40 }}
                                />
                                <Select
                                    placeholder="Filtrar por escopo"
                                    value={scopeFilter || undefined}
                                    onChange={setScopeFilter}
                                    allowClear
                                    style={{ width: 180, height: 40 }}
                                    options={[
                                        { label: 'Escopo 1', value: 'Escopo 1' },
                                        { label: 'Escopo 2', value: 'Escopo 2' },
                                        { label: 'Escopo 3', value: 'Escopo 3' },
                                    ]}
                                />
                                <Select
                                    placeholder="Filtrar por categoria"
                                    value={categoryFilter || undefined}
                                    onChange={setCategoryFilter}
                                    allowClear
                                    style={{ width: 220, height: 40 }}
                                    options={[
                                        ...new Set(safeEmissions.map(item => item.category))
                                    ].filter(Boolean).map(cat => ({ label: cat, value: cat }))}
                                />
                            </div>

                            {/* Botões */}
                            <div className="flex gap-2">
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleDownloadTemplate}
                                    style={{ height: 40 }}
                                >
                                    Baixar Modelo
                                </Button>
                                <Button
                                    icon={<UploadOutlined />}
                                    onClick={() => document.getElementById('file-input').click()}
                                    style={{ height: 40 }}
                                >
                                    Importar Dados
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleOpenAddModal}
                                    className="bg-[#210856] border-[#210856]"
                                    style={{ height: 40 }}
                                >
                                    Adicionar Item
                                </Button>
                            </div>
                        </div>

                        {/* Input file oculto para importação */}
                        <input
                            id="file-input"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFileImport(e.target.files[0]);
                                    e.target.value = ''; // Limpar input para permitir reimportação do mesmo arquivo
                                }
                            }}
                        />

                        {/* Tabela */}
                        <Table
                            dataSource={getTableData()}
                            columns={getTableColumns()}
                            pagination={false}
                            scroll={{ x: 1200 }}
                            className="emissions-table"
                            loading={loading}
                            style={{
                                '& .ant-table-thead > tr > th': {
                                    height: '56px',
                                },
                                '& .ant-table-tbody > tr > td': {
                                    height: '58px',
                                }
                            }}
                        />
                    </>
                ) : (
                    <div className="flex justify-center items-center py-16">
                        <Empty
                            description="Nenhuma atividade de emissão configurada. Comece importando dados ou adicionando atividades manualmente."
                            className="py-8"
                        >
                            <div className="flex flex-col sm:flex-row gap-3 justify-center items-center mt-4">
                                <Button
                                    icon={<DownloadOutlined />}
                                    onClick={handleDownloadTemplate}
                                    className="h-10 px-6"
                                    size="large"
                                >
                                    Baixar Modelo
                                </Button>
                                <Button
                                    icon={<UploadOutlined />}
                                    onClick={() => document.getElementById('file-input').click()}
                                    className="h-10 px-6"
                                    size="large"
                                >
                                    Importar Dados
                                </Button>
                                <Button
                                    type="primary"
                                    icon={<PlusOutlined />}
                                    onClick={handleOpenAddModal}
                                    className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                                    size="large"
                                >
                                    Nova Atividade
                                </Button>
                            </div>
                        </Empty>

                        {/* Input file oculto para importação */}
                        <input
                            id="file-input"
                            type="file"
                            accept=".xlsx,.xls,.csv"
                            style={{ display: 'none' }}
                            onChange={(e) => {
                                if (e.target.files && e.target.files[0]) {
                                    handleFileImport(e.target.files[0]);
                                    e.target.value = ''; // Limpar input para permitir reimportação do mesmo arquivo
                                }
                            }}
                        />
                    </div>
                )}
            </Card>

            {/* Modal de Projeção */}
            <EmissionProjectionModal
                visible={projectionModalVisible}
                onClose={handleCloseProjectionModal}
                emissionItem={selectedEmissionItem}
            />

            {/* Modal de Baseline Emission */}
            <BaselineEmissionModal
                visible={modalVisible}
                onCancel={handleCloseModal}
                onSubmit={handleModalSubmit}
                initialData={editingItem}
                reductionGoals={safeGoals}
                projections={safeProjections}
                loading={loading}
            />
        </div>
    );
}

export default EmissionsInventoryStep;
