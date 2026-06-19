import React from 'react';
import PropTypes from 'prop-types';
import { Button, Tag, Tooltip } from 'antd';
import { PlusOutlined, WarningOutlined } from '@ant-design/icons';
import { indicePorAno } from '../utils/driverIndex';
import { METHOD_LABELS } from '../constants';
import Sparkline from './Sparkline';

/**
 * Lista de drivers (master). Cada item: nome, unidade/tipo, sparkline do índice,
 * badge do método e indicador "usado por N atividades" (ou aviso de órfão).
 */
function DriversList({ drivers, selectedId, baseYear, endYear, onSelect, onAdd }) {
    return (
        <div>
            <div className="flex items-center justify-between px-1 mb-2">
                <span className="text-[11px] uppercase tracking-wide text-gray-500 font-semibold">
                    Drivers
                </span>
                <span className="text-[11px] text-gray-400">{drivers.length} variáveis</span>
            </div>

            <div className="space-y-2">
                {drivers.map((d) => {
                    const selected = d.id === selectedId;
                    const orphan = (d.usedBy || []).length === 0;
                    const values = indicePorAno(d, { baseYear, endYear }).map((p) => p.index);
                    return (
                        <button
                            type="button"
                            key={d.id}
                            onClick={() => onSelect(d.id)}
                            className={`w-full text-left rounded-lg border p-3 transition-colors ${
                                selected ? 'border-[#210856] bg-[#210856]/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            aria-pressed={selected}
                        >
                            <div className="font-semibold text-sm text-[#210856]">{d.name}</div>
                            <div className="text-[11px] text-gray-500">
                                {d.unit || '—'} · {d.type}
                            </div>
                            <div className="mt-1.5">
                                <Sparkline values={values} />
                            </div>
                            <div className="flex items-center justify-between mt-2">
                                <Tag className="rounded-full text-[10px] m-0">{METHOD_LABELS[d.method]}</Tag>
                                {orphan ? (
                                    <Tooltip title="Sem atividade vinculada — não afeta o BAU">
                                        <span className="text-[11px] text-[#b9462f] inline-flex items-center gap-1">
                                            <WarningOutlined /> órfão
                                        </span>
                                    </Tooltip>
                                ) : (
                                    <span className="text-[11px] text-gray-500">
                                        usado por {d.usedBy.length}
                                    </span>
                                )}
                            </div>
                        </button>
                    );
                })}
            </div>

            <Button
                type="dashed"
                icon={<PlusOutlined />}
                onClick={onAdd}
                block
                className="mt-3 text-[#210856]"
            >
                Novo driver
            </Button>
        </div>
    );
}

DriversList.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    drivers: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedId: PropTypes.string,
    baseYear: PropTypes.number.isRequired,
    endYear: PropTypes.number.isRequired,
    onSelect: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
};

DriversList.defaultProps = {
    selectedId: null,
};

export default DriversList;
