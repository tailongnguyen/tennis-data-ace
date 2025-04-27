import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Match } from "@/types/player";

export interface CreateMatchData {
  winner1_id: string;
  winner2_id: string | null;
  loser1_id: string;
  loser2_id: string | null;
  match_type: 'singles' | 'doubles';
  score: string;
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
          winner1:players!matches_player1_id_fkey(id, name, age, playing_style),
          winner2:players!matches_player2_id_fkey(id, name, age, playing_style),
          loser1:players!matches_loser1_id_fkey(id, name, age, playing_style),
          loser2:players!matches_loser2_id_fkey(id, name, age, playing_style)
        `)
        .order("match_date", { ascending: false });

      if (error) {
        console.error("Error fetching matches:", error);
        toast.error("Failed to fetch matches");
        throw error;
      }

      console.log("Matches fetched successfully:", data);
      return data as unknown as Match[]; // Use type assertion to match our interface
    },
  });

  const isDrawMatch = (score: string) => {
    return score === '5-5' || score === '6-6';
  };

  const getPlayerMatches = (playerId: string, filteredMatches: Match[] = matches) => {
    return filteredMatches.filter(match => 
      match.winner1_id === playerId || 
      match.winner2_id === playerId || 
      match.loser1_id === playerId || 
      match.loser2_id === playerId
    );
  };

  const getPlayerWins = (playerId: string, filteredMatches: Match[] = matches) => {
    return filteredMatches.filter(match => 
      !isDrawMatch(match.score) && (match.winner1_id === playerId || match.winner2_id === playerId)
    ).length;
  };

  const getPlayerDraws = (playerId: string, filteredMatches: Match[] = matches) => {
    return filteredMatches.filter(match => 
      isDrawMatch(match.score) && 
      (match.winner1_id === playerId || match.winner2_id === playerId || 
       match.loser1_id === playerId || match.loser2_id === playerId)
    ).length;
  };

  const getPlayerLosses = (playerId: string, filteredMatches: Match[] = matches) => {
    return filteredMatches.filter(match => 
      !isDrawMatch(match.score) && (match.loser1_id === playerId || match.loser2_id === playerId)
    ).length;
  };

  const calculateWinRate = (playerId: string, filteredMatches: Match[] = matches) => {
    const totalMatches = getPlayerMatches(playerId, filteredMatches).length;
    if (totalMatches === 0) return 0;
    
    const wins = getPlayerWins(playerId, filteredMatches);
    return (wins / totalMatches) * 100;
  };

  const calculateNotLoseRate = (playerId: string, filteredMatches: Match[] = matches) => {
    const totalMatches = getPlayerMatches(playerId, filteredMatches).length;
    if (totalMatches === 0) return 0;
    
    const wins = getPlayerWins(playerId, filteredMatches);
    const draws = getPlayerDraws(playerId, filteredMatches);
    
    return ((wins + draws) / totalMatches) * 100;
  };

  const addMatch = useMutation({
    mutationFn: async (matchData: CreateMatchData) => {
      console.log("Starting match mutation with data:", matchData);
      
      if (!user) {
        console.error("User not logged in");
        throw new Error("User must be logged in to add matches");
      }

      const dataToInsert = {
        ...matchData,
        user_id: user.id,
        match_date: new Date().toISOString(),
      };

      console.log("Attempting to insert match data:", dataToInsert);

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
    isDrawMatch,
    getPlayerMatches,
    getPlayerWins,
    getPlayerDraws,
    getPlayerLosses,
    calculateWinRate,
    calculateNotLoseRate
  };
};
