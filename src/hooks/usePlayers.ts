import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Player } from "@/types/player";

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

  const updatePlayer = useMutation({
    mutationFn: async (player: { id: string; name: string; age: number; playing_style: string }) => {
      if (!user) {
        throw new Error("User must be logged in to update players");
      }

      const { data, error } = await supabase
        .from("players")
        .update({
          name: player.name,
          age: player.age,
          playing_style: player.playing_style,
        })
        .eq('id', player.id)
        .select()
        .single();

      if (error) {
        toast.error("Failed to update player");
        throw error;
      }

      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player updated successfully");
    },
  });

  const deletePlayer = useMutation({
    mutationFn: async (playerId: string) => {
      if (!user) {
        throw new Error("User must be logged in to delete players");
      }

      const { error } = await supabase
        .from("players")
        .delete()
        .eq('id', playerId);

      if (error) {
        toast.error("Failed to delete player");
        throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["players"] });
      toast.success("Player deleted successfully");
    },
  });

  return {
    players,
    isLoading,
    addPlayer,
    updatePlayer,
    deletePlayer,
  };
};
