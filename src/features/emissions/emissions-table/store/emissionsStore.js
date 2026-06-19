import { create } from 'zustand';
import { fetchEmissionsData, getGroups, fetchTasksWithStatus } from '../services/emissionsAPI';

export const useEmissionsStore = create((set, get) => ({
    emissions: [],
    filteredEmissions: [],
    groups: [],
    statusMap: {},
    loading: false,
    error: null,
    searchTerm: '',
    filters: {},

    setSearchTerm: (term) => {
        set({ searchTerm: term });
        get().applyFilters();
    },

    setFilters: (newFilters) => {
        set({ filters: newFilters });
        get().applyFilters();
    },

    applyFilters: () => {
        const { emissions, searchTerm, filters } = get();

        const filteredData = emissions.filter(item => {
            if (searchTerm) {
                const searchFields = ['summary', 'category', 'group', 'subtask_id'];
                const matchesSearch = searchFields.some(field =>
                    item[field]?.toLowerCase().includes(searchTerm.toLowerCase())
                );
                if (!matchesSearch) return false;
            }

            return Object.entries(filters).every(([key, value]) => {
                if (!value) return true;
                if (key === 'month') {
                    return item.month === value;
                }
                return item[key] === value;
            });
        });

        set({ filteredEmissions: filteredData });
    },

    fetchEmissions: async (showLoading = true) => {
        if (showLoading) {
            set({ loading: true });
        }
        try {
            const [data, statusData] = await Promise.all([
                fetchEmissionsData(),
                fetchTasksWithStatus()
            ]);
            set({
                emissions: data,
                filteredEmissions: data,
                statusMap: statusData,
                loading: false
            });
        } catch (error) {
            set({ error, loading: false });
        }
    },

    fetchGroups: async () => {
        set({ loading: true });
        try {
            const data = await getGroups();
            // Filtrar apenas grupos habilitados
            const enabledGroups = data.filter(group => group.enabled);
            set({
                groups: enabledGroups,
                // loading: false
            });
        } catch (error) {
            set({ error, loading: false });
        }
    },

    updateSubtaskStatus: (subtaskId, newStatus, monthStatusUpdates = null) => {
        const { statusMap } = get();
        const updatedStatusMap = { ...statusMap };

        if (updatedStatusMap[subtaskId]) {
            // Atualizar status da subtask
            updatedStatusMap[subtaskId] = {
                ...updatedStatusMap[subtaskId],
                subtaskStatus: newStatus
            };

            // Se houver atualizações de status mensal
            if (monthStatusUpdates) {
                updatedStatusMap[subtaskId].extraConfig = {
                    ...updatedStatusMap[subtaskId].extraConfig,
                    ...monthStatusUpdates
                };
            }
        }

        set({ statusMap: updatedStatusMap });
    },

    updateMonthStatus: (subtaskId, month, newStatus) => {
        const { statusMap } = get();
        const updatedStatusMap = { ...statusMap };

        if (updatedStatusMap[subtaskId]) {
            const statusKey = `status_${month}`;
            updatedStatusMap[subtaskId] = {
                ...updatedStatusMap[subtaskId],
                extraConfig: {
                    ...updatedStatusMap[subtaskId].extraConfig,
                    [statusKey]: newStatus
                }
            };
        }

        set({ statusMap: updatedStatusMap });
    },
}));