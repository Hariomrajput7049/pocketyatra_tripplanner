import dotenv from "dotenv";
import { getJson } from "serpapi";
dotenv.config();

export const findDestinations = async (req, res) => {
  try {
    const { budget, season, travelType } = req.body;

    if (!budget || !season || !travelType) {
      return res.status(400).json({ message: "Missing required fields" });
    }

    // If no API key, return dummy destinations
    if (!process.env.SERP_API_KEY) {
      const dummyDestinations = [
        { name: "Manali", state: "Himachal Pradesh", averageBudget: 8000, bestSeason: "winter", type: "adventure" },
        { name: "Goa", state: "Goa", averageBudget: 15000, bestSeason: "summer", type: "relaxation" },
        { name: "Jaipur", state: "Rajasthan", averageBudget: 10000, bestSeason: "winter", type: "cultural" },
      ];

      // Filter based on user input
      const results = dummyDestinations.filter(
        (d) =>
          d.bestSeason.toLowerCase() === season.toLowerCase() &&
          d.type.toLowerCase() === travelType.toLowerCase() &&
          d.averageBudget <= parseInt(budget)
      );

      return res.json({ success: true, destinations: results.length > 0 ? results : [{ note: "No destinations match your criteria" }] });
    }

    // Use SerpAPI client library to search for travel destinations
    const query = `best ${travelType} destinations in India during ${season} season under ${budget} budget`;
    
    // Using the SerpAPI client library with getJson
    const searchData = await getJson({
      engine: "google",
      q: query,
      location: "India",
      google_domain: "google.co.in",
      gl: "in",
      hl: "en",
      api_key: process.env.SERP_API_KEY
    });

    // Get AI overview if available
    const aiOverview = searchData.ai_overview || {};
    const aiSummary = aiOverview.text || "";
    const aiChips = aiOverview.chips || [];
    
    // Process organic results as backup
    const searchResults = searchData.organic_results || [];
    
    // Create destinations from AI overview and organic results
    let destinations = [];
    
    // If AI overview is available, use it as the primary source
    if (aiSummary) {
      // Create a main destination from AI summary
      destinations.push({
        name: `${travelType.charAt(0).toUpperCase() + travelType.slice(1)} Destinations in ${season}`,
        state: "Various States in India",
        bestSeason: season,
        type: travelType,
        description: aiSummary,
        isAiOverview: true,
        aiChips: aiChips.map(chip => chip.text)
      });
    }
    
    // Add organic results as additional destinations
    if (searchResults.length > 0) {
      const organicDestinations = searchResults.slice(0, 5).map((result) => {
        // Extract location name from title
        const name = result.title.split(' - ')[0].split(' | ')[0];
        
        // Default values
        const defaultState = "Various States";
        
        return {
          name: name,
          state: defaultState,
          bestSeason: season,
          type: travelType,
          description: result.snippet || "A perfect destination for your trip",
          link: result.link || ""
        };
      });
      
      destinations = [...destinations, ...organicDestinations];
    }

    // If no results found
    if (destinations.length === 0) {
      destinations.push({ note: "No destinations match your criteria" });
    }

    res.json({ success: true, destinations: destinations });
  } catch (err) {
    console.error("Error in findDestinations:", err);
    res.status(500).json({ success: false, message: "Server error while finding destinations.", error: err.message });
  }
};
