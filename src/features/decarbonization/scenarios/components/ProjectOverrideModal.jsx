import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Select, InputNumber, Button, Row, Col, Alert } from 'antd';
import { DeleteOutlined, PlusOutlined } from '@ant-design/icons';

const labelCls = 'text-[10px] uppercase tracking-wide text-gray-500 block mb-1';
const yearOptions = (from, to) => {
    const out = [];
    for (let y = from; y <= to; y += 1) out.push({ value: y, label: String(y) });
    return out;
};

/**
 * Override por cenário dos parâmetros de abrangência/tempo de um Projeto — o
 * Projeto base permanece intacto. Salva `overrides` no item do cenário.
 */
function ProjectOverrideModal({ open, project, item, baseYear, endYear, onSave, onClear, onClose }) {
    const [startYear, setStartYear] = useState(baseYear);
    const [end, setEnd] = useState(endYear);
    const [points, setPoints] = useState([]);

    useEffect(() => {
        if (open && project) {
            const ov = item?.overrides || {};
            setStartYear(ov.startYear ?? project.startYear);
            setEnd(ov.endYear ?? project.endYear);
            setPoints((ov.coveragePoints ?? project.coveragePoints ?? []).map((p) => ({ ...p })));
        }
    }, [open, project, item]);

    if (!project) return null;

    const updatePoint = (idx, field, value) => setPoints(points.map((p, i) => (i === idx ? { ...p, [field]: Number(value) } : p)));
    const addPoint = () => setPoints([...points, { year: Math.min(end, startYear + 1), pct: 50 }]);
    const removePoint = (idx) => setPoints(points.filter((_, i) => i !== idx));

    const handleSave = () => {
        onSave({ startYear, endYear: end, coveragePoints: [...points].sort((a, b) => a.year - b.year) });
        onClose();
    };

    return (
        <Modal
            open={open}
            title={`Override por cenário — ${project.name}`}
            onCancel={onClose}
            footer={
                <div className="flex items-center justify-between gap-2">
                    <Button danger onClick={() => { onClear(); onClose(); }}>
                        Limpar override
                    </Button>
                    <div className="flex items-center gap-2">
                        <Button onClick={onClose}>Cancelar</Button>
                        <Button type="primary" className="bg-[#210856] border-[#210856]" onClick={handleSave}>
                            Salvar override
                        </Button>
                    </div>
                </div>
            }
            width={560}
            destroyOnClose
        >
            <Alert
                className="mb-3"
                type="info"
                showIcon
                message="O override vale apenas neste cenário. O Projeto base (Etapa 5) permanece intacto."
            />
            <Row gutter={12} className="mb-3">
                <Col span={12}>
                    <span className={labelCls}>Início</span>
                    <Select value={startYear} options={yearOptions(baseYear, endYear)} onChange={setStartYear} style={{ width: '100%' }} />
                </Col>
                <Col span={12}>
                    <span className={labelCls}>Fim</span>
                    <Select value={end} options={yearOptions(baseYear, endYear)} onChange={setEnd} style={{ width: '100%' }} />
                </Col>
            </Row>
            <span className={labelCls}>Abrangência (% do grupo)</span>
            {points.map((p, idx) => (
                // eslint-disable-next-line react/no-array-index-key
                <Row gutter={8} align="middle" className="mb-2" key={idx}>
                    <Col flex="1 1 0">
                        <Select value={p.year} options={yearOptions(startYear, end)} onChange={(v) => updatePoint(idx, 'year', v)} style={{ width: '100%' }} />
                    </Col>
                    <Col flex="1 1 0">
                        <InputNumber value={p.pct} min={0} max={100} formatter={(v) => `${v}%`} parser={(v) => v.replace('%', '')} onChange={(v) => updatePoint(idx, 'pct', v)} style={{ width: '100%' }} />
                    </Col>
                    <Col flex="0 0 auto">
                        <Button type="text" danger icon={<DeleteOutlined />} onClick={() => removePoint(idx)} aria-label="Remover" />
                    </Col>
                </Row>
            ))}
            <Button type="dashed" size="small" icon={<PlusOutlined />} onClick={addPoint}>Adicionar ponto</Button>
        </Modal>
    );
}

ProjectOverrideModal.propTypes = {
    open: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    project: PropTypes.object,
    // eslint-disable-next-line react/forbid-prop-types
    item: PropTypes.object,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    onSave: PropTypes.func.isRequired,
    onClear: PropTypes.func.isRequired,
    onClose: PropTypes.func.isRequired,
};

ProjectOverrideModal.defaultProps = { project: null, item: null };

export default ProjectOverrideModal;
