import { useEffect } from 'react';
import { startPolling, stopPolling } from '../store';

export function useRemoteUpdates(intervalMs = 2000) {
  useEffect(() => {
    startPolling(intervalMs);
    return () => stopPolling();
  }, [intervalMs]);
}
