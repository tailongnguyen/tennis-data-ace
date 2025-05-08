import { useState } from "react";
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
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
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

const matchSchema = z.object({
  matchType: z.enum(['singles', 'doubles']),
  player1: z.string().min(1, "Player 1 is required"),
  player2: z.string().min(1, "Player 2 is required").optional().or(z.string()),
  player3: z.string().min(1, "Player 3 is required"),
  player4: z.string().min(1, "Player 4 is required").optional().or(z.string()),
  matchDate: z.date().default(new Date()),
});

type MatchFormValues = z.infer<typeof matchSchema>;

export function RecordMatchDialog() {
  const [open, setOpen] = useState(false);
  const { players } = usePlayers();
  const { addMatch } = useMatches();
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

  const watchMatchType = form.watch("matchType");

  const onSubmit = async (values: MatchFormValues) => {
    try {
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

      let matchData: CreateMatchData;

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

      console.log("Submitting match data:", matchData);

      addMatch.mutate(matchData, {
        onSuccess: () => {
          setOpen(false);
          form.reset();
          setSetScores(Array(3).fill({ p1: "", p2: "" }));
          toast.success("Match recorded successfully");
        },
        onError: (error) => {
          console.error("Error submitting match:", error);
          toast.error("Failed to record match");
        }
      });
    } catch (error) {
      console.error("Error submitting match:", error);
      toast.error("Failed to record match");
    }
  }

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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader className="pb-2">
          <DialogTitle>Record New Match</DialogTitle>
          <DialogDescription>Fill in the match details and scores below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-2">
            {/* Match details row - Date and Type */}
            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="matchDate"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Match Date</FormLabel>
                    <FormControl>
                      <Input 
                        type="date"
                        className="h-9"
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
              
              <FormField
                control={form.control}
                name="matchType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel className="text-xs">Match Type</FormLabel>
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
                        <SelectTrigger className="h-9">
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
            
            {/* Team 1 */}
            <div className="bg-slate-50 p-2 rounded-md">
              <h4 className="text-sm font-semibold mb-2">Team 1</h4>
              <div className="grid grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name="player1"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Player 1</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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
                        <FormLabel className="text-xs">Player 2</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
            </div>

            {/* Team 2 */}
            <div className="bg-slate-50 p-2 rounded-md">
              <h4 className="text-sm font-semibold mb-2">Team 2</h4>
              <div className="grid grid-cols-1 gap-2">
                <FormField
                  control={form.control}
                  name="player3"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-xs">Player 1</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger className="h-9">
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
                        <FormLabel className="text-xs">Player 2</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-9">
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
            </div>

            {/* Compact Scoreboard */}
            <div className="mt-3">
              <FormLabel className="text-xs font-semibold block mb-1">Set Scores</FormLabel>
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                <table className="w-full text-sm border-collapse">
                  <thead>
                    <tr>
                      <th className="pb-1 text-xs font-medium text-gray-500" style={{ width: "40%" }}>Team</th>
                      {setScores.map((_, i) => (
                        <th key={"set-head-" + i} className="pb-1 text-xs font-medium text-gray-500 text-center">
                          Set {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pr-2 text-xs font-medium">
                        {team1Name}
                      </td>
                      {setScores.map((set, idx) => {
                        const winner = getSetWinner(set.p1, set.p2);
                        const isWinner = winner === "p1" && !!set.p1 && Number(set.p1) > Number(set.p2);
                        return (
                          <td key={"p1-set-" + idx} className="text-center">
                            <Input
                              inputMode="numeric"
                              className={`w-10 h-7 text-center font-medium py-0 px-0 text-sm rounded ${
                                isWinner ? "bg-gray-100 border-gray-500" : ""
                              }`}
                              placeholder="0"
                              value={set.p1}
                              onChange={(e) => handleSetScoreChange(idx, "p1", e.target.value)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                    <tr>
                      <td className="pr-2 pt-1 text-xs font-medium">
                        {team2Name}
                      </td>
                      {setScores.map((set, idx) => {
                        const winner = getSetWinner(set.p1, set.p2);
                        const isWinner = winner === "p2" && !!set.p2 && Number(set.p2) > Number(set.p1);
                        return (
                          <td key={"p2-set-" + idx} className="text-center pt-1">
                            <Input
                              inputMode="numeric"
                              className={`w-10 h-7 text-center font-medium py-0 px-0 text-sm rounded ${
                                isWinner ? "bg-gray-100 border-gray-500" : ""
                              }`}
                              placeholder="0"
                              value={set.p2}
                              onChange={(e) => handleSetScoreChange(idx, "p2", e.target.value)}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground mt-1 mb-2">
                Leave blank for sets that were not played.
              </p>
            </div>

            <div className="flex justify-end space-x-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setSetScores(Array(3).fill({ p1: "", p2: "" }));
                }}
              >
                Cancel
              </Button>
              <Button type="submit" size="sm">Record Match</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
