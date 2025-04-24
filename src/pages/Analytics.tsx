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

const COLORS = ['#8B5CF6', '#D946EF', '#F97316', '#0EA5E9', '#10B981', '#EAB308'];

const Analytics = () => {
  const { matches, isLoading: matchesLoading } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();
  const [selectedPlayer, setSelectedPlayer] = useState<string>("all");
  const [timePeriod, setTimePeriod] = useState<string>("year");

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
        const wins = filteredMatches.filter(match => 
          match.winner1_id === player.id || match.winner2_id === player.id
        ).length;
        
        const losses = filteredMatches.filter(match => 
          match.loser1_id === player.id || match.loser2_id === player.id
        ).length;
        
        return {
          name: player.name,
          wins,
          losses,
          total: wins + losses,
          winRate: wins === 0 ? 0 : Math.round((wins / (wins + losses)) * 100)
        };
      }).filter(player => player.total > 0);

      return playerStats;
    } else {
      const wins = filteredMatches.filter(match => 
        match.winner1_id === selectedPlayer || match.winner2_id === selectedPlayer
      ).length;
      
      const losses = filteredMatches.filter(match => 
        match.loser1_id === selectedPlayer || match.loser2_id === selectedPlayer
      ).length;
      
      return [{ name: "Wins", value: wins }, { name: "Losses", value: losses }];
    }
  }, [filteredMatches, selectedPlayer, players]);

  const monthlyPerformanceData = useMemo(() => {
    const last6Months = Array.from({ length: 6 }, (_, i) => {
      const date = subMonths(new Date(), i);
      return {
        name: format(date, 'MMM'),
        month: date.getMonth(),
        year: date.getFullYear(),
        wins: 0,
        losses: 0
      };
    }).reverse();

    filteredMatches.forEach(match => {
      const matchDate = new Date(match.match_date);
      const monthIndex = last6Months.findIndex(m => 
        m.month === matchDate.getMonth() && m.year === matchDate.getFullYear()
      );
      
      if (monthIndex >= 0) {
        if (selectedPlayer === "all" || 
            match.winner1_id === selectedPlayer || 
            match.winner2_id === selectedPlayer) {
          last6Months[monthIndex].wins += 1;
        }
        
        if (selectedPlayer === "all" || 
            match.loser1_id === selectedPlayer || 
            match.loser2_id === selectedPlayer) {
          last6Months[monthIndex].losses += 1;
        }
      }
    });

    return last6Months;
  }, [filteredMatches, selectedPlayer]);

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
            <CardTitle>Win/Loss Ratio</CardTitle>
            <CardDescription>Overall performance ratio</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                {selectedPlayer === "all" ? (
                  <BarChart data={winLossData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="wins" fill="#8B5CF6" name="Wins" />
                    <Bar dataKey="losses" fill="#F97316" name="Losses" />
                  </BarChart>
                ) : (
                  <PieChart>
                    <Pie
                      data={winLossData}
                      cx="50%"
                      cy="50%"
                      innerRadius={40}
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    >
                      {winLossData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={index === 0 ? '#8B5CF6' : '#F97316'} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                )}
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
                    outerRadius={80}
                    fill="#8884d8"
                    dataKey="value"
                    labelLine={true}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={70}
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
            <CardTitle>Player Activity</CardTitle>
            <CardDescription>Matches played</CardDescription>
          </CardHeader>
          <CardContent className="h-[200px]">
            {hasData ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={players
                  .map(player => {
                    const matchesPlayed = filteredMatches.filter(match => 
                      match.winner1_id === player.id || 
                      match.winner2_id === player.id || 
                      match.loser1_id === player.id || 
                      match.loser2_id === player.id
                    ).length;
                    return {
                      name: player.name,
                      matches: matchesPlayed
                    };
                  })
                  .filter(player => player.matches > 0)
                  .sort((a, b) => b.matches - a.matches)
                  .slice(0, 5)}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="matches" fill="#0EA5E9" name="Matches Played" />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground">No match data available</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
      
      <Tabs defaultValue="trends" className="space-y-4">
        <TabsList>
          <TabsTrigger value="trends">Performance Trends</TabsTrigger>
          <TabsTrigger value="comparisons">Player Comparisons</TabsTrigger>
          <TabsTrigger value="headtohead">Head-to-Head</TabsTrigger>
        </TabsList>
        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Performance Over Time</CardTitle>
              <CardDescription>
                Wins and losses over the selected period.
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
                    <Line type="monotone" dataKey="wins" stroke="#8B5CF6" name="Wins" />
                    <Line type="monotone" dataKey="losses" stroke="#F97316" name="Losses" />
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
        <TabsContent value="comparisons" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Player Comparison</CardTitle>
              <CardDescription>
                Compare statistics between players.
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {hasData && players.length > 1 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={players
                      .map(player => {
                        const wins = filteredMatches.filter(match => 
                          match.winner1_id === player.id || match.winner2_id === player.id
                        ).length;
                        
                        const losses = filteredMatches.filter(match => 
                          match.loser1_id === player.id || match.loser2_id === player.id
                        ).length;
                        
                        const winRate = wins + losses === 0 ? 0 : Math.round((wins / (wins + losses)) * 100);
                        
                        return {
                          name: player.name,
                          winRate,
                          rankingPoints: player.ranking_points || 0
                        };
                      })
                      .filter(player => player.winRate > 0 || player.rankingPoints > 0)
                      .sort((a, b) => b.rankingPoints - a.rankingPoints)
                    }
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis yAxisId="left" orientation="left" stroke="#8B5CF6" />
                    <YAxis yAxisId="right" orientation="right" stroke="#0EA5E9" />
                    <Tooltip />
                    <Legend />
                    <Bar yAxisId="left" dataKey="winRate" name="Win Rate (%)" fill="#8B5CF6" />
                    <Bar yAxisId="right" dataKey="rankingPoints" name="Ranking Points" fill="#0EA5E9" />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">Insufficient data for player comparison.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="headtohead" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Head-to-Head Records</CardTitle>
              <CardDescription>
                Direct match-up statistics between players.
              </CardDescription>
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
                        {players.map(player => (
                          <th key={player.id} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                            {player.name}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {players.map(player1 => (
                        <tr key={player1.id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                            {player1.name}
                          </td>
                          {players.map(player2 => {
                            if (player1.id === player2.id) {
                              return (
                                <td key={player2.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                  -
                                </td>
                              );
                            }
                            
                            const matchesWon = filteredMatches.filter(match => 
                              match.match_type === 'singles' &&
                              ((match.winner1_id === player1.id && match.loser1_id === player2.id))
                            ).length;
                            
                            const matchesLost = filteredMatches.filter(match => 
                              match.match_type === 'singles' &&
                              ((match.winner1_id === player2.id && match.loser1_id === player1.id))
                            ).length;
                            
                            return (
                              <td key={player2.id} className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                                {matchesWon + matchesLost > 0 ? `${matchesWon}-${matchesLost}` : '-'}
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
