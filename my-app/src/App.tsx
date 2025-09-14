import React, {FC,useState} from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { TaskProvider } from './TasksContext';
import Home from './pages/Home';
import TodoList from './pages/TodoList';
import About from './pages/About';
import Bin from './pages/Bin';

const App : FC = () => {

  return (
    <TaskProvider>
     <Router basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/todolist" element={<TodoList />} />
        <Route path="/bin" element={<Bin />} />
        <Route path="/about" element={<About />} />
      </Routes>
    </Router>
    </TaskProvider>
  );
}

export default App;
