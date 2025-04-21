
import { useState } from "react";
import { useForm } from "react-hook-form";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { PlusCircle } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { usePlayers } from "@/hooks/usePlayers";

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
      .filter(s => s.p1 !== "" && s.p2 !== "")
      .map(({ p1, p2 }) => `${p1}-${p2}`)
      .join(",");
    
    if (!scoreString) {
      toast.error("Please enter the score for at least one set.");
      return;
    }

    try {
      // TODO: Add Supabase integration here
      toast.success("Match recorded successfully");
      setOpen(false);
      form.reset();
      resetSets();
    } catch (error) {
      toast.error("Failed to record match");
    }
  }

  function handleSetScoreChange(idx: number, side: "p1" | "p2", val: string) {
    setSetScores(prev =>
      prev.map((set, i) =>
        i === idx ? { ...set, [side]: val.replace(/[^0-9]/g, "").slice(0,2) } : set
      )
    );
  }

  return (
    <Dialog open={open} onOpenChange={(isOpen) => {
      setOpen(isOpen);
      if (!isOpen) {
        resetSets();
        form.reset();
      }
    }}>
      <DialogTrigger asChild>
        <Button>
          <PlusCircle className="mr-2 h-4 w-4" />
          Record Match
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Record New Match</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form
            onSubmit={form.handleSubmit((d) =>
              onSubmit({ ...d, score: setScores
                  .filter(s => s.p1 !== "" && s.p2 !== "")
                  .map(s => `${s.p1}-${s.p2}`).join(",")
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
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                    <Select onValueChange={field.onChange} value={field.value}>
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
                <table className="w-full max-w-xs mx-auto border-separate" style={{ borderSpacing: "0.5rem" }}>
                  <thead>
                    <tr>
                      <th className="px-2 text-center text-xs text-gray-500 font-semibold uppercase">
                        Players
                      </th>
                      {setScores.map((_, i) => (
                        <th key={"set-head-" + i} className="text-center text-xs text-purple-800 font-bold">
                          Set {i + 1}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td className="pr-2 text-xs font-medium text-gray-700" style={{ width: "90px" }}>
                        Player 1
                      </td>
                      {setScores.map((set, idx) => (
                        <td key={"p1-set-" + idx}>
                          <Input
                            inputMode="numeric"
                            className="w-12 text-center font-bold rounded border border-purple-400 focus:border-purple-800 bg-white"
                            placeholder="0"
                            value={set.p1}
                            onChange={e => handleSetScoreChange(idx, "p1", e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                    <tr>
                      <td className="pr-2 text-xs font-medium text-gray-700" style={{ width: "90px" }}>
                        Player 2
                      </td>
                      {setScores.map((set, idx) => (
                        <td key={"p2-set-" + idx}>
                          <Input
                            inputMode="numeric"
                            className="w-12 text-center font-bold rounded border border-purple-400 focus:border-purple-800 bg-white"
                            placeholder="0"
                            value={set.p2}
                            onChange={e => handleSetScoreChange(idx, "p2", e.target.value)}
                          />
                        </td>
                      ))}
                    </tr>
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-muted-foreground text-center mb-2">Leave blank for sets that were not played.</p>
            </div>
            <FormField
              control={form.control}
              name="location"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Location <span className="text-gray-400">(optional)</span></FormLabel>
                  <FormControl>
                    <Input placeholder="Enter match location (optional)" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <div className="flex justify-end space-x-2">
              <Button type="button" variant="outline" onClick={() => {
                setOpen(false);
                resetSets();
                form.reset();
              }}>
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
