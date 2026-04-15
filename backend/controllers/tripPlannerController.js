import dotenv from "dotenv";
import { GoogleGenAI } from "@google/genai";
import axios from "axios";
dotenv.config();

// Define suggestions for popular destinations as fallback
const suggestions = {
  ooty: ["Doddabetta Peak", "Ooty Lake", "Botanical Gardens", "Tea Museum", "Pykara Falls"],
  manali: ["Solang Valley", "Rohtang Pass", "Hadimba Temple", "Old Manali", "Jogini Falls"],
  goa: ["Baga Beach", "Fort Aguada", "Basilica of Bom Jesus", "Dudhsagar Falls", "Anjuna Flea Market"],
  jaipur: ["Amber Fort", "Hawa Mahal", "City Palace", "Jantar Mantar", "Nahargarh Fort"],
  delhi: ["India Gate", "Qutub Minar", "Red Fort", "Humayun's Tomb", "Lotus Temple"],
  mumbai: ["Gateway of India", "Marine Drive", "Elephanta Caves", "Juhu Beach", "Sanjay Gandhi National Park"],
  bangalore: ["Cubbon Park", "Lalbagh Botanical Garden", "MG Road", "Bangalore Palace", "Wonderla Amusement Park"],
  kolkata: ["Victoria Memorial", "Howrah Bridge", "Park Street", "Indian Museum", "Science City"],
  chennai: ["Marina Beach", "Kapaleeshwarar Temple", "Fort St. George", "Elliot's Beach", "Santhome Cathedral"],
  agra: ["Taj Mahal", "Agra Fort", "Fatehpur Sikri", "Mehtab Bagh", "Itimad-ud-Daulah's Tomb"],
};

const getPlaces = (name) => {
  const key = String(name || "").toLowerCase().trim();
  return suggestions[key] || [
    `Top attractions in ${name}: Old Town walking street`,
    `Popular viewpoint near ${name}`,
    `Main lake/park area`,
    `Local museum or cultural center`,
    `Best street-food lane`
  ];
};

// Local fallback plan generator (used if Gemini fails or is not configured)
const generateFallbackTripPlan = (destination, startDate, endDate, budget) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const tripDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
  
  const itinerary = [];
  for (let i = 1; i <= Math.min(tripDays, 7); i++) {
    switch (i) {
      case 1:
        itinerary.push(`Day 1: Arrive in ${destination}, check into hotel, explore local markets and enjoy welcome dinner`);
        break;
      case 2:
        itinerary.push(`Day 2: Visit main attractions and landmarks in ${destination}, including ${getPlaces(destination)[0] || 'popular sites'}`);
        break;
      case 3:
        itinerary.push(`Day 3: Enjoy local cuisine and cultural experiences, visit ${getPlaces(destination)[1] || 'cultural sites'}`);
        break;
      case 4:
        itinerary.push(`Day 4: Day trip to ${getPlaces(destination)[2] || 'nearby attractions'} or relax at hotel`);
        break;
      case 5:
        itinerary.push(`Day 5: Visit ${getPlaces(destination)[3] || 'remaining attractions'} and evening entertainment`);
        break;
      case 6:
        itinerary.push(`Day 6: Free day for shopping or optional activities of your choice`);
        break;
      case 7:
        itinerary.push(`Day 7: Last-minute shopping and departure`);
        break;
      default:
        itinerary.push(`Day ${i}: Explore more of ${destination} at your own pace`);
    }
  }
  
  if (tripDays < 7 && tripDays > 1) {
    itinerary[tripDays-1] = `Day ${tripDays}: Last-minute shopping and departure`;
  }

  const flightPercentage = tripDays <= 3 ? 0.5 : tripDays <= 7 ? 0.4 : 0.35;
  return {
    itinerary: itinerary,
    flights: [
      `Book round-trip flights to ${destination}`,
      `Consider booking 2-3 months in advance for best prices`,
      `Check for connecting flights if direct flights are expensive`,
      `Look for early morning or late night flights for better deals`
    ],
    hotels: [
      `Book hotel in city center for easy access to attractions`,
      `Consider boutique hotels for unique experience`,
      `Look for hotels with breakfast included`,
      `Check for package deals that include airport transfers`
    ],
    places: getPlaces(destination)
  };
};

