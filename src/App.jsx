import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Select, Typography, Button, Modal, Input, Form, Dropdown, Avatar, Tooltip, message } from 'antd';
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
} from '@ant-design/icons';

import { useAuthStore } from '@/features/auth/shared/store/authStore';
import LoginPage from '@/features/auth/LoginPage';
import RecoveryPage from '@/RecoveryPage';
import AuditLogPage from '@/features/auth/AuditLogPage';
import useCompanyPersistence from '@/features/decarbonization/shared/useCompanyPersistence';
import { ADMIN_EMAIL } from '@/features/decarbonization/shared/decarbonizationAudit';
import { formatCnpj } from '@/features/decarbonization/shared/decarbonizationStorage';
import { listCompanyFiles, readCompanyFile } from '@/features/decarbonization/shared/decarbonizationFile';

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
  { key: '/inventory', label: 'Inventário', icon: <DatabaseOutlined />, element: <InventoryPage /> },
  { key: '/targets', label: 'Metas & Período', icon: <FlagOutlined />, element: <TargetsTimeframePage /> },
  { key: '/drivers', label: 'Variáveis de Crescimento', icon: <RiseOutlined />, element: <DriversPage /> },
  { key: '/bau', label: 'Projeção BAU', icon: <AreaChartOutlined />, element: <BauProjectionPage /> },
  { key: '/projects', label: 'Projetos', icon: <BulbOutlined />, element: <ProjectsPage /> },
  { key: '/scenarios', label: 'Cenários', icon: <PartitionOutlined />, element: <ScenariosPage /> },
  { key: '/technologies-bank', label: 'Banco de Tecnologias', icon: <AppstoreOutlined />, element: <TechnologiesBankPage /> },
  { key: '/initiatives-management', label: 'Gestão de Iniciativas', icon: <AppstoreOutlined />, element: <InitiativesManagementPage /> },
];

/** Seletor de empresa — lista os CNPJs com arquivo salvo em decarbonization-data/. */
function CompanyPicker() {
  const selectedCompany = useAuthStore((s) => s.user?.selectedCompany);
  const setSelectedCompany = useAuthStore((s) => s.setSelectedCompany);

  const [companies, setCompanies] = useState([]); // [{ cnpj, company }]
  const [loading, setLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [form] = Form.useForm();

  const loadCompanies = async () => {
    setLoading(true);
    try {
      const cnpjs = await listCompanyFiles();
      const list = await Promise.all(
        cnpjs.map(async (cnpj) => {
          const data = await readCompanyFile(cnpj).catch(() => null);
          return { cnpj, company: data?.empresa || data?.companyName || formatCnpj(cnpj) };
        })
      );
      setCompanies(list);
      // seleciona a primeira empresa se nenhuma estiver ativa
      if (!useAuthStore.getState().user?.selectedCompany && list[0]) {
        setSelectedCompany(list[0]);
      }
    } catch (e) {
      // dev middleware indisponível (ex.: build/preview) — segue só com o que houver
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadCompanies();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const options = useMemo(() => {
    const merged = [...companies];
    const active = selectedCompany;
    if (active?.cnpj && !merged.some((c) => c.cnpj === active.cnpj)) merged.unshift(active);
    return merged.map((c) => ({
      value: c.cnpj,
      label: `${c.company} · ${formatCnpj(c.cnpj)}`,
      company: c,
    }));
  }, [companies, selectedCompany]);

  const handleAdd = async () => {
    const values = await form.validateFields();
    const cnpj = String(values.cnpj || '').replace(/\D/g, '');
    if (cnpj.length !== 14) {
      message.error('CNPJ deve ter 14 dígitos.');
      return;
    }
    const company = { cnpj, company: values.company || formatCnpj(cnpj) };
    setCompanies((prev) => (prev.some((c) => c.cnpj === cnpj) ? prev : [...prev, company]));
    setSelectedCompany(company);
    setAddOpen(false);
    form.resetFields();
    message.success(`Empresa ativa: ${company.company}. Vá em "Salvar no projeto" para gravar o JSON.`);
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
        okText="Selecionar"
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

/** Menu do usuário logado: mostra o e-mail e permite sair. */
function UserMenu({ onOpenAudit }) {
  const authEmail = useAuthStore((s) => s.authEmail);
  const logout = useAuthStore((s) => s.logout);
  const isAdmin = authEmail === ADMIN_EMAIL;

  const items = [
    { key: 'email', label: <span className="text-xs text-gray-500">{authEmail}</span>, disabled: true },
    { type: 'divider' },
    ...(isAdmin
      ? [{ key: 'audit', icon: <HistoryOutlined />, label: 'Histórico de alterações', onClick: onOpenAudit }]
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

export default function App() {
  const location = useLocation();
  const selectedKey = NAV.find((n) => location.pathname.startsWith(n.key))?.key || '/inventory';
  const navigate = useNavigate();
  const [collapsed, setCollapsed] = useState(false);
  const authEmail = useAuthStore((s) => s.authEmail);
  // Rota de recuperação: página isolada que NÃO carrega/salva nada (evita
  // sobrescrever os dados do navegador). Detectada pela URL /recuperar.
  const recovery = typeof window !== 'undefined' && window.location.pathname.startsWith('/recuperar');
  // Carga por empresa + auto-save no banco (Supabase), global a todas as telas.
  // Em modo recuperação, o hook fica desligado (skipLoad).
  const persistence = useCompanyPersistence(recovery);

  if (recovery) return <RecoveryPage />;

  // Gate de acesso: sem login, mostra a tela de login.
  if (!authEmail) return <LoginPage />;

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
            <UserMenu onOpenAudit={() => navigate('/historico')} />
          </div>
        </Header>
        <div className="climoo-accent-bar" />

        <Content style={{ padding: 24 }}>
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            {NAV.map((n) => (
              <Route key={n.key} path={n.key} element={n.element} />
            ))}
            <Route path="/drivers/:id" element={<DriverDetailPage />} />
            <Route path="/projects/:id" element={<ProjectDetailPage />} />
            <Route
              path="/historico"
              element={authEmail === ADMIN_EMAIL ? <AuditLogPage /> : <Navigate to="/inventory" replace />}
            />
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
