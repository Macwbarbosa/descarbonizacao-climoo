import React, { useEffect, useState } from 'react';
import { Button, Spin, Alert, Empty, Row, Col, message } from 'antd';
import { SaveOutlined, PlusOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import useDriversStore from './store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import DriversList from './components/DriversList';
import DriverDetail from './components/DriverDetail';
import PasteAbsolutesModal from './components/PasteAbsolutesModal';
import DecarbonizationDataBar from '../shared/DecarbonizationDataBar';
import { saveCompanyToProject } from '../shared/decarbonizationExport';

/**
 * Etapa 3 — Variáveis de Crescimento (drivers do BAU). Tela master-detail:
 * lista à esquerda, detalhe do driver selecionado à direita. Recálculo ao vivo.
 *
 * O ano-base vem da tela Metas & Período (fonte única); o horizonte vai até o
 * net-zero do plano. Cada driver é normalizado para um índice base 100 que a
 * Etapa 4 (BAU) consome via `indicePorAno`.
 */
function DriversPage() {
    const drivers = useDriversStore((s) => s.drivers);
    const selectedId = useDriversStore((s) => s.selectedId);
    const loading = useDriversStore((s) => s.loading);
    const saving = useDriversStore((s) => s.saving);
    const error = useDriversStore((s) => s.error);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);
    const selectDriver = useDriversStore((s) => s.selectDriver);
    const addDriver = useDriversStore((s) => s.addDriver);
    const patchDriver = useDriversStore((s) => s.patchDriver);
    const removeDriver = useDriversStore((s) => s.removeDriver);
    const savePlan = useDriversStore((s) => s.savePlan);

    // Ano-base e horizonte — fonte única: tela Metas & Período.
    const { baseYear, netZeroYear } = usePlanTargetsStore((s) => s.params);
    const endYear = netZeroYear;

    const [pasteOpen, setPasteOpen] = useState(false);

    useEffect(() => {
        loadDrivers().catch(() => {
            message.error('Erro ao carregar as variáveis de crescimento.');
        });
    }, [loadDrivers]);

    const selectedDriver = drivers.find((d) => d.id === selectedId) || null;

    const handlePatch = (patch) => patchDriver(selectedId, patch);

    const handleSave = async () => {
        try {
            await savePlan();
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

    return (
        <div className="px-2 min-h-[calc(100vh-106px)]">
            <DecarbonizationDataBar />
            {/* Header */}
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 gap-3">
                <div>
                    <div className="text-xs text-gray-500">
                        Plano de Descarbonização &nbsp;›&nbsp;{' '}
                        <span className="text-[#210856] font-medium">Variáveis de Crescimento</span>
                    </div>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">Variáveis de Crescimento</h2>
                    <p className="text-sm text-gray-500">
                        Drivers que ancoram a projeção de emissões. Cada driver vira uma série de índice
                        (base 100 no ano-base {baseYear}) herdada pelas atividades na Projeção BAU.
                    </p>
                </div>
                <Button
                    type="primary"
                    icon={<SaveOutlined />}
                    onClick={handleSave}
                    loading={saving}
                    className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                    size="large"
                >
                    Salvar alterações
                </Button>
            </div>

            {error && <Alert className="mb-4" type="error" showIcon message={error} />}

            <Spin spinning={loading}>
                <Row gutter={16}>
                    {/* Master */}
                    <Col xs={24} lg={7} xl={6}>
                        <Card>
                            <DriversList
                                drivers={drivers}
                                selectedId={selectedId}
                                baseYear={baseYear}
                                endYear={endYear}
                                onSelect={selectDriver}
                                onAdd={addDriver}
                            />
                        </Card>
                    </Col>

                    {/* Detail */}
                    <Col xs={24} lg={17} xl={18}>
                        {selectedDriver ? (
                            <DriverDetail
                                driver={selectedDriver}
                                baseYear={baseYear}
                                endYear={endYear}
                                onPatch={handlePatch}
                                onRemove={removeDriver}
                                onOpenPaste={() => setPasteOpen(true)}
                            />
                        ) : (
                            <Card>
                                <div className="flex justify-center items-center py-16">
                                    <Empty description="Nenhum driver selecionado.">
                                        <Button
                                            type="primary"
                                            icon={<PlusOutlined />}
                                            onClick={addDriver}
                                            className="bg-[#210856] border-[#210856]"
                                        >
                                            Novo driver
                                        </Button>
                                    </Empty>
                                </div>
                            </Card>
                        )}
                    </Col>
                </Row>
            </Spin>

            <PasteAbsolutesModal
                open={pasteOpen}
                baseYear={baseYear}
                onCancel={() => setPasteOpen(false)}
                onApply={(patch) => {
                    handlePatch(patch);
                    setPasteOpen(false);
                    message.success('Valores absolutos aplicados ao método ano-a-ano.');
                }}
            />
        </div>
    );
}

export default DriversPage;
