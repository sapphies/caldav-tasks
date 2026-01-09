import React from 'react';
import ReactDOM from 'react-dom/client';
import { QueryClientProvider } from '@tanstack/react-query';
import App from './App';
import './styles/index.css';
import { ConfirmDialogProvider } from '@/providers/ConfirmDialogProvider';
import { ModalStateProvider } from '@/providers/ModalStateProvider';
import { queryClient } from '@/lib/queryClient';
import { 
  initializeApp, 
  showWindow, 
  showBootstrapError, 
  forceShowWindow 
} from '@/lib/bootstrap';
import { createLogger } from '@/lib/logger';

const log = createLogger('Main', '#a855f7');

function renderApp() {
  ReactDOM.createRoot(document.getElementById('root') as HTMLElement).render(
    <React.StrictMode>
      <QueryClientProvider client={queryClient}>
        <ModalStateProvider>
          <ConfirmDialogProvider>
            <App />
          </ConfirmDialogProvider>
        </ModalStateProvider>
      </QueryClientProvider>
    </React.StrictMode>
  );
}

async function bootstrap(): Promise<void> {
  await initializeApp();
  renderApp();
  await showWindow();
}

await bootstrap().catch(error => {
  log.error('Failed to initialize app:', error);
  showBootstrapError(error);
  // still show window so user can see the error
  forceShowWindow();
});
