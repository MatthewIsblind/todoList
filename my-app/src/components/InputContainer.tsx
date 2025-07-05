import React, {FC} from 'react';

const InputContainer : FC = () => {
  return (
    <div>
       <div className='InputContainer'>
          <input type = 'text' className='input' placeholder='Task ...'></input>
          <input type = 'number' className='input' placeholder='Deadline (in Days)'></input>
        </div>
        
    </div>
  )
}

export default InputContainer
