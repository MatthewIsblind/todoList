import React, {FC,ChangeEvent,useState, } from 'react';
import { useTasks } from '../TasksContext';

export interface InputContainerProps {
  selectedDate: string;
}

const InputContainer: FC<InputContainerProps> = ({ selectedDate }) => {
    const { createTask } = useTasks();
    
    
    const [description, setDescription] = useState<string>('');
    const [time, setTime] = useState<string>('');
    const [error, setError] = useState<string>('');

    // This function will be called whenever the text in those elements are changed
    // The conditiational check what input fields has been changed and will change 
    // the state base on what the input fields is
    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        
        if (event.target.name === 'description') {
            setDescription(event.target.value);
        } else if (event.target.name === 'time') {
            setTime(event.target.value);
        }
        if (error) {
            setError('');
        }
    };

    const addTaskHandler = async (): Promise<void> => {
        if (!description.trim() || !time.trim()) {
            setError('Both description and time are required.');
            return;
        }

        try {
            await createTask({
                description,
                time,
                date: selectedDate,
            });

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
