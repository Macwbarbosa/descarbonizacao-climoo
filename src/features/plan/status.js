/** Metadados de status de etapa (rótulo + cores), compartilhados na feature. */
export const STATUS_META = {
    concluido: { label: 'Concluído', bar: '#0E7C66', chipBg: '#d6f2ea', chipText: '#0b5a4b' },
    andamento: { label: 'Em andamento', bar: '#7c3aed', chipBg: '#ede4fb', chipText: '#5b21b6' },
    nao_iniciado: { label: 'Não iniciado', bar: '#cbd5e1', chipBg: '#eef1f5', chipText: '#64748b' },
};

export const STATUS_ORDER = ['nao_iniciado', 'andamento', 'concluido'];

export const STATUS_OPTIONS = STATUS_ORDER.map((value) => ({ value, label: STATUS_META[value].label }));

export const statusMeta = (status) => STATUS_META[status] || STATUS_META.nao_iniciado;
