import { createContext } from 'react';

export interface ConfirmOptions {
  title?: string;
  subtitle?: string; // For displaying things like task name being deleted
  message?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  destructive?: boolean;
  // Optional third action for special cases (e.g., "Keep subtasks" when deleting)
  alternateLabel?: string;
  alternateDestructive?: boolean;
}

export type ConfirmResult = 'confirm' | 'alternate' | 'cancel';

export interface ConfirmDialogContextValue {
  confirm: (options?: ConfirmOptions) => Promise<boolean>;
  confirmWithAlternate: (options?: ConfirmOptions) => Promise<ConfirmResult>;
  isOpen: boolean;
}

export const ConfirmDialogContext = createContext<ConfirmDialogContextValue | null>(null);

export const defaultConfirmOptions: Required<Omit<ConfirmOptions, 'alternateLabel' | 'alternateDestructive' | 'subtitle'>> & Pick<ConfirmOptions, 'alternateLabel' | 'alternateDestructive' | 'subtitle'> = {
  title: 'Confirm action',
  subtitle: undefined,
  message: 'Are you sure you want to proceed?',
  confirmLabel: 'Confirm',
  cancelLabel: 'Cancel',
  destructive: false,
  alternateLabel: undefined,
  alternateDestructive: undefined,
};
