import React, {FC,useState} from 'react';
import { BrowserRouter as Router, Routes, Route , Navigate} from 'react-router-dom';
import { TaskProvider } from './TasksContext';
import Home from './pages/Home';
import TodoList from './pages/TodoList';
import About from './pages/About';
import Bin from './pages/Bin';
import Login from './pages/Login';

const App : FC = () => {

  const getCookie = (name: string): string | null => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null;
  };

  const setCookie = (name: string, value: string, days: number) => {
    const expires = new Date(Date.now() + days * 864e5).toUTCString();
    document.cookie = `${name}=${value}; expires=${expires}; path=/`;
  };

  const [loggedIn, setLoggedIn] = useState<boolean>(() => {
    return getCookie('loggedIn') === 'true';
  });

  const handleLogin = () => {
    setLoggedIn(true);
    setCookie('loggedIn', 'true', 7);
  };


  return (
    <TaskProvider>
     <Router basename={process.env.PUBLIC_URL}>
      <Routes>
        <Route path="/login" element={<Login onLogin={handleLogin} />} />
        {loggedIn ? (
            <>
              <Route path="/" element={<Home />} />
              <Route path="/todolist" element={<TodoList />} />
              <Route path="/bin" element={<Bin />} />
              <Route path="/about" element={<About />} />
            </>
        ):(
          <Route path="*" element={<Navigate to="/login" replace />} />
        )}
      </Routes>
    </Router>
    </TaskProvider>
  );
}

export default App;
