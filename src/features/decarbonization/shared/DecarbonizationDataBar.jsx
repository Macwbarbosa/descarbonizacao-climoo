import React, { useState } from 'react';
import { Button, Tag, Tooltip, message } from 'antd';
import { SaveOutlined, CloudUploadOutlined, DownloadOutlined, BankOutlined } from '@ant-design/icons';
import { useAuthStore } from '@/features/auth/shared/store/authStore';
import { formatCnpj, NO_CNPJ } from './decarbonizationStorage';
import { saveCompanyToProject, saveAllToProject, loadCompanyFromProject } from './decarbonizationExport';

/**
 * Barra de dados do módulo de Descarbonização. Mostra a empresa/CNPJ ativo e
 * permite SALVAR o JSON dentro do projeto (separado por CNPJ) e CARREGAR de
 * volta. Ao trocar de empresa, re-hidrata os dados daquela empresa.
 *
 * A gravação em arquivo usa o middleware do dev server (npm run dev); fora dele,
 * o estado continua salvo no localStorage por CNPJ.
 */
function DecarbonizationDataBar() {
    const company = useAuthStore((s) => s.user?.selectedCompany?.company);
    const cnpjRaw = useAuthStore((s) => s.user?.selectedCompany?.cnpj);
    const cnpj = cnpjRaw ? String(cnpjRaw).replace(/\D/g, '') : NO_CNPJ;
    const hasCompany = cnpj !== NO_CNPJ;

    const [saving, setSaving] = useState(false);
    const [loadingFile, setLoadingFile] = useState(false);

    // A carga por CNPJ (re-hidratação ao trocar de empresa) é feita globalmente
    // em `useCompanyPersistence` (App), valendo também nas telas de detalhe.

    const handleSave = async () => {
        setSaving(true);
        try {
            const data = await saveCompanyToProject();
            message.success(`Salvo no projeto: decarbonization-data/${data.cnpj}.json`);
        } catch (e) {
            message.warning(e.message || 'Não foi possível gravar o arquivo (rode em npm run dev). Dados mantidos localmente.');
        } finally {
            setSaving(false);
        }
    };

    const handleSaveAll = async () => {
        setSaving(true);
        try {
            const n = await saveAllToProject();
            message.success(`Salvas ${n} empresa(s) em decarbonization-data/.`);
        } catch (e) {
            message.warning(e.message || 'Não foi possível gravar os arquivos (rode em npm run dev).');
        } finally {
            setSaving(false);
        }
    };

    const handleLoad = async () => {
        setLoadingFile(true);
        try {
            const applied = await loadCompanyFromProject();
            if (applied) message.success('Dados carregados do arquivo do projeto.');
            else message.info('Nenhum arquivo salvo para este CNPJ ainda.');
        } catch (e) {
            message.warning(e.message || 'Não foi possível ler o arquivo (rode em npm run dev).');
        } finally {
            setLoadingFile(false);
        }
    };

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-gray-200 bg-white px-4 py-2.5 mb-4">
            <div className="flex items-center gap-2 text-sm">
                <BankOutlined className="text-[#210856]" />
                {hasCompany ? (
                    <span>
                        <b className="text-[#210856]">{company || 'Empresa'}</b>
                        <span className="text-gray-400"> · CNPJ </span>
                        <Tag className="rounded-full m-0">{formatCnpj(cnpj)}</Tag>
                    </span>
                ) : (
                    <span className="text-[#b9462f]">Nenhuma empresa selecionada — selecione uma empresa para salvar por CNPJ.</span>
                )}
            </div>

            <div className="flex items-center gap-2">
                <Tooltip title="Carregar deste CNPJ a partir do arquivo salvo no projeto">
                    <Button icon={<DownloadOutlined />} onClick={handleLoad} loading={loadingFile} disabled={!hasCompany}>
                        Carregar do projeto
                    </Button>
                </Tooltip>
                <Tooltip title="Salvar todas as empresas com dados no projeto">
                    <Button icon={<CloudUploadOutlined />} onClick={handleSaveAll} loading={saving}>
                        Salvar todas
                    </Button>
                </Tooltip>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                    disabled={!hasCompany}
                    className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b]"
                >
                    Salvar no projeto (JSON)
                </Button>
            </div>
        </div>
    );
}

export default DecarbonizationDataBar;
