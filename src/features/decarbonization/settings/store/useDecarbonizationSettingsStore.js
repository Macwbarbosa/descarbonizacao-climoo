import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
    getReductionGoals as fetchReductionGoalsAPI,
    createReductionGoal as createReductionGoalAPI,
    updateReductionGoal as updateReductionGoalAPI,
    deleteReductionGoal as deleteReductionGoalAPI
} from '../services/reductionGoalsAPI';
import {
    getProjectionParametersAPI,
    createProjectionParameterAPI,
    updateProjectionParameterAPI,
    deleteProjectionParameterAPI
} from '../services/projectionsAPI';
import {
    getBaselineEmissions,
    createBaselineEmission,
    updateBaselineEmission,
    deleteBaselineEmission
} from '../services/baselineEmissionsAPI';
import { scenarioAPI, initiativeAPI } from '../../../../apis/decarbonizationAPI';

/**
 * Global state for managing decarbonization settings data.
 *
 * @description
 * This store manages the state for the "decarbonization settings" feature, including
 * reduction goals, baseline emissions, projections, projects, and plan data.
 *
 * @returns {object} A Zustand object with data, actions, and getters.
 */
const useDecarbonizationSettingsStore = create(
    persist(
        (set, get) => ({
            // Step 1: Reduction Goals
            reductionGoals: [],

            // Step 2: Baseline Emissions (placeholder for future implementation)
            baselineEmissions: {},

            // Step 3: Projections
            projections: [],

            // Step 4: Emissions Inventory
            emissionsInventory: [],

            // Step 4: Decarbonization Scenarios
            scenarios: [],
            activeScenarioId: null,

            // Step 4: Decarbonization Initiatives
            initiatives: [],

            // Step 5: Decarbonization Projects (placeholder for future implementation)
            projects: [],

            // Step 5: Plan Review (placeholder for future implementation)
            planReview: {},

            // Loading states
            loading: false,

            /**
             * Loads reduction goals from the API and updates the store.
             */
            loadReductionGoals: async () => {
                set({ loading: true });
                try {
                    const goals = await fetchReductionGoalsAPI();
                    set({ reductionGoals: goals, loading: false });
                    return goals;
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Adds a new reduction goal to the backend and refreshes the data.
             *
             * @param {Object} goal - The reduction goal object to add.
             */
            addReductionGoal: async (goal) => {
                set({ loading: true });
                try {
                    await createReductionGoalAPI(goal);
                    // Refresh data from backend
                    await get().loadReductionGoals();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Updates an existing reduction goal and refreshes the data.
             *
             * @param {number} goalId - The ID of the goal to update.
             * @param {Object} updatedGoal - The updated goal data.
             */
            updateReductionGoal: async (goalId, updatedGoal) => {
                set({ loading: true });
                try {
                    await updateReductionGoalAPI(goalId, updatedGoal);
                    // Refresh data from backend
                    await get().loadReductionGoals();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Removes a reduction goal from the backend and refreshes the data.
             *
             * @param {number} goalId - The ID of the goal to remove.
             */
            removeReductionGoal: async (goalId) => {
                set({ loading: true });
                try {
                    await deleteReductionGoalAPI(goalId);
                    // Refresh data from backend
                    await get().loadReductionGoals();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Clears all reduction goals.
             */
            clearReductionGoals: () => {
                set({ reductionGoals: [] });
            },

            /**
             * Returns all reduction goals.
             *
             * @returns {Array} List of reduction goals.
             */
            getReductionGoals: () => get().reductionGoals || [],

            /**
             * Returns a specific reduction goal by ID.
             *
             * @param {number} goalId - The ID of the goal to find.
             * @returns {Object|undefined} The reduction goal object or undefined if not found.
             */
            getReductionGoalById: (goalId) => (get().reductionGoals || []).find((goal) => goal.id === goalId),

            /**
             * Returns the loading status.
             *
             * @returns {boolean} Loading status.
             */
            isLoading: () => get().loading,

            /**
             * Sets the loading status.
             *
             * @param {boolean} loading - The loading status to set.
             */
            setLoading: (loading) => set({ loading }),

            // Projection Parameters Methods

            /**
             * Loads projection parameters from the backend API.
             */
            loadProjectionParameters: async () => {
                set({ loading: true });
                try {
                    const parameters = await getProjectionParametersAPI();
                    set({
                        projections: parameters,
                        loading: false
                    });
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Adds a new projection parameter to the backend and refreshes the data.
             *
             * @param {Object} parameter - The projection parameter object to add.
             */
            addProjectionParameter: async (parameter) => {
                set({ loading: true });
                try {
                    await createProjectionParameterAPI(parameter);
                    // Refresh data from backend
                    await get().loadProjectionParameters();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Updates an existing projection parameter and refreshes the data.
             *
             * @param {number} parameterId - The ID of the parameter to update.
             * @param {Object} updatedParameter - The updated parameter data.
             */
            updateProjectionParameter: async (parameterId, updatedParameter) => {
                set({ loading: true });
                try {
                    await updateProjectionParameterAPI(parameterId, updatedParameter);
                    // Refresh data from backend
                    await get().loadProjectionParameters();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Removes a projection parameter from the backend and refreshes the data.
             *
             * @param {number} parameterId - The ID of the parameter to remove.
             */
            removeProjectionParameter: async (parameterId) => {
                set({ loading: true });
                try {
                    await deleteProjectionParameterAPI(parameterId);
                    // Refresh data from backend
                    await get().loadProjectionParameters();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Clears all projection parameters.
             */
            clearProjectionParameters: () => {
                set({ projections: [] });
            },

            /**
             * Returns all projection parameters.
             *
             * @returns {Array} List of projection parameters.
             */
            getProjectionParameters: () => {
                const { projections } = get();
                return Array.isArray(projections) ? projections : [];
            },

            /**
             * Returns a specific projection parameter by ID.
             *
             * @param {number} parameterId - The ID of the parameter to find.
             * @returns {Object|undefined} The projection parameter object or undefined if not found.
             */
            getProjectionParameterById: (parameterId) => {
                const { projections } = get();
                const projectionsArray = Array.isArray(projections) ? projections : [];
                return projectionsArray.find((parameter) => parameter.id === parameterId);
            },

            // Emissions Inventory Methods

            /**
             * Adds a new emission inventory item to the store.
             *
             * @param {Object} item - The emission inventory item object to add.
             */
            addEmissionInventoryItem: (item) => {
                const itemWithId = {
                    ...item,
                    // Use provided ID or generate unique one
                    id: item.id || `emission_${Date.now()}_${Math.floor(Math.random() * 10000)}`,
                    createdAt: new Date().toISOString(),
                };
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: [...currentInventory, itemWithId],
                    };
                });
            },

            /**
             * Adds multiple emission inventory items to the store.
             *
             * @param {Array} items - Array of emission inventory items to add.
             */
            addMultipleEmissionInventoryItems: (items) => {
                const baseTime = Date.now();
                const itemsWithIds = items.map((item, index) => ({
                    ...item,
                    // Gerar ID único mais robusto
                    id: `emission_${baseTime}_${index}_${Math.floor(Math.random() * 10000)}`,
                    createdAt: new Date().toISOString(),
                }));
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: [...currentInventory, ...itemsWithIds],
                    };
                });
            },

            /**
             * Updates an existing emission inventory item.
             *
             * @param {number} itemId - The ID of the item to update.
             * @param {Object} updatedItem - The updated item data.
             */
            updateEmissionInventoryItem: (itemId, updatedItem) => {
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: currentInventory.map((item) =>
                            String(item.id) === String(itemId)
                                ? { ...item, ...updatedItem, updatedAt: new Date().toISOString() }
                                : item
                        ),
                    };
                });
            },

            /**
             * Removes an emission inventory item from the store.
             *
             * @param {number} itemId - The ID of the item to remove.
             */
            removeEmissionInventoryItem: (itemId) => {
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: currentInventory.filter((item) => String(item.id) !== String(itemId)),
                    };
                });
            },

            /**
             * Clears all emission inventory items.
             */
            clearEmissionInventory: () => {
                set({ emissionsInventory: [] });
            },

            /**
             * Returns all emission inventory items.
             *
             * @returns {Array} List of emission inventory items.
             */
            getEmissionInventory: () => {
                const { emissionsInventory } = get();
                return Array.isArray(emissionsInventory) ? emissionsInventory : [];
            },

            /**
             * Returns a specific emission inventory item by ID.
             *
             * @param {number} itemId - The ID of the item to find.
             * @returns {Object|undefined} The emission inventory item object or undefined if not found.
             */
            getEmissionInventoryItemById: (itemId) => {
                const { emissionsInventory } = get();
                const inventoryArray = Array.isArray(emissionsInventory) ? emissionsInventory : [];
                return inventoryArray.find((item) => item.id === itemId);
            },

            // Baseline Emissions API Methods

            /**
             * Load baseline emissions from API (alias for backwards compatibility)
             * @param {Object} filters - Optional filters
             */
            loadEmissionsInventory: (filters = {}) => get().loadBaselineEmissions(filters),

            /**
             * Load baseline emissions from API
             * @param {Object} filters - Optional filters
             */
            loadBaselineEmissions: async (filters = {}) => {
                set({ loading: true });
                try {
                    const emissions = await getBaselineEmissions(filters);
                    set({ emissionsInventory: emissions, loading: false });
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Add new baseline emission via API
             * @param {Object} emissionData - Emission data
             */
            addBaselineEmission: async (emissionData) => {
                const newEmission = await createBaselineEmission(emissionData);

                // Add to local state
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: [...currentInventory, newEmission],
                    };
                });

                // Reload data to ensure synchronization
                await get().loadBaselineEmissions();

                return newEmission;
            },

            /**
             * Update baseline emission via API
             * @param {string|number} emissionId - Emission ID
             * @param {Object} emissionData - Updated emission data
             */
            updateBaselineEmission: async (emissionId, emissionData) => {
                const updatedEmission = await updateBaselineEmission(emissionId, emissionData);

                // Update local state
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: currentInventory.map((item) =>
                            String(item.id) === String(emissionId) ? { ...item, ...updatedEmission } : item
                        ),
                    };
                });

                // Reload data to ensure synchronization
                await get().loadBaselineEmissions();

                return updatedEmission;
            },

            /**
             * Remove baseline emission via API
             * @param {string|number} emissionId - Emission ID
             */
            removeBaselineEmission: async (emissionId) => {
                await deleteBaselineEmission(emissionId);

                // Remove from local state
                set((state) => {
                    const currentInventory = Array.isArray(state.emissionsInventory) ? state.emissionsInventory : [];
                    return {
                        emissionsInventory: currentInventory.filter((item) => String(item.id) !== String(emissionId)),
                    };
                });

                // Reload data to ensure synchronization
                await get().loadBaselineEmissions();
            },

            // Scenario Management Methods

            /**
             * Loads scenarios from the API and updates the store.
             */
            loadScenarios: async () => {
                set({ loading: true });
                try {
                    const scenarios = await scenarioAPI.getScenarios();
                    set({
                        scenarios,
                        loading: false,
                        // Set first scenario as active if none is set
                        activeScenarioId: get().activeScenarioId || (scenarios.length > 0 ? scenarios[0].id : null)
                    });
                    return scenarios;
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Adds a new scenario via API and refreshes the data.
             *
             * @param {Object} scenario - The scenario object to add.
             */
            addScenario: async (scenario) => {
                set({ loading: true });
                try {
                    await scenarioAPI.createScenario(scenario);
                    // Refresh data from backend
                    await get().loadScenarios();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Updates an existing scenario via API and refreshes the data.
             *
             * @param {string} scenarioId - The ID of the scenario to update.
             * @param {Object} updatedScenario - The updated scenario data.
             */
            updateScenario: async (scenarioId, updatedScenario) => {
                set({ loading: true });
                try {
                    await scenarioAPI.updateScenario(scenarioId, updatedScenario);
                    // Refresh data from backend
                    await get().loadScenarios();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Removes a scenario via API and refreshes the data.
             *
             * @param {string} scenarioId - The ID of the scenario to remove.
             */
            removeScenario: async (scenarioId) => {
                set({ loading: true });
                try {
                    await scenarioAPI.deleteScenario(scenarioId);
                    // Refresh data from backend
                    await get().loadScenarios();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Sets the active scenario.
             *
             * @param {number} scenarioId - The ID of the scenario to set as active.
             */
            setActiveScenario: (scenarioId) => {
                set({ activeScenarioId: scenarioId });
            },

            /**
             * Returns all scenarios.
             *
             * @returns {Array} List of scenarios.
             */
            getScenarios: () => {
                const { scenarios } = get();
                return Array.isArray(scenarios) ? scenarios : [];
            },

            /**
             * Returns the active scenario.
             *
             * @returns {Object|undefined} The active scenario object or undefined if not found.
             */
            getActiveScenario: () => {
                const { scenarios, activeScenarioId } = get();
                const scenariosArray = Array.isArray(scenarios) ? scenarios : [];
                return scenariosArray.find((scenario) => scenario.id === activeScenarioId);
            },

            /**
             * Returns a specific scenario by ID.
             *
             * @param {number} scenarioId - The ID of the scenario to find.
             * @returns {Object|undefined} The scenario object or undefined if not found.
             */
            getScenarioById: (scenarioId) => {
                const { scenarios } = get();
                const scenariosArray = Array.isArray(scenarios) ? scenarios : [];
                return scenariosArray.find((scenario) => scenario.id === scenarioId);
            },

            /**
             * Loads initiatives from the API and updates the store.
             */
            loadInitiatives: async () => {
                set({ loading: true });
                try {
                    const initiatives = await initiativeAPI.getInitiatives();

                    // Debug: verificar dados recebidos na store
                    // eslint-disable-next-line no-console
                    console.log('🏪 Store - Initiatives received from API:', initiatives);

                    // Store initiatives globally for easy access
                    set({
                        initiatives,
                        loading: false
                    });

                    // Debug: verificar estado final da store
                    // eslint-disable-next-line no-console
                    console.log('🏪 Store - Final initiatives state:', get().initiatives);

                    return initiatives;
                } catch (error) {
                    // eslint-disable-next-line no-console
                    console.error('🏪 Store - Error loading initiatives:', error);
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Adds an initiative via API and refreshes the data.
             *
             * @param {string} scenarioId - The ID of the scenario to add initiative to.
             * @param {Object} initiative - The initiative object to add.
             */
            addInitiativeToScenario: async (scenarioId, initiative) => {
                set({ loading: true });
                try {
                    const initiativeData = {
                        ...initiative,
                        scenarioId
                    };
                    await initiativeAPI.createInitiative(initiativeData);
                    // Refresh data from backend
                    await get().loadInitiatives();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Updates an existing initiative via API and refreshes the data.
             *
             * @param {string} initiativeId - The ID of the initiative to update.
             * @param {Object} updatedInitiative - The updated initiative object.
             */
            updateInitiativeInScenario: async (initiativeId, updatedInitiative) => {
                set({ loading: true });
                try {
                    await initiativeAPI.updateInitiative(initiativeId, updatedInitiative);
                    // Refresh data from backend
                    await get().loadInitiatives();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Removes an initiative via API and refreshes the data.
             *
             * @param {string} scenarioId - The ID of the scenario (not used in API but kept for compatibility).
             * @param {string} initiativeId - The ID of the initiative to remove.
             */
            removeInitiativeFromScenario: async (scenarioId, initiativeId) => {
                set({ loading: true });
                try {
                    await initiativeAPI.deleteInitiative(initiativeId);
                    // Refresh data from backend
                    await get().loadInitiatives();
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            /**
             * Gets all initiatives from the active scenario.
             *
             * @returns {Array} Array of initiatives from the active scenario.
             */
            getInitiatives: () => {
                const { initiatives, activeScenarioId } = get();
                if (!activeScenarioId) return [];
                // Filter initiatives by active scenario
                const initiativesArray = Array.isArray(initiatives) ? initiatives : [];
                return initiativesArray.filter(initiative => initiative.scenarioId === activeScenarioId);
            },

            /**
             * Gets all initiatives without scenario filtering.
             *
             * @returns {Array} Array of all initiatives.
             */
            getAllInitiatives: () => {
                const { initiatives } = get();
                return Array.isArray(initiatives) ? initiatives : [];
            },

            /**
             * Loads all required data for the decarbonization settings page.
             * This method will load reduction goals, projections, baseline emissions,
             * scenarios, and initiatives in parallel to cache all data upfront.
             */
            loadAllSettingsData: async () => {
                set({ loading: true });
                try {
                    // Execute all API calls in parallel for better performance
                    const promises = [
                        get().loadReductionGoals(),
                        get().loadProjectionParameters(),
                        get().loadEmissionsInventory(),
                        get().loadScenarios(),
                        get().loadInitiatives(),
                    ];

                    await Promise.allSettled(promises);

                    set({ loading: false });
                    return true;
                } catch (error) {
                    set({ loading: false });
                    throw error;
                }
            },

            // Future methods for other steps can be added here
            // For example:
            // setBaselineEmissions, updateProjections, addProject, etc.
        }),
        {
            name: 'decarbonization-settings-store',
            partialize: (state) => ({
                reductionGoals: state.reductionGoals,
                baselineEmissions: state.baselineEmissions,
                projections: state.projections,
                emissionsInventory: state.emissionsInventory,
                scenarios: state.scenarios,
                activeScenarioId: state.activeScenarioId,
                initiatives: state.initiatives,
                projects: state.projects,
                planReview: state.planReview,
            }),
        }
    )
);

export default useDecarbonizationSettingsStore;
