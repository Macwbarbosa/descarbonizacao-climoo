import apiClientV2 from '@apis/apiClientV2';
import { useUIStore } from '@/store/uiStore';
import { useAuthStore } from '@/features/auth/shared/store/authStore';

const getSelectedYear = () => useUIStore.getState().selectedYear;
const getSelectedCompany = () => useAuthStore.getState().user.selectedCompany;

export const fetchEmissionsData = async () => {
    try {
        const monthOrder = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
        const response = await apiClientV2.get('/api/v0/results/', {
            params: {
                kind_task: 'results',
                limit: 100000,
                offset: 0
            },
            headers: {
                'cnpj': getSelectedCompany().cnpj.replace(/\D/g, ''),
                'year': getSelectedYear(),
                'user_id': 'UHGftHZvdOejXSa4FvEsOUED6Yt2'
            }
        });

        const data = Object.entries(response.data).map(([key, value]) => ({
            id: key,
            group: value.group,
            scope: value.scope,
            category: value.category,
            month: value.period.toLowerCase(),
            summary: value.summary,
            CO2: value.CO2,
            CH4: value.CH4,
            N2O: value.N2O,
            tCO2e: value.tCO2e,
            CO2b: value.CO2b,
            subtask_id: value.subtask_id
        }));

        return data
            .sort((a, b) => {
                const summaryComparison = b.summary.localeCompare(a.summary);
                if (summaryComparison !== 0) {
                    return summaryComparison;
                }
                return monthOrder.indexOf(a.month) - monthOrder.indexOf(b.month);
            });
    } catch (error) {
        console.error('Error fetching emissions data:', error);
        throw error;
    }
};

export const getGroups = async () => {
    try {
        const response = await apiClientV2.get('/api/v0/general/company_and_groups/groups/', {
            headers: {
                'cnpj': getSelectedCompany().cnpj.replace(/\D/g, ''),
                'year': getSelectedYear(),
            }
        });

        if (!response.data || Object.keys(response.data).length === 0) {
            return [];
        }

        return Object.entries(response.data).map(([id, group]) => ({
            id,
            ...group
        }));

    } catch (error) {
        console.error('Error fetching groups:', error);
        return [];
    }
};

export const fetchTasksWithStatus = async () => {
    try {
        const user = useAuthStore.getState().user;
        const response = await apiClientV2.get('/api/v0/tasks/task/', {
            params: {
                variables: 'id,summary',
                get_subtasks: true,
                variables_subtask: 'task_id,id,extraConfig,status',
                limit: 10000,
                offset: 0
            },
            headers: {
                'cnpj': getSelectedCompany().cnpj.replace(/\D/g, ''),
                'year': getSelectedYear(),
                'user_id': user.uid
            }
        });

        // Processar dados para criar um mapa de subtask_id -> status info
        const statusMap = {};

        Object.values(response.data).forEach(task => {
            if (task.subTasks && task.subTasks.length > 0) {
                task.subTasks.forEach(subtask => {
                    statusMap[subtask.id] = {
                        subtaskStatus: subtask.status,
                        extraConfig: subtask.extraConfig || {}
                    };
                });
            }
        });

        return statusMap;
    } catch (error) {
        console.error('Error fetching task status:', error);
        return {};
    }
};