import { useState } from 'react';
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
  const [sortDirection, setSortDirection] = useState<SortDirection>('desc');

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

  const calculatePlayerPoints = (playerId) => {
    let points = 0;
    const filteredMatches = getFilteredMatches();
    
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
  };

  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortDirection(sortDirection === 'desc' ? 'asc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('desc');
    }
  };

  const getSortedPlayers = () => {
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

    return filtered.sort((a, b) => {
      const multiplier = sortDirection === 'desc' ? 1 : -1;
      switch (sortField) {
        case 'points':
          return (b.dynamicPoints - a.dynamicPoints) * multiplier;
        case 'total':
          return (b.total - a.total) * multiplier;
        case 'wins':
          return (b.wins - a.wins) * multiplier;
        case 'draws':
          return (b.draws - a.draws) * multiplier;
        case 'losses':
          return (b.losses - a.losses) * multiplier;
        case 'winRate':
          return (b.winRate - a.winRate) * multiplier;
        case 'notLoseRate':
          return (b.notLoseRate - a.notLoseRate) * multiplier;
        default:
          return 0;
      }
    });
  };

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

  const SortIcon = ({ field }: { field: SortField }) => {
    if (field !== sortField) return <ArrowDown className="ml-1 h-4 w-4 inline opacity-30" />;
    return sortDirection === 'asc' ? 
      <ArrowUp className="ml-1 h-4 w-4 inline" /> : 
      <ArrowDown className="ml-1 h-4 w-4 inline" />;
  };

  const SortableHeader = ({ field, children }: { field: SortField, children: React.ReactNode }) => (
    <TableHead 
      className="cursor-pointer hover:bg-muted/50"
      onClick={() => handleSort(field)}
    >
      <span className="inline-flex items-center">
        {children}
        <SortIcon field={field} />
      </span>
    </TableHead>
  );

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
                <SortableHeader field="points">Points</SortableHeader>
                <SortableHeader field="total">Total</SortableHeader>
                <SortableHeader field="wins">Wins</SortableHeader>
                <SortableHeader field="draws">Draws</SortableHeader>
                <SortableHeader field="losses">Losses</SortableHeader>
                <SortableHeader field="winRate">Win %</SortableHeader>
                <SortableHeader field="notLoseRate">Not Lose %</SortableHeader>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6">
                    Loading rankings...
                  </TableCell>
                </TableRow>
              ) : getSortedPlayers().length === 0 ? (
                <TableRow>
                  <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                    No players found.
                  </TableCell>
                </TableRow>
              ) : (
                getSortedPlayers().map((player, index) => {
                  const rank = index + 1;
                  
                  return (
                    <TableRow key={player.id} className={getRowHighlightClass(rank)}>
                      <TableCell>{getRankDecoration(rank)}</TableCell>
                      <TableCell>{player.name}</TableCell>
                      <TableCell>{player.dynamicPoints}</TableCell>
                      <TableCell>{player.total}</TableCell>
                      <TableCell>{player.wins}</TableCell>
                      <TableCell>{player.draws}</TableCell>
                      <TableCell>{player.losses}</TableCell>
                      <TableCell>{player.winRate.toFixed(1)}%</TableCell>
                      <TableCell>{player.notLoseRate.toFixed(1)}%</TableCell>
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
