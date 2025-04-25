
import { useState } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Calendar } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches } from "@/hooks/useMatches";
import { addDays, format, isWithinInterval, parseISO, subDays } from "date-fns";
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
  const [showFilters, setShowFilters] = useState(false);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });

  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();

  const isLoading = playersLoading || matchesLoading;

  const getFilteredMatches = () => {
    const now = new Date();
    let startDate: Date;
    let endDate = now;

    if (dateRange === 'custom' && customDateRange.from && customDateRange.to) {
      startDate = customDateRange.from;
      endDate = addDays(customDateRange.to, 1);
    } else {
      const days = dateRanges[dateRange]?.days || 30;
      startDate = subDays(now, days);
    }

    return matches.filter(match => {
      const matchDate = parseISO(match.match_date);
      const dateInRange = isWithinInterval(matchDate, { start: startDate, end: endDate });
      
      // Apply match type filter
      const matchTypeFilter = matchType === 'all' || match.match_type === matchType;
      
      return dateInRange && matchTypeFilter;
    });
  };

  const isDrawMatch = (match) => {
    return match.score === '5-5' || match.score === '6-6';
  };

  const getPlayerMatches = (playerId) => {
    return getFilteredMatches().filter(match => 
      match.winner1_id === playerId || 
      match.winner2_id === playerId || 
      match.loser1_id === playerId || 
      match.loser2_id === playerId
    );
  };

  const getPlayerWins = (playerId) => {
    return getPlayerMatches(playerId).filter(match => 
      !isDrawMatch(match) && (match.winner1_id === playerId || match.winner2_id === playerId)
    ).length;
  };

  const getPlayerDraws = (playerId) => {
    return getPlayerMatches(playerId).filter(match => isDrawMatch(match)).length;
  };

  const getPlayerLosses = (playerId) => {
    return getPlayerMatches(playerId).filter(match => 
      !isDrawMatch(match) && (match.loser1_id === playerId || match.loser2_id === playerId)
    ).length;
  };

  const calculateWinRate = (playerId) => {
    const totalMatches = getPlayerMatches(playerId).length;
    if (totalMatches === 0) return 0;
    
    const wins = getPlayerWins(playerId);
    return (wins / totalMatches) * 100;
  };

  const calculateNotLoseRate = (playerId) => {
    const totalMatches = getPlayerMatches(playerId).length;
    if (totalMatches === 0) return 0;
    
    const wins = getPlayerWins(playerId);
    const draws = getPlayerDraws(playerId);
    
    return ((wins + draws) / totalMatches) * 100;
  };

  // Calculate dynamic points for each player based on filtered matches
  const calculatePlayerPoints = (playerId) => {
    let points = 0;
    const filteredMatches = getFilteredMatches();
    
    filteredMatches.forEach(match => {
      // +3 points for wins
      if (!isDrawMatch(match) && (match.winner1_id === playerId || match.winner2_id === playerId)) {
        points += 3;
      }
      
      // -1 point for losses
      if (!isDrawMatch(match) && (match.loser1_id === playerId || match.loser2_id === playerId)) {
        points -= 1;
      }
    });
    
    return points;
  };

  const filteredPlayers = players
    .filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map(player => ({
      ...player,
      dynamicPoints: calculatePlayerPoints(player.id)
    }))
    .sort((a, b) => b.dynamicPoints - a.dynamicPoints);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Rankings</h1>
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setShowFilters(!showFilters)}
        >
          <Filter className="h-4 w-4" />
          {showFilters ? 'Hide Filters' : 'Show Filters'}
        </Button>
      </div>
      
      <Card>
        <CardHeader>
          <CardTitle>Player Rankings</CardTitle>
          <CardDescription>Dynamic rankings based on match performance (Win: +3 points, Loss: -1 point) within the selected date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("flex flex-wrap gap-2 mb-4", !showFilters && "hidden")}>
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
                <TableHead>Total</TableHead>
                <TableHead>Wins</TableHead>
                <TableHead>Draws</TableHead>
                <TableHead>Losses</TableHead>
                <TableHead>Win %</TableHead>
                <TableHead>Not Lose %</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">
                    Loading rankings...
                  </TableCell>
                </TableRow>
              ) : filteredPlayers.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredPlayers.map((player, index) => {
                  const wins = getPlayerWins(player.id);
                  const draws = getPlayerDraws(player.id);
                  const losses = getPlayerLosses(player.id);
                  const totalMatches = wins + draws + losses;
                  const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
                  const notLoseRate = totalMatches > 0 ? ((wins + draws) / totalMatches) * 100 : 0;
                  
                  return (
                    <TableRow key={player.id}>
                      <TableCell>{index + 1}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.dynamicPoints}</TableCell>
                      <TableCell>{totalMatches}</TableCell>
                      <TableCell>{wins}</TableCell>
                      <TableCell>{draws}</TableCell>
                      <TableCell>{losses}</TableCell>
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
