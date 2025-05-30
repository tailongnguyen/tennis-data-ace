
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { GoogleGenerativeAI } from "https://esm.sh/@google/generative-ai@0.1.3";

// Initialize the Gemini API
const genAI = new GoogleGenerativeAI(Deno.env.get('GEMINI_API_KEY') || '');

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Parse the request body
    const { text, playerList } = await req.json();

    if (!text) {
      return new Response(
        JSON.stringify({ error: 'Text is required' }), 
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Format player list for the prompt
    const playerNames = playerList.map((player: any) => player.name).join(', ');

    // Get the model
    const model = genAI.getGenerativeModel({ model: 'gemini-pro' });

    // Format the prompt with the available players
    const prompt = `
    Parse the following tennis match data in natural language format and convert it to structured match data.
    
    Available players: ${playerNames}
    
    Rules:
    1. Match data may include singles or doubles matches
    2. Format could be "Player1 beat Player2 6-4, 6-2" or "Player1/Player2 vs Player3/Player4 6-4, 3-6, 6-4"
    3. Dates may be included in various formats (DD/MM/YYYY, MM/DD/YYYY, etc.)
    4. Find the closest player name match from the available player list
    5. For doubles matches, player pairs may be separated by "/" or "and" or ","
    6. Score formats may include "6-4, 7-5" or "6-4 7-5" or even just a single set like "6-4"
    
    Input text:
    ${text}
    
    Output format: JSON array where each match is an object with:
    {
      "player1": string (first player/team member 1),
      "player2": string or null (first team member 2, only for doubles),
      "player3": string (second player/team member 1),
      "player4": string or null (second team member 2, only for doubles),
      "score": string (formatted as "6-4,7-5"),
      "matchType": "singles" or "doubles",
      "matchDate": string (ISO date format),
      "isValid": boolean (true if all required fields are valid),
      "errorMessage": string (only if isValid is false)
    }
    
    Only return valid JSON with no explanations or additional text.
    `;

    // Generate content
    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text_response = response.text();

    // Extract the JSON from the response
    let jsonStr = text_response;
    
    // In case the model returns more than just JSON, try to extract the JSON part
    const jsonStartIdx = jsonStr.indexOf('[');
    const jsonEndIdx = jsonStr.lastIndexOf(']') + 1;
    
    if (jsonStartIdx >= 0 && jsonEndIdx > jsonStartIdx) {
      jsonStr = jsonStr.substring(jsonStartIdx, jsonEndIdx);
    }

    try {
      const matches = JSON.parse(jsonStr);
      
      // Process dates to ensure they are valid
      const processedMatches = matches.map((match: any) => ({
        ...match,
        matchDate: match.matchDate ? new Date(match.matchDate).toISOString() : new Date().toISOString()
      }));

      return new Response(
        JSON.stringify({ matches: processedMatches }), 
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (jsonError) {
      console.error('Failed to parse JSON from Gemini response:', jsonError);
      return new Response(
        JSON.stringify({ error: 'Failed to parse AI response' }), 
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }
  } catch (error) {
    console.error('Error processing match text:', error);
    return new Response(
      JSON.stringify({ error: 'Failed to process match text' }), 
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
