import { useState, useMemo, useCallback } from 'react';
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Search, Filter, Calendar, Crown, Medal, Trophy, ArrowUp, ArrowDown } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches } from "@/hooks/useMatches";
import { addDays, format, isWithinInterval, parseISO, subDays } from "date-fns";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { DateRange } from "react-day-picker";
import { Link } from "react-router-dom";
import { Avatar } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";

const dateRanges = {
  '30d': { label: 'Last 30 Days', days: 30 },
  '90d': { label: 'Last 90 Days', days: 90 },
  '1y': { label: 'Last Year', days: 365 },
  'custom': { label: 'Custom Range', days: null }
};

type SortField = 'points' | 'total' | 'wins' | 'draws' | 'losses' | 'winRate' | 'notLoseRate';
type SortDirection = 'asc' | 'desc';

const Rankings = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [matchType, setMatchType] = useState("all");
  const [dateRange, setDateRange] = useState('30d');
  const [showFilters, setShowFilters] = useState(true);
  const [customDateRange, setCustomDateRange] = useState<DateRange>({
    from: undefined,
    to: undefined
  });
  const [sortField, setSortField] = useState<SortField>('points');

  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();

  const isLoading = playersLoading || matchesLoading;

  // Memoize filtered matches to avoid recalculation on every render
  const filteredMatches = useMemo(() => {
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
      
      const matchTypeFilter = matchType === 'all' || match.match_type === matchType;
      
      return dateInRange && matchTypeFilter;
    });
  }, [matches, dateRange, matchType, customDateRange]);

  const isDrawMatch = useCallback((match) => {
    return match.score === '5-5' || match.score === '6-6';
  }, []);

  const getPlayerMatches = useCallback((playerId) => {
    return filteredMatches.filter(match => 
      match.winner1_id === playerId || 
      match.winner2_id === playerId || 
      match.loser1_id === playerId || 
      match.loser2_id === playerId
    );
  }, [filteredMatches]);

  const getPlayerWins = useCallback((playerId) => {
    return getPlayerMatches(playerId).filter(match => 
      !isDrawMatch(match) && (match.winner1_id === playerId || match.winner2_id === playerId)
    ).length;
  }, [getPlayerMatches, isDrawMatch]);

  const getPlayerDraws = useCallback((playerId) => {
    return getPlayerMatches(playerId).filter(match => isDrawMatch(match)).length;
  }, [getPlayerMatches, isDrawMatch]);

  const getPlayerLosses = useCallback((playerId) => {
    return getPlayerMatches(playerId).filter(match => 
      !isDrawMatch(match) && (match.loser1_id === playerId || match.loser2_id === playerId)
    ).length;
  }, [getPlayerMatches, isDrawMatch]);

  const calculateWinRate = useCallback((playerId) => {
    const totalMatches = getPlayerMatches(playerId).length;
    if (totalMatches === 0) return 0;
    
    const wins = getPlayerWins(playerId);
    return (wins / totalMatches) * 100;
  }, [getPlayerMatches, getPlayerWins]);

  const calculateNotLoseRate = useCallback((playerId) => {
    const totalMatches = getPlayerMatches(playerId).length;
    if (totalMatches === 0) return 0;
    
    const wins = getPlayerWins(playerId);
    const draws = getPlayerDraws(playerId);
    
    return ((wins + draws) / totalMatches) * 100;
  }, [getPlayerMatches, getPlayerWins, getPlayerDraws]);

  const calculatePlayerPoints = useCallback((playerId) => {
    let points = 0;
    
    filteredMatches.forEach(match => {
      if (!isDrawMatch(match) && (match.winner1_id === playerId || match.winner2_id === playerId)) {
        points += 3;
      }
      
      else if (isDrawMatch(match) && 
        (match.winner1_id === playerId || match.winner2_id === playerId || 
         match.loser1_id === playerId || match.loser2_id === playerId)) {
        points += 1;
      }
      
      else if (!isDrawMatch(match) && (match.loser1_id === playerId || match.loser2_id === playerId)) {
        points -= 1;
      }
    });
    
    return points;
  }, [filteredMatches, isDrawMatch]);

  // Memoize the entire player calculation and sorting process to prevent recalculation on every render
  const sortedPlayers = useMemo(() => {
  // First filter players by search query
  const filtered = players
    .filter(player => 
      player.name.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .map(player => {
      const wins = getPlayerWins(player.id);
      const draws = getPlayerDraws(player.id);
      const losses = getPlayerLosses(player.id);
      const totalMatches = wins + draws + losses;
      const winRate = totalMatches > 0 ? (wins / totalMatches) * 100 : 0;
      const notLoseRate = totalMatches > 0 ? ((wins + draws) / totalMatches) * 100 : 0;
      
      return {
        ...player,
        dynamicPoints: calculatePlayerPoints(player.id),
        wins,
        draws,
        losses,
        total: totalMatches,
        winRate,
        notLoseRate
      };
    });

  // Always sort descending
  return filtered.sort((a, b) => {
    switch (sortField) {
      case 'points':
        return b.dynamicPoints - a.dynamicPoints;
      case 'total':
        return b.total - a.total;
      case 'wins':
        return b.wins - a.wins;
      case 'draws':
        return b.draws - a.draws;
      case 'losses':
        return b.losses - a.losses;
      case 'winRate':
        return b.winRate - a.winRate;
      case 'notLoseRate':
        return b.notLoseRate - a.notLoseRate;
      default:
        return 0;
    }
  });
}, [players, searchQuery, sortField, getPlayerWins, getPlayerDraws, getPlayerLosses, calculatePlayerPoints]);

  const getRankDecoration = (rank) => {
    switch(rank) {
      case 1:
        return (
          <div className="inline-flex items-center">
            <span className="mr-1">1</span>
            <Crown className="h-5 w-5 text-yellow-500" />
          </div>
        );
      case 2:
        return (
          <div className="inline-flex items-center">
            <span className="mr-1">2</span>
            <Medal className="h-5 w-5 text-gray-400" />
          </div>
        );
      case 3:
        return (
          <div className="inline-flex items-center">
            <span className="mr-1">3</span>
            <Trophy className="h-5 w-5 text-amber-700" />
          </div>
        );
      default:
        return rank;
    }
  };

  const getRowHighlightClass = (rank) => {
    switch(rank) {
      case 1:
        return "bg-yellow-50";
      case 2:
        return "bg-[#f1f3f8]";
      case 3:
        return "bg-[#fbf4e3]";
      default:
        return "";
    }
  };


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
          <CardDescription>Dynamic rankings based on match performance (Win: +3 points, Draw: +1 point, Loss: -1 point) within the selected date range</CardDescription>
        </CardHeader>
        <CardContent>
          <div className={cn("flex flex-wrap gap-2 mb-4", !showFilters && "hidden")}>            <div className="flex flex-col flex-1">
  <Label htmlFor="player-search" className="block mb-1 font-medium text-sm text-gray-700">Search players</Label>
  <div className="relative w-full">
    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
    <Input
      id="player-search"
      placeholder="Search players..."
      className="pl-8"
      value={searchQuery}
      onChange={(e) => setSearchQuery(e.target.value)}
    />
  </div>
</div>
            <div>
              <Label htmlFor="sort-column" className="block mb-1 font-medium text-sm text-gray-700">Sort by column</Label>
              <Select
                value={sortField}
                onValueChange={value => setSortField(value as SortField)}
              >
                <SelectTrigger id="sort-column" className="w-[180px]">
                  <SelectValue placeholder="Sort by" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="points">Points</SelectItem>
                  <SelectItem value="total">Total</SelectItem>
                  <SelectItem value="wins">Wins</SelectItem>
                  <SelectItem value="draws">Draws</SelectItem>
                  <SelectItem value="losses">Losses</SelectItem>
                  <SelectItem value="winRate">Win %</SelectItem>
                  <SelectItem value="notLoseRate">Not Lose %</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="match-type" className="block mb-1 font-medium text-sm text-gray-700">Match type</Label>
              <Select
                value={matchType}
                onValueChange={setMatchType}
              >
                <SelectTrigger id="match-type" className="w-[180px]">
                  <SelectValue placeholder="Mode" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="singles">Singles</SelectItem>
                  <SelectItem value="doubles">Doubles</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="date-range" className="block mb-1 font-medium text-sm text-gray-700">Date range</Label>
              <Select
                value={dateRange}
                onValueChange={setDateRange}
              >
                <SelectTrigger id="date-range" className="w-[180px]">
                  <SelectValue placeholder="Date Range" />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(dateRanges).map(([key, { label }]) => (
                    <SelectItem key={key} value={key}>{label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {dateRange === 'custom' && (
              <div>
                <Label htmlFor="custom-date-range" className="block mb-1 font-medium text-sm text-gray-700">Custom date range</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button id="custom-date-range" variant="outline" className="w-[280px] justify-start text-left font-normal">
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
              </div>
            )}
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableCell>Rank</TableCell>
                <TableCell>Player</TableCell>
                <TableCell>Points</TableCell>
                <TableCell>Total</TableCell>
                <TableCell>Wins</TableCell>
                <TableCell>Draws</TableCell>
                <TableCell>Losses</TableCell>
                <TableCell>Win %</TableCell>
                <TableCell>Not Lose %</TableCell>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedPlayers.map((player, index) => (
                <TableRow key={player.id} className={getRowHighlightClass(index + 1)}>
                  <TableCell>
                    {getRankDecoration(index + 1)}
                  </TableCell>
                  <TableCell>
                    <Link to={`/players/${player.id}`}>
                      <span>{player.name}</span>
                    </Link>
                  </TableCell>
                  <TableCell>{player.dynamicPoints}</TableCell>
                  <TableCell>{player.total}</TableCell>
                  <TableCell>{player.wins}</TableCell>
                  <TableCell>{player.draws}</TableCell>
                  <TableCell>{player.losses}</TableCell>
                  <TableCell>{player.winRate.toFixed(2)}%</TableCell>
                  <TableCell>{player.notLoseRate.toFixed(2)}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

export default Rankings;
