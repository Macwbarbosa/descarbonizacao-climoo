import React from 'react';
import { Modal, Typography, Tag } from 'antd';

const { Title, Paragraph } = Typography;

function ViewTechnologyModal({ visible, onClose, technology }) {
    if (!technology) return null;

    const formatPartners = (partners) => {
        if (Array.isArray(partners)) {
            return partners;
        }
        if (typeof partners === 'string') {
            return partners.split('\n').filter(partner => partner.trim());
        }
        return [];
    };

    return (
        <Modal
            title={technology.name}
            open={visible}
            onCancel={onClose}
            width={600}
            footer={null}
        >
            <div className="mt-4">
                <div className="mb-4">
                    <Title level={5} className="text-[#210856] mb-2">
                        Descrição
                    </Title>
                    <Paragraph className="text-gray-700">
                        {technology.fullDescription || technology.description}
                    </Paragraph>
                </div>

                <div className="mb-4">
                    <Title level={5} className="text-[#210856] mb-2">
                        Potencial de Redução
                    </Title>
                    <Tag color="green" className="text-lg px-3 py-1">
                        {technology.reductionPotential}%
                    </Tag>
                </div>

                {technology.reference && (
                    <div className="mb-4">
                        <Title level={5} className="text-[#210856] mb-2">
                            Referência
                        </Title>
                        <a
                            href={technology.reference}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800"
                        >
                            {technology.reference}
                        </a>
                    </div>
                )}

                {technology.partners && formatPartners(technology.partners).length > 0 && (
                    <div>
                        <Title level={5} className="text-[#210856] mb-2">
                            Potenciais Parceiros
                        </Title>
                        <ul className="list-disc pl-5">
                            {formatPartners(technology.partners).map((partner) => (
                                <li key={partner} className="text-gray-700 mb-1">
                                    {partner}
                                </li>
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </Modal>
    );
}

export default ViewTechnologyModal;
