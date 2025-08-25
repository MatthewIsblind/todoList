import React, { FC, useState } from 'react';
import { ITask } from '../Interfaces';
import InputContainer from '../components/InputContainer';
import TodoTask from '../components/TodoTask';

const TodoList: FC = () => {
  const [todoList, setTodoList] = useState<ITask[]>([]);

    return (
    <div className="flex flex-col items-center justify-center min-h-screen w-full bg-gray-100 font-sans p-4">
      <h1 className="text-3xl font-bold mb-6 text-center">Todo List</h1>
      <div className="w-full flex justify-center">
        <InputContainer todoList={todoList} setTodoList={setTodoList} />␊
      </div>␊
      <div className="w-full flex flex-col items-center mt-8">
        {todoList.map((task: ITask, key: number) => {
          return <TodoTask key={key} task={task} />;
        })}
      </div>
    </div>
  );
}

export default TodoList;