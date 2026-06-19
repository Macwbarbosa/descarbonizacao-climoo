import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import {
    Input,
    InputNumber,
    Select,
    Segmented,
    Button,
    Tag,
    Alert,
    Collapse,
    Row,
    Col,
    Divider,
    Empty,
} from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import { detectImplausibleGrowth, IMPLAUSIBLE_RATE_THRESHOLD } from '../utils/driverIndex';
import { parseNumber } from '../../inventory/utils/inventoryAggregate';
import { METHOD_LABELS } from '../constants';
import MethodEditor from './MethodEditor';
import DriverIndexChart from './DriverIndexChart';

const { TextArea } = Input;
const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';
const TYPE_OPTIONS = ['Físico', 'Financeiro', 'Operacional'].map((t) => ({ value: t, label: t }));
const METHOD_SEGMENTS = ['period', 'avg', 'yearly'].map((m) => ({ value: m, label: METHOD_LABELS[m] }));

/** Editor de histórico (anos anteriores ao ano-base). Entrada manual, sem sugestão automática. */
function HistoryEditor({ history, baseYear, onPatch }) {
    const entries = Object.keys(history || {})
        .map(Number)
        .sort((a, b) => a - b)
        .map((y) => [y, history[y]]);

    const setEntry = (oldYear, nextYear, nextValue) => {
        const next = { ...history };
        delete next[oldYear];
        next[nextYear] = nextValue;
        onPatch({ history: next });
    };
    const removeEntry = (year) => {
        const next = { ...history };
        delete next[year];
        onPatch({ history: next });
    };
    const addEntry = () => {
        const minYear = entries.length > 0 ? entries[0][0] : baseYear;
        const newYear = minYear - 1;
        onPatch({ history: { ...history, [newYear]: 0 } });
    };

    return (
        <div>
            {entries.length === 0 ? (
                <div className="text-xs text-gray-500 mb-2">
                    Sem histórico. Adicione anos anteriores ao ano-base ({baseYear}) para visualizar a tendência.
                </div>
            ) : (
                entries.map(([year, value]) => (
                    <Row gutter={8} className="mb-2" align="middle" key={year}>
                        <Col flex="1 1 0">
                            <InputNumber
                                value={year}
                                onChange={(v) => v != null && setEntry(year, v, value)}
                                style={{ width: '100%' }}
                                max={baseYear - 1}
                            />
                        </Col>
                        <Col flex="1 1 0">
                            <InputNumber
                                value={value}
                                onChange={(v) => setEntry(year, year, Number(v) || 0)}
                                style={{ width: '100%' }}
                                placeholder="valor absoluto"
                            />
                        </Col>
                        <Col flex="0 0 auto">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeEntry(year)}
                                aria-label="Remover ano"
                            />
                        </Col>
                    </Row>
                ))
            )}
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addEntry}>
                Adicionar ano
            </Button>
        </div>
    );
}

HistoryEditor.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    history: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    onPatch: PropTypes.func.isRequired,
};

/**
 * Detalhe do driver selecionado: identificação, premissa/fonte, valor-base,
 * método + editor, curva de índice, histórico opcional e "usado por".
 */
