import React from 'react'
import { ITask } from '../Interfaces';


type TodoTaskProps = {
  task: ITask;
  // Passing through a function here to be called so that i can change information from the parent(TodoList)
  deleteTask: (taskName: number) => void;
};

const TodoTask: React.FC<TodoTaskProps> = ({ task, deleteTask }) => {
  return (
    <div className="flex flex-col sm:flex-row w-full max-w-md text-white mb-4 rounded-md overflow-hidden shadow">
      <div className="flex flex-col sm:flex-row flex-1">
        <span className="flex-1 grid place-items-center bg-red-500 border border-white sm:border-r-0 text-xl p-2 break-words">
          {task.description}
        </span>
        <span className="w-full sm:w-24 grid place-items-center bg-red-500 border border-white text-xl p-2">
          {task.time}
        </span>
      </div>

      <button
        className="w-full sm:w-24 bg-purple-600 text-white hover:bg-purple-700 text-xl p-3"
        onClick={() => deleteTask(task.id)}
      >
        Remove
      </button>
    </div>
  );
};
export default TodoTask
