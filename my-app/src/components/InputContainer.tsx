import React, {FC,ChangeEvent,useState, useEffect} from 'react';
import {ITask} from '../Interfaces';
import { useTasks } from '../TasksContext';

export interface InputContainerProps {
  selectedDate: string;
}


const InputContainer: FC<InputContainerProps> = ({ selectedDate }) => {
    const { addTask } = useTasks();

    const [description, setDescription] = useState<string>('');
    const [time, setTime] = useState<string>('');

    // This function will be called whenever the text in those elements are changed
    // The conditiational check what input fields has been changed and will change 
    // the state base on what the input fields is
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        if (event.target.name === 'description') {
            setDescription(event.target.value);
        } else if (event.target.name === 'time') {
            setTime(event.target.value);
        }
    };

    // useEffect(() => {
    //     console.log("Updated todo list:", todoList);
    //     }, [todoList]);
    
    const addTaskHandler = (): void => {
        const newTask: ITask = {
            id: Date.now(),
            description,
            time,
            date: selectedDate,
        };
        addTask(selectedDate, newTask);
        setDescription('');
        setTime('');
    };

        return (
        <div className="flex items-stretch center">
            <div className="flex flex-col rounded-l-md overflow-hidden">
                <input
                type="text"
                className="w-52 h-10 px-2 text-lg border border-gray-300"
                placeholder="Description ..."
                name="description"
                value={description}
                onChange={handleChange}
                />
                <input
                type="time"
                className="w-52 h-10 px-2 text-lg border border-gray-300 border-t-0"
                name="time"
                value={time}
                onChange={handleChange}
                />
            </div>
            <button
                className="w-24 h-full bg-blue-600 text-white text-lg rounded-r-md hover:bg-blue-700"
                onClick={addTaskHandler}
            >
                Add task
            </button>
        </div>
    )
}

export default InputContainer
