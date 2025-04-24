
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches } from "@/hooks/useMatches";
import { addDays, differenceInDays, format, isWithinInterval, parseISO, subDays } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";

const dateRanges = {
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  '1y': { label: 'Last Year', days: 365 },
  'custom': { label: 'Custom Range', days: null }
};

const Rankings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [matchType, setMatchType] = useState("all");
  const [dateRange, setDateRange] = useState('30d');
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();

  // Combine loading states
  const isLoading = playersLoading || matchesLoading;

  // Filter matches based on date range
  const getFilteredMatches = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
      startDate = customDateRange.from;
      endDate = addDays(customDateRange.to, 1); // Include the end date
    } else {
      const days = dateRanges[dateRange]?.days || 30;
      startDate = subDays(now, days);
    }

    return matches.filter(match => {
      const matchDate = parseISO(match.match_date);
      return isWithinInterval(matchDate, { start: startDate, end: endDate });
    });
  };

  // Calculate win rate for each player
  const calculateWinRate = (playerId) => {
    const playerMatches = getFilteredMatches().filter(match => 
      match.winner1_id === playerId || 
      match.winner2_id === playerId || 
      match.loser1_id === playerId || 
      match.loser2_id === playerId
    );
    
    if (playerMatches.length === 0) return 0;
    
    const wins = getFilteredMatches().filter(match => 
      match.winner1_id === playerId || match.winner2_id === playerId
    ).length;
    
    return (wins / playerMatches.length) * 100;
  };

  // Calculate not lose percentage (wins + draws) / total matches
  const calculateNotLoseRate = (playerId) => {
    const playerMatches = getFilteredMatches().filter(match => 
      match.winner1_id === playerId || 
      match.winner2_id === playerId || 
      match.loser1_id === playerId || 
      match.loser2_id === playerId
    );
    
    if (playerMatches.length === 0) return 0;
    
    const drawnMatches = getFilteredMatches().filter(match => 
      (match.score === '5-5' || match.score === '6-6') && 
      (match.winner1_id === playerId || match.winner2_id === playerId)
    ).length;

    const wins = getFilteredMatches().filter(match => 
      match.winner1_id === playerId || match.winner2_id === playerId
    ).length;

    return ((wins + drawnMatches) / playerMatches.length) * 100;
  };

  // Filter players based on search query and match type
  const filteredPlayers = players
    .filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => (b.ranking_points ?? 0) - (a.ranking_points ?? 0));

  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Rankings</h1>
      
      <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
          <CardDescription>Current rankings based on match performance (Win: +3 points, Loss: -1 point)</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
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
            <Select
              value={dateRange}
              onValueChange={setDateRange}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Date Range" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(dateRanges).map(([key, { label }]) => (
                  <SelectItem key={key} value={key}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            {dateRange === 'custom' && (
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className="w-[280px] justify-start text-left font-normal">
                    <Calendar className="mr-2 h-4 w-4" />
                    {customDateRange.from ? (
                      customDateRange.to ? (
                        <>
                          {format(customDateRange.from, "LLL dd, y")} -{" "}
                          {format(customDateRange.to, "LLL dd, y")}
                        </>
                      ) : (
                        format(customDateRange.from, "LLL dd, y")
                      )
                    ) : (
                      <span>Pick a date range</span>
                    )}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <CalendarComponent
                    initialFocus
                    mode="range"
                    defaultMonth={customDateRange.from}
                    selected={customDateRange}
                    onSelect={setCustomDateRange}
                    numberOfMonths={2}
                    className={cn("p-3 pointer-events-auto")}
                  />
                </PopoverContent>
              </Popover>
            )}
          </div>
          
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Rank</TableHead>
                <TableHead>Player</TableHead>
                <TableHead>Points</TableHead>
                <TableHead>Total Matches</TableHead>
                <TableHead>Win %</TableHead>
                <TableHead>Not Lose %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6">
                    Loading rankings...
                  </TableCell>
                </TableRow>
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-6 text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player, index) => {
                  const winRate = calculateWinRate(player.id);
                  const notLoseRate = calculateNotLoseRate(player.id);
                  const totalMatches = getFilteredMatches().filter(match => 
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
                      <TableCell>{winRate.toFixed(1)}%</TableCell>
                      <TableCell>{notLoseRate.toFixed(1)}%</TableCell>
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
