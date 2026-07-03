import React, { useEffect, useMemo, useState } from 'react';
import {
    Alert,
    Button,
    Card,
    Form,
    Input,
    Modal,
    Popconfirm,
    Select,
    Space,
    Table,
    Tabs,
    Tag,
    Tooltip,
    Typography,
    message,
} from 'antd';
import {
    BankOutlined,
    DeleteOutlined,
    EditOutlined,
    KeyOutlined,
    PlusOutlined,
    ReloadOutlined,
    TeamOutlined,
    ThunderboltOutlined,
} from '@ant-design/icons';

import { formatCnpj } from '@/features/decarbonization/shared/decarbonizationStorage';
import { listCompanies, createCompany, updateCompany, deleteCompany } from './companiesAPI';
import { listUsers, createUser, updateUser, deleteUser, generatePassword } from './adminUsersAPI';

const { Title, Text, Paragraph } = Typography;

/**
 * AdminPage — painel de administração (exclusivo do admin).
 * ---------------------------------------------------------
 * • Empresas: cadastrar/editar/excluir empresas (nome + CNPJ).
 * • Usuários: criar usuários com nome, e-mail e senha, vinculados a uma
 *   empresa. A pessoa entra com e-mail/senha e cai direto na empresa dela —
 *   a RLS do Supabase garante que ela não enxerga nenhuma outra.
 */

/** Modal exibido após criar/redefinir senha — único momento em que a senha aparece. */
function CredentialsModal({ creds, onClose }) {
    return (
        <Modal
            title="Acesso criado — copie e envie para a pessoa"
            open={!!creds}
            onCancel={onClose}
            footer={[
                <Button key="ok" type="primary" onClick={onClose}>
                    Concluir
                </Button>,
            ]}
        >
            <Alert
                className="mb-4"
                type="warning"
                showIcon
                message="A senha não fica visível depois — copie agora. Se perder, basta redefinir."
            />
            <Paragraph className="mb-1">
                <Text type="secondary">E-mail:</Text>{' '}
                <Text strong copyable>
                    {creds?.email}
                </Text>
            </Paragraph>
            <Paragraph className="mb-0">
                <Text type="secondary">Senha:</Text>{' '}
                <Text strong copyable code>
                    {creds?.password}
                </Text>
            </Paragraph>
        </Modal>
    );
}

/** Campo de senha com botão "Gerar" (senha aleatória legível). */
function PasswordField({ form, name = 'password', label = 'Senha' }) {
    return (
        <Form.Item
            name={name}
            label={label}
            rules={[
                { required: true, message: 'Informe a senha.' },
                { min: 8, message: 'Mínimo de 8 caracteres.' },
            ]}
        >
            <Input.Password
                placeholder="Mínimo 8 caracteres"
                addonAfter={
                    <Tooltip title="Gerar senha aleatória">
                        <button
                            type="button"
                            className="bg-transparent border-0 cursor-pointer text-[#210856] px-1"
                            onClick={() => form.setFieldValue(name, generatePassword())}
                        >
                            <ThunderboltOutlined /> Gerar
                        </button>
                    </Tooltip>
                }
            />
        </Form.Item>
    );
}

// ─── Aba: Usuários ────────────────────────────────────────────────────────────

