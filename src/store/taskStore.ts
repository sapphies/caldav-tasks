import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { v4 as uuidv4 } from 'uuid';
import {
  Task,
  Category,
  Account,
  Calendar,
  SortConfig,
  Priority,
  Subtask,
} from '@/types';
import { toAppleEpoch } from '@/lib/ical';
import { FlattenedTask } from '@/lib/treeUtils';

// represents a task pending deletion from the server
interface PendingDeletion {
  uid: string;
  href: string;
  accountId: string;
  calendarId: string;
}

interface TaskStore {
  // state
  tasks: Task[];
  categories: Category[];
  accounts: Account[];
  pendingDeletions: PendingDeletion[];
  activeAccountId: string | null;
  activeCalendarId: string | null;
  selectedTaskId: string | null;
  searchQuery: string;
  sortConfig: SortConfig;
  showCompletedTasks: boolean;
  isEditorOpen: boolean;

  // task actions
  addTask: (task: Partial<Task>) => Task;
  updateTask: (id: string, updates: Partial<Task>) => void;
  deleteTask: (id: string) => void;
  toggleTaskComplete: (id: string) => void;
  reorderTasks: (activeId: string, overId: string, flattenedItems: FlattenedTask[], targetIndent?: number) => void;
  setTaskParent: (taskId: string, parentUid: string | undefined) => void;
  addSubtask: (taskId: string, title: string) => void;
  updateSubtask: (taskId: string, subtaskId: string, updates: Partial<Subtask>) => void;
  deleteSubtask: (taskId: string, subtaskId: string) => void;
  toggleSubtaskComplete: (taskId: string, subtaskId: string) => void;
  clearPendingDeletion: (uid: string) => void;
  toggleTaskCollapsed: (id: string) => void;

  // category actions
  addCategory: (category: Partial<Category>) => Category;
  updateCategory: (id: string, updates: Partial<Category>) => void;
  deleteCategory: (id: string) => void;

  // account actions
  addAccount: (account: Partial<Account>) => Account;
  updateAccount: (id: string, updates: Partial<Account>) => void;
  deleteAccount: (id: string) => void;
  setActiveAccount: (id: string | null) => void;
  setActiveCalendar: (id: string | null) => void;
  addCalendar: (accountId: string, calendar: Partial<Calendar>) => void;

  // ui actions
  setSelectedTask: (id: string | null) => void;
  setSearchQuery: (query: string) => void;
  setSortConfig: (config: SortConfig) => void;
  setShowCompletedTasks: (show: boolean) => void;
  setEditorOpen: (open: boolean) => void;
  setAllTasksView: () => void;

  // export
  exportTaskAndChildren: (taskId: string) => { task: Task; descendants: Task[] } | null;
  getCalendarTasks: (calendarId: string) => Task[];

  // computed
  getFilteredTasks: () => Task[];
  getSortedTasks: (tasks: Task[]) => Task[];
  getChildTasks: (parentUid: string) => Task[];
  getTaskByUid: (uid: string) => Task | undefined;
  countChildren: (parentUid: string) => number;
}

const priorityOrder: Record<Priority, number> = {
  high: 0,
  medium: 1,
  low: 2,
  none: 3,
};

