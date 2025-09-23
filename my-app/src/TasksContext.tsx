import React, { createContext, useContext, useState, ReactNode ,useCallback} from 'react';
import { ITask,TaskResponse } from './Interfaces';

interface TaskContextType {
  tasksByDate: Record<string, ITask[]>;
  addTask: (date: string, task: ITask) => void;
  createTask: (task: Omit<ITask, 'id'>) => Promise<ITask>;
  deleteTask: (date: string, id: number) => Promise<void>
  getTasks: (date: string) => ITask[];
  getTasksByDate: () => Record<string, ITask[]>;
  fetchTasksForDate: (date: string) => Promise<ITask[]>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasksByDate, setTasksByDate] = useState<Record<string, ITask[]>>({});

  const apiBaseUrl = (process.env.REACT_APP_API_BASE_URL ?? '').replace(/\/$/, '');

  const getCookie = useCallback((name: string): string | null => {
    const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
    return match ? decodeURIComponent(match[2]) : null;
  }, []);
  
  const addTask = useCallback((date: string, task: ITask) => {
    setTasksByDate(prev => {
      const list = prev[date] || [];
      return { ...prev, [date]: [...list, task] };
    });
  }, []);

  const createTask = useCallback(
    async (task: Omit<ITask, 'id'>) => {
      const endpoint = `${apiBaseUrl}/tasks/addTask`;
      const userEmail = getCookie('userEmail');

      const payload = {
        ...task,
        id: Date.now(),
        user_email: userEmail,
      };

      try {
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify(payload),
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const savedTask = (await response.json()) as TaskResponse;
        const newTask: ITask = {
          id: savedTask.id,
          description: savedTask.description,
          date: savedTask.date,
          time: savedTask.time,
        };

        addTask(task.date, newTask);

        return newTask;
      } catch (error) {
        console.error('Failed to save task', error);
        throw error;
      }
    },
    [addTask, apiBaseUrl, getCookie],
  );


  const deleteTask = useCallback(
    async (date: string, task_id: number) => {
      
      const query = new URLSearchParams({ task_id: task_id.toString() });
      const endpoint = `${apiBaseUrl}/tasks/deleteTask?${query.toString()}`;

      try {
        const response = await fetch(endpoint, {
          method: 'DELETE',
          credentials: 'include',
        });

        if (response.status === 404) {
          // Task already removed on the server; ensure it is cleared locally too.
          setTasksByDate(prev => {
            const list = prev[date] || [];
            return { ...prev, [date]: list.filter(t => t.id !== task_id) };
          });
          return;
        }

        if (response.status !== 204 && !response.ok) {
          const errorMessage = await response.text().catch(() => '');
          throw new Error(
            errorMessage || `Request failed with status ${response.status}`,
          );
        }

        setTasksByDate(prev => {
          const list = prev[date] || [];
          return { ...prev, [date]: list.filter(t => t.id !== task_id) };
        });
      } catch (error) {
        console.error('Failed to delete task', error);
        throw error;
      }
    },
    [apiBaseUrl],
  );

  const getTasks = (date: string) => {
    return tasksByDate[date] || [];
  };

  const getTasksByDate = useCallback(() => {
    // Return a shallow copy so consumers can't mutate state directly
    return { ...tasksByDate };
  }, [tasksByDate]);

  const fetchTasksForDate = useCallback(
    async (date: string) => {
      const userEmail = getCookie('userEmail');
      
      if (!userEmail) {
        console.warn('No user email cookie found. Skipping task fetch.');
        setTasksByDate(prev => ({ ...prev, [date]: [] }));
        return [];
      }

      const query = new URLSearchParams({ date, user_email: userEmail });

      const endpoint = `${apiBaseUrl}/tasks/getActiveTasksByEmail?${query.toString()}`;

      try {
        const response = await fetch(endpoint, {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error(`Request failed with status ${response.status}`);
        }

        const payload = (await response.json()) as Array<
          ITask & { user_email?: string | null }
        >;

        const normalizedTasks: ITask[] = payload.map(task => ({
          id: task.id,
          description: task.description,
          date: task.date,
          time: task.time,
        }));

        setTasksByDate(prev => ({ ...prev, [date]: normalizedTasks }));

        return normalizedTasks;
      } catch (error) {
        console.error('Failed to fetch tasks for date', date, error);
        setTasksByDate(prev => ({ ...prev, [date]: prev[date] ?? [] }));
        throw error;
      }
    },
    [apiBaseUrl, getCookie],
  );

  return (
    <TaskContext.Provider
      value={{
        tasksByDate,
        addTask,
        createTask,
        deleteTask,
        getTasks,
        getTasksByDate,
        fetchTasksForDate,
      }}
    >
      {children}
    </TaskContext.Provider>
  );
};

export const useTasks = () => {
  const context = useContext(TaskContext);
  if (!context) {
    throw new Error('useTasks must be used within a TaskProvider');
  }
  return context;
};