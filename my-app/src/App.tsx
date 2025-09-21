import React, {FC,useState} from 'react';
import { BrowserRouter as Router, Routes, Route , Navigate} from 'react-router-dom';
import { TaskProvider } from './TasksContext';
import Home from './pages/Home';
import TodoList from './pages/TodoList';
import About from './pages/About';
import Bin from './pages/Bin';
import Login from './pages/Login';

const selectConfiguredRedirectUris = (): string[] => {
  const raw =
    process.env.REACT_APP_COGNITO_LOGOUT_REDIRECT_URI ??
    process.env.REACT_APP_COGNITO_REDIRECT_URI ??
    process.env.COGNITO_REDIRECT_URI ??
    '';

  return raw
    .split(',')
    .map((uri) => uri.trim())
    .filter((uri) => uri.length > 0);
};

const pickLogoutRedirectUri = (): string => {
  const configured = selectConfiguredRedirectUris();
  if (configured.length > 0) {
    return configured[0];
  }

  if (typeof window !== 'undefined' && window.location) {
    return `${window.location.origin}/`;
  }

  return '/';
};

const buildHostedLogoutUrl = (
  domain: string | undefined,
  clientId: string | undefined,
  logoutRedirectUri: string,
): string | undefined => {
  if (!domain || !clientId) {
    return undefined;
  }

  const normalizedDomain = domain.endsWith('/') ? domain.slice(0, -1) : domain;
  const params = new URLSearchParams({
    client_id: clientId,
    logout_uri: logoutRedirectUri,
  });

  return `${normalizedDomain}/logout?${params.toString()}`;
};


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

  const clearCookie = (name: string) => {
    document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
  };

  const handleLogout = () => {
    setLoggedIn(false);
    localStorage.removeItem('cognitoIdToken');
    localStorage.removeItem('cognitoAccessToken');
    localStorage.removeItem('cognitoRefreshToken');
    clearCookie('loggedIn');
    const logoutRedirectUri = pickLogoutRedirectUri();
    const hostedLogoutUrl = buildHostedLogoutUrl(
      process.env.REACT_APP_COGNITO_DOMAIN,
      process.env.REACT_APP_COGNITO_CLIENT_ID,
      logoutRedirectUri,
    );

    if (hostedLogoutUrl) {
      window.location.assign(hostedLogoutUrl);
    }
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
            element={
              loggedIn ? <Home onLogout={handleLogout} /> : <Login onLogin={handleLogin} />
            }
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
