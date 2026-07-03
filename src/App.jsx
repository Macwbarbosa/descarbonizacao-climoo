import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Select, Typography, Button, Modal, Input, Form, Dropdown, Avatar, Tooltip, Spin, message } from 'antd';
import { Link, Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom';
import {
  DatabaseOutlined,
  FlagOutlined,
  RiseOutlined,
  AreaChartOutlined,
  BulbOutlined,
  PartitionOutlined,
  AppstoreOutlined,
  BankOutlined,
  PlusOutlined,
  MenuFoldOutlined,
  MenuUnfoldOutlined,
  LogoutOutlined,
  UserOutlined,
  LoadingOutlined,
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  HistoryOutlined,
  SettingOutlined,
  ScheduleOutlined,
} from '@ant-design/icons';

import { useAuthStore } from '@/features/auth/shared/store/authStore';
import LoginPage from '@/features/auth/LoginPage';
import RecoveryPage from '@/RecoveryPage';
import AuditLogPage from '@/features/auth/AuditLogPage';
import AdminPage from '@/features/admin/AdminPage';
import PlanTrackingPage from '@/features/plan/PlanTrackingPage';
import { listCompanies, createCompany } from '@/features/admin/companiesAPI';
import useCompanyPersistence from '@/features/decarbonization/shared/useCompanyPersistence';
import { formatCnpj } from '@/features/decarbonization/shared/decarbonizationStorage';

import {
  InventoryPage,
  TargetsTimeframePage,
  DriversPage,
  DriverDetailPage,
  BauProjectionPage,
  ProjectsPage,
  ProjectDetailPage,
  ScenariosPage,
  InitiativesManagementPage,
  TechnologiesBankPage,
} from '@/features/decarbonization';

const { Sider, Header, Content } = Layout;
const { Text } = Typography;

const NAV = [
  { key: '/plano', label: 'Acompanhamento', icon: <ScheduleOutlined />, element: <PlanTrackingPage /> },
  { key: '/inventory', label: 'Inventário', icon: <DatabaseOutlined />, element: <InventoryPage /> },
  { key: '/targets', label: 'Metas & Período', icon: <FlagOutlined />, element: <TargetsTimeframePage /> },
  { key: '/drivers', label: 'Variáveis de Crescimento', icon: <RiseOutlined />, element: <DriversPage /> },
  { key: '/bau', label: 'Projeção BAU', icon: <AreaChartOutlined />, element: <BauProjectionPage /> },
  { key: '/projects', label: 'Projetos', icon: <BulbOutlined />, element: <ProjectsPage /> },
  { key: '/scenarios', label: 'Cenários', icon: <PartitionOutlined />, element: <ScenariosPage /> },
  { key: '/technologies-bank', label: 'Banco de Tecnologias', icon: <AppstoreOutlined />, element: <TechnologiesBankPage /> },
  { key: '/initiatives-management', label: 'Gestão de Iniciativas', icon: <AppstoreOutlined />, element: <InitiativesManagementPage /> },
];

/**
 * Seletor de empresa.
 *  - Admin: escolhe entre TODAS as empresas cadastradas (tabela `companies`) e
 *    pode criar novas — o cadastro completo fica no painel /admin.
 *  - Usuário comum: fica travado na empresa do próprio perfil (só exibição);
 *    a RLS do Supabase garante o isolamento também no servidor.
 */
function CompanyPicker() {
  const isAdmin = useAuthStore((s) => s.role === 'admin');
  const selectedCompany = useAuthStore((s) => s.user?.selectedCompany);
  const setSelectedCompany = useAuthStore((s) => s.setSelectedCompany);

  const [companies, setCompanies] = useState([]); // [{ id, cnpj, name }]
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const loadCompanies = async () => {
    if (!isAdmin) return;
    setLoading(true);
    try {
      const list = await listCompanies();
      setCompanies(list);
      // seleciona a primeira empresa se nenhuma estiver ativa
      if (!useAuthStore.getState().user?.selectedCompany && list[0]) {
        setSelectedCompany({ id: list[0].id, cnpj: list[0].cnpj, company: list[0].name });
      }
    } catch (e) {
      // banco indisponível — segue com a empresa já selecionada
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAdmin]);

  const options = useMemo(() => {
    const merged = companies.map((c) => ({ id: c.id, cnpj: c.cnpj, company: c.name }));
    const active = selectedCompany;
    if (active?.cnpj && !merged.some((c) => c.cnpj === active.cnpj)) merged.unshift(active);
    return merged.map((c) => ({
      value: c.cnpj,
      label: `${c.company} · ${formatCnpj(c.cnpj)}`,
      company: c,
    }));
  }, [companies, selectedCompany]);

  // Usuário comum: empresa fixa, sem seletor.
  if (!isAdmin) {
    if (!selectedCompany?.cnpj) return null;
    return (
      <div className="flex items-center gap-2">
        <BankOutlined className="text-[#210856]" />
        <span className="text-sm text-gray-700">
          {selectedCompany.company}{' '}
          <span className="text-gray-400 text-xs">{formatCnpj(selectedCompany.cnpj)}</span>
        </span>
      </div>
    );
  }

  const handleAdd = async () => {
    const values = await form.validateFields();
    try {
      const created = await createCompany({ name: values.company, cnpj: values.cnpj });
      setCompanies((prev) => [...prev, created]);
      setSelectedCompany({ id: created.id, cnpj: created.cnpj, company: created.name });
      setAddOpen(false);
      form.resetFields();
      message.success(`Empresa "${created.name}" criada e ativa. Cadastre os usuários dela em Administração.`);
    } catch (e) {
      message.error(e.message);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <BankOutlined className="text-[#210856]" />
      <Select
        style={{ minWidth: 320 }}
        loading={loading}
        placeholder="Selecione a empresa (CNPJ)"
        value={selectedCompany?.cnpj || undefined}
        options={options}
        onChange={(value, opt) => setSelectedCompany(opt.company)}
        showSearch
        optionFilterProp="label"
      />
      <Button icon={<PlusOutlined />} onClick={() => setAddOpen(true)}>
        Nova empresa
      </Button>

      <Modal
        title="Nova empresa"
        open={addOpen}
        onOk={handleAdd}
        onCancel={() => setAddOpen(false)}
        okText="Criar e selecionar"
      >
        <Form form={form} layout="vertical">
          <Form.Item name="company" label="Nome da empresa" rules={[{ required: true }]}>
            <Input placeholder="Ex.: Minha Empresa S.A." />
          </Form.Item>
          <Form.Item name="cnpj" label="CNPJ" rules={[{ required: true }]}>
            <Input placeholder="00.000.000/0000-00" />
          </Form.Item>
        </Form>
      </Modal>
    </div>
  );
}

/** Indicador discreto de auto-save no banco (Supabase). */
function AutoSaveIndicator({ status, enabled }) {
  if (!enabled) return null;
  if (status === 'saving') {
    return (
      <span className="hidden sm:inline-flex items-center gap-1 text-xs text-gray-500">
        <LoadingOutlined spin /> Salvando…
      </span>
    );
  }
  if (status === 'saved') {
    return (
      <Tooltip title="Tudo salvo no banco — disponível em qualquer lugar.">
        <span className="hidden sm:inline-flex items-center gap-1 text-xs text-emerald-600">
          <CheckCircleOutlined /> Salvo
        </span>
      </Tooltip>
    );
  }
  if (status === 'error') {
    return (
      <Tooltip title="Falha ao salvar no banco. Vamos tentar de novo na próxima alteração (seus dados seguem no navegador).">
        <span className="inline-flex items-center gap-1 text-xs text-[#b9462f]">
          <ExclamationCircleOutlined /> Erro ao salvar
        </span>
      </Tooltip>
    );
  }
  return null;
}

/** Menu do usuário logado: mostra o e-mail e permite sair; admin acessa a administração. */
function UserMenu({ onOpenAudit, onOpenAdmin }) {
  const authEmail = useAuthStore((s) => s.authEmail);
  const profileName = useAuthStore((s) => s.profile?.name);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = useAuthStore((s) => s.role === 'admin');

  const items = [
    {
      key: 'email',
      label: (
        <span className="text-xs text-gray-500">
          {profileName ? `${profileName} · ` : ''}
          {authEmail}
        </span>
      ),
      disabled: true,
    },
    { type: 'divider' },
    ...(isAdmin
      ? [
          { key: 'admin', icon: <SettingOutlined />, label: 'Administração', onClick: onOpenAdmin },
          { key: 'audit', icon: <HistoryOutlined />, label: 'Histórico de alterações', onClick: onOpenAudit },
        ]
      : []),
    { key: 'logout', icon: <LogoutOutlined />, label: 'Sair', onClick: logout },
  ];

  return (
    <Dropdown menu={{ items }} placement="bottomRight" trigger={['click']}>
      <button type="button" className="flex items-center gap-2 cursor-pointer border-0 bg-transparent">
        <Avatar size="small" style={{ background: '#210856' }} icon={<UserOutlined />} />
        <span className="hidden sm:inline text-sm text-gray-600 max-w-[180px] truncate">{authEmail}</span>
      </button>
    </Dropdown>
  );
}

/** Tela para usuário autenticado mas ainda sem empresa vinculada. */
function NoCompanyScreen() {
  const authEmail = useAuthStore((s) => s.authEmail);
  const logout = useAuthStore((s) => s.logout);
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-3" style={{ background: '#f4f3fb' }}>
      <img src="/climoo-logo.png" alt="Climoo" className="h-8 w-auto mb-2" />
      <Text strong className="text-[#210856]" style={{ fontSize: 16 }}>
        Seu usuário ainda não está vinculado a uma empresa
      </Text>
      <Text type="secondary">
        Peça ao administrador (mac@climoo.com.br) para vincular {authEmail} a uma empresa.
      </Text>
      <Button className="mt-2" icon={<LogoutOutlined />} onClick={logout}>
        Sair
      </Button>
    </div>
  );
}

export default function App() {
  const location = useLocation();
  const selectedKey = NAV.find((n) => location.pathname.startsWith(n.key))?.key || '/inventory';
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const authEmail = useAuthStore((s) => s.authEmail);
  const ready = useAuthStore((s) => s.ready);
  const isAdmin = useAuthStore((s) => s.role === 'admin');
  const hasCompany = useAuthStore((s) => Boolean(s.user?.selectedCompany?.cnpj));
  // Rota de recuperação: página isolada que NÃO carrega/salva nada (evita
  // sobrescrever os dados do navegador). Detectada pela URL /recuperar.
  const recovery = typeof window !== 'undefined' && window.location.pathname.startsWith('/recuperar');
  // Carga por empresa + auto-save no banco (Supabase), global a todas as telas.
  // Em modo recuperação, o hook fica desligado (skipLoad).
  const persistence = useCompanyPersistence(recovery);

  // Restaura a sessão do Supabase Auth (uma vez).
  useEffect(() => {
    useAuthStore.getState().init();
  }, []);

  if (recovery) return <RecoveryPage />;

  // Aguarda a restauração da sessão (evita "piscar" a tela de login).
  if (!ready) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: '#f4f3fb' }}>
        <Spin size="large" />
      </div>
    );
  }

  // Gate de acesso: sem login, mostra a tela de login.
  if (!authEmail) return <LoginPage />;

  // Usuário comum sem empresa vinculada: nada a mostrar além do aviso.
  if (!isAdmin && !hasCompany) return <NoCompanyScreen />;

  // Tela inicial: cliente cai no acompanhamento do plano; admin, no inventário.
  const home = isAdmin ? '/inventory' : '/plano';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider
        theme="light"
        width={252}
        collapsedWidth={72}
        collapsible
        collapsed={collapsed}
        onCollapse={setCollapsed}
        trigger={null}
        breakpoint="lg"
        className="climoo-sider"
        style={{ borderRight: '1px solid #e5e7eb' }}
      >
        <div
          className={`pt-5 pb-4 flex items-center ${collapsed ? 'justify-center px-0' : 'px-5'}`}
          style={{ height: 76 }}
        >
          {collapsed ? (
            <img src="/climoo-ring.png" alt="Climoo" className="h-9 w-9" />
          ) : (
            <div className="flex flex-col gap-1">
              <img src="/climoo-logo.png" alt="Climoo" className="h-7 w-auto self-start" />
              <span className="text-xs text-gray-500 pl-0.5">Plano de Descarbonização</span>
            </div>
          )}
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ borderInlineEnd: 'none', paddingTop: 4 }}
          items={NAV.map((n) => ({
            key: n.key,
            icon: n.icon,
            label: <Link to={n.key}>{n.label}</Link>,
          }))}
        />
      </Sider>

      <Layout>
        <Header
          style={{ background: '#fff', borderBottom: '1px solid #eef0f3', paddingInline: 24 }}
          className="flex items-center justify-between"
        >
          <div className="flex items-center gap-3">
            <Button
              type="text"
              aria-label={collapsed ? 'Expandir menu' : 'Recolher menu'}
              icon={collapsed ? <MenuUnfoldOutlined /> : <MenuFoldOutlined />}
              onClick={() => setCollapsed((v) => !v)}
              className="text-[#210856]"
            />
            <Text strong className="climoo-wordmark text-[#210856]" style={{ fontSize: 16 }}>
              Ferramenta de Descarbonização
            </Text>
          </div>
          <div className="flex items-center gap-4">
            <AutoSaveIndicator status={persistence.status} enabled={persistence.enabled} />
            <CompanyPicker />
            <UserMenu onOpenAudit={() => navigate('/historico')} onOpenAdmin={() => navigate('/admin')} />
          </div>
        </Header>
        <div className="climoo-accent-bar" />

        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to={home} replace />} />
            {NAV.map((n) => (
              <Route key={n.key} path={n.key} element={n.element} />
            ))}
            <Route path="/drivers/:id" element={<DriverDetailPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route
              path="/admin"
              element={isAdmin ? <AdminPage /> : <Navigate to="/inventory" replace />}
            />
            <Route
              path="/historico"
              element={isAdmin ? <AuditLogPage /> : <Navigate to="/inventory" replace />}
            />
            <Route path="*" element={<Navigate to={home} replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
