import { useEffect } from 'react';
import { useTasks, useUIState, useAccounts } from '@/hooks/queries';
import { useSettingsStore } from '@/store/settingsStore';
import { updateMenuState, rebuildAppMenu } from '@/utils/menu';
import { loggers } from '@/lib/logger';

const log = loggers.app;

/**
 * hook to manage macOS app menu state synchronization
 */
export function useAppMenu() {
  const { data: accounts = [] } = useAccounts();
  const { data: tasks = [] } = useTasks();
  const { data: uiState } = useUIState();
  const { keyboardShortcuts } = useSettingsStore();

  // update menu state when accounts or tasks change
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    // only use menu-supported sort modes
    const menuSortMode:
      | 'manual'
      | 'smart'
      | 'due-date'
      | 'priority'
      | 'title'
      | 'created'
      | 'modified' = sortMode === 'start-date' ? 'manual' : sortMode;

    log.debug('Updating menu state with sortMode:', menuSortMode);
    updateMenuState({
      hasAccounts: accounts.length > 0,
      hasTasks: tasks.length > 0,
      showCompleted: uiState?.showCompletedTasks ?? true,
      sortMode: menuSortMode,
    });
  }, [accounts.length, tasks.length, uiState?.showCompletedTasks, uiState?.sortConfig?.mode]);

  // Rebuild menu when keyboard shortcuts change
  useEffect(() => {
    const sortMode = uiState?.sortConfig?.mode ?? 'manual';
    const menuSortMode:
      | 'manual'
      | 'smart'
      | 'due-date'
      | 'priority'
      | 'title'
      | 'created'
      | 'modified' = sortMode === 'start-date' ? 'manual' : sortMode;

    rebuildAppMenu({
      showCompleted: uiState?.showCompletedTasks ?? true,
      sortMode: menuSortMode,
      shortcuts: keyboardShortcuts,
    });
  }, [keyboardShortcuts, uiState?.showCompletedTasks, uiState?.sortConfig?.mode]);
}
