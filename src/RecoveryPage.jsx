import React, { useMemo, useState } from 'react';
import { Button, Typography, Table, Alert, Tag } from 'antd';
import { DownloadOutlined, SafetyCertificateOutlined } from '@ant-design/icons';

/**
 * RecoveryPage — página de RECUPERAÇÃO isolada (rota `/recuperar`).
 *
 * Objetivo: permitir baixar TODOS os dados que estão no navegador do usuário
 * SEM carregar nada do banco e SEM sobrescrever nada. É a rede de segurança
 * quando a versão do navegador está mais completa do que a versão do banco
 * (ex.: trabalho de um usuário que foi sobrescrito por outro).
 *
 * O App monta esta página ANTES de qualquer carga da empresa (o hook de
 * persistência é desligado nesta rota), então abrir `/recuperar` é 100% seguro.
 */

const ROOT_KEY = 'climoo-decarbonization-data';
const BKP_KEY = `${ROOT_KEY}__bkp`;
const SCEN = 'decarbonization-scenarios-store';
const PROJ = 'decarbonization-projects-store';

const { Title, Paragraph, Text } = Typography;

/** Lê e resume um snapshot (string JSON da raiz por CNPJ) em linhas por empresa. */
function summarize(raw, origem) {
    if (!raw) return [];
    try {
        const root = JSON.parse(raw);
        const companies = root?.companies || {};
        return Object.keys(companies).map((cnpj) => {
            const c = companies[cnpj] || {};
            const scen = c?.stores?.[SCEN]?.state?.scenarios;
            const proj = c?.stores?.[PROJ]?.state?.projects;
            const cenList = Array.isArray(scen) ? scen : [];
            return {
                key: `${origem}-${cnpj}`,
                origem,
                cnpj: cnpj || '(vazio)',
                empresa: c?.companyName || '(sem nome)',
                updatedAt: c?.updatedAt || '',
                cenarios: cenList.length,
                projetos: Array.isArray(proj) ? proj.length : 0,
                cenNomes: cenList.map((s) => s?.name || s?.nome).filter(Boolean).join(' · '),
            };
        });
    } catch (e) {
        return [];
    }
}

export default function RecoveryPage() {
    const [done, setDone] = useState(false);

    const rows = useMemo(() => {
        const main = summarize(localStorage.getItem(ROOT_KEY), 'Navegador (atual)');
        const bkp = summarize(localStorage.getItem(BKP_KEY), 'Backup de segurança');
        return [...main, ...bkp];
    }, []);

    const download = () => {
        const dump = {};
        for (let i = 0; i < localStorage.length; i += 1) {
            const k = localStorage.key(i);
            dump[k] = localStorage.getItem(k);
        }
        dump.__meta = { exportadoEm: new Date().toISOString(), userAgent: navigator.userAgent };
        const blob = new Blob([JSON.stringify(dump, null, 2)], { type: 'application/json' });
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = 'climoo-backup-navegador.json';
        document.body.appendChild(a);
        a.click();
        a.remove();
        setDone(true);
    };

    const columns = [
        { title: 'Origem', dataIndex: 'origem', key: 'origem', render: (v) => <Tag color={v.startsWith('Backup') ? 'gold' : 'blue'}>{v}</Tag> },
        { title: 'Empresa', dataIndex: 'empresa', key: 'empresa' },
        { title: 'CNPJ', dataIndex: 'cnpj', key: 'cnpj' },
        { title: 'Cenários', dataIndex: 'cenarios', key: 'cenarios', align: 'center' },
        { title: 'Projetos', dataIndex: 'projetos', key: 'projetos', align: 'center' },
        { title: 'Última alteração local', dataIndex: 'updatedAt', key: 'updatedAt', render: (v) => (v ? new Date(v).toLocaleString('pt-BR') : '—') },
        { title: 'Nomes dos cenários', dataIndex: 'cenNomes', key: 'cenNomes', render: (v) => <span style={{ fontSize: 12, color: '#6b7280' }}>{v || '—'}</span> },
    ];

    return (
        <div style={{ minHeight: '100vh', background: '#e4ebf0', padding: '40px 16px' }}>
            <div style={{ maxWidth: 960, margin: '0 auto' }}>
                <div className="flex items-center gap-3 mb-2">
                    <SafetyCertificateOutlined style={{ fontSize: 28, color: '#210856' }} />
                    <Title level={2} style={{ margin: 0, color: '#210856' }}>
                        Recuperação de dados
                    </Title>
                </div>
                <Paragraph type="secondary" style={{ maxWidth: 720 }}>
                    Esta página <b>não altera nada</b>: ela só mostra e permite <b>baixar</b> os dados que estão
                    guardados <b>neste navegador</b>. Use para exportar a sua versão e enviá-la para restauração.
                </Paragraph>

                <Alert
                    type="warning"
                    showIcon
                    className="mb-4"
                    message="Não abra a aplicação normal antes de baixar"
                    description="Ao abrir a aplicação normal, ela carrega a versão do banco e pode substituir o que está neste navegador. Baixe o arquivo aqui primeiro."
                />

                <div className="mb-5">
                    <Button type="primary" size="large" icon={<DownloadOutlined />} onClick={download} style={{ height: 48, background: '#210856', borderColor: '#210856' }}>
                        Baixar meus dados (backup completo)
                    </Button>
                    {done && (
                        <Text style={{ marginLeft: 12, color: '#059669' }}>
                            ✓ Arquivo <b>climoo-backup-navegador.json</b> baixado. Envie-o para o suporte.
                        </Text>
                    )}
                </div>

                <Title level={4} style={{ color: '#374151' }}>
                    O que foi encontrado neste navegador
                </Title>
                {rows.length ? (
                    <Table columns={columns} dataSource={rows} pagination={false} size="small" bordered />
                ) : (
                    <Alert type="info" showIcon message="Nenhum dado local encontrado neste navegador." />
                )}

                <Paragraph type="secondary" style={{ marginTop: 20, fontSize: 12 }}>
                    Dica: se a linha “Navegador (atual)” já não tiver os seus cenários, verifique a linha
                    “Backup de segurança” — mesmo assim, o botão acima baixa tudo o que existir.
                </Paragraph>
            </div>
        </div>
    );
}
