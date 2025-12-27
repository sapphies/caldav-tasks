import { useState, useEffect, useCallback } from 'react';

interface UseOfflineOptions {
  onOnline?: () => void;
  onOffline?: () => void;
}

export function useOffline(options: UseOfflineOptions = {}) {
  const [isOffline, setIsOffline] = useState(!navigator.onLine);

  const handleOnline = useCallback(() => {
    setIsOffline(false);
    options.onOnline?.();
  }, [options]);

  const handleOffline = useCallback(() => {
    setIsOffline(true);
    options.onOffline?.();
  }, [options]);

  useEffect(() => {
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [handleOnline, handleOffline]);

  return { isOffline };
}
