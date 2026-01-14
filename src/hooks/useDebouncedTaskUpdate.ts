import { useEffect, useRef, useState } from 'react';
import { useUpdateTask } from '@/hooks/queries';

/**
 * hook to debounce task field updates
 * provides local state that updates immediately, while database updates are debounced
 */
export function useDebouncedTaskUpdate<T>(
  taskId: string,
  fieldName: string,
  initialValue: T,
  debounceMs: number = 1000,
) {
  const updateTaskMutation = useUpdateTask();
  const [pendingValue, setPendingValue] = useState<T>(initialValue);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pendingValueRef = useRef(pendingValue);
  const initialValueRef = useRef(initialValue);

  // update refs when values change
  useEffect(() => {
    pendingValueRef.current = pendingValue;
    initialValueRef.current = initialValue;
  }, [pendingValue, initialValue]);

  // sync pending value when initial value changes (e.g., switching tasks)
  // biome-ignore lint/correctness/useExhaustiveDependencies: only want to reset on taskId or initialValue change
  useEffect(() => {
    setPendingValue(initialValue);
  }, [taskId, initialValue]);

  // update function that debounces the mutation
  const updateValue = (newValue: T) => {
    setPendingValue(newValue);

    // clear existing timeout
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    // set new timeout for debounced update
    timeoutRef.current = setTimeout(() => {
      updateTaskMutation.mutate({
        id: taskId,
        updates: { [fieldName]: newValue },
      });
    }, debounceMs);
  };

  // cleanup: flush pending changes on unmount
  // biome-ignore lint/correctness/useExhaustiveDependencies: cleanup only on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        // save any pending changes
        if (pendingValueRef.current !== initialValueRef.current) {
          updateTaskMutation.mutate({
            id: taskId,
            updates: { [fieldName]: pendingValueRef.current },
          });
        }
      }
    };
  }, []);

  return [pendingValue, updateValue] as const;
}
