import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { Modal, Input, Alert, Typography } from 'antd';
import { parseNumber } from '../../inventory/utils/inventoryAggregate';

const { Text } = Typography;

/**
 * Converte texto colado (Excel/planilha) em uma lista de números, com parse
 * pt-BR (vírgula = decimal, ponto = milhar). Separa por TAB, quebra de linha ou
 * ponto-e-vírgula — NÃO por vírgula (que é o separador decimal).
 */
const parseNumbers = (text) =>
    text
        .trim()
        .split(/[\t\n\r;]+/)
        .map((tok) => tok.trim())
        .filter((tok) => tok !== '' && tok !== '-')
        .map(parseNumber)
        .filter((n) => Number.isFinite(n));

/**
 * Modal "colar valores absolutos": cola uma série de VALORES ABSOLUTOS por ano
 * (a partir do primeiro ano de projeção) e preenche o método ano-a-ano. O índice
 * e o crescimento são derivados no cálculo, tendo o valor do ano-base como âncora.
 */
function PasteAbsolutesModal({ open, baseYear, onCancel, onApply }) {
    const [raw, setRaw] = useState('');
    const firstYear = baseYear + 1;

    const numbers = parseNumbers(raw);
    const yearly = {};
    numbers.forEach((n, i) => {
        yearly[firstYear + i] = n;
    });

    const handleOk = () => {
        onApply({ method: 'yearly', yearly });
        setRaw('');
    };

    const handleCancel = () => {
        setRaw('');
        onCancel();
    };

    return (
        <Modal
            title="Colar valores absolutos"
            open={open}
            onOk={handleOk}
            onCancel={handleCancel}
            okText="Aplicar valores"
            okButtonProps={{
                disabled: numbers.length === 0,
                className: 'bg-[#210856] border-[#210856]',
            }}
            cancelText="Cancelar"
            width={560}
            destroyOnClose
        >
            <Text type="secondary" className="block mb-2 text-sm">
                Cole a série de valores absolutos por ano, a partir do primeiro ano de projeção ({firstYear}).
                Eles preenchem o método ano-a-ano; o índice/crescimento é derivado tendo o valor do ano-base ({baseYear})
                como âncora.
            </Text>
            <Input.TextArea
                rows={5}
                value={raw}
                onChange={(e) => setRaw(e.target.value)}
                placeholder={`Ex.: 2048,87\n2547,15\n2852,81\n...\n(um valor por linha — vírgula = decimal)`}
            />
            {numbers.length > 0 && (
                <Alert
                    className="mt-3"
                    type="success"
                    showIcon
                    message={`${numbers.length} valor(es) lido(s) — anos ${firstYear} a ${firstYear + numbers.length - 1}.`}
                />
            )}
        </Modal>
    );
}

PasteAbsolutesModal.propTypes = {
    open: PropTypes.bool.isRequired,
    baseYear: PropTypes.number.isRequired,
    onCancel: PropTypes.func.isRequired,
    onApply: PropTypes.func.isRequired,
};

export default PasteAbsolutesModal;