function UsersTab({ companies, reloadCompanies }) {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(false);
    const [creating, setCreating] = useState(false);
    const [editing, setEditing] = useState(null); // usuário em edição
    const [resetting, setResetting] = useState(null); // usuário redefinindo senha
    const [creds, setCreds] = useState(null); // { email, password } recém-criados
    const [saving, setSaving] = useState(false);
    const [createForm] = Form.useForm();
    const [editForm] = Form.useForm();
    const [resetForm] = Form.useForm();

    const load = async () => {
        setLoading(true);
        try {
            setUsers(await listUsers());
        } catch (e) {
            message.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        load();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    const companyOptions = useMemo(
        () =>
            companies.map((c) => ({
                value: c.id,
                label: `${c.name} · ${formatCnpj(c.cnpj)}`,
            })),
        [companies]
    );

    const handleCreate = async () => {
        const values = await createForm.validateFields();
        setSaving(true);
        try {
            await createUser({
                email: values.email,
                password: values.password,
                name: values.name,
                companyId: values.companyId,
            });
            setCreds({ email: values.email.trim().toLowerCase(), password: values.password });
            setCreating(false);
            createForm.resetFields();
            load();
        } catch (e) {
            message.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleEdit = async () => {
        const values = await editForm.validateFields();
        setSaving(true);
        try {
            await updateUser({ id: editing.id, name: values.name, companyId: values.companyId || null });
            message.success('Usuário atualizado.');
            setEditing(null);
            load();
        } catch (e) {
            message.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleReset = async () => {
        const values = await resetForm.validateFields();
        setSaving(true);
        try {
            await updateUser({ id: resetting.id, password: values.password });
            setCreds({ email: resetting.email, password: values.password });
            setResetting(null);
            resetForm.resetFields();
        } catch (e) {
            message.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (user) => {
        try {
            await deleteUser(user.id);
            message.success(`Usuário ${user.email} excluído.`);
            load();
        } catch (e) {
            message.error(e.message);
        }
    };

    const columns = [
        { title: 'Nome', dataIndex: 'name', render: (v) => v || <Text type="secondary">—</Text> },
        { title: 'E-mail', dataIndex: 'email' },
        {
            title: 'Empresa',
            dataIndex: ['company', 'name'],
            render: (_, u) =>
                u.company ? (
                    <span>
                        {u.company.name}{' '}
                        <Text type="secondary" className="text-xs">
                            {formatCnpj(u.company.cnpj)}
                        </Text>
                    </span>
                ) : u.role === 'admin' ? (
                    <Text type="secondary">todas (admin)</Text>
                ) : (
                    <Tag color="orange">sem empresa</Tag>
                ),
        },
        {
            title: 'Perfil',
            dataIndex: 'role',
            width: 110,
            render: (role) =>
                role === 'admin' ? <Tag color="#210856">admin</Tag> : <Tag>usuário</Tag>,
        },
        {
            title: 'Ações',
            key: 'actions',
            width: 200,
            render: (_, u) => (
                <Space size={4}>
                    <Tooltip title="Editar nome/empresa">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditing(u);
                                editForm.setFieldsValue({ name: u.name, companyId: u.company?.id || undefined });
                            }}
                        />
                    </Tooltip>
                    <Tooltip title="Redefinir senha">
                        <Button
                            type="text"
                            icon={<KeyOutlined />}
                            onClick={() => {
                                setResetting(u);
                                resetForm.setFieldsValue({ password: generatePassword() });
                            }}
                        />
                    </Tooltip>
                    {u.role !== 'admin' && (
                        <Popconfirm
                            title={`Excluir ${u.email}?`}
                            description="A pessoa perde o acesso imediatamente. Os dados da empresa não são apagados."
                            okText="Excluir"
                            okButtonProps={{ danger: true }}
                            onConfirm={() => handleDelete(u)}
                        >
                            <Button type="text" danger icon={<DeleteOutlined />} />
                        </Popconfirm>
                    )}
                </Space>
            ),
        },
    ];

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <Text type="secondary">
                    Cada usuário entra com e-mail e senha e cai direto na empresa vinculada — sem acesso a
                    nenhuma outra.
                </Text>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={load} loading={loading}>
                        Atualizar
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            createForm.setFieldsValue({ password: generatePassword() });
                            setCreating(true);
                        }}
                    >
                        Novo usuário
                    </Button>
                </Space>
            </div>

            <Table rowKey="id" columns={columns} dataSource={users} loading={loading} pagination={false} />

            {/* Criar usuário */}
            <Modal
                title="Novo usuário"
                open={creating}
                onOk={handleCreate}
                onCancel={() => setCreating(false)}
                okText="Criar usuário"
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={createForm} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Nome" rules={[{ required: true, message: 'Informe o nome.' }]}>
                        <Input placeholder="Ex.: Maria Silva" />
                    </Form.Item>
                    <Form.Item
                        name="email"
                        label="E-mail"
                        rules={[
                            { required: true, message: 'Informe o e-mail.' },
                            { type: 'email', message: 'E-mail inválido.' },
                        ]}
                    >
                        <Input placeholder="pessoa@empresa.com.br" />
                    </Form.Item>
                    <Form.Item
                        name="companyId"
                        label="Empresa"
                        rules={[{ required: true, message: 'Vincule uma empresa.' }]}
                        extra={
                            !companies.length && (
                                <span>
                                    Nenhuma empresa cadastrada — crie primeiro na aba <b>Empresas</b>.
                                </span>
                            )
                        }
                    >
                        <Select
                            placeholder="Selecione a empresa"
                            options={companyOptions}
                            showSearch
                            optionFilterProp="label"
                            onDropdownVisibleChange={(open) => open && reloadCompanies()}
                        />
                    </Form.Item>
                    <PasswordField form={createForm} />
                </Form>
            </Modal>

            {/* Editar usuário */}
            <Modal
                title={`Editar — ${editing?.email || ''}`}
                open={!!editing}
                onOk={handleEdit}
                onCancel={() => setEditing(null)}
                okText="Salvar"
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={editForm} layout="vertical" requiredMark={false}>
                    <Form.Item name="name" label="Nome">
                        <Input />
                    </Form.Item>
                    {editing?.role !== 'admin' && (
                        <Form.Item name="companyId" label="Empresa">
                            <Select
                                placeholder="Selecione a empresa"
                                options={companyOptions}
                                showSearch
                                optionFilterProp="label"
                                allowClear
                            />
                        </Form.Item>
                    )}
                </Form>
            </Modal>

            {/* Redefinir senha */}
            <Modal
                title={`Redefinir senha — ${resetting?.email || ''}`}
                open={!!resetting}
                onOk={handleReset}
                onCancel={() => setResetting(null)}
                okText="Redefinir"
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={resetForm} layout="vertical" requiredMark={false}>
                    <PasswordField form={resetForm} label="Nova senha" />
                </Form>
            </Modal>

            <CredentialsModal creds={creds} onClose={() => setCreds(null)} />
        </>
    );
}

// ─── Aba: Empresas ────────────────────────────────────────────────────────────

function CompaniesTab({ companies, loading, reload }) {
    const [editing, setEditing] = useState(null); // null | 'new' | empresa
    const [saving, setSaving] = useState(false);
    const [form] = Form.useForm();

    const handleSave = async () => {
        const values = await form.validateFields();
        setSaving(true);
        try {
            if (editing === 'new') {
                await createCompany(values);
                message.success(`Empresa "${values.name}" criada. Agora cadastre os usuários dela.`);
            } else {
                await updateCompany(editing.id, values);
                message.success('Empresa atualizada.');
            }
            setEditing(null);
            form.resetFields();
            reload();
        } catch (e) {
            message.error(e.message);
        } finally {
            setSaving(false);
        }
    };

    const handleDelete = async (company) => {
        try {
            await deleteCompany(company.id);
            message.success(`Empresa "${company.name}" excluída.`);
            reload();
        } catch (e) {
            message.error(e.message);
        }
    };

    const columns = [
        { title: 'Empresa', dataIndex: 'name' },
        { title: 'CNPJ', dataIndex: 'cnpj', width: 200, render: (v) => formatCnpj(v) },
        {
            title: 'Ações',
            key: 'actions',
            width: 140,
            render: (_, c) => (
                <Space size={4}>
                    <Tooltip title="Editar">
                        <Button
                            type="text"
                            icon={<EditOutlined />}
                            onClick={() => {
                                setEditing(c);
                                form.setFieldsValue({ name: c.name, cnpj: formatCnpj(c.cnpj) });
                            }}
                        />
                    </Tooltip>
                    <Popconfirm
                        title={`Excluir "${c.name}"?`}
                        description="Os usuários vinculados perdem o acesso. Os dados do plano (por CNPJ) permanecem no banco."
                        okText="Excluir"
                        okButtonProps={{ danger: true }}
                        onConfirm={() => handleDelete(c)}
                    >
                        <Button type="text" danger icon={<DeleteOutlined />} />
                    </Popconfirm>
                </Space>
            ),
        },
    ];

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <Text type="secondary">
                    Cada empresa é identificada pelo CNPJ — os dados do plano de descarbonização ficam
                    isolados por CNPJ.
                </Text>
                <Space>
                    <Button icon={<ReloadOutlined />} onClick={reload} loading={loading}>
                        Atualizar
                    </Button>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => {
                            form.resetFields();
                            setEditing('new');
                        }}
                    >
                        Nova empresa
                    </Button>
                </Space>
            </div>

            <Table rowKey="id" columns={columns} dataSource={companies} loading={loading} pagination={false} />

            <Modal
                title={editing === 'new' ? 'Nova empresa' : `Editar — ${editing?.name || ''}`}
                open={!!editing}
                onOk={handleSave}
                onCancel={() => setEditing(null)}
                okText={editing === 'new' ? 'Criar empresa' : 'Salvar'}
                confirmLoading={saving}
                destroyOnClose
            >
                <Form form={form} layout="vertical" requiredMark={false}>
                    <Form.Item
                        name="name"
                        label="Nome da empresa"
                        rules={[{ required: true, message: 'Informe o nome.' }]}
                    >
                        <Input placeholder="Ex.: Minha Empresa S.A." />
                    </Form.Item>
                    <Form.Item
                        name="cnpj"
                        label="CNPJ"
                        rules={[
                            { required: true, message: 'Informe o CNPJ.' },
                            {
                                validator: (_, v) =>
                                    String(v || '').replace(/\D/g, '').length === 14
                                        ? Promise.resolve()
                                        : Promise.reject(new Error('CNPJ deve ter 14 dígitos.')),
                            },
                        ]}
                    >
                        <Input placeholder="00.000.000/0000-00" />
                    </Form.Item>
                </Form>
            </Modal>
        </>
    );
}

// ─── Página ───────────────────────────────────────────────────────────────────

export default function AdminPage() {
    const [companies, setCompanies] = useState([]);
    const [loading, setLoading] = useState(false);

    const reload = async () => {
        setLoading(true);
        try {
            setCompanies(await listCompanies());
        } catch (e) {
            message.error(e.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        reload();
    }, []);

    return (
        <div className="max-w-[1100px]">
            <Title level={3} className="!mb-1 climoo-heading !text-[#210856]">
                Administração
            </Title>
            <Text type="secondary">
                Cadastre empresas e os usuários de cada uma. Cada pessoa acessa somente a empresa à qual
                foi vinculada.
            </Text>

            <Card className="mt-5" styles={{ body: { paddingTop: 8 } }}>
                <Tabs
                    defaultActiveKey="users"
                    items={[
                        {
                            key: 'users',
                            label: (
                                <span>
                                    <TeamOutlined /> Usuários
                                </span>
                            ),
                            children: <UsersTab companies={companies} reloadCompanies={reload} />,
                        },
                        {
                            key: 'companies',
                            label: (
                                <span>
                                    <BankOutlined /> Empresas
                                </span>
                            ),
                            children: <CompaniesTab companies={companies} loading={loading} reload={reload} />,
                        },
                    ]}
                />
            </Card>
        </div>
    );
}
