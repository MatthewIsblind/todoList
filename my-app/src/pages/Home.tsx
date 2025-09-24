import React from 'react';
import { Link } from 'react-router-dom';

type HomeProps = {
  onLogout: () => void;
};


const Home: React.FC<HomeProps> = ({ onLogout }) => {
  const handleLogout = () => {
    onLogout();
  };

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="grid gap-8 sm:grid-cols-2">
        <button type="button" onClick={handleLogout} className="p-3 text-white bg-red-500 rounded shadow transition transform hover:scale-105 hover:shadow-xl">
          Log Out
        </button>
        <Link
          to="/todolist"
          className="p-10 bg-white rounded shadow transition transform hover:scale-105 hover:shadow-xl"
        >
          <h2 className="text-xl font-semibold">Todo List3</h2>
        </Link>
        <Link
          to="/about"
          className="p-10 bg-white rounded shadow transition transform hover:scale-105 hover:shadow-xl"
        >
          <h2 className="text-xl font-semibold">About</h2>
        </Link>
        <Link
          to="/bin"
          className="p-10 bg-white rounded shadow transition transform hover:scale-105 hover:shadow-xl"
        >
          <h2 className="text-xl font-semibold">Bin</h2>
        </Link>

      </div>
    </div>
  );
};

export default Home;