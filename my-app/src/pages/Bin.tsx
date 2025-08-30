import React, { ChangeEvent, FormEvent, useState } from 'react';

// Model representing the structure of the bin data returned from the API
interface BinInfo {
    day_of_week: string;
    frequency: string;
    house_number: number;
    house_number_suffix: string | null;
    next_recycling_date: string;
    recurrence: string;
    street_name: string;
    suburb_name: string;
    unit_number: number | null;
}


const Contact: React.FC = () => {

    const[street,setStreet] = useState<string>("");
    const[suburb,setSuburb] = useState<string>("");
    const[streetNumber,setStreetNumber] = useState<string>("");
    const [binData, setBinData] = useState<BinInfo[]>([]);
    const [notes, setNotes] = useState<string>("");

    const [loading, setLoading] = useState<boolean>(false);

    // Check whether the current week is the recycle week
    const processBinInfo = (data: BinInfo[]): void => {
        //state update are asynchronous, make a string to build it then set the
        //notes variable 
        let newNotes = "";

        const binDay = data[0]?.day_of_week
        if (!binDay) {
            setNotes('No bin day available');
            return;
        }
        newNotes = `Binday is ${binDay}\n`;

        const nextRecyclingDate = data[0]?.next_recycling_date;
        if (!nextRecyclingDate) {
            newNotes = newNotes + ('No recycling date available');
            return;
        }
        
        newNotes = newNotes + `Next recycling date: ${nextRecyclingDate}\n`; 
        const nextDate = new Date(nextRecyclingDate);
        const now = new Date();

        console.log(newNotes + 'Now :' + now);
        
        console.log()
        if(checkNextBindayRecycle(binDay,nextDate) == true){
            newNotes = newNotes + "\nRemeber to take the recycling bin out for this bin day"
        } else {
            newNotes = newNotes + "\nYou're good. No recycling bin for this bin day"
        }
        setNotes(newNotes)
    };

    function checkNextBindayRecycle(day: string, nextRecyclingDate : Date): Boolean {
        const weekdayNames = [
            "Monday",
            "Tuesday",
            "Wednesday",
            "Thursday",
            "Friday",
            "Saturday",
            "Sunday",
        ];
        
        const target = weekdayNames.indexOf(day);
        if (target === -1) throw new Error("Invalid weekday name");

        const today = new Date();
        // Convert JS getDay() (0=Sunday..6=Saturday) to Monday=0..Sunday=6
        const todayIndex = (today.getDay() + 6) % 7;

        let daysAhead = (target - todayIndex + 7) % 7;
        if (daysAhead === 0) daysAhead = 7; // if it's today, push to next week

        const result = new Date(today);
        result.setDate(today.getDate() + daysAhead);

        console.log(`result ${result}  next${nextRecyclingDate} `)
        if (result.toDateString() === nextRecyclingDate.toDateString()) {
            return true
        } 
        return false;


    }


    const handleChange = (event: ChangeEvent<HTMLInputElement>): void => {
        const { name, value } = event.target;
        const trimmedValue = value.trim(); 
        if (name === 'street') {
            setStreet(trimmedValue);
        } else if (name === 'suburb') {
            setSuburb(trimmedValue);
        } else if (name === 'streetNumber') {
            setStreetNumber(trimmedValue);
        }
    };

    const handleSubmit = async (event: FormEvent<HTMLFormElement>): Promise<void> => {
        event.preventDefault();
        if (!street || !suburb || !streetNumber) {
            console.warn('Street, suburb, and street number are required');
            setNotes('Street, suburb, and street number are required')
            return;
        }
        setLoading(true);
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
            const data: BinInfo[] = await response.json();

            console.log(data);
            setBinData(data);
            
            processBinInfo(data);
        } catch (error) {
            console.error('Error fetching bin data:', error);
        } finally {
            setLoading(false);
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
            
            <button
                type="submit"
                className="w-full p-2 text-white bg-blue-500 rounded hover:bg-blue-600 flex items-center justify-center"
                disabled={loading}
            >
                {loading ? (
                    <div className="h-5 w-5 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                ) : (
                    'Submit'
                )}
            </button>
            </form>
            
            <textarea className="w-full p-2 border border-gray-300 rounded h-32" value={JSON.stringify(binData, null, 2)}readOnly />
            <textarea className="w-full p-2 border border-gray-300 rounded h-32" value={notes}readOnly />
        </div>
        
        </div>
    );
};

export default Contact;