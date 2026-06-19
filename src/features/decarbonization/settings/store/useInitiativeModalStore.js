import { create } from 'zustand';

/**
 * Store for managing the "Nova Iniciativa" modal state and data.
 * 
 * @description
 * This store manages the form data across all tabs of the initiative modal,
 * providing a centralized way to handle the complex multi-step form.
 */
const useInitiativeModalStore = create((set, get) => ({
    // Current initiative being edited (null for new initiative)
    currentInitiative: null,

    // Tab data
    detalhes: {
        title: '',
        projectType: '',
        associatedGoal: null,
        scope: '',
        category: '',
        activities: [],
        technology: null,
        responsible: '',
        startDate: null,
        endDate: null,
    },

    abrangencia: {
        coverage: {}, // Dynamic years based on selected goal
    },

    tarefas: {
        tasks: [],
        currentTask: {
            taskName: '',
            taskResponsible: '',
            taskDeadline: null,
            taskMetric: '',
            applicationTarget: 0,
            reportType: 'monthly',
            monthlyTargets: {
                janeiro: 0,
                fevereiro: 0,
                marco: 0,
                abril: 0,
                maio: 0,
                junho: 0,
                julho: 0,
                agosto: 0,
                setembro: 0,
                outubro: 0,
                novembro: 0,
                dezembro: 0,
            },
            annualTarget: 0, // For annual reports
        },
    },

    investimento: {
        investmentType: '',
        investmentValue: 0,
        currency: 'BRL',
        investmentYear: new Date().getFullYear(),
        investmentDescription: '',
    },

    // Form validation states
    validation: {
        detalhes: {
            isValid: false,
            errors: {},
        },
        abrangencia: {
            isValid: true,
            errors: {},
        },
        tarefas: {
            isValid: true,
            errors: {},
        },
        investimento: {
            isValid: true,
            errors: {},
        },
    },

    // Loading state
    loading: false,

    // Actions for Detalhes tab
    updateDetalhes: (data) => {
        set((state) => ({
            detalhes: {
                ...state.detalhes,
                ...data,
            },
        }));
    },

    // Actions for Abrangencia tab
    updateAbrangencia: (data) => {
        set((state) => ({
            abrangencia: {
                ...state.abrangencia,
                ...data,
            },
        }));
    },

    updateCoverageYear: (year, value) => {
        set((state) => ({
            abrangencia: {
                ...state.abrangencia,
                coverage: {
                    ...state.abrangencia.coverage,
                    [year]: value,
                },
            },
        }));
    },

    // Clear coverage for years that are not in the range anymore
    resetCoverageForYears: (validYears) => {
        set((state) => {
            const newCoverage = {};
            validYears.forEach(year => {
                newCoverage[year] = state.abrangencia.coverage[year] || 0;
            });
            return {
                abrangencia: {
                    ...state.abrangencia,
                    coverage: newCoverage,
                },
            };
        });
    },

    // Actions for Tarefas tab
    updateCurrentTask: (data) => {
        set((state) => ({
            tarefas: {
                ...state.tarefas,
                currentTask: {
                    ...state.tarefas.currentTask,
                    ...data,
                },
            },
        }));
    },

    updateMonthlyTarget: (month, value) => {
        set((state) => ({
            tarefas: {
                ...state.tarefas,
                currentTask: {
                    ...state.tarefas.currentTask,
                    monthlyTargets: {
                        ...state.tarefas.currentTask.monthlyTargets,
                        [month]: value,
                    },
                },
            },
        }));
    },

    updateAnnualTarget: (value) => {
        set((state) => ({
            tarefas: {
                ...state.tarefas,
                currentTask: {
                    ...state.tarefas.currentTask,
                    annualTarget: value,
                },
            },
        }));
    },

    addTask: () => {
        const { tarefas } = get();
        const newTask = {
            ...tarefas.currentTask,
            id: Date.now(),
            createdAt: new Date().toISOString(),
        };

        set((state) => ({
            tarefas: {
                ...state.tarefas,
                tasks: [...state.tarefas.tasks, newTask],
                // Reset current task
                currentTask: {
                    taskName: '',
                    taskResponsible: '',
                    taskDeadline: null,
                    taskMetric: '',
                    applicationTarget: 0,
                    reportType: 'monthly',
                    monthlyTargets: {
                        janeiro: 0,
                        fevereiro: 0,
                        marco: 0,
                        abril: 0,
                        maio: 0,
                        junho: 0,
                        julho: 0,
                        agosto: 0,
                        setembro: 0,
                        outubro: 0,
                        novembro: 0,
                        dezembro: 0,
                    },
                    annualTarget: 0,
                },
            },
        }));
    },

    removeTask: (taskId) => {
        set((state) => ({
            tarefas: {
                ...state.tarefas,
                tasks: state.tarefas.tasks.filter(task => task.id !== taskId),
            },
        }));
    },

    // Actions for Investimento tab
    updateInvestimento: (data) => {
        // Debug: verificar dados recebidos
        // eslint-disable-next-line no-console
        console.log('🔧 updateInvestimento called with:', data);

        set((state) => {
            const newState = {
                investimento: {
                    ...state.investimento,
                    ...data,
                },
            };

            // Debug: verificar estado após update
            // eslint-disable-next-line no-console
            console.log('🔧 Investment state after update:', newState.investimento);

            return newState;
        });
    },

    // Validation actions
    validateDetalhes: () => {
        const { detalhes } = get();
        const errors = {};
        let isValid = true;

        // Required fields validation
        if (!detalhes.title.trim()) {
            errors.title = 'Título da iniciativa é obrigatório';
            isValid = false;
        }

        if (!detalhes.projectType.trim()) {
            errors.projectType = 'Tipo de projeto é obrigatório';
            isValid = false;
        }

        if (!detalhes.associatedGoal) {
            errors.associatedGoal = 'Meta associada é obrigatória';
            isValid = false;
        }

        if (!detalhes.scope.trim()) {
            errors.scope = 'Escopo é obrigatório';
            isValid = false;
        }

        if (!detalhes.category.trim()) {
            errors.category = 'Categoria é obrigatória';
            isValid = false;
        }

        if (!detalhes.startDate) {
            errors.startDate = 'Data de início é obrigatória';
            isValid = false;
        }

        if (!detalhes.endDate) {
            errors.endDate = 'Data de término é obrigatória';
            isValid = false;
        }

        // Date validation
        if (detalhes.startDate && detalhes.endDate) {
            if (new Date(detalhes.startDate) >= new Date(detalhes.endDate)) {
                errors.endDate = 'Data de término deve ser posterior à data de início';
                isValid = false;
            }
        }

        set((state) => ({
            validation: {
                ...state.validation,
                detalhes: {
                    isValid,
                    errors,
                },
            },
        }));

        return isValid;
    },

    // Validation for Investimento tab
    validateInvestimento: () => {
        const { investimento } = get();
        const errors = {};
        let isValid = true;

        // Optional validation - only validate if any investment field is filled
        const hasInvestmentData = investimento.investmentType ||
            investimento.investmentValue > 0 ||
            investimento.investmentDescription;

        if (hasInvestmentData) {
            if (!investimento.investmentType) {
                errors.investmentType = 'Tipo de investimento é obrigatório quando há dados de investimento';
                isValid = false;
            }

            if (!investimento.investmentValue || investimento.investmentValue <= 0) {
                errors.investmentValue = 'Valor do investimento deve ser maior que zero';
                isValid = false;
            }

            if (!investimento.currency) {
                errors.currency = 'Moeda é obrigatória quando há dados de investimento';
                isValid = false;
            }

            if (!investimento.investmentYear || investimento.investmentYear < 2025 || investimento.investmentYear > 2050) {
                errors.investmentYear = 'Ano do investimento deve estar entre 2025 e 2050';
                isValid = false;
            }
        }

        set((state) => ({
            validation: {
                ...state.validation,
                investimento: {
                    isValid,
                    errors,
                },
            },
        }));

        return isValid;
    },

    // Get complete initiative data
    getCompleteInitiative: () => {
        const state = get();
        const completeData = {
            id: state.currentInitiative?.id || Date.now(),
            ...state.detalhes,
            // Map abrangencia to coverage for API compatibility
            coverage: state.abrangencia.coverage || {},
            // Map tarefas to tasks for API compatibility
            tasks: (state.tarefas.tasks || []).map(task => ({
                ...task,
                title: task.taskName, // Map taskName to title for API compatibility
                taskName: undefined // Remove taskName from the payload
            })),
            // Map investimento to investment for API compatibility
            investment: {
                totalAmount: state.investimento.investmentValue || 0,
                currency: state.investimento.currency || 'BRL',
                type: state.investimento.investmentType || '',
                year: state.investimento.investmentYear || new Date().getFullYear(),
                description: state.investimento.investmentDescription || '',
                breakdown: [] // Can be expanded later if needed
            },
            createdAt: state.currentInitiative?.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
        };

        // Debug: verificar dados completos
        // eslint-disable-next-line no-console
        console.log('🔧 getCompleteInitiative - Raw investment state:', state.investimento);
        // eslint-disable-next-line no-console
        console.log('🔧 getCompleteInitiative - Mapped investment:', completeData.investment);
        // eslint-disable-next-line no-console
        console.log('🔧 getCompleteInitiative - Full mapped data:', completeData);

        return completeData;
    },

    // Load existing initiative for editing
    loadInitiative: (initiative) => {
        // Debug: verificar dados recebidos
        // eslint-disable-next-line no-console
        console.log('🔧 loadInitiative - Raw initiative data:', initiative);
        // eslint-disable-next-line no-console
        console.log('🔧 loadInitiative - Investment data:', initiative.investment);

        set({
            currentInitiative: initiative,
            detalhes: {
                title: initiative.title || '',
                projectType: initiative.projectType || '',
                associatedGoal: initiative.associatedGoal || null,
                scope: initiative.scope || '',
                category: initiative.category || '',
                activities: initiative.activities || [],
                technology: initiative.technology || null,
                responsible: initiative.responsible || '',
                startDate: initiative.startDate || null,
                endDate: initiative.endDate || null,
            },
            // Map coverage back to abrangencia for internal use
            abrangencia: {
                coverage: initiative.coverage || {},
            },
            // Map tasks back to tarefas for internal use
            tarefas: {
                tasks: initiative.tasks || [],
                currentTask: {
                    taskName: '',
                    taskResponsible: '',
                    taskDeadline: null,
                    taskMetric: '',
                    applicationTarget: 0,
                    reportType: 'monthly',
                    monthlyTargets: {
                        janeiro: 0,
                        fevereiro: 0,
                        marco: 0,
                        abril: 0,
                        maio: 0,
                        junho: 0,
                        julho: 0,
                        agosto: 0,
                        setembro: 0,
                        outubro: 0,
                        novembro: 0,
                        dezembro: 0,
                    },
                    annualTarget: 0,
                },
            },
            // Map investment back to investimento for internal use
            investimento: {
                investmentType: initiative.investment?.type || '',
                investmentValue: initiative.investment?.totalAmount || 0,
                currency: initiative.investment?.currency || 'BRL',
                investmentYear: initiative.investment?.year || new Date().getFullYear(),
                investmentDescription: initiative.investment?.description || '',
            },
        });

        // Debug: verificar dados após carregamento
        setTimeout(() => {
            const { investimento } = get();
            // eslint-disable-next-line no-console
            console.log('🔧 loadInitiative - Final investment state:', investimento);
        }, 100);
    },

    // Reset form to initial state
    resetForm: () => {
        set({
            currentInitiative: null,
            detalhes: {
                title: '',
                projectType: '',
                associatedGoal: null,
                scope: '',
                category: '',
                activities: [],
                technology: null,
                responsible: '',
                startDate: null,
                endDate: null,
            },
            abrangencia: {
                coverage: {},
            },
            tarefas: {
                tasks: [],
                currentTask: {
                    taskName: '',
                    taskResponsible: '',
                    taskDeadline: null,
                    taskMetric: '',
                    applicationTarget: 0,
                    reportType: 'monthly',
                    monthlyTargets: {
                        janeiro: 0,
                        fevereiro: 0,
                        marco: 0,
                        abril: 0,
                        maio: 0,
                        junho: 0,
                        julho: 0,
                        agosto: 0,
                        setembro: 0,
                        outubro: 0,
                        novembro: 0,
                        dezembro: 0,
                    },
                },
            },
            investimento: {
                investmentType: '',
                investmentValue: 0,
                currency: 'BRL',
                investmentYear: new Date().getFullYear(),
                investmentDescription: '',
            },
            validation: {
                detalhes: {
                    isValid: false,
                    errors: {},
                },
                abrangencia: {
                    isValid: true,
                    errors: {},
                },
                tarefas: {
                    isValid: true,
                    errors: {},
                },
                investimento: {
                    isValid: true,
                    errors: {},
                },
            },
            loading: false,
        });
    },

    // Set loading state
    setLoading: (loading) => {
        set({ loading });
    },

    // Get validation state for a specific tab
    getTabValidation: (tabKey) => {
        const { validation } = get();
        return validation[tabKey] || { isValid: true, errors: {} };
    },

    // Check if the form is valid overall
    isFormValid: () => {
        const { validation } = get();
        return Object.values(validation).every(tab => tab.isValid);
    },
}));

export default useInitiativeModalStore;
