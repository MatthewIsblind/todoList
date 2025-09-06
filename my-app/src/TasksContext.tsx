import React, { createContext, useContext, useState, ReactNode ,useCallback} from 'react';
import { ITask } from './Interfaces';

interface TaskContextType {
  tasksByDate: Record<string, ITask[]>;
  addTask: (date: string, task: ITask) => void;
  deleteTask: (date: string, id: number) => void;
  getTasks: (date: string) => ITask[];
  getTasksByDate: () => Record<string, ITask[]>;
}

const TaskContext = createContext<TaskContextType | undefined>(undefined);

export const TaskProvider = ({ children }: { children: ReactNode }) => {
  const [tasksByDate, setTasksByDate] = useState<Record<string, ITask[]>>({});

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

  return (
    <TaskContext.Provider value={{ tasksByDate, addTask, deleteTask, getTasks ,getTasksByDate}}>
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