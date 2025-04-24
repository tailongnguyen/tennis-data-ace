
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

const matchSchema = z.object({
  matchType: z.enum(['singles', 'doubles']),
  player1: z.string().min(1, "Player 1 is required"),
  player2: z.string().min(1, "Player 2 is required"),
  player3: z.string().min(1, "Player 3 is required"),
  player4: z.string().optional(),
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
      player1: "",
      player2: "",
      player3: "",
    },
  });

  const watchMatchType = form.watch("matchType");

  function onSubmit(values: MatchFormValues) {
    // Check if scores are entered
    const validSets = setScores.filter((s) => s.p1 !== "" && s.p2 !== "");
    const scoreString = validSets
      .map(({ p1, p2 }) => `${p1}-${p2}`)
      .join(",");

    if (validSets.length === 0) {
      toast.error("Please enter at least one set score");
      return;
    }

    const matchWinner = determineMatchWinners(setScores);
    
    // Create match data based on who won
    const matchData: CreateMatchData = {
      match_type: values.matchType,
      score: scoreString,
      winner1_id: matchWinner === "p1" ? values.player1 : values.player3,
      winner2_id: values.matchType === 'doubles' ? 
        (matchWinner === "p1" ? values.player2 : values.player4) || null : null,
      loser1_id: matchWinner === "p1" ? values.player3 : values.player1,
      loser2_id: values.matchType === 'doubles' ? 
        (matchWinner === "p1" ? values.player4 : values.player2) || null : null,
    };

    console.log("Submitting match data:", matchData);

    addMatch.mutate(matchData, {
      onSuccess: () => {
        setOpen(false);
        form.reset();
        setSetScores(Array(3).fill({ p1: "", p2: "" }));
      },
      onError: (error) => {
        console.error("Error submitting match:", error);
        toast.error("Failed to record match");
      }
    });
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
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record New Match</DialogTitle>
          <DialogDescription>Fill in the match details and scores below.</DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <Select onValueChange={field.onChange} value={field.value}>
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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
                      <Select onValueChange={field.onChange} value={field.value || ""}>
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
              <p className="text-xs text-muted-foreground text-center mb-2">
                Leave blank for sets that were not played.
              </p>
            </div>
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  form.reset();
                  setSetScores(Array(3).fill({ p1: "", p2: "" }));
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Record Match</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
