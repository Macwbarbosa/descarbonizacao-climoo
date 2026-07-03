import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Popover, Button, Tooltip, Select, ColorPicker, Divider } from 'antd';
import { SettingOutlined, DownloadOutlined, FileExcelOutlined, FullscreenOutlined, UndoOutlined } from '@ant-design/icons';
import useChartTheme, { PALETTE_PRESETS, PALETTE_LABELS } from '../utils/chartTheme';

const KEYS = ['primary', 'secondary', 'meta', 'compare'];

/**
 * Botão de CONFIG do gráfico (engrenagem, canto superior direito). Popover com:
 *  - Baixar PNG / Baixar Excel (.xlsx) / Expandir;
 *  - Paleta de cores (preset Climoo ou personalizada, cor a cor).
 * A paleta é global (aplica a todos os gráficos) e persiste no navegador.
 */
function ChartConfig({ onDownloadPng, onDownloadXlsx, onExpand }) {
    const palette = useChartTheme((s) => s.palette);
    const setColor = useChartTheme((s) => s.setColor);
    const setPalette = useChartTheme((s) => s.setPalette);
    const reset = useChartTheme((s) => s.reset);
    // Popover CONTROLADO: as ações (expandir/baixar) fecham o popover antes de
    // executar — senão ele fica aberto por cima do modal do gráfico expandido.
    const [open, setOpen] = useState(false);

    const runAndClose = (fn) => () => {
        setOpen(false);
        if (fn) fn();
    };

    const currentPreset = PALETTE_PRESETS.find((p) => KEYS.every((k) => p.palette[k] === palette[k]));

    const content = (
        <div style={{ width: 268 }}>
            <div className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold mb-2">Exportar</div>
            <div className="flex flex-col gap-1.5">
                <Button size="small" icon={<DownloadOutlined />} onClick={runAndClose(onDownloadPng)} block className="justify-start">
                    Baixar imagem (PNG)
                </Button>
                <Button size="small" icon={<FileExcelOutlined />} onClick={runAndClose(onDownloadXlsx)} block className="justify-start">
                    Baixar dados (Excel .xlsx)
                </Button>
                {onExpand && (
                    <Button size="small" icon={<FullscreenOutlined />} onClick={runAndClose(onExpand)} block className="justify-start">
                        Expandir gráfico
                    </Button>
                )}
            </div>

            <Divider className="my-3" />

            <div className="flex items-center justify-between mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">Cores dos gráficos</span>
                <Tooltip title="Restaurar padrão Climoo">
                    <Button size="small" type="text" icon={<UndoOutlined />} onClick={reset} aria-label="Restaurar padrão" />
                </Tooltip>
            </div>

            <Select
                size="small"
                value={currentPreset ? currentPreset.key : '__custom__'}
                onChange={(key) => {
                    const preset = PALETTE_PRESETS.find((p) => p.key === key);
                    if (preset) setPalette(preset.palette);
                }}
                style={{ width: '100%' }}
                options={[
                    ...PALETTE_PRESETS.map((p) => ({ value: p.key, label: p.name })),
                    ...(currentPreset ? [] : [{ value: '__custom__', label: 'Personalizada', disabled: true }]),
                ]}
                className="mb-2"
            />

            <div className="flex flex-col gap-1.5">
                {KEYS.map((k) => (
                    <div key={k} className="flex items-center justify-between">
                        <span className="text-[12px] text-gray-600">{PALETTE_LABELS[k]}</span>
                        <ColorPicker
                            value={palette[k]}
                            onChange={(_, hex) => setColor(k, hex)}
                            size="small"
                            showText
                        />
                    </div>
                ))}
            </div>
            <div className="text-[11px] text-gray-400 mt-2">As cores valem para todos os gráficos e ficam salvas neste navegador.</div>
        </div>
    );

    return (
        <Popover
            content={content}
            trigger="click"
            placement="bottomRight"
            title={null}
            open={open}
            onOpenChange={setOpen}
        >
            <Tooltip title="Configurar gráfico (baixar / cores)">
                <Button type="text" size="small" icon={<SettingOutlined />} aria-label="Configurar gráfico" />
            </Tooltip>
        </Popover>
    );
}

ChartConfig.propTypes = {
    onDownloadPng: PropTypes.func.isRequired,
    onDownloadXlsx: PropTypes.func.isRequired,
    onExpand: PropTypes.func,
};

ChartConfig.defaultProps = { onExpand: null };

export default ChartConfig;
