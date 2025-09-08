import React, { FC, useState, useEffect } from 'react';
import { ITask } from '../Interfaces';
import InputContainer from '../components/InputContainer';
import TodoTask from '../components/TodoTask';
import Bin from './Bin';
import { useTasks } from '../TasksContext';


const TodoList: FC = () => {

  //Dictionary that uses string(selected date as key),listt of tasks as values)
  const { getTasks, deleteTask ,getTasksByDate} = useTasks();
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [showBin, setShowBin] = useState(false);

  //Grab the relevent list of tasks uses the date, updates whenever setSelectedDate is called to change the date
  const todoList = getTasks(selectedDate);

  const handleDelete = (taskId: number): void => {
    deleteTask(selectedDate, taskId);
  };

   useEffect(() => {
    // Log the entire task mapping whenever the tasks for the selected date change
    console.log('Updated todo list:', getTasksByDate());
  }, [todoList, getTasksByDate]);
  
  return (
    <div className="flex flex-col items-center min-h-screen w-full bg-gray-100 font-sans p-4 overflow-y-auto">
      <h1 className="text-4xl font-bold mb-6 text-center">Todo List</h1>

      <div className="mb-4 flex flex-wrap items-center gap-2 justify-center">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded px-3 py-2 text-lg"
        />
        <button
          onClick={() => setShowBin(true)}
          className="px-3 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 text-lg"
        >
          Bin Info
        </button>
      </div>

      {/* pass in the todolist of each day and the function that can modify 
      the todo list to the input container */}
      <div className="w-full flex justify-center">
        <InputContainer selectedDate={selectedDate} />
      </div>
      <div className="w-full max-w-md flex flex-col items-center mt-8 space-y-4 flex-shrink-0">
        {todoList.map((task: ITask) => (
          <TodoTask key={task.id} task={task} deleteTask={handleDelete} />
        ))}
      </div>

       {showBin && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-2 sm:p-4">
            <div className="bg-white p-4 sm:p-6 rounded shadow w-full max-w-sm sm:max-w-xl max-h-full overflow-auto">
            <button
              className="mb-2 px-4 py-1 bg-red-500 text-white rounded hover:bg-red-600"
              onClick={() => setShowBin(false)}
            >
              Close
            </button>
            <Bin embedded onClose={() => setShowBin(false)}/>
          </div>
        </div>
      )}
      
    </div>
  );
}

export default TodoList;