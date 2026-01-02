import { useEffect, useCallback, useMemo } from 'react';
import { useTaskStore } from '@/store/taskStore';
import { useSettingsStore, KeyboardShortcut } from '@/store/settingsStore';
import { getAltKeyLabel, getMetaKeyLabel, getModifierJoiner, getShiftKeyLabel } from '../utils/keyboard';
import { useConfirmTaskDelete } from '@/hooks/useConfirmTaskDelete';
import { useConfirmDialog } from '@/hooks/useConfirmDialog';
import { useModalState } from '@/context/modalStateContext';
import { getIsKeyboardDragging } from '@/lib/dragState';

interface UseKeyboardShortcutsOptions {
  onOpenSettings?: () => void;
  onSync?: () => void;
}

export function useKeyboardShortcuts(options: UseKeyboardShortcutsOptions = {}) {
  const { onOpenSettings, onSync } = options;
  const {
    addTask,
    setSearchQuery,
    selectedTaskId,
    toggleTaskComplete,
    setSelectedTask,
    setEditorOpen,
    getFilteredTasks,
    getSortedTasks,
  } = useTaskStore();
  const { keyboardShortcuts } = useSettingsStore();
  const { confirmAndDelete } = useConfirmTaskDelete();
  const { isOpen: isConfirmDialogOpen } = useConfirmDialog();
  const { isAnyModalOpen } = useModalState();

  const handleNewTask = useCallback(() => {
    const task = addTask({ title: '' });
    setSelectedTask(task.id);
  }, [addTask, setSelectedTask]);

  const handleSearch = useCallback(() => {
    const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
    searchInput?.focus();
  }, []);

  const handleDelete = useCallback(async () => {
    if (selectedTaskId) {
      await confirmAndDelete(selectedTaskId);
    }
  }, [selectedTaskId, confirmAndDelete]);

  const handleToggleComplete = useCallback(() => {
    if (selectedTaskId) {
      toggleTaskComplete(selectedTaskId);
    }
  }, [selectedTaskId, toggleTaskComplete]);

  const handleEscape = useCallback(() => {
    setSearchQuery('');
    setEditorOpen(false);
    const searchInput = document.querySelector<HTMLInputElement>('[data-search-input]');
    searchInput?.blur();
  }, [setSearchQuery, setEditorOpen]);

  const handleNavigateUp = useCallback(() => {
    const filteredTasks = getFilteredTasks();
    const sortedTasks = getSortedTasks(filteredTasks);
    
    if (sortedTasks.length === 0) return;
    
    if (!selectedTaskId) {
      setSelectedTask(sortedTasks[0].id);
      return;
    }
    
    const currentIndex = sortedTasks.findIndex((t) => t.id === selectedTaskId);
    if (currentIndex > 0) {
      setSelectedTask(sortedTasks[currentIndex - 1].id);
    }
  }, [selectedTaskId, getFilteredTasks, getSortedTasks, setSelectedTask]);

  const handleNavigateDown = useCallback(() => {
    const filteredTasks = getFilteredTasks();
    const sortedTasks = getSortedTasks(filteredTasks);
    
    if (sortedTasks.length === 0) return;
    
    if (!selectedTaskId) {
      setSelectedTask(sortedTasks[0].id);
      return;
    }
    
    const currentIndex = sortedTasks.findIndex((t) => t.id === selectedTaskId);
    if (currentIndex < sortedTasks.length - 1) {
      setSelectedTask(sortedTasks[currentIndex + 1].id);
    }
  }, [selectedTaskId, getFilteredTasks, getSortedTasks, setSelectedTask]);

  const handleOpenSettings = useCallback(() => {
    // If settings is already open, this will close it (toggle behavior)
    onOpenSettings?.();
  }, [onOpenSettings]);

  const handleSync = useCallback(() => {
    onSync?.();
  }, [onSync]);

  // Map shortcut IDs to their handler functions
  const actionHandlers: Record<string, () => void> = useMemo(() => ({
    'new-task': handleNewTask,
    'search': handleSearch,
    'settings': handleOpenSettings,
    'sync': handleSync,
    'delete': handleDelete,
    'toggle-complete': handleToggleComplete,
    'close': handleEscape,
    'nav-up': handleNavigateUp,
    'nav-down': handleNavigateDown,
  }), [handleNewTask, handleSearch, handleOpenSettings, handleSync, handleDelete, handleToggleComplete, handleEscape, handleNavigateUp, handleNavigateDown]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // if confirm dialog is open, let it consume keys (Esc/Enter) without triggering app shortcuts
      if (isConfirmDialogOpen) {
        if (e.key === 'Escape' || e.key === 'Enter') {
          e.preventDefault();
        }
        return;
      }

      // if keyboard dragging is in progress (via dnd-kit KeyboardSensor),
      // let dnd-kit handle all keyboard events (arrow keys, enter, escape)
      if (getIsKeyboardDragging()) {
        return;
      }
      
      // don't trigger shortcuts when typing in inputs
      const target = e.target as HTMLElement;
      const isInput = 
        target.tagName === 'INPUT' || 
        target.tagName === 'TEXTAREA' || 
        target.isContentEditable;

      // allow some shortcuts even in inputs
      // Escape: close editor/clear search
      // Cmd+Backspace: delete task (shouldn't conflict with text editing)
      const allowInInput = ['Escape'];
      const allowWithMetaInInput = ['Backspace']; // Cmd+Backspace for delete
      
      const isAllowedInInput = allowInInput.includes(e.key) || 
        (allowWithMetaInInput.includes(e.key) && (e.metaKey || e.ctrlKey));
      
      if (isInput && !isAllowedInInput) {
        return;
      }
      
      // Shortcuts that should NOT work when a modal is open
      // (except for 'settings' which toggles, and 'close' which closes modals)
      const blockedInModal = ['new-task', 'search', 'sync', 'delete', 'toggle-complete', 'nav-up', 'nav-down', 'nav-up-vim', 'nav-down-vim'];

      for (const shortcut of keyboardShortcuts) {
        const handler = actionHandlers[shortcut.id];
        if (!handler) continue;
        
        // Block certain shortcuts when a modal is open
        if (isAnyModalOpen && blockedInModal.includes(shortcut.id)) {
          continue;
        }

        const metaMatch = shortcut.meta ? (e.metaKey || e.ctrlKey) : true;
        const ctrlMatch = shortcut.ctrl ? e.ctrlKey : true;
        const shiftMatch = shortcut.shift ? e.shiftKey : !e.shiftKey;
        const altMatch = shortcut.alt ? e.altKey : !e.altKey;

        if (
          e.key.toLowerCase() === shortcut.key.toLowerCase() &&
          metaMatch &&
          ctrlMatch &&
          shiftMatch &&
          altMatch
        ) {
          // only match if modifier requirements are exactly met
          if (
            (shortcut.meta && (e.metaKey || e.ctrlKey)) ||
            (shortcut.ctrl && e.ctrlKey) ||
            (!shortcut.meta && !shortcut.ctrl)
          ) {
            e.preventDefault();
            handler();
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [keyboardShortcuts, actionHandlers, isConfirmDialogOpen, isAnyModalOpen]);

  return { shortcuts: keyboardShortcuts };
}

export function getShortcutDisplay(shortcut: KeyboardShortcut): string {
  const parts: string[] = [];

  if (shortcut.meta) {
    parts.push(getMetaKeyLabel());
  }
  if (shortcut.ctrl && !shortcut.meta) {
    parts.push('Ctrl');
  }
  if (shortcut.shift) {
    parts.push(getShiftKeyLabel());
  }
  if (shortcut.alt) {
    parts.push(getAltKeyLabel());
  }

  const keyDisplay = shortcut.key === ' ' ? 'Space' : shortcut.key.toUpperCase();
  parts.push(keyDisplay);

  return parts.join(getModifierJoiner());
}
