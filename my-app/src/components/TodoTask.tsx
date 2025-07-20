import React from 'react'
import { ITask } from '../Interfaces';


type TodoTaskProps = {
  task? : ITask;
};


const TodoTask: React.FC<TodoTaskProps> = ({ task }) => {
  return (
    <div className='task'>
        <div className='content'>
			<span>{task?.TaskName}</span>   
			<span>{task?.Deadline}</span>
		</div>
           
        <button>task</button>
    </div>
  )
}

export default TodoTask
