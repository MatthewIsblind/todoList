import React, { createContext, useContext, useState, ReactNode ,useCallback} from 'react';
import { ITask } from './Interfaces';

interface TaskContextType {
  tasksByDate: Record<string, ITask[]>;
  addTask: (date: string, task: ITask) => void;
  deleteTask: (date: string, id: number) => void;
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
  
  const addTask = (date: string, task: ITask) => {
    setTasksByDate(prev => {
      const list = prev[date] || [];
      return { ...prev, [date]: [...list, task] };
    });
  };

  const deleteTask = (date: string, id: number) => {
    setTasksByDate(prev => {
      const list = prev[date] || [];
      return { ...prev, [date]: list.filter(t => t.id !== id) };
    });
  };

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