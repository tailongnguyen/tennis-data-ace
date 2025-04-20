
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

interface Player {
  id: string;
  name: string;
  age: number;
  playing_style: string;
  ranking_points: number;
  created_at: string;
}

export const usePlayers = () => {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  const { data: players = [], isLoading } = useQuery({
    queryKey: ["players"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("players")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        toast.error("Failed to fetch players");
        throw error;
      }

      return data as Player[];
    },
  });

  const addPlayer = useMutation({
    mutationFn: async (player: { name: string; age: number; playing_style: string }) => {
      if (!user) {
        throw new Error("User must be logged in to add players");
      }

      const { data, error } = await supabase
        .from("players")
        .insert({
          ...player,
          user_id: user.id,
        })
        .select()
        .single();

      if (error) {
        toast.error("Failed to add player");
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player added successfully");
    },
  });

  return {
    players,
    isLoading,
    addPlayer,
  };
};
