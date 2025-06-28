import React, {FC} from 'react';

const InputContainer : FC = () => {
  return (
    <div>
       <div className='Input container'>
          <input type = 'text' placeholder='Task ...'></input>

          <input type = 'number' placeholder='Deadline (in Days)'></input>
        </div>
        <button>Add task</button>
    </div>
  )
}

export default InputContainer
