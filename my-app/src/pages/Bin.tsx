import React, { ChangeEvent, FormEvent, useState } from 'react';

const Contact: React.FC = () => {

    const[street,setStreet] = useState<string>("");
    const[suburb,setSuburb] = useState<string>("");
    const[streetNumber,setStreetNumber] = useState<string>("");
    const[APIResponse, setAPIResponse] = useState<string>("");

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

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!street || !suburb || !streetNumber) {
            console.warn('Street, suburb, and street number are required');
            return;
        }
        const baseUrl =
        'https://ipaasapi.brisbane.qld.gov.au/property/v3/properties/waste_flags';
        const params = new URLSearchParams({
        suburb_name: suburb,
        street_name: street,
        street_number: streetNumber,
        });
        
        const url = `${baseUrl}?${params.toString()}`;
        try {
            const response = await fetch(
                `https://corsproxy.io/?${encodeURIComponent(url)}`,
                {
                headers: {
                    'X-API-Key': 'b87afba9ff6349f49ca1e0de2ddf142d',
                },
                },
            );

            if (!response.ok) {
                throw new Error(`Request failed with status ${response.status}`);
            }
            const data = await response.json();

            console.log(data);
            setAPIResponse(JSON.stringify(data));
        } catch (error) {
            console.error('Error fetching bin data:', error);
        }
    };


    return (
        <div className="flex items-center justify-center min-h-screen bg-gray-100">
        <div className="w-full max-w-xl p-10 bg-white rounded shadow">
            <h1 className="mb-6 text-2xl font-bold text-center">Bin Information</h1>
            <form className="space-y-4" onSubmit={handleSubmit}>
            <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Street Number"
                name="streetNumber"
                value={streetNumber}
                onChange={handleChange}
            />
            <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Street"
                name="street"
                value={street}
                onChange={handleChange}
            />
            <input
                type="text"
                className="w-full p-2 border border-gray-300 rounded"
                placeholder="Suburb"
                name="suburb"
                value={suburb}
                onChange={handleChange}
            />
            
            <button type="submit" className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600">
            Submit
            </button>
            </form>
            
            <textarea className="w-full p-2 border border-gray-300 rounded h-32" value={APIResponse} readOnly />

        </div>
        
        </div>
    );
};

export default Contact;