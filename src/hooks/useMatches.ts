
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
      const { data, error } = await supabase
        .from("matches")
        .select(`
          *,
          player1:players!matches_player1_id_fkey(name),
          player2:players!matches_player2_id_fkey(name)
        `)
        .order("match_date", { ascending: false });

      if (error) {
        console.error("Error fetching matches:", error);
        toast.error("Failed to fetch matches");
        throw error;
      }

      return data as unknown as (Match & { player1: { name: string }, player2: { name: string } })[];
    },
  });

  const addMatch = useMutation({
    mutationFn: async (matchData: CreateMatchData) => {
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

      try {
        const { data, error } = await supabase
          .from("matches")
          .insert(dataToInsert)
          .select()
          .single();

        if (error) {
          console.error("Error adding match:", error);
          throw error;
        }

        console.log("Match added successfully:", data);
        return data;
      } catch (error) {
        console.error("Exception adding match:", error);
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["matches"] });
      toast.success("Match recorded successfully");
    },
    onError: (error) => {
      console.error("Failed to add match:", error);
      toast.error("Failed to record match");
    },
  });

  return {
    matches,
    isLoading,
    addMatch,
  };
};
