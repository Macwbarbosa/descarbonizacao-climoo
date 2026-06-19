import React, { useState, useMemo, useEffect } from 'react';
import { Card, Typography, Button, Table, Tag, Input, message } from 'antd';
import { PlusOutlined, EditOutlined, DeleteOutlined, SearchOutlined } from '@ant-design/icons';
import AddTechnologyModal from './components/AddTechnologyModal';
import EditTechnologyModal from './components/EditTechnologyModal';
import useTechnologyBankStore from '../../../store/technologyBankStore';

const { Title } = Typography;

function TechnologyBankPage() {
    const [addModalVisible, setAddModalVisible] = useState(false);
    const [editModalVisible, setEditModalVisible] = useState(false);
    const [selectedTechnology, setSelectedTechnology] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    // Zustand store
    const {
        technologies,
        addTechnology,
        updateTechnology,
        deleteTechnology,
        loadTechnologies,
        loading
    } = useTechnologyBankStore();

    // Carregar tecnologias quando o componente for montado
    useEffect(() => {
        const loadData = async () => {
            try {
                await loadTechnologies();
            } catch (error) {
                message.error('Erro ao carregar tecnologias');
            }
        };

        loadData();
    }, [loadTechnologies]);

    // Filtrar tecnologias baseado no termo de busca
    const filteredTechnologies = useMemo(() => {
        if (!searchTerm) return technologies;

        const term = searchTerm.toLowerCase();
        return technologies.filter(tech =>
            tech.name.toLowerCase().includes(term) ||
            tech.description.toLowerCase().includes(term) ||
            (tech.fullDescription && tech.fullDescription.toLowerCase().includes(term))
        );
    }, [technologies, searchTerm]);

    const handleAddTechnology = async (newTechnology) => {
        try {
            await addTechnology(newTechnology);
            await loadTechnologies(); // Recarregar dados após criação
            message.success('Tecnologia adicionada com sucesso!');
        } catch (error) {
            message.error('Erro ao adicionar tecnologia');
        }
    };

    const handleEditTechnology = (technology) => {
        setSelectedTechnology(technology);
        setEditModalVisible(true);
    };

    const handleUpdateTechnology = async (id, updatedData) => {
        try {
            await updateTechnology(id, updatedData);
            message.success('Tecnologia atualizada com sucesso!');
            setEditModalVisible(false);
            setSelectedTechnology(null);
        } catch (error) {
            message.error('Erro ao atualizar tecnologia');
        }
    };

    const handleDeleteTechnology = async (id) => {
        try {
            await deleteTechnology(id);
            await loadTechnologies(); // Recarregar dados após exclusão
            message.success('Tecnologia removida com sucesso!');
        } catch (error) {
            message.error('Erro ao remover tecnologia');
        }
    };

    const columns = [
        {
            title: 'Tecnologia de Redução',
            dataIndex: 'name',
            key: 'name',
            width: '25%',
        },
        {
            title: 'Descrição',
            dataIndex: 'description',
            key: 'description',
            width: '35%',
        },
        {
            title: 'Potencial de Redução',
            dataIndex: 'reductionPotential',
            key: 'reductionPotential',
            width: '15%',
            render: (potential) => {
                const value = typeof potential === 'string' ? parseFloat(potential) : potential;
                return <Tag color="green">{value}%</Tag>;
            },
        },
        {
            title: 'Referência',
            dataIndex: 'reference',
            key: 'reference',
            width: '15%',
            render: (reference) => (
                reference ? (
                    <a href={reference} target="_blank" rel="noopener noreferrer">
                        Link
                    </a>
                ) : null
            ),
        },
        {
            title: 'Ações',
            key: 'actions',
            width: '10%',
            align: 'center',
            render: (_, record) => (
                <div className='flex justify-center'>
                    <Button
                        type="text"
                        icon={<EditOutlined />}
                        onClick={() => handleEditTechnology(record)}
                        size="small"
                    />
                    <Button
                        type="text"
                        icon={<DeleteOutlined />}
                        onClick={() => handleDeleteTechnology(record.id)}
                        size="small"
                        danger
                    />
                </div>
            ),
        },
    ];

    return (
        <div className="py-2">
            <div className='flex justify-between pb-4'>
                <Input
                    placeholder="Buscar tecnologias..."
                    prefix={<SearchOutlined />}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-80 h-10"
                    allowClear
                />

                <Button
                    type="primary"
                    icon={<PlusOutlined />}
                    onClick={() => setAddModalVisible(true)}
                    className="bg-[#210856] hover:bg-[#2d0a6b] border-[#210856] hover:border-[#2d0a6b] h-10"
                >
                    Adicionar Tecnologia
                </Button>
            </div>
            <Card>
                <div className="flex justify-between items-center mb-6">
                    <div className="flex items-center gap-4">
                        <Title level={4} className="text-[#210856] m-0">
                            Banco de Tecnologias
                        </Title>
                    </div>
                </div>

                <Table
                    columns={columns}
                    dataSource={filteredTechnologies}
                    rowKey="id"
                    pagination={false}
                    size="middle"
                    loading={loading}
                    rowClassName="h-14"
                />
            </Card>

            <AddTechnologyModal
                visible={addModalVisible}
                onClose={() => setAddModalVisible(false)}
                onSave={handleAddTechnology}
            />

            <EditTechnologyModal
                visible={editModalVisible}
                onClose={() => {
                    setEditModalVisible(false);
                    setSelectedTechnology(null);
                }}
                onSave={handleUpdateTechnology}
                technology={selectedTechnology}
            />
        </div>
    );
}

export default TechnologyBankPage;