function DriverDetail({ driver, baseYear, endYear, onPatch, onRemove, onOpenPaste }) {
    const { implausible, maxRate } = useMemo(
        () => detectImplausibleGrowth(driver, { baseYear, endYear }),
        [driver, baseYear, endYear]
    );
    const orphan = (driver.usedBy || []).length === 0;

    return (
        <Card>
            {/* Cabeçalho */}
            <div className="flex items-baseline justify-between mb-1">
                <h3 className="text-base font-semibold text-[#210856]">Detalhe do driver</h3>
                <span className="text-[11px] text-gray-500">ano-base = {baseYear}</span>
            </div>
            <Divider className="my-3" />

            {orphan && (
                <Alert
                    className="mb-3"
                    type="warning"
                    showIcon
                    message="Este driver não está vinculado a nenhuma atividade emissora. Ele não afeta o BAU — vincule na Etapa 4 (BAU) ou remova."
                />
            )}
            {implausible && (
                <Alert
                    className="mb-3"
                    type="warning"
                    showIcon
                    message={`Crescimento elevado sustentado (até ${maxRate.toLocaleString('pt-BR')}%/ano, acima de ${IMPLAUSIBLE_RATE_THRESHOLD}%). Verifique a premissa — aviso não bloqueante.`}
                />
            )}

            {/* Identificação */}
            <Row gutter={[12, 12]}>
                <Col xs={24} md={12}>
                    <span className={labelCls}>Nome</span>
                    <Input value={driver.name} onChange={(e) => onPatch({ name: e.target.value })} />
                </Col>
                <Col xs={12} md={6}>
                    <span className={labelCls}>Unidade</span>
                    <Input
                        value={driver.unit}
                        placeholder="ex.: ton/ano"
                        onChange={(e) => onPatch({ unit: e.target.value })}
                    />
                </Col>
                <Col xs={12} md={6}>
                    <span className={labelCls}>Tipo</span>
                    <Select
                        value={driver.type}
                        options={TYPE_OPTIONS}
                        onChange={(v) => onPatch({ type: v })}
                        style={{ width: '100%' }}
                    />
                </Col>
            </Row>

            {/* Premissa + valor-base */}
            <Row gutter={[12, 12]} className="mt-3">
                <Col xs={24} md={14}>
                    <span className={labelCls}>Premissa / fonte (memorial)</span>
                    <TextArea
                        value={driver.note}
                        rows={2}
                        onChange={(e) => onPatch({ note: e.target.value })}
                        placeholder="Ex.: Plano de negócios 2025–2030; nova linha em 2028. Rev. mar/2026."
                    />
                </Col>
                <Col xs={24} md={10}>
                    <span className={labelCls}>Valor no ano-base ({baseYear})</span>
                    <InputNumber
                        value={driver.baseValue}
                        decimalSeparator=","
                        onChange={(v) => onPatch({ baseValue: Number(v) || 0 })}
                        onPaste={(e) => {
                            const text = e.clipboardData?.getData('text') ?? '';
                            const first = text.split(/[\t\r\n]+/).map((t) => t.trim()).find((t) => t !== '');
                            if (first == null) return;
                            e.preventDefault();
                            onPatch({ baseValue: parseNumber(first) });
                        }}
                        style={{ width: '100%' }}
                    />
                    <div className="text-[11px] text-gray-500 mt-1.5">
                        Usado só para contexto/histórico — o BAU usa o crescimento relativo (índice), não o
                        valor absoluto.
                    </div>
                </Col>
            </Row>

            {/* Método */}
            <div className="mt-4">
                <span className={labelCls}>Método de projeção</span>
                <Segmented
                    value={driver.method}
                    options={METHOD_SEGMENTS}
                    onChange={(v) => onPatch({ method: v })}
                />
                <MethodEditor
                    driver={driver}
                    baseYear={baseYear}
                    endYear={endYear}
                    onPatch={onPatch}
                    onOpenPaste={onOpenPaste}
                />
            </div>

            {/* Curva do valor projetado (absoluto) */}
            <Divider className="my-3" />
            <DriverIndexChart driver={driver} baseYear={baseYear} endYear={endYear} />

            {/* Histórico + Usado por */}
            <Collapse
                className="mt-3"
                defaultActiveKey={Object.keys(driver.history || {}).length ? ['hist'] : []}
                items={[
                    {
                        key: 'hist',
                        label: `Histórico (opcional) — ${Object.keys(driver.history || {}).length || 'nenhum'} ano(s)`,
                        children: (
                            <HistoryEditor history={driver.history || {}} baseYear={baseYear} onPatch={onPatch} />
                        ),
                    },
                ]}
            />

            <div className="mt-4">
                <span className={labelCls}>Usado por</span>
                {orphan ? (
                    <Empty
                        image={Empty.PRESENTED_IMAGE_SIMPLE}
                        description="Nenhuma atividade vinculada (a vinculação acontece na Etapa 4)."
                    />
                ) : (
                    <div className="flex flex-wrap gap-2">
                        {driver.usedBy.map((u) => (
                            <Tag key={u} className="rounded-full">
                                {u}
                            </Tag>
                        ))}
                    </div>
                )}
            </div>

            <Divider className="my-3" />
            <Button danger icon={<DeleteOutlined />} onClick={() => onRemove(driver.id)}>
                Remover driver
            </Button>
        </Card>
    );
}

DriverDetail.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    driver: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    onPatch: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
    onOpenPaste: PropTypes.func.isRequired,
};

export default DriverDetail;
