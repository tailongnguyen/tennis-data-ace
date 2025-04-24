
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches } from "@/hooks/useMatches";

const Rankings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [matchType, setMatchType] = useState("all");
  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();

  // Filter players based on search query and match type
  const filteredPlayers = players
    .filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.ranking_points ?? 0) - (a.ranking_points ?? 0));

  // Calculate win rate for each player
  const calculateWinRate = (playerId) => {
    const playerMatches = matches.filter(match => 
      match.winner1_id === playerId || 
      match.winner2_id === playerId || 
      match.loser1_id === playerId || 
      match.loser2_id === playerId
    );
    
    if (playerMatches.length === 0) return 0;
    
    const wins = matches.filter(match => 
      match.winner1_id === playerId || match.winner2_id === playerId
    ).length;
    
    return (wins / playerMatches.length) * 100;
  };

  const isLoading = playersLoading || matchesLoading;

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Rankings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
          <CardDescription>Current rankings based on match performance (Win: +3 points, Loss: -1 point)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search players..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
            <Select
              value={matchType}
              onValueChange={setMatchType}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Mode" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Matches</SelectItem>
                <SelectItem value="singles">Singles</SelectItem>
                <SelectItem value="doubles">Doubles</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="default" className="bg-green-500 text-white hover:bg-green-600">
              Filter
            </Button>
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Total Matches</TableHead>
                <TableHead>Win %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6">
                    Loading rankings...
                  </TableCell>
                </TableRow>
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="text-center py-6 text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player, index) => {
                  const winRate = calculateWinRate(player.id);
                  const totalMatches = matches.filter(match => 
                    match.winner1_id === player.id || 
                    match.winner2_id === player.id || 
                    match.loser1_id === player.id || 
                    match.loser2_id === player.id
                  ).length;
                  
                  return (
                    <TableRow key={player.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.ranking_points ?? 0}</TableCell>
                      <TableCell>{totalMatches}</TableCell>
                      <TableCell>
                        {winRate.toFixed(1)}%
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default Rankings;
