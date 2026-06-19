import React, { useEffect, useMemo, useState } from 'react';
import { Layout, Menu, Select, Typography, Button, Modal, Input, Form, message } from 'antd';
import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
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
} from '@ant-design/icons';

import { useAuthStore } from '@/features/auth/shared/store/authStore';
import { formatCnpj } from '@/features/decarbonization/shared/decarbonizationStorage';
import { listCompanyFiles, readCompanyFile } from '@/features/decarbonization/shared/decarbonizationFile';

import {
  InventoryPage,
  TargetsTimeframePage,
  DriversPage,
  BauProjectionPage,
  ProjectsPage,
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

export default function App() {
  const location = useLocation();
  const selectedKey = NAV.find((n) => location.pathname.startsWith(n.key))?.key || '/inventory';

  return (
    <Layout style={{ minHeight: '100vh' }}>
      <Sider theme="light" width={248} style={{ borderRight: '1px solid #f0f0f0' }}>
        <div className="px-5 py-4 flex flex-col leading-tight">
          <span className="text-lg font-bold text-[#210856]">Climoo</span>
          <span className="text-xs text-gray-500">Plano de Descarbonização</span>
        </div>
        <Menu
          mode="inline"
          selectedKeys={[selectedKey]}
          style={{ borderInlineEnd: 'none' }}
          items={NAV.map((n) => ({
            key: n.key,
            icon: n.icon,
            label: <Link to={n.key}>{n.label}</Link>,
          }))}
        />
      </Sider>

      <Layout>
        <Header
          style={{ background: '#fff', borderBottom: '1px solid #f0f0f0', paddingInline: 24 }}
          className="flex items-center justify-between"
        >
          <Text strong className="text-[#210856]">Ferramenta de Descarbonização</Text>
          <CompanyPicker />
        </Header>

        <Content style={{ padding: 24, background: '#f7f7fb' }}>
          <Routes>
            <Route path="/" element={<Navigate to="/inventory" replace />} />
            {NAV.map((n) => (
              <Route key={n.key} path={n.key} element={n.element} />
            ))}
            <Route path="*" element={<Navigate to="/inventory" replace />} />
          </Routes>
        </Content>
      </Layout>
    </Layout>
  );
}