export const planTrip = async (req, res) => {
  try {
    const { source, destination, startDate, endDate, budget } = req.body;

    if (!source || !destination || !startDate || !endDate || !budget) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    if (Number(budget) <= 0) {
      return res.status(400).json({ message: "Budget must be greater than 0" });
    }

    const start = new Date(startDate);
    const end = new Date(endDate);
    const tripDays = Math.max(1, Math.ceil((end - start) / (1000 * 60 * 60 * 24)));

    // Fallback if no API Key is configured
    const apiKey = process.env.OPENROUTER_API_KEY || process.env.GEMINI_API_KEY;
    if (!apiKey) {
      console.warn("API Key is not set. Falling back to dummy generator.");
      const fallbackPlan = generateFallbackTripPlan(destination, startDate, endDate, budget);
      return res.json({ success: true, plan: fallbackPlan });
    }

    try {
      const prompt = `You are an expert travel planner. Your task is to design a realistic trip plan starting from the source city: ${source} to the destination: ${destination}.
Dates: from ${startDate} to ${endDate} (${tripDays} days).
Total Budget: ₹${budget} INR.

First, evaluate if the total budget of ₹${budget} INR is sufficient to cover:
1. Travel/Transportation from ${source} to ${destination} (e.g. flight/train/bus ticket).
2. Basic accommodation for ${tripDays} days in ${destination}.
3. Simple food and local sightseeing for the duration of ${tripDays} days.

Note: Only mark "insufficientBudget" as true if the monetary amount (₹${budget}) is genuinely too low to cover these basic costs. Do NOT mark it as true due to time constraints, short duration, or tight travel schedules (e.g., if a 2-day trip is logistically tight but the budget of ₹${budget} is more than enough to pay for it, "insufficientBudget" MUST be false).

If the budget amount of ₹${budget} INR is genuinely NOT sufficient for a basic trip of ${tripDays} days, you MUST return a JSON object with this schema:
{
  "insufficientBudget": true,
  "message": "A friendly, detailed explanation of why the budget is insufficient, estimating the minimum realistic costs for travel (flight/train), hotels, and food, and suggesting a more realistic budget amount in Rupees."
}

If the budget is sufficient for a decent trip, you MUST return a JSON object with this schema:
{
  "insufficientBudget": false,
  "itinerary": [
    "Day 1: [Detailed morning, afternoon, and evening activities in ${destination} matching the budget]",
    "Day 2: [Detailed sightseeing, activities, and dining options]"
    ... (continue for all ${tripDays} days)
  ],
  "places": [
    "Real attraction 1 to visit in ${destination}",
    "Real attraction 2 to visit in ${destination}",
    ... (list 5-8 top places)
  ],
  "flights": [
    "Transportation suggestion 1 (suggest specific flight/train options from ${source} to ${destination} with approximate costs)",
    "Transportation suggestion 2",
    ... (list 3-4 suggestions)
  ],
  "hotels": [
    "Hotel recommendation 1 (suggest specific real hotels/hostels/resorts in ${destination} suitable for a total trip budget of ₹${budget})",
    "Hotel recommendation 2",
    ... (list 3-4 suggestions)
  ]
}

Make sure to provide actual, real-world options (airlines, specific hotels, attractions) that exist and fit well within the ₹${budget} budget. Do not include markdown code block syntax (like \`\`\`json) outside the JSON structure. Just return the JSON object directly.`;

      let responseText = "";

      if (apiKey.startsWith("sk-or-")) {
        const model = process.env.AI_MODEL || "openrouter/free";
        console.log(`Calling OpenRouter with model: ${model}...`);
        const openRouterResponse = await axios.post(
          "https://openrouter.ai/api/v1/chat/completions",
          {
            model: model,
            messages: [
              {
                role: "user",
                content: prompt
              }
            ],
            response_format: {
              type: "json_object"
            }
          },
          {
            headers: {
              "Content-Type": "application/json",
              "Authorization": `Bearer ${apiKey}`,
              "HTTP-Referer": "http://localhost:5000",
              "X-Title": "PocketYatra"
            }
          }
        );
        responseText = openRouterResponse.data.choices[0].message.content;
      } else {
        console.log("Calling Google Gen AI SDK...");
        const ai = new GoogleGenAI({ apiKey });
        const response = await ai.models.generateContent({
          model: 'gemini-2.0-flash',
          contents: prompt,
          config: {
            responseMimeType: 'application/json',
          }
        });
        responseText = response.text;
      }

      if (!responseText) {
        throw new Error("Empty response from AI service");
      }

      const parsedPlan = JSON.parse(responseText.trim());
      
      if (parsedPlan.insufficientBudget) {
        return res.json({ 
          success: true, 
          plan: { 
            insufficientBudget: true, 
            message: parsedPlan.message 
          } 
        });
      }

      const plan = {
        insufficientBudget: false,
        itinerary: parsedPlan.itinerary || [],
        places: parsedPlan.places || [],
        flights: parsedPlan.flights || [],
        hotels: parsedPlan.hotels || []
      };

      return res.json({ success: true, plan });
    } catch (geminiErr) {
      console.error("Gemini API error:", geminiErr?.message || geminiErr);
      // Fallback to our dummy planner if Gemini fails
      const fallbackPlan = generateFallbackTripPlan(destination, startDate, endDate, budget);
      return res.json({ 
        success: true, 
        plan: fallbackPlan, 
        note: "Generated a custom fallback trip plan due to API issues." 
      });
    }
  } catch (err) {
    console.error("Error in planTrip:", err);
    res.status(500).json({ success: false, message: "Server error while planning trip.", error: err.message });
  }
};
