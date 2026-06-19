import React from 'react';
import PropTypes from 'prop-types';
import { Modal, Descriptions, Tag, Typography } from 'antd';

const { Paragraph, Text } = Typography;

/** Exibe o memorial de uma iniciativa do banco (somente leitura). O financeiro
 * é configurado por projeto, não na iniciativa. */
function InitiativeMemorialModal({ open, initiative, onClose }) {
    if (!initiative) return null;
    const hasApplicability =
        (initiative.applicability?.scopes || []).length > 0 || (initiative.applicability?.categories || []).length > 0;
    return (
        <Modal open={open} onCancel={onClose} footer={null} width={680} title={initiative.name}>
            <Paragraph type="secondary">{initiative.fullDescription || initiative.description}</Paragraph>

            <Descriptions size="small" column={2} bordered className="mb-3">
                <Descriptions.Item label="Eficácia">{initiative.efficacy}%</Descriptions.Item>
                {initiative.reference ? (
                    <Descriptions.Item label="Referência">
                        <a href={initiative.reference} target="_blank" rel="noopener noreferrer">Link</a>
                    </Descriptions.Item>
                ) : null}
            </Descriptions>

            {hasApplicability && (
                <div className="mb-2">
                    <Text type="secondary" className="text-xs uppercase">Aplicabilidade</Text>
                    <div className="mt-1">
                        {(initiative.applicability?.scopes || []).map((s) => (
                            <Tag key={s} color="blue">{s}</Tag>
                        ))}
                        {(initiative.applicability?.categories || []).map((c) => (
                            <Tag key={c}>{c}</Tag>
                        ))}
                    </div>
                </div>
            )}

            <div className="rounded-md bg-[#fffdf2] border border-dashed border-[#d8cf9e] p-3 text-[13px]">
                <Text strong>Memorial de cálculo</Text>
                <Paragraph className="mb-0 mt-1">{initiative.memorial || '—'}</Paragraph>
            </div>
        </Modal>
    );
}

InitiativeMemorialModal.propTypes = {
    open: PropTypes.bool.isRequired,
    // eslint-disable-next-line react/forbid-prop-types
    initiative: PropTypes.object,
    onClose: PropTypes.func.isRequired,
};

InitiativeMemorialModal.defaultProps = { initiative: null };

export default InitiativeMemorialModal;
