import React, { useEffect, useMemo } from 'react';
import { Button, Select, Spin, Alert, Upload, Tooltip, message } from 'antd';
import { SaveOutlined, DownloadOutlined, UploadOutlined } from '@ant-design/icons';
import * as XLSX from 'xlsx';
import ExcelJS from 'exceljs';
import { Card } from '@/shared/components/ui/Card';
import useBauStore from './store/useBauStore';
import useDriversStore from '../drivers/store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import { parseNumber } from '../inventory/utils/inventoryAggregate';
import BauKpis from './components/BauKpis';
import BauAreaChart from './components/BauAreaChart';
import BauMatrix from './components/BauMatrix';
import DecarbonizationDataBar from '../shared/DecarbonizationDataBar';
import { saveCompanyToProject } from '../shared/decarbonizationExport';

/**
 * Etapa 4 — Projeção BAU. KPIs + área empilhada por escopo + matriz de vínculo
 * atividade × driver. O crescimento é herdado dos drivers (Etapa 3, somente
 * leitura aqui); o usuário só edita o vínculo e o fator. Recálculo ao vivo.
 */
function BauProjectionPage() {
    const activities = useBauStore((s) => s.activities);
    const targetYear = useBauStore((s) => s.targetYear);
    const loading = useBauStore((s) => s.loading);
    const saving = useBauStore((s) => s.saving);
    const error = useBauStore((s) => s.error);
    const loadActivities = useBauStore((s) => s.loadActivities);
    const setTargetYear = useBauStore((s) => s.setTargetYear);
    const setDriver = useBauStore((s) => s.setDriver);
    const setFactor = useBauStore((s) => s.setFactor);
    const bulkAssignCategory = useBauStore((s) => s.bulkAssignCategory);
    const applyLinks = useBauStore((s) => s.applyLinks);
    const saveLinks = useBauStore((s) => s.saveLinks);

    const drivers = useDriversStore((s) => s.drivers);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);

    // Período/ano-base — fonte única: tela Metas & Período.
    const { baseYear, netZeroYear } = usePlanTargetsStore((s) => s.params);
    const endYear = netZeroYear;

    useEffect(() => {
        loadDrivers().catch(() => {});
        loadActivities().catch(() => message.error('Erro ao carregar o inventário de atividades.'));
    }, [loadDrivers, loadActivities]);

    // Mantém o ano-alvo dentro do horizonte do plano.
    useEffect(() => {
        if (targetYear < baseYear + 1) setTargetYear(baseYear + 1);
        else if (targetYear > endYear) setTargetYear(endYear);
    }, [targetYear, baseYear, endYear, setTargetYear]);

    const driversById = useMemo(() => Object.fromEntries(drivers.map((d) => [d.id, d])), [drivers]);

    const yearOptions = useMemo(() => {
        const out = [];
        for (let y = baseYear + 1; y <= endYear; y += 1) out.push({ value: y, label: String(y) });
        return out;
    }, [baseYear, endYear]);

    const handleSave = async () => {
        try {
            await saveLinks();
            try {
                const data = await saveCompanyToProject();
                message.success(`Salvo no projeto: decarbonization-data/${data.cnpj}.json`);
            } catch (fileErr) {
                message.warning('Salvo localmente. Para gravar o arquivo no projeto, rode em npm run dev.');
            }
        } catch (err) {
            message.error('Erro ao salvar. Tente novamente.');
        }
    };

    // Baixa modelo .xlsx (ExcelJS): coluna Driver com VALIDAÇÃO DE DADOS (lista suspensa).
    // Casamento no upload é por Escopo + Categoria + Atividade (sem id interno).
    const handleDownloadTemplate = async () => {
        const wb = new ExcelJS.Workbook();
        const ws = wb.addWorksheet('BAU');
        ws.columns = [
            { header: 'Escopo', key: 'scope', width: 12 },
            { header: 'Categoria', key: 'category', width: 30 },
            { header: 'Atividade', key: 'name', width: 44 },
            { header: 'Driver', key: 'driver', width: 26 },
            { header: 'Fator', key: 'factor', width: 10 },
        ];
        ws.getRow(1).font = { bold: true };
        activities.forEach((a) => {
            ws.addRow({
                scope: a.scope,
                category: a.category,
                name: a.name,
                driver: driversById[a.driverId]?.name || '',
                factor: a.factor ?? 1,
            });
        });

        // Lista de drivers para a validação. Inline quando curto; senão, aba auxiliar.
        const driverNames = drivers.map((d) => d.name).filter(Boolean);
        const inline = driverNames.join(',');
        let listFormula = '""';
        if (driverNames.length) {
            if (inline.length <= 250 && !driverNames.some((n) => n.includes(','))) {
                listFormula = `"${inline}"`;
            } else {
                const dws = wb.addWorksheet('Drivers');
                dws.state = 'hidden';
                driverNames.forEach((n, i) => {
                    dws.getCell(`A${i + 1}`).value = n;
                });
                listFormula = `Drivers!$A$1:$A$${driverNames.length}`;
            }
        }
        for (let r = 2; r <= activities.length + 1; r += 1) {
            ws.getCell(`D${r}`).dataValidation = {
                type: 'list',
                allowBlank: true,
                formulae: [listFormula],
                showErrorMessage: true,
                errorStyle: 'warning',
                errorTitle: 'Driver inválido',
                error: 'Selecione um driver da lista (ou deixe em branco).',
            };
        }

        const buf = await wb.xlsx.writeBuffer();
        const blob = new Blob([buf], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'modelo-bau-vinculos.xlsx';
        link.click();
        URL.revokeObjectURL(url);
    };

    // Sobe a planilha preenchida: casa por Escopo+Categoria+Atividade (sem id),
    // resolve o Driver pelo NOME e aplica vínculo + fator.
    const handleUploadLinks = (file) => {
        const norm = (v) => String(v ?? '').trim().toLowerCase();
        const keyOf = (scope, category, name) => `${norm(scope)}||${norm(category)}||${norm(name)}`;
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const wb = XLSX.read(e.target.result, { type: 'array' });
                const ws = wb.Sheets[wb.SheetNames[0]];
                const rows = XLSX.utils.sheet_to_json(ws, { defval: '' });
                const nameToId = Object.fromEntries(drivers.map((d) => [norm(d.name), d.id]));
                // Mapa identidade da atividade → id (Escopo+Categoria+Atividade).
                const keyToId = Object.fromEntries(activities.map((a) => [keyOf(a.scope, a.category, a.name), a.id]));
                const pick = (row, keys) => {
                    const k = Object.keys(row).find((kk) => keys.includes(kk.trim().toLowerCase()));
                    return k ? row[k] : undefined;
                };
                let unmatchedRow = 0;
                let unmatchedDriver = 0;
                const entries = [];
                rows.forEach((row) => {
                    const name = pick(row, ['atividade', 'activity', 'nome', 'name']);
                    if (name == null || String(name).trim() === '') return;
                    const key = keyOf(pick(row, ['escopo', 'scope']), pick(row, ['categoria', 'category']), name);
                    const activityId = keyToId[key];
                    if (!activityId) {
                        unmatchedRow += 1;
                        return;
                    }
                    const driverName = String(pick(row, ['driver']) ?? '').trim();
                    const fatorRaw = pick(row, ['fator', 'factor']);
                    let driverId = null;
                    if (driverName) {
                        driverId = nameToId[norm(driverName)] ?? null;
                        if (!driverId) unmatchedDriver += 1;
                    }
                    entries.push({
                        activityId,
                        driverId,
                        factor: fatorRaw === '' || fatorRaw == null ? undefined : parseNumber(fatorRaw),
                    });
                });
                const applied = applyLinks(entries);
                if (applied === 0) {
                    message.error('Nenhuma atividade casada — as colunas Escopo/Categoria/Atividade devem bater com a tela.');
                } else {
                    const extras = [
                        unmatchedRow ? `${unmatchedRow} linha(s) sem correspondência` : '',
                        unmatchedDriver ? `${unmatchedDriver} driver(s) não reconhecido(s)` : '',
                    ].filter(Boolean);
                    message.success(`${applied} vínculo(s) aplicado(s)${extras.length ? ` · ${extras.join(' · ')}` : ''}.`);
                }
            } catch (err) {
                message.error('Falha ao ler a planilha .xlsx.');
            }
        };
        reader.onerror = () => message.error('Falha ao ler o arquivo.');
        reader.readAsArrayBuffer(file);
        return false; // impede upload de rede
    };

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <DecarbonizationDataBar />
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp;{' '}
                        <span className="text-[#210856] font-medium">Projeção BAU</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Projeção BAU</h2>
                    <p className="text-sm text-gray-500">
                        Emissões projetadas sem ação. Cada atividade herda o crescimento do seu driver (Etapa 3);
                        aqui você define apenas o vínculo e o fator de acoplamento.
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    <div className="text-xs text-gray-500">
                        Ano-meta{' '}
                        <Select
                            value={yearOptions.some((o) => o.value === targetYear) ? targetYear : undefined}
                            onChange={setTargetYear}
                            options={yearOptions}
                            size="small"
                            style={{ width: 90 }}
                        />
                    </div>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                        size="large"
                    >
                        Salvar vínculos
                    </Button>
                </div>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                <BauKpis activities={activities} baseYear={baseYear} targetYear={targetYear} driversById={driversById} />

                <Card className="mb-4">
                    <h3 className="text-base font-semibold text-[#210856] mb-3">Emissões BAU projetadas</h3>
                    <BauAreaChart
                        activities={activities}
                        baseYear={baseYear}
                        endYear={endYear}
                        targetYear={targetYear}
                        driversById={driversById}
                    />
                </Card>

                <Card className="mb-4">
                    <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                        <h3 className="text-base font-semibold text-[#210856]">Matriz de vínculo — atividade × driver</h3>
                        <div className="flex items-center gap-2">
                            <Tooltip title="Baixar modelo .xlsx — a coluna Driver é uma lista suspensa (validação de dados)">
                                <Button icon={<DownloadOutlined />} onClick={handleDownloadTemplate}>
                                    Modelo .xlsx
                                </Button>
                            </Tooltip>
                            <Tooltip title="Subir a planilha preenchida — casa pela coluna id e aplica o Driver/Fator">
                                <Upload accept=".xlsx,.xls" beforeUpload={handleUploadLinks} showUploadList={false}>
                                    <Button icon={<UploadOutlined />}>Subir vínculos</Button>
                                </Upload>
                            </Tooltip>
                        </div>
                    </div>
                    <BauMatrix
                        activities={activities}
                        drivers={drivers}
                        driversById={driversById}
                        baseYear={baseYear}
                        targetYear={targetYear}
                        endYear={endYear}
                        onSetDriver={setDriver}
                        onSetFactor={setFactor}
                        onBulkAssign={bulkAssignCategory}
                    />
                </Card>
            </Spin>
        </div>
    );
}

export default BauProjectionPage;
