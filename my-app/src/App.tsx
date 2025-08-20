import './App.css';
import React, {FC,useState} from 'react';
import {ITask} from './Interfaces';

import InputContainer from './components/InputContainer';
import TodoTask from './components/TodoTask';

const App : FC = () => {
  const [todoList, setTodoList] = useState<ITask[]>([]);

  return (
    <div className="App">
       <h1 className="text-3xl font-bold underline text-blue-500">
          Hello world!
        </h1>
        <div className = 'header'>
            <InputContainer todoList={todoList} setTodoList={setTodoList} />
        </div>
      
        <div className = 'todoList'>
            {todoList.map((task : ITask, key : number) => {
                return <TodoTask key={key} task={task}/>
            })}
        </div>
    </div>
  );
}

export default App;
