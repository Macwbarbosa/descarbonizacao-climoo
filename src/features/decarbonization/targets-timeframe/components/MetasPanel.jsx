import React from 'react';
import PropTypes from 'prop-types';
import { Button, Divider, Tooltip } from 'antd';
import { PlusOutlined, ThunderboltOutlined, WarningOutlined } from '@ant-design/icons';
import { Card } from '@/shared/components/ui/Card';
import { TARGET_TYPE_OPTIONS, SCOPE_KEYS } from '../services/sbtiTargetService';
import MetaEditor from './MetaEditor';

const scopesText = (scopes) => SCOPE_KEYS.filter((k) => scopes[k]).map((k) => `E${k.slice(-1)}`).join('+') || '—';
const typeShort = (type) => TARGET_TYPE_OPTIONS.find((t) => t.value === type)?.short || type;

/**
 * Bloco "Metas": lista de metas (cards selecionáveis) + ações (nova meta /
 * template SBTi) + editor da meta selecionada.
 */
function MetasPanel({
    metas,
    selectedMetaId,
    targets,
    issuesByMeta,
    params,
    baselineByScope,
    drivers,
    onSelect,
    onAdd,
    onApplyTemplate,
    onPatch,
    onRemove,
}) {
    const selectedMeta = metas.find((m) => m.id === selectedMetaId) || null;

    return (
        <Card className="mb-4">
            <div className="flex items-center justify-between mb-1 flex-wrap gap-2">
                <div>
                    <h3 className="text-base font-semibold text-[#210856] inline">Metas</h3>
                    <span className="text-[11px] text-gray-500 ml-2">{metas.length} meta(s)</span>
                </div>
                <div className="flex gap-2">
                    <Tooltip title="Cria automaticamente Escopo 1+2 (absoluta) e Escopo 3 — padrão intersetorial SBTi">
                        <Button icon={<ThunderboltOutlined />} onClick={onApplyTemplate}>
                            Template SBTi
                        </Button>
                    </Tooltip>
                    <Button
                        type="primary"
                        icon={<PlusOutlined />}
                        onClick={() => onAdd()}
                        className="bg-[#210856] border-[#210856]"
                    >
                        Nova meta
                    </Button>
                </div>
            </div>
            <Divider className="my-3" />

            {/* Seletor de metas */}
            <div className="flex flex-wrap gap-2">
                {metas.map((m) => {
                    const selected = m.id === selectedMetaId;
                    const hasIssues = (issuesByMeta[m.id] || []).length > 0;
                    return (
                        <button
                            type="button"
                            key={m.id}
                            onClick={() => onSelect(m.id)}
                            className={`text-left rounded-lg border p-3 min-w-[180px] transition-colors ${
                                selected ? 'border-[#210856] bg-[#210856]/5' : 'border-gray-200 hover:border-gray-300'
                            }`}
                            aria-pressed={selected}
                        >
                            <div className="flex items-center justify-between gap-2">
                                <span className="text-sm font-semibold text-[#210856] truncate">{m.name}</span>
                                {hasIssues && (
                                    <WarningOutlined className="text-[#b9462f] shrink-0" aria-label="meta com avisos" />
                                )}
                            </div>
                            <div className="text-[11px] text-gray-500 mt-1">
                                Escopo {scopesText(m.scopes)} · {typeShort(m.type)} · {m.nearTermYear}
                                {m.netZeroYear ? `→${m.netZeroYear}` : ''}
                            </div>
                        </button>
                    );
                })}
            </div>

            <Divider className="my-4" />

            {selectedMeta ? (
                <MetaEditor
                    meta={selectedMeta}
                    params={params}
                    baselineByScope={baselineByScope}
                    drivers={drivers}
                    target={targets[selectedMeta.id]}
                    issues={issuesByMeta[selectedMeta.id] || []}
                    onPatch={(patch) => onPatch(selectedMeta.id, patch)}
                    onRemove={onRemove}
                />
            ) : (
                <div className="text-sm text-gray-500 py-6 text-center">
                    Nenhuma meta. Crie uma nova meta ou aplique o template SBTi.
                </div>
            )}
        </Card>
    );
}

MetasPanel.propTypes = {
    // eslint-disable-next-line react/forbid-prop-types
    metas: PropTypes.arrayOf(PropTypes.object).isRequired,
    selectedMetaId: PropTypes.string,
    // eslint-disable-next-line react/forbid-prop-types
    targets: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    issuesByMeta: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    params: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    baselineByScope: PropTypes.object.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    drivers: PropTypes.arrayOf(PropTypes.object).isRequired,
    onSelect: PropTypes.func.isRequired,
    onAdd: PropTypes.func.isRequired,
    onApplyTemplate: PropTypes.func.isRequired,
    onPatch: PropTypes.func.isRequired,
    onRemove: PropTypes.func.isRequired,
};

MetasPanel.defaultProps = {
    selectedMetaId: null,
};

export default MetasPanel;
