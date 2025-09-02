import React, { FC, useState } from 'react';
import { ITask } from '../Interfaces';
import InputContainer from '../components/InputContainer';
import TodoTask from '../components/TodoTask';

const TodoList: FC = () => {

  //Dictionary that uses string(selected date as key),listt of tasks as values)
  const [tasksByDate, setTasksByDate] = useState<Record<string, ITask[]>>({});
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  //Grab the relevent list of tasks uses the date 
  const todoList = tasksByDate[selectedDate] || [];

  //add tasks to the dictionary. 
  // By replacing the list of tasks that have the key[selectedDate], so only 
  //tasksByDate[selectedDate] is updated
  const setTodoList = (tasks: ITask[]) => {
    setTasksByDate((prev) => ({ ...prev, [selectedDate]: tasks }));
    console.log(tasksByDate)
  };

  //remove task by id
  const deleteTask = (taskId: number): void => {
    setTodoList(todoList.filter((task) => task.id !== taskId));
  };
  
  
  return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-100 font-sans p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Todo List</h1>

      <div className="mb-4">
        <input
          type="date"
          value={selectedDate}
          onChange={(e) => setSelectedDate(e.target.value)}
          className="border border-gray-300 rounded px-2 py-1"
        />
      </div>

      {/* pass in the todolist of each day and the function that can modify 
      the todo list to the input container */}
      <div className="w-full flex justify-center">
        <InputContainer
          todoList={todoList}
          setTodoList={setTodoList}
          selectedDate={selectedDate}
        />
      </div>
      <div className="w-full flex flex-col items-center mt-8">
        {todoList.map((task: ITask) => (
          <TodoTask key={task.id} task={task} deleteTask={deleteTask} />
        ))}
      </div>
    </div>
  );
}

export default TodoList;