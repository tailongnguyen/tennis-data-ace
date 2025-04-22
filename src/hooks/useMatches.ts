
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Match } from "@/types/player";

export interface CreateMatchData {
  player1_id: string;
  player2_id: string;
  match_type: 'singles' | 'doubles';
  score: string;
  location?: string;
}

export const useMatches = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: matches = [], isLoading } = useQuery({
    queryKey: ["matches"],
    queryFn: async () => {
      console.log("Fetching matches...");
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          player1:players!matches_player1_id_fkey(id, name),
          player2:players!matches_player2_id_fkey(id, name)
        `)
        .order("match_date", { ascending: false });

      if (error) {
        console.error("Error fetching matches:", error);
        toast.error("Failed to fetch matches");
        throw error;
      }

      console.log("Matches fetched successfully:", data);
      return data as unknown as (Match & { player1: { name: string }, player2: { name: string } })[];
    },
  });

  const addMatch = useMutation({
    mutationFn: async (matchData: CreateMatchData) => {
      console.log("Starting match mutation with data:", matchData);
      
      if (!user) {
        console.error("User not logged in");
        throw new Error("User must be logged in to add matches");
      }

      // Ensure location is never undefined, use empty string instead
      const dataToInsert = {
        player1_id: matchData.player1_id,
        player2_id: matchData.player2_id,
        match_type: matchData.match_type,
        score: matchData.score,
        location: matchData.location || "",
        user_id: user.id,
        match_date: new Date().toISOString(),
      };

      console.log("Attempting to insert match data:", dataToInsert);

      // First attempt to insert the data
      const result = await supabase
        .from("matches")
        .insert(dataToInsert)
        .select();

      console.log("Supabase insert result:", result);

      if (result.error) {
        console.error("Error adding match:", result.error);
        throw result.error;
      }

      console.log("Match added successfully:", result.data);
      return result.data[0];
    },
    onSuccess: () => {
      console.log("Match added successfully - invalidating queries...");
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match recorded successfully");
    },
    onError: (error) => {
      console.error("Failed to add match:", error);
      toast.error("Failed to record match: " + (error instanceof Error ? error.message : "Unknown error"));
    },
  });

  return {
    matches,
    isLoading,
    addMatch,
  };
};
