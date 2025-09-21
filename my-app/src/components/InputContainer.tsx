import React, {FC,ChangeEvent,useState, useEffect} from 'react';
import {ITask} from '../Interfaces';
import { useTasks } from '../TasksContext';

export interface InputContainerProps {
  selectedDate: string;
}

const getCookie = (name: string): string |null  => {
    const match = document.cookie.match(new RegExp('(^| )' + name + '=([^;]+)'));
    return match ? match[2] : null
};


const InputContainer: FC<InputContainerProps> = ({ selectedDate }) => {
    const { addTask } = useTasks();
    
    
    const [description, setDescription] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [error, setError] = useState<string>('');

    // This function will be called whenever the text in those elements are changed
    // The conditiational check what input fields has been changed and will change 
    // the state base on what the input fields is
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const userEmail = getCookie('userEmail');
        console.log("useremail",userEmail);
        if (event.target.name === 'description') {
            setDescription(event.target.value);
        } else if (event.target.name === 'time') {
            setTime(event.target.value);
        }
        if (error) {
            setError('');
        }
    };
    
    const apiBaseUrl = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '') ?? '';
    const saveTaskCallUrl = `${apiBaseUrl}/tasks/addTask`;

    
    const getCookie = (name: string): string | null => {
        const match = document.cookie.match(new RegExp(`(^|;\\s*)${name}=([^;]+)`));
        return match ? decodeURIComponent(match[2]) : null;
    };

    const addTaskHandler = async (): Promise<void> => {
        if (!description.trim() || !time.trim()) {
            setError('Both description and time are required.');
            return;
        }
        
        const newTask: ITask = {
            id: Date.now(),
            description,
            time,
            date: selectedDate,
        };
        
        const userEmail = getCookie('userEmail') 
        const payload = {
            id: Date.now(),
            description,
            time,
            date: selectedDate,
            user_email : userEmail
        };

        addTask(selectedDate, newTask);
        setDescription('');
        setTime('');
        setError('');

        try {
            const response = await fetch(saveTaskCallUrl, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                credentials: 'include',
                body: JSON.stringify(payload),
            });

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }

            const savedTask = (await response.json()) as Partial<ITask> & { id?: number };
            const taskToAdd: ITask = {
                id: savedTask.id ?? newTask.id,
                description: savedTask.description ?? newTask.description,
                time: savedTask.time ?? newTask.time,
                date: savedTask.date ?? newTask.date,
            };

            setDescription('');
            setTime('');
            setError('');
        } catch (fetchError) {
            console.error('Failed to save task', fetchError);
            setError('Failed to save task. Please try again.');
        }
    };

        return (
            <div className="flex flex-col items-center">
            <div className="flex">
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
                className="w-24 h-full bg-blue-600 text-white text-lg rounded-md hover:bg-blue-700"
                onClick={addTaskHandler}
                >
                Add task
                </button>
            </div>
            {error && (
                <div className="mt-2 w-full max-w-md text-center text-sm text-red-700 bg-red-100 border border-red-400 rounded p-2">
                {error}
                </div>
            )}
            </div>
    )
}

export default InputContainer
