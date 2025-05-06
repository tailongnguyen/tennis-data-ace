
import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Wand2 } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches, CreateMatchData } from "@/hooks/useMatches";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Loader2 } from "lucide-react";
import { GoogleGenAI } from "@google/genai";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

// Schema for the AI input form
const aiInputSchema = z.object({
  matchInput: z.string().min(3, "Please enter at least one match description"),
});

type AIInputFormValues = z.infer<typeof aiInputSchema>;

// Interface for processed match data
interface ProcessedMatch {
  player1: string;
  player2: string;
  player3: string;
  player4: string;
  score: string;
  matchType: 'singles' | 'doubles';
  matchDate: Date;
  isValid: boolean;
  errorMessage?: string;
}

export function RecordMatchWithAIDialog() {
  const [open, setOpen] = useState(false);
  const { players } = usePlayers();
  const { addMatch } = useMatches();
  const [processingMatches, setProcessingMatches] = useState(false);
  const [processedMatches, setProcessedMatches] = useState<ProcessedMatch[]>([]);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [geminiApiKey, setGeminiApiKey] = useState<string | null>(null);
  const [apiKeyLoading, setApiKeyLoading] = useState(true);
  const { session } = useAuth();
  const [keyFetchAttempted, setKeyFetchAttempted] = useState(false);

  const form = useForm<AIInputFormValues>({
    resolver: zodResolver(aiInputSchema),
    defaultValues: {
      matchInput: "",
    },
  });

  // Fetch the Gemini API key from the Supabase database
  useEffect(() => {
    // Prevent multiple fetch attempts if we've already tried or if session is not available
    if (keyFetchAttempted || !session) {
      return;
    }

    const fetchGeminiApiKey = async () => {
      try {
        setApiKeyLoading(true);
        
        const { data, error } = await supabase.rpc('get_api_key', { key_name: 'GEMINI_API_KEY' });
        
        if (error) {
          console.error("Error fetching Gemini API key:", error);
          toast.error("Failed to fetch API key. Please make sure it's set up correctly in the database.");
        } else if (!data) {
          console.error("No Gemini API key found in database");
          toast.error("No Gemini API key found. Please add it to the database.");
        } else {
          setGeminiApiKey(data);
        }
      } catch (error) {
        console.error("Error fetching Gemini API key:", error);
        toast.error("Failed to fetch API key");
      } finally {
        setApiKeyLoading(false);
        setKeyFetchAttempted(true);
      }
    };

    fetchGeminiApiKey();
  }, [session, keyFetchAttempted]);

  // Reset key fetch flag when dialog opens or closes
  useEffect(() => {
    if (!open) {
      setKeyFetchAttempted(false);
    }
  }, [open]);

  // Process the natural language input using Gemini API directly
  const processMatchText = async (matchInput: string) => {
    setProcessingMatches(true);
    try {
      if (!geminiApiKey) {
        toast.error("Gemini API key not found. Please add the GEMINI_API_KEY to your database.");
        setProcessingMatches(false);
        return;
      }

      // Initialize the Gemini API
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });

      // Format player list for the prompt
      const playerNames = players.map(player => player.name).join(', ');

      // Format the prompt with the available players
      const prompt = `
Input rules:
1. Each line can be one of the following:
   - A date (e.g., "1/5/2025", "2025-05-01", etc.)
   - A singles match
   - A doubles match
2. If a line is a date, all subsequent matches are associated with that date until a new date line appears.
3. If a line is a match, it could be one of the following formats:
   - <Team1> <score1><delimiter><score2> <Team2>
   - <Team1>:<score1><delimiter><Team2>:<score2>
   - <Team1>(<score1>)<delimiter><Team2>(<score2>)
   - <Team1><delimiter><Team2> <score1><delimiter><score2>
4. Note that <Team> could be a single player name or a combination of 2 player names separated by team delimiters, depending on the match type that you have to guess.
5. Team delimiters for doubles: "/", ",", "and" or " " (e.g., "A/B", "A, B", "A and B" or just "A B").
6. Score format is just a string of numbers and hyphens representing a single set (note that it is not necessary to have a winner).
7. If multiple dates are present, each date applies to all matches listed after it, until another date line appears.

Example:
  01/05/2025
  Khải 6-4 Hiệp
  01/06/2025
  Long 4-6 Hải
  Thiện Hiệp - Phương Thành 5-5

Output rules:
1. Output format: JSON array where each match is an object parsed from a match line:
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
Note: 
- The length of the array must be equal to the number of match lines in the input text.
- Only return valid JSON with no explanations or additional text.
2. Steps and logic to produce output:
- For each line, classify if it is a date, a singles match, or a doubles match.
- If it is a date, set the match date to that date and set current date to this date.
- If it is a match, use current date to set match date and try to detect the match type, players and scores:
+ Match type: "singles" or "doubles", depends on the number of players you have to guess.
+ Available players: ${playerNames}. Try to map the input to the available players.
+ For example: "Khải Hiển 4-6 Hiệp Thiện" -> player1: "Khải", player2: "Hiển", player3: "Hiệp", player4: "Thiện" and score is "4-6".

- If there are more than one matches with the same player name, set "isValid" to false and return an error message: "Multiple matches found for player [player name]: <list of matches>". For example: Long could be either Tài Long or Đức Long -> "Multiple matches found for player Long: Tài Long, Đức Long".
- Similarly, if there is no match found for a player name, set "isValid" to false and return an error message: "Player [player name] not found".
- If the score is invalid (e.g there is only one score 5-; or score number is bigger than 7 or not even a number), set "isValid" to false and return an error message: "Invalid score format: [score]".
- If the date is invalid, set "isValid" to false and return an error message: "Invalid date format: [date]".
- If there is no reasonable way to parse the input, set "isValid" to false and return an error message: "Invalid input format".
Input text:
${matchInput}
      `;

      // Generate content using the correct Gemini API
      const response = await ai.models.generateContent({
        model: "gemini-2.0-flash",
        contents: prompt,
      });
      const text_response = response.text;

      
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
        
        // Process dates to ensure they are Date objects
        const playerNameSet = new Set(players.map((p) => p.name));
        const processedMatches = matches.map((match: any) => {
          // List of player fields to check
          const playerFields = ['player1', 'player2', 'player3', 'player4'];
          let missingPlayers: string[] = [];
          let matchCopy = { ...match };

          // Check each player field
          playerFields.forEach((field) => {
            const name = matchCopy[field];
            if (name && !playerNameSet.has(name)) {
              missingPlayers.push(name);
              matchCopy[field] = null; // Remove non-existent player
            }
          });

          // Update isValid and errorMessage if any player is missing
          if (missingPlayers.length > 0) {
            matchCopy.isValid = false;
            matchCopy.errorMessage = `Player(s) not found: ${missingPlayers.join(', ')}`;
          }

          return {
            ...matchCopy,
            matchDate: new Date(matchCopy.matchDate)
          };
        });

        setProcessedMatches(processedMatches);
        setShowConfirmation(true);
      } catch (jsonError) {
        console.error('Failed to parse JSON from Gemini response:', jsonError, text_response);
        toast.error("Failed to parse AI response");
      }
    } catch (error) {
      console.error("Error processing match text:", error);
      toast.error("Failed to process match input. Please try again.");
    } finally {
      setProcessingMatches(false);
    }
  };

  const onSubmit = async (values: AIInputFormValues) => {
    await processMatchText(values.matchInput);
  };

  // Add all confirmed matches to the database
  const confirmAndAddMatches = async () => {
    try {
      const validMatches = processedMatches.filter(match => match.isValid);
      
      if (validMatches.length === 0) {
        toast.error("No valid matches to add");
        return;
      }

      // Convert processed matches to CreateMatchData format
      const matchesData = validMatches.map(match => {
        // Find player IDs from player names
        const player1Id = players.find(p => p.name === match.player1)?.id;
        const player2Id = match.player2 ? players.find(p => p.name === match.player2)?.id : null;
        const player3Id = players.find(p => p.name === match.player3)?.id;
        const player4Id = match.player4 ? players.find(p => p.name === match.player4)?.id : null;

        // Get winners and losers from the score
        // For simplicity, we'll assume team1 (player1/player2) is the winner for now
        // In a real implementation, you'd analyze the score to determine the winner
        const matchData: CreateMatchData = {
          winner1_id: player1Id || "",
          winner2_id: match.matchType === 'doubles' ? player2Id || "" : null,
          loser1_id: player3Id || "",
          loser2_id: match.matchType === 'doubles' ? player4Id || "" : null,
          match_type: match.matchType,
          score: match.score,
          match_date: match.matchDate.toISOString(),
        };

        return matchData;
      });

      // Add all matches sequentially
      for (const matchData of matchesData) {
        await addMatch.mutateAsync(matchData);
      }

      toast.success(`Added ${validMatches.length} matches successfully`);
      setOpen(false);
      resetForm();
    } catch (error) {
      console.error("Error adding matches:", error);
      toast.error("Failed to add matches");
    }
  };

  const resetForm = () => {
    form.reset();
    setProcessedMatches([]);
    setShowConfirmation(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="secondary">
          <Wand2 className="mr-2 h-4 w-4" />
          Record Match with AI
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-hidden flex flex-col p-6">
        <DialogHeader className="px-0 flex-shrink-0">
          <DialogTitle>Record Matches with AI</DialogTitle>
          <DialogDescription>
            Enter match details in natural language. The AI will parse and prepare them for you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="flex-1 overflow-hidden flex flex-col mt-4">
          {apiKeyLoading ? (
            <div className="flex items-center justify-center p-6">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <p>Loading API key...</p>
            </div>
          ) : !geminiApiKey ? (
            <Alert variant="destructive">
              <AlertTitle>API Key Missing</AlertTitle>
              <AlertDescription>
                The Gemini API key is not set up in the database. Please add a key with the name 'GEMINI_API_KEY' to the api_keys table.
              </AlertDescription>
            </Alert>
          ) : !showConfirmation ? (
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="matchInput"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Match Details</FormLabel>
                      <FormControl>
                        <Textarea
                          placeholder={`Enter matches with natural language, for example:
01/05/2025
Tài Long 6-4 Khải
Hùng Anh / Thiện, Hiệp / Hải 5-5`}
                          className="min-h-[150px] max-h-[200px] overflow-y-auto"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                      <p className="text-xs text-muted-foreground mt-1">
                        Enter player names, scores, and optional dates. You can enter multiple matches, each on a new line.
                      </p>
                    </FormItem>
                  )}
                />
                <Button type="submit" disabled={processingMatches}>
                  {processingMatches ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Process with AI"
                  )}
                </Button>
              </form>
            </Form>
          ) : (
            <div className="flex flex-col h-full overflow-hidden">
              <div className="flex-shrink-0 mb-2">
                <h3 className="text-lg font-medium">Confirm Matches</h3>
              </div>
              <div className="flex-1 overflow-y-auto pr-1 mb-4 max-h-[50vh] custom-scrollbar">
                {processedMatches.length === 0 ? (
                  <Alert variant="destructive">
                    <AlertTitle>No matches detected</AlertTitle>
                    <AlertDescription>
                      The AI couldn't detect any valid matches. Please try rephrasing your input.
                    </AlertDescription>
                  </Alert>
                ) : (
                  <div className="space-y-3">
                    {processedMatches.map((match, index) => (
                      <div 
                        key={index} 
                        className={`p-3 border rounded-md ${match.isValid ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}`}
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="font-medium text-sm">Match {index + 1}</div>
                          <div className="text-xs bg-gray-100 px-2 py-1 rounded">
                            {match.matchType === 'singles' ? 'Singles' : 'Doubles'}
                          </div>
                        </div>
                        
                        {match.isValid ? (
                          <>
                            <div className="text-xs mb-1">
                              <span className="font-medium">Date:</span> {match.matchDate.toLocaleDateString()}
                            </div>
                            <div className="text-xs mb-1">
                              {match.matchType === 'singles' ? (
                                <>
                                  <span className="font-medium">Players:</span> {match.player1} vs {match.player3}
                                </>
                              ) : (
                                <>
                                  <span className="font-medium">Teams:</span> {match.player1}/{match.player2} vs {match.player3}/{match.player4}
                                </>
                              )}
                            </div>
                            <div className="text-xs">
                              <span className="font-medium">Score:</span> {match.score}
                            </div>
                          </>
                        ) : (
                          <div className="text-xs text-red-600">{match.errorMessage || "Invalid match data"}</div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-3 pt-3 flex-shrink-0 border-t">
                <Button variant="outline" onClick={() => setShowConfirmation(false)}>
                  Back to Edit
                </Button>
                <Button 
                  onClick={confirmAndAddMatches} 
                  disabled={processedMatches.filter(m => m.isValid).length === 0}
                >
                  Confirm and Add Matches
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
