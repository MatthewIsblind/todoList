import React, {FC,useState} from 'react';
import {ITask} from './Interfaces';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import TodoList from './pages/TodoList';
import About from './pages/About';
import Bin from './pages/Bin';

const App : FC = () => {
  const [todoList, setTodoList] = useState<ITask[]>([]);

  return (
    <Router basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/todolist" element={<TodoList />} />
        <Route path="/bin" element={<Bin />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
  );
}

export default App;
