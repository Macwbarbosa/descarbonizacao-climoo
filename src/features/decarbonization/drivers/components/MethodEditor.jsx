import React, { useMemo } from 'react';
import PropTypes from 'prop-types';
import { InputNumber, Select, Button, Row, Col } from 'antd';
import { PlusOutlined, DeleteOutlined } from '@ant-design/icons';
import { parseNumber } from '../../inventory/utils/inventoryAggregate';

const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';

/**
 * Editor dos parâmetros do método de projeção do driver.
 * Três métodos: 'period' (segmentos), 'avg' (taxa média), 'yearly' (ano-a-ano).
 * Toda alteração chama `onPatch` (recálculo ao vivo na tela).
 */
function MethodEditor({ driver, baseYear, endYear, onPatch, onOpenPaste }) {
    const years = useMemo(() => {
        const list = [];
        for (let y = baseYear; y <= endYear; y += 1) list.push(y);
        return list;
    }, [baseYear, endYear]);

    const yearOptions = years.map((y) => ({ value: y, label: String(y) }));

    if (driver.method === 'avg') {
        return (
            <div className="px-1 py-2">
                <span className={labelCls}>Crescimento médio (%/ano)</span>
                <InputNumber
                    value={driver.avgRate}
                    step={0.5}
                    onChange={(v) => onPatch({ avgRate: Number(v) || 0 })}
                    style={{ width: 160 }}
                    addonAfter="%/ano"
                />
            </div>
        );
    }

    if (driver.method === 'period') {
        const segments = driver.segments || [];

        const updateSegment = (index, field, value) => {
            const next = segments.map((s, i) => (i === index ? { ...s, [field]: Number(value) } : s));
            onPatch({ segments: next });
        };
        const removeSegment = (index) => onPatch({ segments: segments.filter((_, i) => i !== index) });
        const addSegment = () => {
            const last = segments[segments.length - 1];
            onPatch({
                segments: [...segments, { from: last ? Math.min(endYear, last.to) : baseYear, to: endYear, g: 3 }],
            });
        };

        return (
            <div className="px-1 py-2">
                {segments.map((seg, index) => (
                    // eslint-disable-next-line react/no-array-index-key
                    <Row gutter={8} align="bottom" className="mb-2" key={index}>
                        <Col flex="1 1 0">
                            <span className={labelCls}>De</span>
                            <Select
                                value={seg.from}
                                options={yearOptions}
                                onChange={(v) => updateSegment(index, 'from', v)}
                                style={{ width: '100%' }}
                            />
                        </Col>
                        <Col flex="1 1 0">
                            <span className={labelCls}>Até</span>
                            <Select
                                value={seg.to}
                                options={yearOptions}
                                onChange={(v) => updateSegment(index, 'to', v)}
                                style={{ width: '100%' }}
                            />
                        </Col>
                        <Col flex="1 1 0">
                            <span className={labelCls}>Cresc. %/ano</span>
                            <InputNumber
                                value={seg.g}
                                step={0.5}
                                onChange={(v) => updateSegment(index, 'g', v)}
                                style={{ width: '100%' }}
                            />
                        </Col>
                        <Col flex="0 0 auto">
                            <Button
                                type="text"
                                danger
                                icon={<DeleteOutlined />}
                                onClick={() => removeSegment(index)}
                                aria-label="Remover período"
                            />
                        </Col>
                    </Row>
                ))}
                <Button type="dashed" icon={<PlusOutlined />} onClick={addSegment} size="small">
                    Adicionar período
                </Button>
            </div>
        );
    }

    // 'yearly' — VALORES ABSOLUTOS por ano (na unidade do driver); ano-base é a
    // âncora (campo "valor no ano-base"). O índice/crescimento é derivado no cálculo.
    const editableYears = years.filter((y) => y > baseYear);

    const setYearly = (year, value) => {
        onPatch({ yearly: { ...driver.yearly, [year]: value == null ? 0 : Number(value) } });
    };

    // Colagem do Excel: cola uma coluna/linha de valores ABSOLUTOS preenchendo os
    // anos a partir da célula colada. Parse pt-BR (vírgula = decimal; não dividir por vírgula).
    const handlePaste = (startYear) => (e) => {
        const text = e.clipboardData?.getData('text') ?? '';
        const tokens = text.split(/[\t\r\n]+/).map((t) => t.trim()).filter((t) => t !== '');
        if (tokens.length === 0) return;
        e.preventDefault();
        const startIdx = editableYears.indexOf(startYear);
        const next = { ...driver.yearly };
        tokens.forEach((tok, i) => {
            const year = editableYears[startIdx + i];
            if (year != null) next[year] = parseNumber(tok);
        });
        onPatch({ yearly: next });
    };

    return (
        <div className="px-1 py-2">
            <Row gutter={[8, 8]}>
                {editableYears.map((y) => (
                    <Col xs={8} sm={6} md={4} key={y}>
                        <span className={labelCls}>{y}</span>
                        <InputNumber
                            value={driver.yearly?.[y]}
                            decimalSeparator=","
                            placeholder={driver.unit || 'valor'}
                            onChange={(v) => setYearly(y, v)}
                            onPaste={handlePaste(y)}
                            style={{ width: '100%' }}
                        />
                    </Col>
                ))}
            </Row>
            <div className="text-[11px] text-gray-400 mt-2">
                Cada célula é o <b>valor absoluto</b> do ano{driver.unit ? ` (${driver.unit})` : ''} — o índice/crescimento é
                derivado tendo o valor do ano-base ({baseYear}) como âncora. Dica: copie a coluna do Excel e cole na
                primeira célula (vírgula = decimal).
            </div>
            <Button type="link" className="px-0 mt-1" onClick={onOpenPaste}>
                📋 Colar valores absolutos da planilha
            </Button>
        </div>
    );
}

MethodEditor.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    driver: PropTypes.object.isRequired,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    onPatch: PropTypes.func.isRequired,
    onOpenPaste: PropTypes.func.isRequired,
};

export default MethodEditor;
