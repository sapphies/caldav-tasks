import { ReactNode, useEffect, useState, useMemo } from 'react';
import { ModalStateContext } from '@/context/modalStateContext';

// This provider tracks modal state and manages hover state resets
export function ModalStateProvider({ children }: { children: ReactNode }) {
  const [isAnyModalOpen, setIsAnyModalOpen] = useState(false);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);

  useEffect(() => {
    // Observer to detect modal elements being added/removed
    const observer = new MutationObserver(() => {
      // Check for modal backdrop elements
      const modals = document.querySelectorAll('[role="dialog"], .fixed.inset-0.z-50, .fixed.inset-0.z-\\[60\\]');
      const hasOpenModal = modals.length > 0;

      // Check for context menu elements
      const contextMenus = document.querySelectorAll('[data-context-menu-content]');
      const hasContextMenu = contextMenus.length > 0;
      setIsContextMenuOpen(hasContextMenu);

      setIsAnyModalOpen((prev) => {
        if (hasOpenModal && !prev) {
          // Modal opening - set data attribute for CSS
          document.documentElement.setAttribute('data-modal-open', 'true');
          
          // Blur active element to remove focus ring
          if (document.activeElement instanceof HTMLElement) {
            document.activeElement.blur();
          }
        } else if (!hasOpenModal && prev) {
          // Modal closing - remove data attribute
          document.documentElement.removeAttribute('data-modal-open');
        }
        
        return hasOpenModal;
      });
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
    });

    return () => {
      observer.disconnect();
      document.documentElement.removeAttribute('data-modal-open');
    };
  }, []);

  const value = useMemo(() => ({ isAnyModalOpen, isContextMenuOpen }), [isAnyModalOpen, isContextMenuOpen]);

  return (
    <ModalStateContext.Provider value={value}>
      {children}
    </ModalStateContext.Provider>
  );
}
