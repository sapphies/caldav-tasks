import { useState, useCallback } from 'react';
import { useGlobalContextMenuClose } from './useGlobalContextMenu';

/**
 * Hook for managing context menu state and handlers
 * @returns Object with contextMenu state, handlers, and setter
 */
export function useContextMenu() {
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number } | null>(null);

  const handleContextMenu = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    document.dispatchEvent(new CustomEvent('closeAllContextMenus'));
    setContextMenu({ x: e.clientX, y: e.clientY });
  };

  const handleCloseContextMenu = useCallback(() => {
    setContextMenu(null);
  }, []);

  useGlobalContextMenuClose(handleCloseContextMenu, contextMenu !== null);

  return { contextMenu, handleContextMenu, handleCloseContextMenu, setContextMenu };
}
