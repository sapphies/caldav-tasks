import { useState, useCallback, useRef } from 'react';
import { useMenuEvents } from './useMenuEvents';
import { useCreateTask, useSetSelectedTask, useAccounts, useSetShowCompletedTasks, useSetSortConfig } from './queries';
import type { SortMode } from '@/types';

export function useMenuHandlers() {
  const [showSettings, setShowSettings] = useState(false);
  const [settingsInitialTab, setSettingsInitialTab] = useState<{ 
    category?: 'general' | 'account' | 'about'; 
    subtab?: string 
  }>({});
  const [showImport, setShowImport] = useState(false);
  const [showExport, setShowExport] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showCreateCalendar, setShowCreateCalendar] = useState(false);

  const createTaskMutation = useCreateTask();
  const setSelectedTaskMutation = useSetSelectedTask();
  const { data: accounts = [] } = useAccounts();
  const setShowCompletedMutation = useSetShowCompletedTasks();
  const setSortConfigMutation = useSetSortConfig();

  // Separate refs for each callback to avoid object reference changes
  const onNewTaskRef = useRef<(() => void) | null>(null);
  const onOpenSettingsRef = useRef<(() => void) | null>(null);
  const onOpenImportRef = useRef<(() => void) | null>(null);
  const onOpenExportRef = useRef<(() => void) | null>(null);
  const onOpenAccountRef = useRef<(() => void) | null>(null);
  const onOpenCreateCalendarRef = useRef<(() => void) | null>(null);
  const onSearchRef = useRef<(() => void) | null>(null);
  const onOpenAboutRef = useRef<(() => void) | null>(null);
  const onOpenKeyboardShortcutsRef = useRef<(() => void) | null>(null);
  const onToggleCompletedRef = useRef<((currentValue: boolean) => void) | null>(null);
  const onSetSortModeRef = useRef<((mode: SortMode, currentMode: SortMode, currentDirection: 'asc' | 'desc') => void) | null>(null);

  const handleNewTask = useCallback(() => {
    createTaskMutation.mutate({ title: '' }, {
      onSuccess: (task) => {
        setSelectedTaskMutation.mutate(task.id);
      }
    });
  }, [createTaskMutation, setSelectedTaskMutation]);

  const handleOpenSettings = useCallback(() => {
    setSettingsInitialTab({});
    setShowSettings(true);
  }, []);

  const handleOpenImport = useCallback(() => {
    setShowImport(true);
  }, []);

  const handleOpenExport = useCallback(() => {
    setShowExport(true);
  }, []);

  const handleOpenAccount = useCallback(() => {
    setShowAccountModal(true);
  }, []);

  const handleOpenCreateCalendar = useCallback(() => {
    if (accounts.length > 0) {
      setShowCreateCalendar(true);
    }
  }, [accounts.length]);

  const handleSearch = useCallback(() => {
    const searchInput = document.querySelector('[data-search-input]') as HTMLInputElement;
    if (searchInput) {
      // Toggle focus: if already focused, blur it; otherwise focus and select
      if (document.activeElement === searchInput) {
        searchInput.blur();
      } else {
        searchInput.focus();
        searchInput.select();
      }
    }
  }, []);

  const handleOpenAbout = useCallback(() => {
    setSettingsInitialTab({ category: 'about', subtab: 'version' });
    setShowSettings(true);
  }, []);

  const handleOpenKeyboardShortcuts = useCallback(() => {
    setSettingsInitialTab({ category: 'general', subtab: 'shortcuts' });
    setShowSettings(true);
  }, []);

  const handleToggleCompleted = useCallback((currentValue: boolean) => {
    setShowCompletedMutation.mutate(!currentValue);
  }, [setShowCompletedMutation]);

  const handleSetSortMode = useCallback((mode: SortMode, _currentMode: SortMode, currentDirection: 'asc' | 'desc') => {
    setSortConfigMutation.mutate({ mode, direction: currentDirection });
  }, [setSortConfigMutation]);

  // Update refs with latest callbacks
  onNewTaskRef.current = handleNewTask;
  onOpenSettingsRef.current = handleOpenSettings;
  onOpenImportRef.current = handleOpenImport;
  onOpenExportRef.current = handleOpenExport;
  onOpenAccountRef.current = handleOpenAccount;
  onOpenCreateCalendarRef.current = handleOpenCreateCalendar;
  onSearchRef.current = handleSearch;
  onOpenAboutRef.current = handleOpenAbout;
  onOpenKeyboardShortcutsRef.current = handleOpenKeyboardShortcuts;
  onToggleCompletedRef.current = handleToggleCompleted;
  onSetSortModeRef.current = handleSetSortMode;

  // Wire up menu events using refs
  useMenuEvents({
    onNewTask: onNewTaskRef,
    onOpenSettings: onOpenSettingsRef,
    onOpenImport: onOpenImportRef,
    onOpenExport: onOpenExportRef,
    onOpenAccount: onOpenAccountRef,
    onOpenCreateCalendar: onOpenCreateCalendarRef,
    onSearch: onSearchRef,
    onOpenAbout: onOpenAboutRef,
    onOpenKeyboardShortcuts: onOpenKeyboardShortcutsRef,
    onToggleCompleted: onToggleCompletedRef,
    onSetSortMode: onSetSortModeRef,
  });

  return {
    // Modal visibility state
    showSettings,
    showImport,
    showExport,
    showAccountModal,
    showCreateCalendar,
    settingsInitialTab,
    
    // Modal controls
    setShowSettings,
    setShowImport,
    setShowExport,
    setShowAccountModal,
    setShowCreateCalendar,
    setSettingsInitialTab,
    
    // Handlers
    handleOpenSettings,
  };
}
