import { create } from 'zustand';
import apiClientV2 from '@/apis/apiClientV2';
import { useAuthStore } from '@/features/auth/shared/store/authStore';
import { useUIStore } from './uiStore';

const getHeaders = () => ({
    'cnpj': useAuthStore.getState().user.selectedCompany.cnpj.replace(/\D/g, ''),
    'year': useUIStore.getState().selectedYear,
});

export const useGlobalStore = create((set, get) => {
    const loadingState = {
        users: false,
        groups: false
    };

    return {
        users: [],
        groups: [],
        loading: loadingState,
        error: null,

        setLoading: (key, value) => {
            loadingState[key] = value;
            set({ loading: loadingState });
        },

        fetchUsers: async () => {
            if (loadingState.users) return get().users;

            try {
                get().setLoading('users', true);

                const { cnpj } = useAuthStore.getState().user.selectedCompany;
                const response = await apiClientV2.get('/api/v0/users/', {
                    headers: getHeaders(),
                    params: { cnpj }
                });

                const users = response.data.users?.map(user => ({
                    ...user,
                    department: user.department || user.kwargs?.department || '',
                    id: user.email,
                    value: user.email,
                    label: user.name
                })).filter(val => val.enabled) || [];

                set({ users, error: null });
                return users;
            } catch (error) {
                set({ error: error.message });
                return [];
            } finally {
                get().setLoading('users', false);
            }
        },

        fetchGroups: async () => {
            if (loadingState.groups) return get().groups;

            try {
                get().setLoading('groups', true);

                const response = await apiClientV2.get('/api/v0/general/company_and_groups/groups/', {
                    headers: getHeaders()
                });

                const groups = Object.entries(response.data || {}).map(([id, group]) => ({
                    ...group,
                    id,
                    value: id,
                    label: group.name,
                    enabeld: group.enabled
                })).filter(val => val.enabled) || [];

                set({ groups, error: null });
                return groups;
            } catch (error) {
                set({ error: error.message });
                return [];
            } finally {
                get().setLoading('groups', false);
            }
        },

        refreshAll: async () => {
            if (loadingState.users || loadingState.groups) return;

            await Promise.all([
                get().fetchUsers(),
                get().fetchGroups()
            ]);
        },

        clearData: () => {
            Object.keys(loadingState).forEach(key => {
                loadingState[key] = false;
            });

            set({
                users: [],
                groups: [],
                loading: loadingState,
                error: null
            });
        }
    };
});
