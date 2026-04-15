import { getJson } from "serpapi";
import dotenv from "dotenv";
dotenv.config();

export const searchFlights=async(req,res)=>{
    try {
        const {from,to,depart,returnDate}=req.body;
        if(!from || !to || !depart){
            return res.status(400).json({message:"All fields are required"});
        }
        const API_KEY = process.env.SERP_API_KEY;
        if(!API_KEY){
            const dummyFlights=[
                {
                   id:1,
                   airline:"Indigo",
                   flight_number:"6E-2342",
                   departure_time:"10:00 AM",
                   arrival_time:"12:30 PM",
                   duration:"2h 30m",
                   details:`Non-stop flight from ${from} to ${to} (${depart})`
                },
                {
                    id:2,
                    airline:"Air India",
                    flight_number:"AI-803",
                    departure_time:"02:15 PM",
                    arrival_time:"04:45 PM",
                    duration:"2h 30m",
                    details:`Non-stop flight from ${from} to ${to} (${depart})`
                },
                {
                    id:3,
                    airline:"Vistara",
                    flight_number:"UK-985",
                    departure_time:"06:00 PM",
                    arrival_time:"08:30 PM",
                    duration:"2h 30m",
                    details:`Non-stop flight from ${from} to ${to} (${depart})`
                }
            ];
            console.log("Using dummy flight data. Set SERP_API_KEY in .env to use real flight data");
            return res.json({success:true,data:dummyFlights});
        }
        const params={
            engine:"google_flights",
            departure_id:from.toUpperCase(),
            arrival_id:to.toUpperCase(),
            outbound_date:depart,
            type: returnDate ? "1" : "2",
            currency:"INR",
            hl:"en",
            api_key: API_KEY,
        };
        if(returnDate){
            params.return_date=returnDate;
        }
        console.log("Calling SerpAPI with params:",{ ...params });
        console.log("API Key present:", !!API_KEY);
        
        let json;
        try {
            json = await getJson(params);
            if (!json) {
                throw new Error("No response received from SerpAPI");
            }
            if (json.error) {
                console.error("Error from SerpAPI:", JSON.stringify(json, null, 2));
                if (json.error.includes("Invalid API key")) {
                    throw new Error("Invalid API key");
                }
                throw new Error(json.error || "Unknown error from SerpAPI");
            }
            const bestCount = json.best_flights?.length || 0;
            const otherCount = json.other_flights?.length || 0;
            console.log(`SerpAPI response received. best_flights=${bestCount}, other_flights=${otherCount}, total=${bestCount+otherCount}`);
        } catch (apiErr) {
            console.error("SerpAPI Call Failed:", apiErr.message || apiErr);
            throw apiErr;
        }
        const bestFlights=json.best_flights || [];
        const otherFlights=json.other_flights||[];
        const formatFlights=(flights)=>{
            let idCounter=1;
            const formattedList=[];
            for(const flightGroup of flights){
                const flightSegments=flightGroup.flights||[flightGroup];
                const firstSegment=flightSegments[0];
                const lastSegment=flightSegments[flightSegments.length-1];
                const totalDuration = flightGroup.total_duration || flightGroup.duration || flightSegments.reduce((sum, seg)=> sum + (seg?.duration || 0), 0);
                const price=flightGroup.price;
                const formatTime=(timeString)=>{
                    if(!timeString) return 'N/A';
                    if(typeof timeString === 'string' && (timeString.includes('AM') || timeString.includes('PM'))){
                        return timeString;
                    }
                    try {
                        const parts = timeString.split(/[\sT]/);
                        if (parts.length >= 2) {
                            const timePart = parts[1];
                            const timeSubparts = timePart.split(':');
                            if (timeSubparts.length >= 2) {
                                let hours = parseInt(timeSubparts[0], 10);
                                const minutes = timeSubparts[1].substring(0, 2);
                                if (!isNaN(hours)) {
                                    const ampm = hours >= 12 ? 'PM' : 'AM';
                                    const displayHours = hours % 12 || 12;
                                    return `${displayHours}:${minutes} ${ampm}`;
                                }
                            }
                        }
                        
                        const timeMatch = timeString.match(/(\d{2}):(\d{2})/);
                        if (timeMatch) {
                            let hours = parseInt(timeMatch[1], 10);
                            const minutes = timeMatch[2];
                            const ampm = hours >= 12 ? 'PM' : 'AM';
                            const displayHours = hours % 12 || 12;
                            return `${displayHours}:${minutes} ${ampm}`;
                        }
                    } catch (err) {
                        console.error("String time parse error:", err);
                    }
                    try{
                        const date=new Date(timeString);
                        if (isNaN(date.getTime())) {
                            throw new Error("Invalid Date");
                        }
                        const hours=date.getHours();
                        const minutes=date.getMinutes();
                        const ampm=hours>=12?'PM':'AM';
                        const displayHours=hours%12||12;
                        const displayMinutes=minutes.toString().padStart(2,'0');
                        return `${displayHours}:${displayMinutes} ${ampm}`;
                    }
                    catch(e){
                        return 'N/A';
                    }
                };
                
                const layovers=flightGroup.layovers||[];
                const layoverInfo=layovers.length>0?layovers.map(l=>`${l.name} (${Math.floor(l.duration/60)}h ${l.duration%60}m layover)`).join(','):null;
                
                formattedList.push({
                    id:idCounter++,
                    airline:flightSegments.map(s=>s.airline||s.airline?.[0]?.name || 'Unknown').join('/'),
                    flight_number:flightSegments.map(s=>s.flight_number||'').filter(f=>f).join('/'),
                    departure_time: formatTime(firstSegment.departure_time?.time || firstSegment.departure_time || firstSegment.departure_airport?.time),
                    arrival_time: formatTime(lastSegment.arrival_time?.time || lastSegment.arrival_time || lastSegment.arrival_airport?.time),
                    duration: totalDuration ? `${Math.floor(totalDuration/60)}h ${totalDuration%60}m` : 'N/A',
                    details:flightSegments.length>1
                            ? `${flightSegments.length-1} stop${flightSegments.length>2 ? 's':''}${layoverInfo ? ' - '+layoverInfo:''}`
                            :'Non-stop',
                    booking_token:flightGroup.booking_token||null
                });
            }
            return formattedList;
        };
        const allFlights=[ ...formatFlights(bestFlights), ...formatFlights(otherFlights)];
        if(allFlights.length === 0){
            console.warn("No flights formatted from SERPAPI response");
            console.log("Response structure:",JSON.stringify(json,null,2).substring(0,500)+"...");
        
        }
        else{
            console.log(`Successfully formatted ${allFlights.length} flights`);

        }
        res.json({success:true, data:allFlights});
    } catch (err) {
        console.error("Error fetching flights from SERPAPI");
        console.error("Error message",err.message);
        let errorMessage="Failed to fetch flight data.Check backend console for details";
        if(err.message.includes("timeout")){
            errorMessage="Search timed out. Please try shorter dates or refresh";

        }
        else if(err.message.includes("Invalid API key")||err.message.includes("api_key")){
            errorMessage="API key invalid or exceeded usage limit. Please check SERP_API_KEY";


        }
        else if(err.message.includes("No response")||err.message.includes("Unknown SERPAPI error")){
            errorMessage="SerpAPI failed to return data. Check airport codes (IATA) and dates";

        }
        else if(err.message){
            errorMessage=err.message;
        }
        console.error("--Error Details to Troubleshoot--");
        console.error(err);
        console.error("---------------------------------");
        res.status(500).json({
            message:errorMessage,
            error:err.message
        })
    }
};

export const getFlightBookingOption = async (req, res) => {
    try {
        const { booking_token } = req.body;
        if (!booking_token) {
            return res.status(400).json({ message: "booking_token is required" });
        }
        
        const API_KEY = process.env.SERP_API_KEY;
        if (!API_KEY) {
            return res.status(400).json({ message: "SERP_API_KEY is not configured" });
        }

        const params = {
            engine: "google_flights",
            booking_token: booking_token,
            api_key: API_KEY
        };

        console.log("Calling SerpAPI Google Flights with booking_token...");
        const json = await getJson(params);
        
        if (json.error) {
            console.error("SerpAPI booking call error:", json.error);
            return res.status(400).json({ message: json.error });
        }

        const bookingOptions = json.booking_options || [];
        if (bookingOptions.length > 0) {
            const url = bookingOptions[0].url;
            return res.json({ success: true, url });
        } else {
            return res.status(404).json({ message: "No booking options found for this token." });
        }
    } catch (err) {
        console.error("Error getting flight booking options:", err);
        res.status(500).json({ message: err.message || "Failed to fetch booking details" });
    }
};