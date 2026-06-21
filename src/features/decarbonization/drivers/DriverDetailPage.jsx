import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { Button, Spin, Empty, message } from 'antd';
import { SaveOutlined, ArrowLeftOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import useDriversStore from './store/useDriversStore';
import usePlanTargetsStore from '../targets-timeframe/store/usePlanTargetsStore';
import DriverDetail from './components/DriverDetail';
import PasteAbsolutesModal from './components/PasteAbsolutesModal';
import { saveCompanyToProject } from '../shared/decarbonizationExport';

/**
 * Tela cheia de uma Variável de Crescimento (rota `/drivers/:id`).
 * Aberta ao clicar numa linha da lista. Mostra todos os detalhes do driver
 * (método, histórico, gráfico de índice) com mais espaço, e um botão "Voltar".
 */
function DriverDetailPage() {
    const { id } = useParams();
    const navigate = useNavigate();

    const drivers = useDriversStore((s) => s.drivers);
    const loading = useDriversStore((s) => s.loading);
    const saving = useDriversStore((s) => s.saving);
    const loadDrivers = useDriversStore((s) => s.loadDrivers);
    const patchDriver = useDriversStore((s) => s.patchDriver);
    const removeDriver = useDriversStore((s) => s.removeDriver);
    const savePlan = useDriversStore((s) => s.savePlan);

    const { baseYear, netZeroYear } = usePlanTargetsStore((s) => s.params);
    const endYear = netZeroYear;

    const [pasteOpen, setPasteOpen] = useState(false);

    useEffect(() => {
        loadDrivers().catch(() => message.error('Erro ao carregar as variáveis de crescimento.'));
    }, [loadDrivers]);

    const driver = drivers.find((d) => d.id === id) || null;

    const handlePatch = (patch) => patchDriver(id, patch);

    const handleRemove = (driverId) => {
        removeDriver(driverId);
        message.success('Variável removida.');
        navigate('/drivers');
    };

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
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-5 gap-3">
                <div>
                    <button
                        type="button"
                        onClick={() => navigate('/drivers')}
                        className="text-xs text-gray-500 hover:text-[#210856] inline-flex items-center gap-1"
                    >
                        <ArrowLeftOutlined /> Variáveis de Crescimento
                    </button>
                    <h2 className="text-xl font-semibold text-[#210856] mt-1">
                        {driver ? driver.name : 'Variável de Crescimento'}
                    </h2>
                    {driver && (
                        <p className="text-sm text-gray-500">
                            {driver.unit || '—'} · {driver.type} · índice base 100 no ano-base {baseYear}.
                        </p>
                    )}
                </div>
                <div className="flex items-center gap-2">
                    <Button icon={<ArrowLeftOutlined />} onClick={() => navigate('/drivers')}>
                        Voltar
                    </Button>
                    <Button
                        type="primary"
                        icon={<SaveOutlined />}
                        onClick={handleSave}
                        loading={saving}
                        disabled={!driver}
                        className="bg-[#210856] border-[#210856] hover:bg-[#2d0a6b] h-10 px-6"
                        size="large"
                    >
                        Salvar alterações
                    </Button>
                </div>
            </div>

            <Spin spinning={loading}>
                {driver ? (
                    <DriverDetail
                        driver={driver}
                        baseYear={baseYear}
                        endYear={endYear}
                        onPatch={handlePatch}
                        onRemove={handleRemove}
                        onOpenPaste={() => setPasteOpen(true)}
                    />
                ) : (
                    !loading && (
                        <Card>
                            <div className="flex justify-center items-center py-16">
                                <Empty description="Variável não encontrada.">
                                    <Button
                                        type="primary"
                                        onClick={() => navigate('/drivers')}
                                        className="bg-[#210856] border-[#210856]"
                                    >
                                        Voltar para a lista
                                    </Button>
                                </Empty>
                            </div>
                        </Card>
                    )
                )}
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

export default DriverDetailPage;