export const useTaskStore = create<TaskStore>()(
  persist(
    (set, get) => ({
      // initial state
      tasks: [],
      categories: [],
      accounts: [],
      pendingDeletions: [],
      activeAccountId: null,
      activeCalendarId: null,
      selectedTaskId: null,
      searchQuery: '',
      sortConfig: { mode: 'manual', direction: 'asc' },
      showCompletedTasks: true,
      isEditorOpen: false,

      // task actions
      addTask: (taskData) => {
        const now = new Date();
        const tasks = get().tasks;
        
        // calculate sort order using Apple epoch format
        // find the maximum sort order among existing tasks and add 1
        const maxSortOrder = tasks.length > 0 
          ? Math.max(...tasks.map(t => t.sortOrder)) 
          : toAppleEpoch(now.getTime()) - 1;

        const task: Task = {
          id: uuidv4(),
          uid: uuidv4(),
          title: taskData.title || 'New Task',
          description: taskData.description || '',
          completed: false,
          priority: taskData.priority || 'none',
          subtasks: taskData.subtasks || [],
          sortOrder: maxSortOrder + 1,
          accountId: taskData.accountId || get().activeAccountId || '',
          calendarId: taskData.calendarId || get().activeCalendarId || '',
          synced: false,
          createdAt: now,
          modifiedAt: now,
          ...taskData,
        };

        set((state) => ({ tasks: [...state.tasks, task] }));
        return task;
      },

      updateTask: (id, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? { 
                  ...task, 
                  ...updates, 
                  // only update modifiedAt if not provided in updates (local changes)
                  modifiedAt: updates.modifiedAt !== undefined ? updates.modifiedAt : new Date(), 
                  // only mark as unsynced if synced is not explicitly set in updates
                  synced: updates.synced !== undefined ? updates.synced : false,
                }
              : task
          ),
        }));
      },

      deleteTask: (id) => {
        const task = get().tasks.find(t => t.id === id);
        set((state) => {
          // if task has been synced to server (has href), track it for deletion
          const newPendingDeletions = task?.href 
            ? [...state.pendingDeletions, {
                uid: task.uid,
                href: task.href,
                accountId: task.accountId,
                calendarId: task.calendarId,
              }]
            : state.pendingDeletions;
          
          return {
            tasks: state.tasks.filter((t) => t.id !== id),
            pendingDeletions: newPendingDeletions,
            selectedTaskId: state.selectedTaskId === id ? null : state.selectedTaskId,
          };
        });
      },

      clearPendingDeletion: (uid) => {
        set((state) => ({
          pendingDeletions: state.pendingDeletions.filter(d => d.uid !== uid),
        }));
      },

      toggleTaskComplete: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  completed: !task.completed,
                  completedAt: !task.completed ? new Date() : undefined,
                  modifiedAt: new Date(),
                  synced: false,
                }
              : task
          ),
        }));
      },

      reorderTasks: (activeId, overId, flattenedItems, targetIndent) => {
        const tasks = get().tasks;
        const activeTask = tasks.find((t) => t.id === activeId);
        const overTask = tasks.find((t) => t.id === overId);

        if (!activeTask || !overTask) return;

        const activeIndex = flattenedItems.findIndex(t => t.id === activeId);
        const overIndex = flattenedItems.findIndex(t => t.id === overId);
        
        if (activeIndex === -1 || overIndex === -1) return;

        const overItem = flattenedItems[overIndex];
        
        // prevent dropping into own descendants
        if (overItem.ancestorIds.includes(activeId)) {
          return;
        }

        // determine the effective indent level
        const effectiveIndent = targetIndent ?? overItem.depth;
        
        // find the new parent based on the target indent
        let newParentUid: string | undefined = undefined;
        
        if (effectiveIndent > 0) {
          // we need to find a parent task at depth = effectiveIndent - 1
          // look backwards from the position we're going to (or current position if not moving)
          
          // start searching from the appropriate position
          // if moving down, the "above" task after reorder is at overIndex
          // if moving up or staying, the "above" task is at overIndex - 1 (or activeIndex - 1)
          let searchStart = activeIndex === overIndex 
            ? activeIndex - 1 
            : (activeIndex < overIndex ? overIndex : overIndex - 1);
          
          for (let i = searchStart; i >= 0; i--) {
            const candidate = flattenedItems[i];
            // skip the task being dragged
            if (candidate.id === activeId) continue;
            
            // parent should be at exactly one level shallower than our target
            if (candidate.depth === effectiveIndent - 1) {
              newParentUid = candidate.uid;
              break;
            }
            
            // if we hit a task shallower than needed, use it if possible
            if (candidate.depth < effectiveIndent - 1) {
              // we can't go this deep at this position - should not happen if bounds are correct
              // but as fallback, we can still look for a valid parent
              break;
            }
          }
          
          // fallback: if we didn't find an exact parent, find the nearest valid one
          if (!newParentUid && effectiveIndent > 0) {
            for (let i = (activeIndex === overIndex ? activeIndex : overIndex) - 1; i >= 0; i--) {
              const candidate = flattenedItems[i];
              if (candidate.id === activeId) continue;
              
              // find the first task that could be our parent (shallower than us)
              if (candidate.depth < effectiveIndent) {
                newParentUid = candidate.uid;
                break;
              }
            }
          }
        }
        // if effectiveIndent is 0, newParentUid stays undefined (root level)

        // get all current siblings at the target parent level (excluding the task being moved)
        const siblings = tasks.filter(t => t.parentUid === newParentUid && t.id !== activeId);
        const sortedSiblings = get().getSortedTasks(siblings);
        
        // determine where to insert among siblings
        let insertIndex = 0;
        
        // if we're changing parent (not just reordering among siblings), 
        // find the right position based on the visual location
        if (activeTask.parentUid !== newParentUid || activeId === overId) {
          // find the sibling that appears before us in the flat list
          for (let i = overIndex - 1; i >= 0; i--) {
            const item = flattenedItems[i];
            if (item.id === activeId) continue;
            
            if (item.parentUid === newParentUid) {
              const siblingIndex = sortedSiblings.findIndex(s => s.id === item.id);
              if (siblingIndex !== -1) {
                insertIndex = siblingIndex + 1;
                break;
              }
            }
            
            // if we've passed the parent, insert at beginning
            if (item.uid === newParentUid) {
              insertIndex = 0;
              break;
            }
          }
        } else {
          // same parent, just reordering
          const overSiblingIndex = sortedSiblings.findIndex(s => s.id === overId);
          if (overSiblingIndex !== -1) {
            insertIndex = activeIndex < overIndex ? overSiblingIndex + 1 : overSiblingIndex;
          }
        }

        // build new order with active task inserted at the right position
        const newOrder = [...sortedSiblings];
        newOrder.splice(Math.min(insertIndex, newOrder.length), 0, activeTask);
        
        // assign sort orders with consistent gaps
        const updates: Map<string, { sortOrder: number; parentUid: string | undefined }> = new Map();
        
        newOrder.forEach((task, index) => {
          const newSortOrder = (index + 1) * 100;
          updates.set(task.id, {
            sortOrder: newSortOrder,
            parentUid: task.id === activeId ? newParentUid : task.parentUid,
          });
        });

        // apply all updates
        set((state) => ({
          tasks: state.tasks.map((task) => {
            const update = updates.get(task.id);
            if (update) {
              return { 
                ...task, 
                sortOrder: update.sortOrder,
                parentUid: update.parentUid,
                synced: false,
                modifiedAt: new Date(),
              };
            }
            return task;
          }),
        }));
      },

      setTaskParent: (taskId, parentUid) => {
        const tasks = get().tasks;
        const task = tasks.find(t => t.id === taskId);
        if (!task) return;
        
        // prevent circular references
        if (parentUid) {
          const isDescendant = (checkUid: string): boolean => {
            const parent = tasks.find(t => t.uid === checkUid);
            if (!parent) return false;
            if (parent.id === taskId) return true;
            return parent.parentUid ? isDescendant(parent.parentUid) : false;
          };
          if (isDescendant(parentUid)) return;
        }
        
        // calculate new sort order based on siblings
        let newSortOrder = task.sortOrder;
        if (parentUid) {
          const siblings = get().getChildTasks(parentUid);
          if (siblings.length > 0) {
            newSortOrder = Math.max(...siblings.map(t => t.sortOrder)) + 1;
          }
        }
        
        set((state) => ({
          tasks: state.tasks.map((t) =>
            t.id === taskId
              ? {
                  ...t,
                  parentUid,
                  sortOrder: newSortOrder,
                  modifiedAt: new Date(),
                  synced: false,
                }
              : t
          ),
        }));
      },

      addSubtask: (taskId, title) => {
        const subtask: Subtask = {
          id: uuidv4(),
          title,
          completed: false,
        };

        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: [...task.subtasks, subtask],
                  modifiedAt: new Date(),
                  synced: false,
                }
              : task
          ),
        }));
      },

      updateSubtask: (taskId, subtaskId, updates) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: task.subtasks.map((st) =>
                    st.id === subtaskId ? { ...st, ...updates } : st
                  ),
                  modifiedAt: new Date(),
                  synced: false,
                }
              : task
          ),
        }));
      },

      deleteSubtask: (taskId, subtaskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: task.subtasks.filter((st) => st.id !== subtaskId),
                  modifiedAt: new Date(),
                  synced: false,
                }
              : task
          ),
        }));
      },

      toggleSubtaskComplete: (taskId, subtaskId) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === taskId
              ? {
                  ...task,
                  subtasks: task.subtasks.map((st) =>
                    st.id === subtaskId ? { ...st, completed: !st.completed } : st
                  ),
                  modifiedAt: new Date(),
                  synced: false,
                }
              : task
          ),
        }));
      },

      toggleTaskCollapsed: (id) => {
        set((state) => ({
          tasks: state.tasks.map((task) =>
            task.id === id
              ? {
                  ...task,
                  isCollapsed: !task.isCollapsed,
                  modifiedAt: new Date(),
                  synced: false,
                }
              : task
          ),
        }));
      },

      // category actions
      addCategory: (categoryData) => {
        const category: Category = {
          id: uuidv4(),
          title: categoryData.title || 'New Category',
          color: categoryData.color || '#3b82f6',
          accountId: categoryData.accountId || get().activeAccountId || '',
        };

        set((state) => ({ categories: [...state.categories, category] }));
        return category;
      },

      updateCategory: (id, updates) => {
        set((state) => ({
          categories: state.categories.map((cat) =>
            cat.id === id ? { ...cat, ...updates } : cat
          ),
        }));
      },

      deleteCategory: (id) => {
        set((state) => ({
          categories: state.categories.filter((cat) => cat.id !== id),
          tasks: state.tasks.map((task) =>
            task.categoryId === id ? { ...task, categoryId: undefined } : task
          ),
        }));
      },

      // account actions
      addAccount: (accountData) => {
        const account: Account = {
          id: accountData.id || uuidv4(),
          name: accountData.name || 'New Account',
          serverUrl: accountData.serverUrl || '',
          username: accountData.username || '',
          password: accountData.password || '',
          serverType: accountData.serverType,
          calendars: [],
          isActive: true,
        };

        set((state) => ({ 
          accounts: [...state.accounts, account],
          activeAccountId: state.activeAccountId || account.id,
        }));
        return account;
      },

      updateAccount: (id, updates) => {
        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === id ? { ...acc, ...updates } : acc
          ),
        }));
      },

      deleteAccount: (id) => {
        set((state) => {
          const newAccounts = state.accounts.filter((acc) => acc.id !== id);
          return {
            accounts: newAccounts,
            activeAccountId:
              state.activeAccountId === id
                ? newAccounts[0]?.id || null
                : state.activeAccountId,
            tasks: state.tasks.filter((task) => task.accountId !== id),
            categories: state.categories.filter((cat) => cat.accountId !== id),
          };
        });
      },

      setActiveAccount: (id) => {
        set({ activeAccountId: id, activeCalendarId: null });
      },

      setActiveCalendar: (id) => {
        set({ activeCalendarId: id });
      },

      addCalendar: (accountId, calendarData) => {
        // spread calendarData first so our explicit fields take precedence
        const calendar: Calendar = {
          ...calendarData,
          id: calendarData.id || uuidv4(), // Preserve existing ID (URL) if provided
          displayName: calendarData.displayName || 'Tasks',
          url: calendarData.url || '',
          accountId,
        };

        console.log(`[Store] Adding calendar: ${calendar.displayName} with ID: ${calendar.id}`);

        set((state) => ({
          accounts: state.accounts.map((acc) =>
            acc.id === accountId
              ? { ...acc, calendars: [...acc.calendars, calendar] }
              : acc
          ),
          activeCalendarId: state.activeCalendarId || calendar.id,
        }));
      },

      // UI actions
      setSelectedTask: (id) => {
        set({ selectedTaskId: id, isEditorOpen: id !== null });
      },

      setSearchQuery: (query) => {
        set({ searchQuery: query });
      },

      setSortConfig: (config) => {
        set({ sortConfig: config });
      },

      setShowCompletedTasks: (show) => {
        set({ showCompletedTasks: show });
      },

      setEditorOpen: (open) => {
        set({ isEditorOpen: open });
        if (!open) set({ selectedTaskId: null });
      },

      setAllTasksView: () => {
        set({ activeCalendarId: null });
      },

      // export actions
      exportTaskAndChildren: (taskId: string) => {
        const { tasks } = get();
        const task = tasks.find(t => t.id === taskId);
        if (!task) return null;
        
        // get all child tasks recursively
        const getDescendants = (parentUid: string): Task[] => {
          const children = tasks.filter(t => t.parentUid === parentUid);
          return [
            ...children,
            ...children.flatMap(child => getDescendants(child.uid)),
          ];
        };
        
        const descendants = getDescendants(task.uid);
        return { task, descendants };
      },

      getCalendarTasks: (calendarId: string) => {
        const { tasks } = get();
        return tasks.filter(t => t.calendarId === calendarId);
      },

      // computed helpers
      getFilteredTasks: () => {
        const { tasks, searchQuery, showCompletedTasks, activeCalendarId } = get();

        return tasks.filter((task) => {
          // filter by calendar (null means "All Tasks" view - show all)
          if (activeCalendarId !== null && task.calendarId !== activeCalendarId) {
            return false;
          }

          // filter by completion status
          if (!showCompletedTasks && task.completed) {
            return false;
          }

          // filter by search query
          if (searchQuery) {
            const query = searchQuery.toLowerCase();
            return (
              task.title.toLowerCase().includes(query) ||
              task.description.toLowerCase().includes(query) ||
              task.subtasks.some((st) => st.title.toLowerCase().includes(query))
            );
          }

          return true;
        });
      },

      getSortedTasks: (tasks) => {
        const { sortConfig } = get();
        const { mode, direction } = sortConfig;
        const multiplier = direction === 'asc' ? 1 : -1;

        return [...tasks].sort((a, b) => {
          switch (mode) {
            case 'manual':
            case 'smart':
              return (a.sortOrder - b.sortOrder) * multiplier;

            case 'due-date':
              if (!a.dueDate && !b.dueDate) return 0;
              if (!a.dueDate) return 1;
              if (!b.dueDate) return -1;
              return (
                (new Date(a.dueDate).getTime() - new Date(b.dueDate).getTime()) *
                multiplier
              );

            case 'start-date':
              if (!a.startDate && !b.startDate) return 0;
              if (!a.startDate) return 1;
              if (!b.startDate) return -1;
              return (
                (new Date(a.startDate).getTime() -
                  new Date(b.startDate).getTime()) *
                multiplier
              );

            case 'priority':
              return (
                (priorityOrder[a.priority] - priorityOrder[b.priority]) *
                multiplier
              );

            case 'title':
              return a.title.localeCompare(b.title) * multiplier;

            case 'modified':
              return (
                (new Date(b.modifiedAt).getTime() -
                  new Date(a.modifiedAt).getTime()) *
                multiplier
              );

            case 'created':
              return (
                (new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()) *
                multiplier
              );

            default:
              return 0;
          }
        });
      },

      getChildTasks: (parentUid) => {
        const { tasks } = get();
        return tasks.filter((task) => task.parentUid === parentUid);
      },

      getTaskByUid: (uid) => {
        const { tasks } = get();
        return tasks.find((task) => task.uid === uid);
      },

      countChildren: (parentUid) => {
        const { tasks } = get();
        return tasks.filter((task) => task.parentUid === parentUid).length;
      },
    }),
    {
      name: 'caldav-tasks-storage',
      partialize: (state) => ({
        tasks: state.tasks,
        categories: state.categories,
        accounts: state.accounts,
        pendingDeletions: state.pendingDeletions,
        activeAccountId: state.activeAccountId,
        activeCalendarId: state.activeCalendarId,
        sortConfig: state.sortConfig,
        showCompletedTasks: state.showCompletedTasks,
      }),
    }
  )
);
