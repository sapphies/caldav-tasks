import { useEffect } from 'react';

/**
 * Hook to close a modal when the Escape key is pressed
 * @param onClose - Callback to execute when Escape is pressed
 */
export function useModalEscapeKey(onClose: () => void) {
  useEffect(() => {
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleEsc);
    return () => window.removeEventListener('keydown', handleEsc);
  }, [onClose]);
}
