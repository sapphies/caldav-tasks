import { useEffect, useContext } from 'react';
import { ConfirmDialogContext } from '@/context/confirmDialogContext';

/**
 * Hook to close a modal when the Escape key is pressed
 * Won't trigger if a confirm dialog is open (to allow proper nesting)
 * @param onClose - Callback to execute when Escape is pressed
 */
export function useModalEscapeKey(onClose: () => void) {
  const confirmDialogContext = useContext(ConfirmDialogContext);
  
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        // Don't handle if a confirm dialog is open - let it handle the escape
        if (confirmDialogContext?.isOpen) {
          return;
        }
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc, { capture: true });
    return () => window.removeEventListener('keydown', handleEsc, { capture: true } as EventListenerOptions);
  }, [onClose, confirmDialogContext?.isOpen]);
}
