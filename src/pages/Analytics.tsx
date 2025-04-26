import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  ResponsiveContainer, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Line,
  Pie,
  Cell
} from "recharts";
import { useMatches } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { format, subDays, parseISO, isWithinInterval, isAfter } from "date-fns";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Activity, BarChart3, PieChartIcon, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TableScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#10B981', '#EAB308'];

const Analytics = () => {
  type H2hSortField = "total" | "wins" | "draws" | "losses" | "winRate" | "notLoseRate";
  type PartnerSortField = "total" | "wins" | "draws" | "losses" | "winRate" | "notLoseRate";

  const [h2hSearch, setH2hSearch] = useState("");
  const [h2hSortField, setH2hSortField] = useState<H2hSortField>("total");
  const [partnerSearch, setPartnerSearch] = useState("");
  const [partnerSortField, setPartnerSortField] = useState<PartnerSortField>("total");

  const { matches, isLoading: matchesLoading, isDrawMatch, getPlayerMatches, getPlayerWins, getPlayerDraws, getPlayerLosses, calculateWinRate, calculateNotLoseRate } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("30d");
  const [headToHeadType, setHeadToHeadType] = useState<string>("all");
  const [partnershipType, setPartnershipType] = useState<string>("all");

  // Date range filtering function
  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case "30d":
        return subDays(now, 30);
      case "90d":
        return subDays(now, 90);
      case "1y":
        return subDays(now, 365);
      case "custom":
        // Custom date handling would go here if implemented
        return subDays(now, 30); // Default fallback
      default:
        return new Date(0); // Beginning of time for "all"
    }
  };
  
  // Apply date filter to matches
  const filteredMatches = useMemo(() => {
    const startDate = getDateRange();
    
    return matches.filter(match => {
      const matchDate = new Date(match.match_date);
      const isInTimeRange = isAfter(matchDate, startDate);
      
      if (!isInTimeRange) return false;
      
      if (selectedPlayer === "all") return true;
      
      return (
        match.winner1_id === selectedPlayer ||
        match.winner2_id === selectedPlayer ||
        match.loser1_id === selectedPlayer ||
        match.loser2_id === selectedPlayer
      );
    });
  }, [matches, selectedPlayer, timePeriod]);

  // --- Head-to-Head sorted/search table data ---
  const sortedH2hOpponents = useMemo(() => {
    if (selectedPlayer === "all") return [];
    return players
      .filter(p => p.id !== selectedPlayer)
      .map(opponent => {
        const relevantMatches = filteredMatches.filter(match => {
          if (headToHeadType !== 'all' && match.match_type !== headToHeadType) return false;
          // playersParticipatedInMatch is defined later in the component
          const player1InMatch = match.winner1_id === selectedPlayer || match.winner2_id === selectedPlayer || match.loser1_id === selectedPlayer || match.loser2_id === selectedPlayer;
          const player2InMatch = match.winner1_id === opponent.id || match.winner2_id === opponent.id || match.loser1_id === opponent.id || match.loser2_id === opponent.id;
          const notPartners = !((match.winner1_id === selectedPlayer && match.winner2_id === opponent.id) || (match.winner1_id === opponent.id && match.winner2_id === selectedPlayer) || (match.loser1_id === selectedPlayer && match.loser2_id === opponent.id) || (match.loser1_id === opponent.id && match.loser2_id === selectedPlayer));
          return player1InMatch && player2InMatch && notPartners;
        });
        const matchesWon = relevantMatches.filter(match => !isDrawMatch(match.score) && ((match.winner1_id === selectedPlayer || match.winner2_id === selectedPlayer) && (match.loser1_id === opponent.id || match.loser2_id === opponent.id))).length;
        const matchesLost = relevantMatches.filter(match => !isDrawMatch(match.score) && ((match.winner1_id === opponent.id || match.winner2_id === opponent.id) && (match.loser1_id === selectedPlayer || match.loser2_id === selectedPlayer))).length;
        const matchesDrawn = relevantMatches.filter(match => isDrawMatch(match.score) && (((match.winner1_id === selectedPlayer || match.winner2_id === selectedPlayer) && (match.loser1_id === opponent.id || match.loser2_id === opponent.id)) || ((match.winner1_id === opponent.id || match.winner2_id === opponent.id) && (match.loser1_id === selectedPlayer || match.loser2_id === selectedPlayer)))).length;
        const total = matchesWon + matchesDrawn + matchesLost;
        const winRate = total > 0 ? (matchesWon / total) * 100 : 0;
        const notLoseRate = total > 0 ? ((matchesWon + matchesDrawn) / total) * 100 : 0;
        return {
          id: opponent.id,
          name: opponent.name,
          total,
          wins: matchesWon,
          draws: matchesDrawn,
          losses: matchesLost,
          winRate,
          notLoseRate
        };
      })
      .filter(row => row.total > 0 && row.name.toLowerCase().includes(h2hSearch.toLowerCase()))
      .sort((a, b) => b[h2hSortField] - a[h2hSortField]);
  }, [players, filteredMatches, selectedPlayer, headToHeadType, h2hSearch, h2hSortField, isDrawMatch]);

  // --- Partnership sorted/search table data ---
  const sortedPartners = useMemo(() => {
    if (selectedPlayer === "all") return [];
    return players
      .filter(p => p.id !== selectedPlayer)
      .map(partner => {
        // Only consider doubles matches where selectedPlayer and partner are partners
        const relevantMatches = filteredMatches.filter(match => {
          if (match.match_type !== 'doubles') return false;
          if (partnershipType === 'wins' && !(!isDrawMatch(match.score) && ((match.winner1_id === selectedPlayer && match.winner2_id === partner.id) || (match.winner1_id === partner.id && match.winner2_id === selectedPlayer)))) return false;
          if (partnershipType === 'losses' && !(!isDrawMatch(match.score) && ((match.loser1_id === selectedPlayer && match.loser2_id === partner.id) || (match.loser1_id === partner.id && match.loser2_id === selectedPlayer)))) return false;
          return ((match.winner1_id === selectedPlayer && match.winner2_id === partner.id) || (match.winner1_id === partner.id && match.winner2_id === selectedPlayer) || (match.loser1_id === selectedPlayer && match.loser2_id === partner.id) || (match.loser1_id === partner.id && match.loser2_id === selectedPlayer));
        });
        const matchesWon = relevantMatches.filter(match => !isDrawMatch(match.score) && ((match.winner1_id === selectedPlayer && match.winner2_id === partner.id) || (match.winner1_id === partner.id && match.winner2_id === selectedPlayer))).length;
        const matchesDrawn = relevantMatches.filter(match => isDrawMatch(match.score) && ((match.winner1_id === selectedPlayer && match.winner2_id === partner.id) || (match.winner1_id === partner.id && match.winner2_id === selectedPlayer) || (match.loser1_id === selectedPlayer && match.loser2_id === partner.id) || (match.loser1_id === partner.id && match.loser2_id === selectedPlayer))).length;
        const matchesLost = relevantMatches.filter(match => !isDrawMatch(match.score) && ((match.loser1_id === selectedPlayer && match.loser2_id === partner.id) || (match.loser1_id === partner.id && match.loser2_id === selectedPlayer))).length;
        const total = matchesWon + matchesDrawn + matchesLost;
        const winRate = total > 0 ? (matchesWon / total) * 100 : 0;
        const notLoseRate = total > 0 ? ((matchesWon + matchesDrawn) / total) * 100 : 0;
        return {
          id: partner.id,
          name: partner.name,
          total,
          wins: matchesWon,
          draws: matchesDrawn,
          losses: matchesLost,
          winRate,
          notLoseRate
        };
      })
      .filter(row => row.total > 0 && row.name.toLowerCase().includes(partnerSearch.toLowerCase()))
      .sort((a, b) => b[partnerSortField] - a[partnerSortField]);
  }, [players, filteredMatches, selectedPlayer, partnershipType, partnerSearch, partnerSortField, isDrawMatch]);

  const winLossData = useMemo(() => {
    if (selectedPlayer === "all") {
      const playerStats = players.map(player => {
        const wins = getPlayerWins(player.id, filteredMatches);
        const losses = getPlayerLosses(player.id, filteredMatches);
        const draws = getPlayerDraws(player.id, filteredMatches);
        
        return {
          name: player.name,
          wins,
          losses,
          draws,
          total: wins + losses + draws,
          winRate: calculateWinRate(player.id, filteredMatches),
          notLoseRate: calculateNotLoseRate(player.id, filteredMatches)
        };
      }).filter(player => player.total > 0);

      return playerStats;
    } else {
      const wins = getPlayerWins(selectedPlayer, filteredMatches);
      const losses = getPlayerLosses(selectedPlayer, filteredMatches);
      
      return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
    }
  }, [filteredMatches, selectedPlayer, players, getPlayerWins, getPlayerLosses, getPlayerDraws, calculateWinRate, calculateNotLoseRate]);

  const aggregatedMetrics = useMemo(() => {
    const totalMatches = filteredMatches.length;
    let totalWins = 0;
    let totalDraws = 0;
    let totalLosses = 0;
    let totalGames = 0;

    if (selectedPlayer === "all") {
      players.forEach(player => {
        const playerMatches = getPlayerMatches(player.id, filteredMatches);
        const wins = getPlayerWins(player.id, filteredMatches);
        const draws = getPlayerDraws(player.id, filteredMatches);
        const losses = getPlayerLosses(player.id, filteredMatches);
        
        totalWins += wins;
        totalDraws += draws;
        totalLosses += losses;
        totalGames += playerMatches.length;
      });
    } else {
      totalWins = getPlayerWins(selectedPlayer, filteredMatches);
      totalDraws = getPlayerDraws(selectedPlayer, filteredMatches);
      totalLosses = getPlayerLosses(selectedPlayer, filteredMatches);
      totalGames = getPlayerMatches(selectedPlayer, filteredMatches).length;
    }

    const winRate = totalGames === 0 ? 0 : Math.round((totalWins / totalGames) * 100);
    const notLoseRate = totalGames === 0 ? 0 : Math.round(((totalWins + totalDraws) / totalGames) * 100);

    return {
      totalMatches: totalGames,
      winRate,
      notLoseRate
    };
  }, [filteredMatches, selectedPlayer, players, getPlayerMatches, getPlayerWins, getPlayerDraws, getPlayerLosses]);

  const monthlyPerformanceData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subDays(new Date(), i * 30); // Approximate month with 30 days
      return {
        name: format(date, 'MMM'),
        month: date.getMonth(),
        year: date.getFullYear(),
        matches: 0,
        wins: 0,
        draws: 0,
        losses: 0,
        total: 0,
        winRate: 0,
        notLoseRate: 0
      };
    }).reverse();

    filteredMatches.forEach(match => {
      const matchDate = new Date(match.match_date);
      const monthIndex = last6Months.findIndex(m => 
        m.month === matchDate.getMonth() && m.year === matchDate.getFullYear()
      );
      
      if (monthIndex >= 0) {
        last6Months[monthIndex].matches += 1;
        
        if (selectedPlayer === "all") {
          last6Months[monthIndex].total += 1;
        } else {
          const isWinner = match.winner1_id === selectedPlayer || match.winner2_id === selectedPlayer;
          const isLoser = match.loser1_id === selectedPlayer || match.loser2_id === selectedPlayer;
          const isDraw = isDrawMatch(match.score);
          
          if (isWinner || isLoser) {
            last6Months[monthIndex].total += 1;
            
            if (isDraw) {
              last6Months[monthIndex].draws += 1;
            } else if (isWinner) {
              last6Months[monthIndex].wins += 1;
            } else if (isLoser) {
              last6Months[monthIndex].losses += 1;
            }
          }
        }
      }
    });

    return last6Months.map(month => ({
      ...month,
      winRate: month.total === 0 ? 0 : Math.round((month.wins / month.total) * 100),
      notLoseRate: month.total === 0 ? 0 : Math.round(((month.wins + month.draws) / month.total) * 100)
    }));
  }, [filteredMatches, selectedPlayer, isDrawMatch]);

  const matchTypeData = useMemo(() => {
    const singles = filteredMatches.filter(match => match.match_type === 'singles').length;
    const doubles = filteredMatches.filter(match => match.match_type === 'doubles').length;
    
    return [
      { name: 'Singles', value: singles },
      { name: 'Doubles', value: doubles }
    ];
  }, [filteredMatches]);

  if (matchesLoading || playersLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p>Loading analytics data...</p>
      </div>
    );
  }

  const hasData = filteredMatches.length > 0;
  
  const headToHeadRowPlayers = selectedPlayer === "all" 
    ? players 
    : players.filter(player => player.id === selectedPlayer);

  const headToHeadColumnPlayers = players.filter(player => 
    selectedPlayer === "all" || player.id !== selectedPlayer
  );
  
  const playersAreOpponents = (player1Id: string, player2Id: string, match: any) => {
    const player1IsWinner = match.winner1_id === player1Id || match.winner2_id === player1Id;
    const player1IsLoser = match.loser1_id === player1Id || match.loser2_id === player1Id;
    const player2IsWinner = match.winner1_id === player2Id || match.winner2_id === player2Id;
    const player2IsLoser = match.loser1_id === player2Id || match.loser2_id === player2Id;
    
    return (player1IsWinner && player2IsLoser) || (player1IsLoser && player2IsWinner);
  };
  
  const playersArePartners = (player1Id: string, player2Id: string, match: any) => {
    const bothWinners = 
      (match.winner1_id === player1Id && match.winner2_id === player2Id) || 
      (match.winner1_id === player2Id && match.winner2_id === player1Id);
      
    const bothLosers = 
      (match.loser1_id === player1Id && match.loser2_id === player2Id) || 
      (match.loser1_id === player2Id && match.loser2_id === player1Id);
      
    return bothWinners || bothLosers;
  };
  
  const playersParticipatedInMatch = (player1Id: string, player2Id: string, match: any) => {
    const player1InMatch = 
      match.winner1_id === player1Id || 
      match.winner2_id === player1Id || 
      match.loser1_id === player1Id || 
      match.loser2_id === player1Id;
    
    const player2InMatch = 
      match.winner1_id === player2Id || 
      match.winner2_id === player2Id || 
      match.loser1_id === player2Id || 
      match.loser2_id === player2Id;
    
    return player1InMatch && player2InMatch && !playersArePartners(player1Id, player2Id, match);
  };
  
  const playerWonAgainstPlayer = (player1Id: string, player2Id: string, match: any) => {
    if (!playersAreOpponents(player1Id, player2Id, match)) {
      return false;
    }
    
    const player1IsWinner = match.winner1_id === player1Id || match.winner2_id === player1Id;
    return player1IsWinner;
  };
  
  return (
    <div className="space-y-4 max-w-[1400px] mx-auto">
      <h1 className="text-3xl font-bold mb-2">Performance Analytics</h1>
      
      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2 mb-4">
        <p className="text-muted-foreground">Analyze player performance and statistics.</p>
        <div className="flex items-center gap-2">
          <Select 
            value={selectedPlayer} 
            onValueChange={setSelectedPlayer}
          >
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Player" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Players</SelectItem>
              {players.map(player => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select 
            value={timePeriod} 
            onValueChange={setTimePeriod}
          >
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="Time Period" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Last 30 Days</SelectItem>
              <SelectItem value="90d">Last 90 Days</SelectItem>
              <SelectItem value="1y">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
              <SelectItem value="custom">Custom Range</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Performance Rates</CardTitle>
            <CardDescription>Win and not lose percentages</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <div className="flex items-center justify-center h-full gap-8">
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">{aggregatedMetrics.winRate}%</span>
                <p className="text-sm text-muted-foreground mt-2">Win Rate</p>
              </div>
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">{aggregatedMetrics.notLoseRate}%</span>
                <p className="text-sm text-muted-foreground mt-2">Not Lose Rate</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Match Type Distribution</CardTitle>
            <CardDescription>Singles vs Doubles</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {hasData && (matchTypeData[0].value > 0 || matchTypeData[1].value > 0) ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={matchTypeData}
                    cx="50%"
                    cy="50%"
                    innerRadius={40}
                    outerRadius={55}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    paddingAngle={2}
                  >
                    {matchTypeData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(value, name) => [value, name]} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No match data available</p>
              </div>
            )}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle>Total Matches</CardTitle>
            <CardDescription>Number of matches played</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            <div className="flex items-center justify-center h-full">
              <div className="text-center">
                <span className="text-4xl font-bold text-primary">{aggregatedMetrics.totalMatches}</span>
                <p className="text-sm text-muted-foreground mt-2">Matches Played</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="productivity">Productivity Trends</TabsTrigger>
          <TabsTrigger value="headtohead">Head-to-Head</TabsTrigger>
          <TabsTrigger value="partnership">Partnership</TabsTrigger>
        </TabsList>
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                Win rate and not lose rate over the selected period.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Line type="monotone" dataKey="winRate" stroke="#8B5CF6" name="Win Rate %" />
                    <Line type="monotone" dataKey="notLoseRate" stroke="#F97316" name="Not Lose Rate %" />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No performance data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="productivity" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Match Productivity</CardTitle>
              <CardDescription>
                Total matches played over time.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {hasData ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={monthlyPerformanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="matches" name="Total Matches" fill="#8B5CF6" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No match data available.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="headtohead" className="space-y-4 max-w-full">
          <Card className="max-w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 mb-4">
                <div className="space-y-2">
                  <CardTitle>Head-to-Head Records</CardTitle>
                  <CardDescription>Direct match-up statistics between players.</CardDescription>
                </div>
              </div>
              
              {selectedPlayer !== "all" && (
                <div className="flex flex-wrap gap-3 items-end mt-2">
                  <div>
                    <Label htmlFor="h2h-match-type" className="block mb-1 font-medium text-sm">Match Type</Label>
                    <Select
                      value={headToHeadType}
                      onValueChange={setHeadToHeadType}
                    >
                      <SelectTrigger id="h2h-match-type" className="w-[160px]">
                        <SelectValue placeholder="Match Type" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Matches</SelectItem>
                        <SelectItem value="singles">Singles Only</SelectItem>
                        <SelectItem value="doubles">Doubles Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="h2h-search" className="block mb-1 font-medium text-sm">Search opponents</Label>
                    <div className="relative w-full">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="h2h-search"
                        placeholder="Search opponents..."
                        className="pl-8"
                        value={h2hSearch}
                        onChange={e => setH2hSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="h2h-sort-column" className="block mb-1 font-medium text-sm">Sort by</Label>
                    <Select value={h2hSortField} onValueChange={v => setH2hSortField(v as H2hSortField)}>
                      <SelectTrigger id="h2h-sort-column" className="w-[140px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">Matches</SelectItem>
                        <SelectItem value="wins">Wins</SelectItem>
                        <SelectItem value="draws">Draws</SelectItem>
                        <SelectItem value="losses">Losses</SelectItem>
                        <SelectItem value="winRate">Win %</SelectItem>
                        <SelectItem value="notLoseRate">Not Lose %</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedPlayer === "all" ? (
                <div className="w-full overflow-hidden" style={{ maxWidth: "75vw" }}>
                  <TableScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="sticky left-0 z-20 bg-background border-r"                          
                          >
                            Player
                          </TableHead>
                          {headToHeadColumnPlayers.map(player => (
                            <TableHead 
                              key={player.id} 
                              className="text-center whitespace-nowrap"                            
                            >
                              {player.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headToHeadRowPlayers.map(player1 => (
                          <TableRow key={player1.id}>
                            <TableCell 
                              className="sticky left-0 z-10 bg-background font-medium border-r"
                              style={{ minWidth: "150px" }}
                            >
                              {player1.name}
                            </TableCell>
                            {headToHeadColumnPlayers.map(player2 => {
                              if (player1.id === player2.id) {
                                return (
                                  <TableCell 
                                    key={player2.id} 
                                    className="text-center text-muted-foreground"                                  
                                  >
                                    -
                                  </TableCell>
                                );
                              }
                              
                              const relevantMatches = filteredMatches.filter(match => {
                                if (headToHeadType !== 'all' && match.match_type !== headToHeadType) {
                                  return false;
                                }
                                
                                return playersParticipatedInMatch(player1.id, player2.id, match);
                              });
                              
                              const matchesWon = relevantMatches.filter(match => 
                                !isDrawMatch(match.score) && playerWonAgainstPlayer(player1.id, player2.id, match)
                              ).length;
                              
                              const matchesLost = relevantMatches.filter(match => 
                                !isDrawMatch(match.score) && playerWonAgainstPlayer(player2.id, player1.id, match)
                              ).length;
                              
                              const matchesDrawn = relevantMatches.filter(match => 
                                isDrawMatch(match.score) && playersAreOpponents(player1.id, player2.id, match)
                              ).length;
                              
                              const score = `${matchesWon}-${matchesDrawn}-${matchesLost}`;
                              const isWinning = matchesWon > matchesLost;
                              const isLosing = matchesWon < matchesLost;
                              
                              return (
                                <TableCell 
                                  key={player2.id} 
                                  className={cn(
                                    "text-center whitespace-nowrap",
                                    {
                                      "text-green-600 font-medium": isWinning,
                                      "text-red-600 font-medium": isLosing,
                                      "text-muted-foreground": !isWinning && !isLosing
                                    }
                                  )}                                
                                >
                                  {matchesWon + matchesDrawn + matchesLost > 0 ? score : '-'}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableScrollArea>
                </div>
              ) : (
                // Ranking-style table for specific player
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Opponent</TableHead>
                        <TableHead className="text-center">Matches</TableHead>
                        <TableHead className="text-center">Wins</TableHead>
                        <TableHead className="text-center">Draws</TableHead>
                        <TableHead className="text-center">Losses</TableHead>
                        <TableHead className="text-center">Win%</TableHead>
                        <TableHead className="text-center">NotL%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Head-to-head controls moved to CardHeader */}
{sortedH2hOpponents.map(opponent => (
  <TableRow key={opponent.id}>
    <TableCell>{opponent.name}</TableCell>
    <TableCell className="text-center">{opponent.total}</TableCell>
    <TableCell className="text-center">{opponent.wins}</TableCell>
    <TableCell className="text-center">{opponent.draws}</TableCell>
    <TableCell className="text-center">{opponent.losses}</TableCell>
    <TableCell className="text-center">{opponent.winRate.toFixed(2)}%</TableCell>
    <TableCell className="text-center">{opponent.notLoseRate.toFixed(2)}%</TableCell>
  </TableRow>
))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="partnership" className="space-y-4 max-w-full">
          <Card className="max-w-full">
            <CardHeader>
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-3 sm:space-y-0 mb-4">
                <div className="space-y-2">
                  <CardTitle>Partnership Success</CardTitle>
                  <CardDescription>How well players perform when paired together in doubles.</CardDescription>
                </div>
              </div>
              
              {selectedPlayer !== "all" && (
                <div className="flex flex-wrap gap-3 items-end mt-2">
                  <div>
                    <Label htmlFor="partnership-type" className="block mb-1 font-medium text-sm">Match Filter</Label>
                    <Select
                      value={partnershipType}
                      onValueChange={setPartnershipType}
                    >
                      <SelectTrigger id="partnership-type" className="w-[160px]">
                        <SelectValue placeholder="Filter" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All Results</SelectItem>
                        <SelectItem value="wins">Wins Only</SelectItem>
                        <SelectItem value="losses">Losses Only</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div className="flex-1 min-w-[200px]">
                    <Label htmlFor="partner-search" className="block mb-1 font-medium text-sm">Search partners</Label>
                    <div className="relative w-full">
                      <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
                      <Input
                        id="partner-search"
                        placeholder="Search partners..."
                        className="pl-8"
                        value={partnerSearch}
                        onChange={e => setPartnerSearch(e.target.value)}
                      />
                    </div>
                  </div>
                  
                  <div>
                    <Label htmlFor="partner-sort-column" className="block mb-1 font-medium text-sm">Sort by</Label>
                    <Select value={partnerSortField} onValueChange={v => setPartnerSortField(v as PartnerSortField)}>
                      <SelectTrigger id="partner-sort-column" className="w-[140px]">
                        <SelectValue placeholder="Sort by" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="total">Matches</SelectItem>
                        <SelectItem value="wins">Wins</SelectItem>
                        <SelectItem value="draws">Draws</SelectItem>
                        <SelectItem value="losses">Losses</SelectItem>
                        <SelectItem value="winRate">Win %</SelectItem>
                        <SelectItem value="notLoseRate">Not Lose %</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}
            </CardHeader>
            <CardContent>
              {selectedPlayer === "all" ? (
                <div className="w-full overflow-hidden" style={{ maxWidth: "75vw" }}>
                  <TableScrollArea>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead 
                            className="sticky left-0 z-20 bg-background border-r"
                          >
                            Player
                          </TableHead>
                          {headToHeadColumnPlayers.map(player => (
                            <TableHead 
                              key={player.id} 
                              className="text-center whitespace-nowrap"
                            >
                              {player.name}
                            </TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {headToHeadRowPlayers.map(player1 => (
                          <TableRow key={player1.id}>
                            <TableCell 
                              className="sticky left-0 z-10 bg-background font-medium border-r"
                              style={{ minWidth: "150px" }}
                            >
                              {player1.name}
                            </TableCell>
                            {headToHeadColumnPlayers.map(player2 => {
                              if (player1.id === player2.id) {
                                return (
                                  <TableCell 
                                    key={player2.id} 
                                    className="text-center text-muted-foreground"
                                  >
                                    -
                                  </TableCell>
                                );
                              }
                              // Get matches where these players were partners
                              const relevantMatches = filteredMatches.filter(match => {
                                // Only look at doubles matches
                                if (match.match_type !== 'doubles') {
                                  return false;
                                }
                                // Check if they were partners
                                return playersArePartners(player1.id, player2.id, match);
                              });
                              // Apply partnership type filter
                              let partnerMatches = relevantMatches;
                              if (partnershipType === 'wins') {
                                partnerMatches = relevantMatches.filter(match =>
                                  !isDrawMatch(match.score) && (
                                    (match.winner1_id === player1.id && match.winner2_id === player2.id) ||
                                    (match.winner1_id === player2.id && match.winner2_id === player1.id)
                                  )
                                );
                              } else if (partnershipType === 'losses') {
                                partnerMatches = relevantMatches.filter(match =>
                                  !isDrawMatch(match.score) && (
                                    (match.loser1_id === player1.id && match.loser2_id === player2.id) ||
                                    (match.loser1_id === player2.id && match.loser2_id === player1.id)
                                  )
                                );
                              }
                              const matchesWon = partnerMatches.filter(match =>
                                !isDrawMatch(match.score) && (
                                  (match.winner1_id === player1.id && match.winner2_id === player2.id) ||
                                  (match.winner1_id === player2.id && match.winner2_id === player1.id)
                                )
                              ).length;
                              const matchesDrawn = partnerMatches.filter(match =>
                                isDrawMatch(match.score) && (
                                  (match.winner1_id === player1.id && match.winner2_id === player2.id) ||
                                  (match.winner1_id === player2.id && match.winner2_id === player1.id) ||
                                  (match.loser1_id === player1.id && match.loser2_id === player2.id) ||
                                  (match.loser1_id === player2.id && match.loser2_id === player1.id)
                                )
                              ).length;
                              const matchesLost = partnerMatches.filter(match =>
                                !isDrawMatch(match.score) && (
                                  (match.loser1_id === player1.id && match.loser2_id === player2.id) ||
                                  (match.loser1_id === player2.id && match.loser2_id === player1.id)
                                )
                              ).length;
                              const total = matchesWon + matchesDrawn + matchesLost;
                              if (total === 0) {
                                return (
                                  <TableCell 
                                    key={player2.id} 
                                    className="text-center text-muted-foreground"
                                  >
                                    -
                                  </TableCell>
                                );
                              }
                              // Format as W-D-L without percentage
                              const score = `${matchesWon}-${matchesDrawn}-${matchesLost}`;
                              // More wins than losses = good (green)
                              // Equal wins and losses = neutral (amber)
                              // More losses than wins = bad (red)
                              return (
                                <TableCell 
                                  key={player2.id} 
                                  className={cn(
                                    "text-center whitespace-nowrap",
                                    {
                                      "text-green-600 font-medium": matchesWon > matchesLost,
                                      "text-red-600 font-medium": matchesWon < matchesLost,
                                      "text-amber-600 font-medium": matchesWon === matchesLost && total > 0
                                    }
                                  )}
                                >
                                  {score}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </TableScrollArea>
                </div>
              ) : (
                // Ranking-style table for specific player
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Partner</TableHead>
                        <TableHead className="text-center">Matches</TableHead>
                        <TableHead className="text-center">Wins</TableHead>
                        <TableHead className="text-center">Draws</TableHead>
                        <TableHead className="text-center">Losses</TableHead>
                        <TableHead className="text-center">Win%</TableHead>
                        <TableHead className="text-center">NotL%</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {/* Partnership controls moved to CardHeader */}
                      {sortedPartners.map(partner => (
                        <TableRow key={partner.id}>
                          <TableCell>{partner.name}</TableCell>
                          <TableCell className="text-center">{partner.total}</TableCell>
                          <TableCell className="text-center">{partner.wins}</TableCell>
                          <TableCell className="text-center">{partner.draws}</TableCell>
                          <TableCell className="text-center">{partner.losses}</TableCell>
                          <TableCell className="text-center">{partner.winRate.toFixed(2)}%</TableCell>
                          <TableCell className="text-center">{partner.notLoseRate.toFixed(2)}%</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Analytics;
