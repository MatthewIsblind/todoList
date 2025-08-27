import React, {FC,ChangeEvent,useState, useEffect} from 'react';

const Contact: React.FC = () => {

    const[street,setStreet] = useState<string>("");
    const[suburb,setSuburb] = useState<string>("");
    const[streetNumber,setStreetNumber] = useState<string>("");

    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = event.target;
        if (name === 'street') {
        setStreet(value);
        } else if (name === 'suburb') {
        setSuburb(value);
        } else if (name === 'streetNumber') {
        setStreetNumber(value);
        }
    };
    return (
        <div className="flex items-center justify-center min-h-screen">
            <h1 className="text-2xl font-bold">Bin</h1>

            <input type='string'
            className='w-52 h-10 px-2 text-lg border border-gray-300 border-t-0'
            placeholder='street'
            name="street"
            value ={street}
            onChange={handleChange}>
            </input>

            <input type='string'
            className='w-52 h-10 px-2 text-lg border border-gray-300 border-t-0'
            placeholder='suburb'
            name="suburb"
            value ={suburb}
            onChange={handleChange}>
            </input>

            <input type='number'
            className='w-52 h-10 px-2 text-lg border border-gray-300 border-t-0'
            placeholder='streetNumber'
            name="streetNumber"
            value ={streetNumber}
            onChange={handleChange}>
            </input>
        </div>
    
    );
};

export default Contact;