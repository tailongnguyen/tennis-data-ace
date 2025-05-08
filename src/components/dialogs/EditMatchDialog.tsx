import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches, CreateMatchData } from "@/hooks/useMatches";
import { Match } from "@/types/player";
import { parseISO } from "date-fns";

// Helper to check for winner for a single set
function getSetWinner(p1Score: string, p2Score: string): "p1" | "p2" | null {
  if (
    p1Score !== "" &&
    p2Score !== "" &&
    !isNaN(Number(p1Score)) &&
    !isNaN(Number(p2Score))
  ) {
    if (Number(p1Score) > Number(p2Score)) return "p1";
    if (Number(p2Score) > Number(p1Score)) return "p2";
  }
  return null;
}

// Helper to determine match winners based on sets
function determineMatchWinners(setScores: { p1: string; p2: string }[]): "p1" | "p2" {
  let p1Sets = 0;
  let p2Sets = 0;
  
  setScores.forEach(set => {
    const winner = getSetWinner(set.p1, set.p2);
    if (winner === "p1") p1Sets++;
    if (winner === "p2") p2Sets++;
  });
  
  return p1Sets > p2Sets ? "p1" : "p2";
}

// Helper to normalize score to higher-lower format
function normalizeScore(score: string): string {
  const sets = score.split(',');
  return sets.map(set => {
    const [a, b] = set.split('-').map(Number);
    return a >= b ? `${a}-${b}` : `${b}-${a}`;
  }).join(',');
}

// Helper to parse a score string into set scores
function parseScoreToSets(scoreString: string): { p1: string; p2: string }[] {
  // Initialize with empty sets
  const setScores = Array(3).fill({ p1: "", p2: "" });
  
  if (!scoreString) return setScores;
  
  // Parse the score string (e.g., "6-4,7-5")
  const sets = scoreString.split(',');
  
  return sets.map((set, index) => {
    const [p1, p2] = set.split('-');
    return { p1: p1 || "", p2: p2 || "" };
  }).concat(Array(3 - sets.length).fill({ p1: "", p2: "" }));
}

const matchSchema = z.object({
  matchType: z.enum(['singles', 'doubles']),
  player1: z.string().min(1, "Player 1 is required"),
  player2: z.string().min(1, "Player 2 is required").optional().or(z.string()),
  player3: z.string().min(1, "Player 3 is required"),
  player4: z.string().min(1, "Player 4 is required").optional().or(z.string()),
  matchDate: z.date().default(new Date()),
});

type MatchFormValues = z.infer<typeof matchSchema>;

