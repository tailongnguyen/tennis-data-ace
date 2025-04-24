
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
import { format, subMonths, isAfter } from "date-fns";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Activity, BarChart3, PieChartIcon } from "lucide-react";
import { cn } from "@/lib/utils";

const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#10B981', '#EAB308'];

const Analytics = () => {
  const { matches, isLoading: matchesLoading, isDrawMatch, getPlayerMatches, getPlayerWins, getPlayerDraws, getPlayerLosses, calculateWinRate, calculateNotLoseRate } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("year");
  const [headToHeadType, setHeadToHeadType] = useState<string>("all");

  const getDateRange = () => {
    const now = new Date();
    switch (timePeriod) {
      case "month":
        return subMonths(now, 1);
      case "quarter":
        return subMonths(now, 3);
      case "year":
        return subMonths(now, 12);
      default:
        return new Date(0); // Beginning of time for "all"
    }
  };

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
      const date = subMonths(new Date(), i);
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
          // Just count total matches for all players
          last6Months[monthIndex].total += 1;
        } else {
          // For a specific player, track their performance
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

    // Calculate win rates and not lose rates for each month
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
  
  // Determine which players to show in the head-to-head table
  const headToHeadRowPlayers = selectedPlayer === "all" 
    ? players 
    : players.filter(player => player.id === selectedPlayer);

  const headToHeadColumnPlayers = players.filter(player => 
    selectedPlayer === "all" || player.id !== selectedPlayer
  );
  
  return (
    <div className="space-y-4">
      <h1 className="text-3xl font-bold">Performance Analytics</h1>
      
      <div className="flex justify-between items-center mb-4">
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
              <SelectItem value="month">Last Month</SelectItem>
              <SelectItem value="quarter">Last Quarter</SelectItem>
              <SelectItem value="year">Last Year</SelectItem>
              <SelectItem value="all">All Time</SelectItem>
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
        <TabsContent value="headtohead" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Head-to-Head Records</CardTitle>
                <CardDescription>Direct match-up statistics between players.</CardDescription>
              </div>
              <Select
                value={headToHeadType}
                onValueChange={setHeadToHeadType}
              >
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Match Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Matches</SelectItem>
                  <SelectItem value="singles">Singles Only</SelectItem>
                  <SelectItem value="doubles">Doubles Only</SelectItem>
                </SelectContent>
              </Select>
            </CardHeader>
            <CardContent className="h-[300px]">
              {hasData ? (
                <div className="h-full overflow-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Player
                        </th>
                        {headToHeadColumnPlayers.map(player => (
                          <th key={player.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {player.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {headToHeadRowPlayers.map(player1 => (
                        <tr key={player1.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player1.name}
                          </td>
                          {headToHeadColumnPlayers.map(player2 => {
                            if (player1.id === player2.id) {
                              return (
                                <td key={player2.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  -
                                </td>
                              );
                            }
                            
                            // Fix the filtering logic to respect the headToHeadType filter
                            const relevantMatches = filteredMatches.filter(match => {
                              // Apply match type filter correctly
                              if (headToHeadType !== 'all' && match.match_type !== headToHeadType) {
                                return false;
                              }
                              
                              // For singles matches
                              if (match.match_type === 'singles') {
                                return ((match.winner1_id === player1.id && match.loser1_id === player2.id) || 
                                       (match.winner1_id === player2.id && match.loser1_id === player1.id));
                              }
                              
                              // For doubles matches
                              return (
                                // player1 won against player2
                                (
                                  (match.winner1_id === player1.id || match.winner2_id === player1.id) && 
                                  (match.loser1_id === player2.id || match.loser2_id === player2.id)
                                ) ||
                                // player2 won against player1
                                (
                                  (match.winner1_id === player2.id || match.winner2_id === player2.id) &&
                                  (match.loser1_id === player1.id || match.loser2_id === player1.id)
                                )
                              );
                            });
                            
                            const matchesWon = relevantMatches.filter(match => 
                              (match.match_type === 'singles' && match.winner1_id === player1.id) ||
                              (match.match_type === 'doubles' && (match.winner1_id === player1.id || match.winner2_id === player1.id))
                            ).length;
                            
                            const matchesLost = relevantMatches.filter(match => 
                              (match.match_type === 'singles' && match.winner1_id === player2.id) ||
                              (match.match_type === 'doubles' && (match.winner1_id === player2.id || match.winner2_id === player2.id))
                            ).length;
                            
                            const score = `${matchesWon}-${matchesLost}`;
                            const isWinning = matchesWon > matchesLost;
                            const isLosing = matchesWon < matchesLost;
                            
                            return (
                              <td key={player2.id} className={cn(
                                "px-6 py-4 whitespace-nowrap text-sm",
                                {
                                  "text-green-600 font-medium": isWinning,
                                  "text-red-600 font-medium": isLosing,
                                  "text-gray-500": !isWinning && !isLosing
                                }
                              )}>
                                {matchesWon + matchesLost > 0 ? score : '-'}
                              </td>
                            );
                          })}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No head-to-head data available.</p>
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
