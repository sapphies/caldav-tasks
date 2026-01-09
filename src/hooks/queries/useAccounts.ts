/**
 * TanStack Query hooks for accounts and calendars
 */

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { queryKeys } from '@/lib/queryClient';
import * as taskData from '@/lib/taskData';
import type { Account, Calendar } from '@/types';

// ============================================================================
// Query Hooks
// ============================================================================

/**
 * Hook to get all accounts
 */
export function useAccounts() {
  const queryClient = useQueryClient();

  useEffect(() => {
    return taskData.subscribeToDataChanges(() => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    });
  }, [queryClient]);

  return useQuery({
    queryKey: queryKeys.accounts.all,
    queryFn: () => taskData.getAllAccounts(),
    staleTime: Infinity,
  });
}

/**
 * Hook to get a single account by ID
 */
export function useAccount(id: string | null) {
  const queryClient = useQueryClient();

  useEffect(() => {
    return taskData.subscribeToDataChanges(() => {
      if (id) {
        queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byId(id) });
      }
    });
  }, [queryClient, id]);

  return useQuery({
    queryKey: queryKeys.accounts.byId(id || ''),
    queryFn: () => (id ? taskData.getAccountById(id) : undefined),
    enabled: !!id,
    staleTime: Infinity,
  });
}

// ============================================================================
// Mutation Hooks
// ============================================================================

/**
 * Hook to create an account
 */
export function useCreateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (accountInput: Partial<Account>) => {
      return Promise.resolve(taskData.createAccount(accountInput));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}

/**
 * Hook to update an account
 */
export function useUpdateAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, updates }: { id: string; updates: Partial<Account> }) => {
      return Promise.resolve(taskData.updateAccount(id, updates));
    },
    onSuccess: (_, { id }) => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byId(id) });
    },
  });
}

/**
 * Hook to delete an account
 */
export function useDeleteAccount() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) => {
      taskData.deleteAccount(id);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.tasks.all });
    },
  });
}

/**
 * Hook to add a calendar to an account
 */
export function useAddCalendar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      accountId,
      calendarData,
    }: {
      accountId: string;
      calendarData: Partial<Calendar>;
    }) => {
      taskData.addCalendar(accountId, calendarData);
      return Promise.resolve();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.accounts.all });
    },
  });
}
