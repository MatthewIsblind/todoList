import './App.css';
import React, {FC} from 'react';

import InputContainer from './components/InputContainer';

const App : FC = () => {
  return (
    <div className="App">
      <div className = 'header'>
        <InputContainer></InputContainer>
        <button className='button'>Add task</button>
      </div>
      
      <div className = 'todoList'>
        

      </div>
    </div>
  );
}

export default App;
