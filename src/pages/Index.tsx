
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Users, Calendar, Trophy as TrophyIcon, BarChart3 } from "lucide-react";
import { useMatches } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { format } from "date-fns";

const Index = () => {
  const { matches, isLoading: matchesLoading } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();

  // Get total number of players
  const totalPlayers = players.length;

  // Get total number of matches
  const totalMatches = matches.length;

  // Get top ranked player based on most recent matches
  const topPlayer = players.length > 0 
    ? players.reduce((prev, current) => {
        const prevMatches = matches.filter(match => 
          match.winner1_id === prev.id || match.winner2_id === prev.id
        ).length;
        
        const currentMatches = matches.filter(match => 
          match.winner1_id === current.id || match.winner2_id === current.id
        ).length;
        
        return currentMatches > prevMatches ? current : prev;
      })
    : null;

  // Get recent matches
  const recentMatches = matches
    .slice(0, 5)
    .sort((a, b) => new Date(b.match_date).getTime() - new Date(a.match_date).getTime());

  if (matchesLoading || playersLoading) {
    return <div>Loading...</div>;
  }

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Dashboard</h1>
      <p className="text-muted-foreground">Welcome to Tennis Tracker, your tool for managing players, matches, and statistics.</p>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Players</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalPlayers}</div>
            <p className="text-xs text-muted-foreground">
              {totalPlayers === 0 ? "Add your first player to get started" : "Active players in the system"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Matches Recorded</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalMatches}</div>
            <p className="text-xs text-muted-foreground">
              {totalMatches === 0 ? "Record your first match" : "Total matches played"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Top Player</CardTitle>
            <TrophyIcon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {topPlayer ? topPlayer.name : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {topPlayer 
                ? `${matches.filter(m => m.winner1_id === topPlayer.id || m.winner2_id === topPlayer.id).length} wins` 
                : "No matches yet"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Performance</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {totalMatches > 0 ? `${((totalMatches / totalPlayers) || 0).toFixed(1)}` : "-"}
            </div>
            <p className="text-xs text-muted-foreground">
              {totalMatches > 0 ? "Matches per player" : "No data available"}
            </p>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="recent" className="space-y-4">
        <TabsList>
          <TabsTrigger value="recent">Recent Matches</TabsTrigger>
          <TabsTrigger value="upcoming">Upcoming</TabsTrigger>
        </TabsList>
        <TabsContent value="recent" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Matches</CardTitle>
              <CardDescription>
                Records of your latest tennis matches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentMatches.length > 0 ? (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Team 1</TableHead>
                      <TableHead>Team 2</TableHead>
                      <TableHead>Score</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentMatches.map((match) => (
                      <TableRow key={match.id}>
                        <TableCell>{format(new Date(match.match_date), 'MMM d, yyyy')}</TableCell>
                        <TableCell className="capitalize">{match.match_type}</TableCell>
                        <TableCell>
                          {match.winner1.name}
                          {match.winner2 && ` / ${match.winner2.name}`}
                        </TableCell>
                        <TableCell>
                          {match.loser1.name}
                          {match.loser2 && ` / ${match.loser2.name}`}
                        </TableCell>
                        <TableCell>{match.score}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              ) : (
                <p className="text-sm text-muted-foreground">No recent matches. Add your first match to see it here.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="upcoming" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Upcoming Matches</CardTitle>
              <CardDescription>
                Schedule of your upcoming tennis matches.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">No upcoming matches scheduled.</p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Index;
