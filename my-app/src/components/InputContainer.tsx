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
        <div className="flex items-stretch center">
            <div className="flex flex-col rounded-l-md overflow-hidden">
                <input
                    type='text'
                    className='w-52 h-10 px-2 text-lg border border-gray-300'
                    placeholder='Task ...'
                    name="task"
                    value={task}
                    onChange={handleChange}
                />
                <input
                    type='number'
                    className='w-52 h-10 px-2 text-lg border border-gray-300 border-t-0'
                    placeholder='Deadline (in Days)'
                    name="deadline"
                    value={deadline}
                    onChange={handleChange}
                />
            </div>
            <button
                className='w-24 h-full bg-blue-600 text-white text-lg rounded-r-md hover:bg-blue-700'
                onClick={addTask}
            >
                Add task
            </button>
        </div>
    )
}

export default InputContainer
