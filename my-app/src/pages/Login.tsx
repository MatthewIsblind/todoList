import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const [isCreating, setIsCreating] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (!users['admin']) {
      users['admin'] = 'password';
      localStorage.setItem('users', JSON.stringify(users));
    }
  }, []);

  const handleLoginSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[username] && users[username] === password) {
      onLogin();
      navigate('/');
    } else {
      alert('Invalid credentials');
    }
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirmPassword) {
      alert('Passwords do not match');
      return;
    }
    const users = JSON.parse(localStorage.getItem('users') || '{}');
    if (users[username]) {
      alert('User already exists');
      return;
    }
    users[username] = password;
    localStorage.setItem('users', JSON.stringify(users));
    alert('Account created. You can now log in.');
    setIsCreating(false);
    setPassword('');
    setConfirmPassword('');
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      {isCreating ? (
        <form onSubmit={handleCreateSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">Create Account</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Confirm Password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-green-500 text-white rounded hover:bg-green-600"
          >
            Create Account
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsCreating(false)}
              className="text-blue-500 underline"
            >
              Back to Login
            </button>
          </div>
        </form>
      ) : (
        <form onSubmit={handleLoginSubmit} className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4">
          <h1 className="text-2xl font-bold text-center">Login</h1>
          <input
            type="text"
            placeholder="Username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-gray-300 rounded px-3 py-2"
          />
          <button
            type="submit"
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Login
          </button>
          <div className="text-center">
            <button
              type="button"
              onClick={() => {
                setIsCreating(true);
                setUsername('');
                setPassword('');
                setConfirmPassword('');
              }}
              className="text-blue-500 underline"
            >
              Create Account
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default Login;