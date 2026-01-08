import { createContext, useContext } from 'react';

interface ModalStateContextValue {
  isAnyModalOpen: boolean;
  isContextMenuOpen: boolean;
}

export const ModalStateContext = createContext<ModalStateContextValue | null>(null);

export function useModalState() {
  const context = useContext(ModalStateContext);
  return context ?? { isAnyModalOpen: false, isContextMenuOpen: false };
}
