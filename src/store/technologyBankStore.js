import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { technologiesBankAPI } from '../apis/technologiesBankAPI';

const useTechnologyBankStore = create(
    persist(
        (set, get) => ({
            // Estado inicial
            technologies: [
                {
                    id: 1,
                    name: 'Veículo flex, gasolina p/ veículo flex etanol',
                    description: 'Conversão de combustível de gasolina para etanol',
                    fullDescription: 'Implementação de programa de conversão da frota flex de gasolina para etanol, incluindo treinamento de motoristas, análise de custos e benefícios, e monitoramento de performance dos veículos.',
                    reductionPotential: 91.00,
                    reference: 'https://www.anp.gov.br/biocombustiveis/etanol',
                    partners: 'Raízen\nCopersucar\nUsinas de etanol regionais',
                    createdAt: new Date('2024-01-01'),
                    updatedAt: new Date('2024-01-01')
                },
                {
                    id: 2,
                    name: 'Eletrificação, veículo leve',
                    description: 'Substituição de veículos leves por elétricos',
                    fullDescription: 'Implementação de programa de eletrificação da frota leve empresarial, incluindo substituição gradual de veículos a combustão por veículos elétricos, instalação de infraestrutura de recarga e treinamento de colaboradores.',
                    reductionPotential: 99.00,
                    reference: 'https://www.iea.org/reports/electric-vehicles',
                    partners: 'BMW i3, Tesla Model 3\nEnel X (infraestrutura)\nWEG (equipamentos de recarga)',
                    createdAt: new Date('2024-01-02'),
                    updatedAt: new Date('2024-01-02')
                },
                {
                    id: 3,
                    name: 'Cenário Biodiesel BR',
                    description: 'Implementação de biodiesel na frota',
                    fullDescription: 'Adoção de biodiesel B20 ou superior na frota de veículos pesados, incluindo análise de fornecedores, adaptações necessárias nos veículos e monitoramento de performance.',
                    reductionPotential: 8.44,
                    reference: 'https://www.gov.br/anp/pt-br/assuntos/producao-e-fornecimento-de-combustiveis/biodiesel',
                    partners: 'Petrobras Biocombustível\nBSBios\nAgropalma',
                    createdAt: new Date('2024-01-03'),
                    updatedAt: new Date('2024-01-03')
                },
                {
                    id: 4,
                    name: 'Direção econômica',
                    description: 'Treinamento em direção eficiente',
                    fullDescription: 'Programa de treinamento em direção econômica para motoristas da frota, incluindo técnicas de economia de combustível, manutenção preventiva e monitoramento de consumo.',
                    reductionPotential: 15.00,
                    reference: 'https://www.ecodrive.org/',
                    partners: 'CFC credenciados\nEmpresas de treinamento\nConsultorias especializadas',
                    createdAt: new Date('2024-01-04'),
                    updatedAt: new Date('2024-01-04')
                },
                {
                    id: 5,
                    name: 'Eletricidade renovável (iRECs)',
                    description: 'Certificados de energia renovável internacional',
                    fullDescription: 'Aquisição de certificados internacionais de energia renovável (iRECs) para compensar o consumo elétrico da organização, garantindo origem 100% renovável da energia consumida.',
                    reductionPotential: 100.00,
                    reference: 'https://www.irecstandard.org/',
                    partners: 'I-REC Standard Foundation\nAPX\nMarubeni',
                    createdAt: new Date('2024-01-05'),
                    updatedAt: new Date('2024-01-05')
                },
                {
                    id: 6,
                    name: 'GLP para Gás Natural',
                    description: 'Conversão de GLP para gás natural',
                    fullDescription: 'Substituição de sistemas que utilizam GLP (gás liquefeito de petróleo) por gás natural, incluindo adaptações de equipamentos e análise de viabilidade técnica e econômica.',
                    reductionPotential: 10.98,
                    reference: 'https://www.gov.br/anp/pt-br/assuntos/gas-natural',
                    partners: 'Comgás\nNaturgy\nConsultorias técnicas',
                    createdAt: new Date('2024-01-06'),
                    updatedAt: new Date('2024-01-06')
                },
                {
                    id: 7,
                    name: 'Gás Natural para Biomassa',
                    description: 'Substituição de gás natural por biomassa',
                    fullDescription: 'Conversão de sistemas de aquecimento e geração de energia de gás natural para biomassa, incluindo caldeiras, fornos e sistemas de cogeração.',
                    reductionPotential: 96.60,
                    reference: 'https://www.aebiom.org/',
                    partners: 'Suzano\nKlabin\nFornecedores de biomassa local',
                    createdAt: new Date('2024-01-07'),
                    updatedAt: new Date('2024-01-07')
                },
                {
                    id: 8,
                    name: 'Gás Natural para Biometano',
                    description: 'Conversão para biometano',
                    fullDescription: 'Substituição do gás natural por biometano produzido a partir de resíduos orgânicos, incluindo análise de fornecedores e adaptações nos sistemas existentes.',
                    reductionPotential: 99.95,
                    reference: 'https://www.abiogás.org.br/',
                    partners: 'Orizon\nGás Verde\nBiogás Itaú',
                    createdAt: new Date('2024-01-08'),
                    updatedAt: new Date('2024-01-08')
                },
                {
                    id: 9,
                    name: 'Gás refrigerante R404A para HFC-32',
                    description: 'Substituição de refrigerante R404A por HFC-32',
                    fullDescription: 'Conversão de sistemas de refrigeração e ar condicionado de R404A para HFC-32, um refrigerante com menor potencial de aquecimento global.',
                    reductionPotential: 82.82,
                    reference: 'https://www.unep.org/ozonaction/',
                    partners: 'Daikin\nCarrier\nTrane',
                    createdAt: new Date('2024-01-09'),
                    updatedAt: new Date('2024-01-09')
                },
                {
                    id: 10,
                    name: 'Gás refrigerante R404A para HFC-134A',
                    description: 'Substituição de refrigerante R404A por HFC-134A',
                    fullDescription: 'Conversão de sistemas de refrigeração de R404A para HFC-134A, reduzindo significativamente o potencial de aquecimento global dos equipamentos.',
                    reductionPotential: 62.02,
                    reference: 'https://www.ashrae.org/',
                    partners: 'Honeywell\nChemours\nMexichem',
                    createdAt: new Date('2024-01-10'),
                    updatedAt: new Date('2024-01-10')
                },
                {
                    id: 11,
                    name: 'Gás refrigerante R404A para HFC-134',
                    description: 'Substituição de refrigerante R404A por HFC-134',
                    fullDescription: 'Migração de sistemas de refrigeração de R404A para HFC-134, oferecendo uma opção com menor impacto climático e boa eficiência energética.',
                    reductionPotential: 71.60,
                    reference: 'https://www.ashrae.org/technical-resources/standards-and-guidelines',
                    partners: 'Dupont\nArkema\nSolvay',
                    createdAt: new Date('2024-01-11'),
                    updatedAt: new Date('2024-01-11')
                },
                {
                    id: 12,
                    name: 'Gás refrigerante R404A para R410A',
                    description: 'Substituição de refrigerante R404A por R410A',
                    fullDescription: 'Conversão de equipamentos de refrigeração de R404A para R410A, proporcionando melhor eficiência energética e menor impacto ambiental.',
                    reductionPotential: 51.17,
                    reference: 'https://www.epa.gov/snap/substitutes-refrigeration-and-air-conditioning',
                    partners: 'Lennox\nYork\nRheem',
                    createdAt: new Date('2024-01-12'),
                    updatedAt: new Date('2024-01-12')
                },
                {
                    id: 13,
                    name: 'GLP para elétrico',
                    description: 'Conversão de equipamentos GLP para elétricos',
                    fullDescription: 'Substituição de equipamentos que utilizam GLP por versões elétricas, incluindo fornos, aquecedores e outros equipamentos industriais e comerciais.',
                    reductionPotential: 100.00,
                    reference: 'https://www.iea.org/reports/electricity-security',
                    partners: 'Electrolux\nBrastemp\nBosch',
                    createdAt: new Date('2024-01-13'),
                    updatedAt: new Date('2024-01-13')
                },
                {
                    id: 14,
                    name: 'Gás refrigerante HFC-134A para R-290',
                    description: 'Substituição de HFC-134A por R-290 (propano)',
                    fullDescription: 'Conversão de sistemas de refrigeração de HFC-134A para R-290 (propano), um refrigerante natural com potencial de aquecimento global praticamente zero.',
                    reductionPotential: 99.77,
                    reference: 'https://www.unep.org/ozonaction/resources/factsheet/r290-refrigerant-factsheet',
                    partners: 'Embraco\nDanfoss\nSecop',
                    createdAt: new Date('2024-01-14'),
                    updatedAt: new Date('2024-01-14')
                },
                {
                    id: 15,
                    name: 'Empresas atingirem metas climáticas (SBTs)',
                    description: 'Implementação de metas baseadas na ciência',
                    fullDescription: 'Desenvolvimento e implementação de metas de redução de emissões baseadas na ciência (Science Based Targets), alinhadas com os objetivos do Acordo de Paris.',
                    reductionPotential: 63.00,
                    reference: 'https://sciencebasedtargets.org/',
                    partners: 'SBTi\nCDP\nConsultorias especializadas em sustentabilidade',
                    createdAt: new Date('2024-01-15'),
                    updatedAt: new Date('2024-01-15')
                }
            ],
            loading: false,
            error: null,

            // Actions
            // Catálogo GLOBAL compartilhado — CRUD local-first (persistido via zustand).
            // Sem backend disponível: o catálogo seed já vem populado; criar/editar/
            // excluir operam sobre a lista local e persistem. Só busca da API quando
            // ainda não há nada local.
            loadTechnologies: async () => {
                if (get().technologies.length > 0) return get().technologies;
                try {
                    set({ loading: true, error: null });
                    const technologies = await technologiesBankAPI.getTechnologies();
                    set({ technologies, loading: false });
                    return technologies;
                } catch (error) {
                    set({ error: error.message, loading: false });
                    throw error;
                }
            },

            addTechnology: async (technologyData) => {
                const id = Math.max(0, ...get().technologies.map((t) => Number(t.id) || 0)) + 1;
                const newTechnology = {
                    id,
                    name: '',
                    description: '',
                    fullDescription: '',
                    reductionPotential: 0,
                    reference: '',
                    partners: '',
                    ...technologyData,
                };
                set((s) => ({ technologies: [...s.technologies, newTechnology], loading: false, error: null }));
                return newTechnology;
            },

            updateTechnology: async (id, updatedData) => {
                set((s) => ({
                    technologies: s.technologies.map((t) => (t.id === id ? { ...t, ...updatedData } : t)),
                    loading: false,
                    error: null,
                }));
            },

            deleteTechnology: async (id) => {
                set((s) => ({ technologies: s.technologies.filter((t) => t.id !== id), loading: false, error: null }));
            },

            getTechnologyById: (id) => {
                const { technologies } = get();
                return technologies.find(tech => tech.id === id);
            },

            getTechnologies: () => {
                const { technologies } = get();
                return technologies;
            },

            searchTechnologies: (searchTerm) => {
                const { technologies } = get();
                if (!searchTerm) return technologies;

                const term = searchTerm.toLowerCase();
                return technologies.filter(tech =>
                    tech.name.toLowerCase().includes(term) ||
                    tech.description.toLowerCase().includes(term) ||
                    (tech.fullDescription && tech.fullDescription.toLowerCase().includes(term))
                );
            },

            getTechnologiesByReductionPotential: (minPotential) => {
                const { technologies } = get();
                return technologies.filter(tech => tech.reductionPotential >= minPotential);
            },

            clearError: () => {
                set({ error: null });
            },

            setLoading: (loading) => {
                set({ loading });
            },

            setError: (error) => {
                set({ error, loading: false });
            },

            // Estatísticas
            getStatistics: () => {
                const { technologies } = get();
                return {
                    totalTechnologies: technologies.length,
                    averageReductionPotential: technologies.length > 0
                        ? (technologies.reduce((sum, tech) => sum + tech.reductionPotential, 0) / technologies.length).toFixed(1)
                        : 0,
                    maxReductionPotential: technologies.length > 0
                        ? Math.max(...technologies.map(tech => tech.reductionPotential))
                        : 0,
                    technologiesWithReferences: technologies.filter(tech => tech.reference).length
                };
            },

            // Reset store
            reset: () => {
                set({
                    technologies: [],
                    loading: false,
                    error: null
                });
            }
        }),
        {
            name: 'technology-bank-store',
            version: 1,
        }
    )
);

export default useTechnologyBankStore;