interface EditMatchDialogProps {
  match: Match | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function EditMatchDialog({ match, open, onOpenChange }: EditMatchDialogProps) {
  const { players } = usePlayers();
  const { updateMatch } = useMatches();
  const [setScores, setSetScores] = useState<{ p1: string; p2: string }[]>(
    Array(3).fill({ p1: "", p2: "" })
  );

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      matchType: 'singles',
      player1: '',
      player2: '',
      player3: '',
      player4: '',
      matchDate: new Date(),
    },
  });

  // Update form when match changes
  useEffect(() => {
    if (match) {
      // Reset form with match data
      const matchDate = match.match_date ? new Date(match.match_date) : new Date();
      
      form.reset({
        matchType: match.match_type,
        player1: match.winner1_id,
        player2: match.winner2_id || '',
        player3: match.loser1_id,
        player4: match.loser2_id || '',
        matchDate,
      });
      
      // Parse the score string to set scores
      setSetScores(parseScoreToSets(match.score));
    }
  }, [match, form]);

  const watchMatchType = form.watch("matchType");

  const onSubmit = async (values: MatchFormValues) => {
    try {
      if (!match) {
        toast.error("No match selected for editing");
        return;
      }
      
      if (setScores.every(set => set.p1 === "" || set.p2 === "")) {
        toast.error("Please enter at least one set score");
        return;
      }

      // Determine winners and losers based on set scores
      const matchWinner = determineMatchWinners(setScores);
      
      // Format score string (e.g., "6-4,6-3,7-5")
      const formattedScore = setScores
        .filter(set => set.p1 !== "" && set.p2 !== "")
        .map(set => `${set.p1}-${set.p2}`)
        .join(",");

      if (formattedScore === "") {
        toast.error("Please enter at least one complete set score");
        return;
      }

      // Normalize score to ensure higher score comes first
      const normalizedScore = normalizeScore(formattedScore);

      let matchData: Partial<CreateMatchData>;

      // Setup match data based on singles or doubles
      if (values.matchType === 'singles') {
        matchData = {
          winner1_id: matchWinner === "p1" ? values.player1 : values.player3,
          winner2_id: null,
          loser1_id: matchWinner === "p1" ? values.player3 : values.player1,
          loser2_id: null,
          match_type: 'singles',
          score: normalizedScore,
          match_date: values.matchDate ? values.matchDate.toISOString() : new Date().toISOString(),
        };
      } else { // doubles
        if (!values.player2 || !values.player4) {
          toast.error("All players are required for doubles matches");
          return;
        }

        matchData = {
          winner1_id: matchWinner === "p1" ? values.player1 : values.player3,
          winner2_id: matchWinner === "p1" ? values.player2 : values.player4,
          loser1_id: matchWinner === "p1" ? values.player3 : values.player1,
          loser2_id: matchWinner === "p1" ? values.player4 : values.player2,
          match_type: 'doubles',
          score: normalizedScore,
          match_date: values.matchDate ? values.matchDate.toISOString() : new Date().toISOString(),
        };
      }

      console.log("Updating match data:", matchData);

      updateMatch.mutate({
        matchId: match.id,
        matchData
      }, {
        onSuccess: () => {
          onOpenChange(false);
          form.reset();
          setSetScores(Array(3).fill({ p1: "", p2: "" }));
          toast.success("Match updated successfully");
        },
        onError: (error) => {
          console.error("Error updating match:", error);
          toast.error("Failed to update match");
        }
      });
    } catch (error) {
      console.error("Error updating match:", error);
      toast.error("Failed to update match");
    }
  };

  function handleSetScoreChange(idx: number, side: "p1" | "p2", val: string) {
    const newSetScores = [...setScores];
    // Create a new object reference to ensure state updates properly
    newSetScores[idx] = { 
      ...newSetScores[idx], 
      [side]: val.replace(/[^0-9]/g, "").slice(0, 2) 
    };
    setSetScores(newSetScores);
  }

  // Get player names for display
  const player1Name = players.find(p => p.id === form.watch("player1"))?.name || "Player 1";
  const player2Name = players.find(p => p.id === form.watch("player2"))?.name || "Player 2";
  const player3Name = players.find(p => p.id === form.watch("player3"))?.name || "Player 3";
  const player4Name = players.find(p => p.id === form.watch("player4"))?.name || "Player 4";

  // Get team names based on match type
  const team1Name = watchMatchType === 'singles' ? 
    player1Name : 
    `${player1Name} / ${player2Name}`;
  
  const team2Name = watchMatchType === 'singles' ? 
    player3Name : 
    `${player3Name} / ${player4Name}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Match Record</DialogTitle>
          <DialogDescription>Update the match details and scores below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="flex flex-col space-y-4">
              {/* Match Date Field */}
              <FormField
                control={form.control}
                name="matchDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        value={field.value ? new Date(field.value).toISOString().split('T')[0] : ''}
                        onChange={(e) => {
                          const date = e.target.value ? new Date(e.target.value) : new Date();
                          field.onChange(date);
                        }}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              {/* Match Type Field */}
              <FormField
                control={form.control}
                name="matchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Match Type</FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={(value) => {
                        field.onChange(value);
                        if (value === 'singles') {
                          form.setValue('player2', '');
                          form.setValue('player4', '');
                        }
                      }}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select match type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="singles">Singles</SelectItem>
                        <SelectItem value="doubles">Doubles</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="player1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team 1 - Player 1</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchMatchType === 'doubles' && (
                <FormField
                  control={form.control}
                  name="player2"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team 1 - Player 2</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="player3"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Team 2 - Player 1</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select player" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {players.map((player) => (
                          <SelectItem key={player.id} value={player.id}>
                            {player.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {watchMatchType === 'doubles' && (
                <FormField
                  control={form.control}
                  name="player4"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Team 2 - Player 2</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select player" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {players.map((player) => (
                            <SelectItem key={player.id} value={player.id}>
                              {player.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}
            </div>

            <div>
              {/* TV-style Scoreboard */}
              <div>
                <FormLabel className="block mb-2 text-base text-center font-semibold tracking-wide">
                  Set Scores
                </FormLabel>
                <div className="bg-gray-50 border border-gray-300 rounded-lg p-4 flex items-center justify-center mb-2">
                  <table
                    className="w-full max-w-xs mx-auto border-separate"
                    style={{ borderSpacing: "0.5rem" }}
                  >
                    <thead>
                      <tr>
                        <th className="px-2 text-center text-xs text-gray-500 font-semibold uppercase">
                          TEAMS
                        </th>
                        {setScores.map((_, i) => (
                          <th
                            key={"set-head-" + i}
                            className="text-center text-xs font-bold text-gray-700"
                          >
                            Set {i + 1}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      <tr>
                        <td
                          className="pr-2 text-xs font-medium text-gray-700"
                          style={{ width: "90px" }}
                        >
                          {team1Name}
                        </td>
                        {setScores.map((set, idx) => {
                          const winner = getSetWinner(set.p1, set.p2);
                          const isWinner =
                            winner === "p1" &&
                            !!set.p1 &&
                            Number(set.p1) > Number(set.p2);
                          return (
                            <td key={"p1-set-" + idx}>
                              <Input
                                inputMode="numeric"
                                className={
                                  "w-12 text-center font-bold rounded border" +
                                  " border-gray-300 bg-white " +
                                  (isWinner
                                    ? " bg-gray-200 border-gray-600 ring-2 ring-gray-500"
                                    : "")
                                }
                                style={{
                                  fontWeight: isWinner ? 800 : 500,
                                  transition: "box-shadow 0.2s, border 0.2s",
                                }}
                                placeholder="0"
                                value={set.p1}
                                onChange={(e) =>
                                  handleSetScoreChange(idx, "p1", e.target.value)
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                      <tr>
                        <td
                          className="pr-2 text-xs font-medium text-gray-700"
                          style={{ width: "90px" }}
                        >
                          {team2Name}
                        </td>
                        {setScores.map((set, idx) => {
                          const winner = getSetWinner(set.p1, set.p2);
                          const isWinner =
                            winner === "p2" &&
                            !!set.p2 &&
                            Number(set.p2) > Number(set.p1);
                          return (
                            <td key={"p2-set-" + idx}>
                              <Input
                                inputMode="numeric"
                                className={
                                  "w-12 text-center font-bold rounded border" +
                                  " border-gray-300 bg-white " +
                                  (isWinner
                                    ? " bg-gray-200 border-gray-600 ring-2 ring-gray-500"
                                    : "")
                                }
                                style={{
                                  fontWeight: isWinner ? 800 : 500,
                                  transition: "box-shadow 0.2s, border 0.2s",
                                }}
                                placeholder="0"
                                value={set.p2}
                                onChange={(e) =>
                                  handleSetScoreChange(idx, "p2", e.target.value)
                                }
                              />
                            </td>
                          );
                        })}
                      </tr>
                    </tbody>
                  </table>
                </div>
                <p className="text-xs text-gray-500 text-center">
                  Leave blank for sets that were not played.
                </p>
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  onOpenChange(false);
                  // Don't reset the form here as it will be populated when opened again
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Update Match</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
