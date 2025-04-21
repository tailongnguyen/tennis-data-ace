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
import { useMatches } from "@/hooks/useMatches";

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

const NUM_SETS = 3;

const matchSchema = z.object({
  player1: z.string().min(1, "Player 1 is required"),
  player2: z.string().min(1, "Player 2 is required"),
  // 'score' will be populated via sets input, string sent to backend
  score: z.string().min(1, "Score is required"),
  location: z.string().optional(),
  matchType: z.string().min(1, "Match type is required"),
});

type MatchFormValues = z.infer<typeof matchSchema>;

export function RecordMatchDialog() {
  const [open, setOpen] = useState(false);
  const { players } = usePlayers();
  const { addMatch } = useMatches();

  // Represent each set as [p1, p2] score
  const [setScores, setSetScores] = useState<{ p1: string; p2: string }[]>(
    Array(NUM_SETS).fill({ p1: "", p2: "" })
  );

  const form = useForm<MatchFormValues>({
    resolver: zodResolver(matchSchema),
    defaultValues: {
      player1: "",
      player2: "",
      score: "",
      location: "",
      matchType: "singles",
    },
  });

  function resetSets() {
    setSetScores(Array(NUM_SETS).fill({ p1: "", p2: "" }));
  }

  async function onSubmit(data: MatchFormValues) {
    // Serialize sets to the familiar string format (e.g. 6-4,7-5,2-6)
    const scoreString = setScores
      .filter((s) => s.p1 !== "" && s.p2 !== "")
      .map(({ p1, p2 }) => `${p1}-${p2}`)
      .join(",");

    if (!scoreString) {
      toast.error("Please enter the score for at least one set.");
      return;
    }

    try {
      console.log("Submitting match data:", {
        player1_id: data.player1,
        player2_id: data.player2,
        match_type: data.matchType as 'singles' | 'doubles',
        score: scoreString,
        location: data.location,
      });
      
      await addMatch.mutateAsync({
        player1_id: data.player1,
        player2_id: data.player2,
        match_type: data.matchType as 'singles' | 'doubles',
        score: scoreString,
        location: data.location,
      });
      
      setOpen(false);
      form.reset();
      resetSets();
    } catch (error) {
      console.error("Error submitting match:", error);
      toast.error("Failed to record match");
    }
  }

  function handleSetScoreChange(idx: number, side: "p1" | "p2", val: string) {
    setSetScores((prev) =>
      prev.map((set, i) =>
        i === idx
          ? { ...set, [side]: val.replace(/[^0-9]/g, "").slice(0, 2) }
          : set
      )
    );
  }

  // Find player objects from form values to get their names
  const player1Obj = players.find(
    (p) => p.id === form.watch("player1")
  );
  const player2Obj = players.find(
    (p) => p.id === form.watch("player2")
  );
  const player1Name = player1Obj ? player1Obj.name : "Player 1";
  const player2Name = player2Obj ? player2Obj.name : "Player 2";

  return (
    <Dialog
      open={open}
      onOpenChange={(isOpen) => {
        setOpen(isOpen);
        if (!isOpen) {
          resetSets();
          form.reset();
        }
      }}
    >
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record New Match</DialogTitle>
          <DialogDescription>
            Fill in the match details and scores below.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) =>
              onSubmit({
                ...d,
                score: setScores
                  .filter((s) => s.p1 !== "" && s.p2 !== "")
                  .map((s) => `${s.p1}-${s.p2}`)
                  .join(","),
              })
            )}
            className="space-y-4"
          >
            <FormField
              control={form.control}
              name="matchType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Match Type</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
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
            <div className="grid grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="player1"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player 1</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select player 1" />
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
              <FormField
                control={form.control}
                name="player2"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Player 2</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      value={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select player 2" />
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
                        PLAYERS
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
                        {player1Name}
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
                                // Base: grey border, white bg
                                " border-gray-300 bg-white " +
                                // Highlight if this side won this set and set is not blank/tied
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
                        {player2Name}
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
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>
                    Location{" "}
                    <span className="text-gray-400 text-xs">
                      (optional)
                    </span>
                  </FormLabel>
                  <FormControl>
                    <Input
                      placeholder="Enter match location (optional)"
                      {...field}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpen(false);
                  resetSets();
                  form.reset();
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
