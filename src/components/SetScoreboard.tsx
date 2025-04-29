import { Input } from "@/components/ui/input";

interface SetScore {
  p1: string;
  p2: string;
}

interface SetScoreboardProps {
  setScores: SetScore[];
  onSetScoreChange: (idx: number, side: "p1" | "p2", val: string) => void;
  team1Name: string;
  team2Name: string;
}

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

export function SetScoreboard({ setScores, onSetScoreChange, team1Name, team2Name }: SetScoreboardProps) {
  return (
    <div>
      <div className="mb-2">
        <h3 className="text-sm font-medium">Set Scores</h3>
        <div className="text-xs text-muted-foreground mb-4">
          Enter the scores for each set. The team with more set wins will be marked as the winner.
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full table-auto">
          <thead>
            <tr>
              <th className="px-2 py-1 text-left text-xs font-medium">Set</th>
              <th className="px-2 py-1 text-left text-xs font-medium">{team1Name}</th>
              <th className="px-2 py-1 text-left text-xs font-medium">{team2Name}</th>
            </tr>
          </thead>
          <tbody>
            {setScores.map((set, idx) => {
              const winner = getSetWinner(set.p1, set.p2);
              const isWinnerP1 = winner === "p1";
              const isWinnerP2 = winner === "p2";
              return (
                <tr key={idx}>
                  <td className="px-2 py-1 text-center">{idx + 1}</td>
                  <td className="px-2 py-1">
                    <Input
                      inputMode="numeric"
                      className={
                        "w-12 text-center font-bold rounded border" +
                        " border-gray-300 bg-white " +
                        (isWinnerP1 ? " bg-gray-200 border-gray-600 ring-2 ring-gray-500" : "")
                      }
                      style={{
                        fontWeight: isWinnerP1 ? 800 : 500,
                        transition: "box-shadow 0.2s, border 0.2s",
                      }}
                      placeholder="0"
                      value={set.p1}
                      onChange={(e) => onSetScoreChange(idx, "p1", e.target.value)}
                    />
                  </td>
                  <td className="px-2 py-1">
                    <Input
                      inputMode="numeric"
                      className={
                        "w-12 text-center font-bold rounded border" +
                        " border-gray-300 bg-white " +
                        (isWinnerP2 ? " bg-gray-200 border-gray-600 ring-2 ring-gray-500" : "")
                      }
                      style={{
                        fontWeight: isWinnerP2 ? 800 : 500,
                        transition: "box-shadow 0.2s, border 0.2s",
                      }}
                      placeholder="0"
                      value={set.p2}
                      onChange={(e) => onSetScoreChange(idx, "p2", e.target.value)}
                    />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-xs text-muted-foreground text-center mb-2">
        Leave blank for sets that were not played.
      </p>
    </div>
  );
}
