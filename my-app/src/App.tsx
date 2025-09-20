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


  const rawPublicUrl = process.env.PUBLIC_URL ?? '';
  let resolvedBasename = rawPublicUrl;
  if (resolvedBasename.startsWith('http')) {
    try {
      const parsed = new URL(resolvedBasename);
      resolvedBasename = parsed.pathname;
    } catch (error) {
      resolvedBasename = '';
    }
  }

  if (resolvedBasename && resolvedBasename !== '/') {
    resolvedBasename = resolvedBasename.replace(/\/$/, '');
    const currentPath = window.location.pathname;
    if (!currentPath.startsWith(resolvedBasename)) {
      resolvedBasename = '';
    }
  }
  
  return (
    <TaskProvider>
      <Router basename={resolvedBasename}>
        <Routes>
          <Route
            path="/login"
            element={
              loggedIn ? <Navigate to="/" replace /> : <Login onLogin={handleLogin} />
            }
          />
          <Route
            path="/"
            element={loggedIn ? <Home /> : <Login onLogin={handleLogin} />}
          />
          <Route
            path="/todolist"
            element={loggedIn ? <TodoList /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/bin"
            element={loggedIn ? <Bin /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/about"
            element={loggedIn ? <About /> : <Navigate to="/login" replace />}
          />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </TaskProvider>
  );
}

export default App;
