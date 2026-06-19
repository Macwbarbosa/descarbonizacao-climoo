/** Zustand */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';

/**
 * Zustand store for managing UI state, such as sidebar visibility.
 *
 * @function useUIStore
 * @returns {Object} Zustand store with UI state and actions.
 */
export const useUIStore = create(
    persist(
        (set) => ({
            sidebarCollapsed: false,
            selectedYear: new Date().getFullYear().toString(),
            esgFrameworkViewMode: 'stacked', // 'stacked' | 'modal'
            toggleSidebar: () => set((state) => ({
                sidebarCollapsed: !state.sidebarCollapsed
            })),
            setSelectedYear: (year) => set(() => ({
                selectedYear: year
            })),
            setEsgFrameworkViewMode: (mode) => set(() => ({
                esgFrameworkViewMode: mode,
            })),
        }),
        {
            name: 'ui-storage',
            partialize: (state) => ({
                sidebarCollapsed: state.sidebarCollapsed,
                selectedYear: state.selectedYear,
                esgFrameworkViewMode: state.esgFrameworkViewMode,
            }),
        }
    )
);
