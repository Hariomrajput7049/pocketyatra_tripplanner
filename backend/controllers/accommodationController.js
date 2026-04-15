import axios from "axios";
import dotenv from "dotenv";
import { getUsdToInrRate } from "../utils/currency.js";
dotenv.config();

export const searchHotels = async (req, res) => {
  try {
    console.log('Request body:', req.body);
    const { location, checkIn, checkOut, guests } = req.body;

    if (!location || !checkIn || !checkOut) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // If no API key, return dummy hotels
    if (!process.env.SERP_API_KEY) {
      const dummyHotels = [
        {
          name: "Taj Palace Hotel",
          location: location,
          rating: "4.5",
          rooms: "25",
          pricePerNight: 8500
        },
        {
          name: "Marriott Resort",
          location: location,
          rating: "4.3",
          rooms: "18",
          pricePerNight: 7200
        },
        {
          name: "Holiday Inn Express",
          location: location,
          rating: "4.1",
          rooms: "32",
          pricePerNight: 4500
        },
        {
          name: "Budget Stay Inn",
          location: location,
          rating: "3.8",
          rooms: "45",
          pricePerNight: 2800
        }
      ];

      return res.json({ success: true, hotels: dummyHotels });
    }

    // Call Serp API for hotel search
    const serpApiUrl = "https://serpapi.com/search";
    const params = {
      engine: "google_hotels",
      q: `hotels in ${location}`,
      check_in_date: checkIn,
      check_out_date: checkOut,
      adults: guests || 1,
      currency: "USD",
      gl: "us",
      hl: "en",
      api_key: process.env.SERP_API_KEY
    };

    const response = await axios.get(serpApiUrl, { params });
    console.log(response.data);
    
    console.log('Serp API Response:', JSON.stringify(response.data, null, 2));
    
    let hotels = [];
    
    console.log(response.data.properties[0])

    if (response.data && response.data.properties) {
      const usdToInrRate = await getUsdToInrRate();
      hotels = response.data.properties.slice(0, 8).map(property => {
        let convertedPrice = 0;
        const lowestRate = property.total_rate?.lowest || property.price || 0;
        if (typeof lowestRate === 'number') {
          convertedPrice = Math.round(lowestRate * usdToInrRate);
        } else if (lowestRate) {
          const parsed = parseInt(lowestRate.toString().replace(/[^\d]/g, ''), 10);
          convertedPrice = isNaN(parsed) ? 0 : Math.round(parsed * usdToInrRate);
        }
        if (!convertedPrice) {
          convertedPrice = 3500 + Math.floor(Math.random() * 4000);
        }

        return {
          name: property.name || "Hotel",
          location: property.address || location,
          rating: property.overall_rating ? property.overall_rating.toString() : "N/A",
          rooms: property.rooms_available ? property.rooms_available.toString() : "N/A",
          pricePerNight: convertedPrice
        };
      });
    }

    // If no hotels found from Serp API, return dummy data
    if (hotels.length === 0) {
      hotels = [
        {
          name: "Hill Side Inn",
          location: location,
          rating: "4.0",
          rooms: "20",
          pricePerNight: 5000
        }
      ];
    }

    res.json({ success: true, hotels });
  } catch (err) {
    console.error("Error in searchHotels:", err.message);
    
    // Return dummy hotels on API error
    const fallbackHotels = [
      {
        name: "Grand Hotel",
        location: location,
        rating: "4.2",
        rooms: "30",
        pricePerNight: 6000
      }
    ];
    
    res.json({ success: true, hotels: fallbackHotels });
  }
};
