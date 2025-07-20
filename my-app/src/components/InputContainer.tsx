import React, {FC,ChangeEvent,useState, useEffect} from 'react';
import {ITask} from '../Interfaces';

export interface InputContainerProps {
  todoList: ITask[];
  setTodoList: React.Dispatch<React.SetStateAction<ITask[]>>;
}


const InputContainer : FC<InputContainerProps> = ({ todoList, setTodoList }) => {

    const[task,setTask] = useState<string>("");
    const[deadline,setDeadline] = useState<number>(0);
    

    // This function will be called whenever the text in those elements are changed
    // The conditiational check what input fields has been changed and will change 
    // the state base on what the input fields is
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        if (event.target.name === "task") {
            setTask(event.target.value)
        } else if (event.target.name === "deadline") {
            setDeadline(Number(event.target.value))
        }
    };

    useEffect(() => {
        console.log("Updated todo list:", todoList);
        }, [todoList]);
    
    const addTask = ():void => {
        console.log("testing" + task + deadline)
        const newTask = {TaskName : task , Deadline : deadline}
        //this is appending newTask to todolist array
        setTodoList([...todoList,newTask]);

        //reset the inputs
        setDeadline(0);
        setTask("");
    }

    return (
        <div>
           <div className='InputContainer'>
                <div className='input-fields'>
                    <input type = 'text' className='input' placeholder='Task ...' name="task" value={task} onChange={handleChange}></input>
                    <input type = 'number' className='input' placeholder='Deadline (in Days)' name = "deadline" value={deadline} onChange={handleChange} ></input>
                </div>
                <button className='button' onClick={addTask}>Add task</button>
            </div>
            
        </div>
    )
}

export default InputContainer
