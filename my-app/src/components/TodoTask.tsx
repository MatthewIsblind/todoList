import React from 'react'
import { ITask } from '../Interfaces';


type TodoTaskProps = {
  task : ITask;
  //Passing through a function here to be called so that i can change information from the parent(TodoList)
  deleteTask: (taskName: number) => void;
};


const TodoTask: React.FC<TodoTaskProps> = ({ task, deleteTask }) => {
  return (
    <div className='flex w-full max-w-md h-12 text-white mb-4 rounded-md overflow-hidden shadow'>
      <div className='flex flex-1'>
        <span className='flex-1 grid place-items-center bg-red-500 border border-white border-r-0 text-lg'>
          {task.description}
        </span>
        <span className='flex-1 grid place-items-center bg-red-500 border border-white text-lg'>
          {task.time}
        </span>
      </div>

      <button
        className="w-24 h-full bg-purple-600 text-white hover:bg-purple-700"
        onClick={() => deleteTask(task.id)}
      >
        Remove
      </button>
    </div>
  );
};
export default TodoTask
