import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, 
  LineChart, 
  PieChart, 
  AreaChart,
  ResponsiveContainer, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  Line,
  Pie,
  Cell,
  Area
} from "recharts";
import { useMatches } from "@/hooks/useMatches";
import { usePlayers } from "@/hooks/usePlayers";
import { format, subDays, parseISO, isWithinInterval, isAfter, addWeeks, startOfWeek, endOfWeek, isSameWeek, differenceInWeeks } from "date-fns";
import { ChartContainer, ChartTooltipContent } from "@/components/ui/chart";
import { Activity, BarChart3, PieChartIcon, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { TableScrollArea } from "@/components/ui/scroll-area";
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from "@/components/ui/table";

// More visually friendly colors with better contrast for charts
// More visually friendly colors with better contrast for charts
const COLORS = ['#ef233c', '#ffd166', '#06d6a0', '#118ab2', '#073b4c', '#386641', "#540b0e", "#e0b1cb", "#f15bb5", "#4361ee"];
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
    const normalizeDate = (date: Date) => {
      const normalized = new Date(date);
      normalized.setHours(0, 0, 0, 0);
      return normalized;
    };

    switch (timePeriod) {
      case "30d":
        return normalizeDate(subDays(now, 30));
      case "90d":
        return normalizeDate(subDays(now, 90));
      case "1y":
        return normalizeDate(subDays(now, 365));
      case "custom":
        // Custom date handling would go here if implemented
        return normalizeDate(subDays(now, 30)); // Default fallback
      default:
        return normalizeDate(new Date(0)); // Beginning of time for "all"
    }
  };
  // Apply date filter to matches
  const filteredMatches = useMemo(() => {
    const startDate = getDateRange();
    const endDate = new Date(); // Current date

    // Normalize to midnight (local time)
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const normStart = normalizeDate(startDate);
    const normEnd = normalizeDate(endDate);

    const filtered = matches.filter(match => {
      // If match.match_date is a string, parse as ISO
      const matchDate = normalizeDate(new Date(match.match_date));
      // Check if matchDate is between normStart and normEnd (inclusive)
      const isInTimeRange = matchDate >= normStart && matchDate <= normEnd;
      if (!isInTimeRange) return false;
      if (selectedPlayer === "all") return true;
      return (
        match.winner1_id === selectedPlayer ||
        match.winner2_id === selectedPlayer ||
        match.loser1_id === selectedPlayer ||
        match.loser2_id === selectedPlayer
      );
    });
    // Debug output
    console.log('[Analytics] startDate:', normStart, 'endDate:', normEnd, 'filteredMatches:', filtered.length);
    return filtered;
  }, [matches, selectedPlayer, timePeriod]);

  // Apply date filter to matches
  const filteredMatchesJustByDate = useMemo(() => {
    const startDate = getDateRange();
    const endDate = new Date(); // Current date

    // Normalize to midnight (local time)
    const normalizeDate = (date: Date) => {
      const d = new Date(date);
      d.setHours(0, 0, 0, 0);
      return d;
    };
    const normStart = normalizeDate(startDate);
    const normEnd = normalizeDate(endDate);

    const filtered = matches.filter(match => {
      // If match.match_date is a string, parse as ISO
      const matchDate = normalizeDate(new Date(match.match_date));
      // Check if matchDate is between normStart and normEnd (inclusive)
      const isInTimeRange = matchDate >= normStart && matchDate <= normEnd;
      if (!isInTimeRange) return false;
      return true;      
    });
    // Debug output
    console.log('[Analytics] startDate:', normStart, 'endDate:', normEnd, 'filteredMatches:', filtered.length);
    return filtered;
  }, [matches, selectedPlayer, timePeriod]);
  
  // Define a variable to check if we have match data to display
  const hasMatchData = filteredMatches.length > 0;

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
    let totalGames = totalMatches;

    if (selectedPlayer === "all") {
      players.forEach(player => {
        const playerMatches = getPlayerMatches(player.id, filteredMatches);
        const wins = getPlayerWins(player.id, filteredMatches);
        const draws = getPlayerDraws(player.id, filteredMatches);
        const losses = getPlayerLosses(player.id, filteredMatches);
        
        totalWins += wins;
        totalDraws += draws;
        totalLosses += losses;
      });
    } else {
      totalWins = getPlayerWins(selectedPlayer, filteredMatches);
      totalDraws = getPlayerDraws(selectedPlayer, filteredMatches);
      totalLosses = getPlayerLosses(selectedPlayer, filteredMatches);
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
  
  // Generate dynamic player color map
  // Only create color map for top 10 most active players (by matches played in filteredMatches)
  const playerColorMap = useMemo(() => {
    // Count matches played per player
    const playerActivity = players.map(player => {
      const matchesPlayed = filteredMatches.filter(match =>
        match.winner1_id === player.id ||
        match.winner2_id === player.id ||
        match.loser1_id === player.id ||
        match.loser2_id === player.id
      ).length;
      return { player, matchesPlayed };
    });
    // Sort descending by matches played and take top 10
    const topPlayers = playerActivity
      .sort((a, b) => b.matchesPlayed - a.matchesPlayed)
      .slice(0, 10)
      .map(a => a.player);
    // Assign colors only to top 10
    const colorMap: Record<string, string> = {};
    topPlayers.forEach((player, index) => {
      colorMap[player.name] = COLORS[index % COLORS.length];
    });
    console.log(colorMap)
    return colorMap;
  }, [players, filteredMatches]);

  // Weekly accumulated points data for the area chart
  const weeklyPointsData = useMemo(() => {
    // If no data available, return empty array
    if (!hasMatchData) return [];
    
    // Determine start and end date for the analysis
    const startDate = getDateRange();
    const endDate = new Date();
    
    // Calculate how many weeks to show
    const totalWeeks = Math.max(1, differenceInWeeks(endDate, startDate)) + 1;
    
    // First step: Create all potential week buckets
    const allWeekBuckets = [];
    for (let i = 0; i < totalWeeks; i++) {
      const weekStart = startOfWeek(addWeeks(startDate, i));
      // Ensure we don't go before our start date
      const adjustedWeekStart = weekStart < startDate ? startDate : weekStart;
      // For the end date
      const weekEnd = endOfWeek(weekStart);
      // Ensure we don't go beyond current date
      const adjustedWeekEnd = weekEnd > endDate ? endDate : weekEnd;
      
      allWeekBuckets.push({
        name: format(adjustedWeekStart, 'MMM d'),
        weekStart: adjustedWeekStart,
        weekEnd: adjustedWeekEnd,
        total: 0,
        playerPoints: {},
        hasMatches: false // Track if this week has any matches
      });
    }
    
    // Initialize player data
    let relevantPlayers = [];
    // Get player match counts
    const playerMatches = {};
    filteredMatches.forEach(match => {
      const playerIds = [match.winner1_id, match.loser1_id];
      if (match.winner2_id) playerIds.push(match.winner2_id);
      if (match.loser2_id) playerIds.push(match.loser2_id);
      
      playerIds.forEach(id => {
        if (!id) return;
        playerMatches[id] = (playerMatches[id] || 0) + 1;
      });
    });
    
    if (selectedPlayer === "all") {
      // Get the top 10 most active players
      relevantPlayers = Object.entries(playerMatches)
        .sort((a, b) => Number(b[1]) - Number(a[1]))
        .slice(0, 10)
        .map(([id]) => id);
    }
    else {
      relevantPlayers = Object.keys(playerMatches)
    }
    
    // Initialize player points for each week
    const playerMap = {};
    relevantPlayers.forEach(playerId => {
      const player = players.find(p => p.id === playerId);
      if (player) {
        playerMap[playerId] = player.name;
        allWeekBuckets.forEach(week => {
          week.playerPoints[playerId] = 0;
          week[player.name] = 0; // For direct access in the chart
        });
      }
    });

    // Sort matches by date, oldest first
    const countMatches = selectedPlayer == "all" ? [...filteredMatches] : [...filteredMatchesJustByDate];
    const sortedMatches = countMatches.sort((a, b) => 
      new Date(a.match_date).getTime() - new Date(b.match_date).getTime()
    );
    
    // Process matches to accumulate points by player and week
    sortedMatches.forEach(match => {
      const matchDate = new Date(match.match_date);
      
      // Find the appropriate week bucket for this match
      const weekIndex = allWeekBuckets.findIndex(week => 
        matchDate >= week.weekStart && matchDate <= week.weekEnd
      );
      
      if (weekIndex >= 0) {
        const week = allWeekBuckets[weekIndex];
        week.hasMatches = true; // Mark this week as having matches
        
        const isDraw = isDrawMatch(match.score);
        
        // Assign points based on match outcome
        const winnerPoints = isDraw ? 1 : 3; // 3 for win, 1 for draw
        const loserPoints = isDraw ? 1 : -1;  // 1 for draw, -1 for loss
        
        [match.winner1_id, match.winner2_id].forEach(playerId => {
          if (playerId && relevantPlayers.includes(playerId)) {
            week.playerPoints[playerId] = (week.playerPoints[playerId] || 0) + winnerPoints;
            week[playerMap[playerId]] = week.playerPoints[playerId];
            week.total += winnerPoints;
          }
        });
        
        [match.loser1_id, match.loser2_id].forEach(playerId => {
          if (playerId && relevantPlayers.includes(playerId)) {
            week.playerPoints[playerId] = (week.playerPoints[playerId] || 0) + loserPoints;
            week[playerMap[playerId]] = week.playerPoints[playerId];
            week.total += loserPoints;
          }
        });
      }
    });

    // Filter to keep only weeks that have matches
    const weeksWithMatches = allWeekBuckets.filter(week => week.hasMatches);
    
    // If we still have too many weeks, consolidate them optimally
    let weekBuckets = weeksWithMatches;
    const MAX_WEEKS = 12;
    
    if (weeksWithMatches.length > MAX_WEEKS) {
      // Consolidated buckets strategy: even distribution
      const groupSize = Math.ceil(weeksWithMatches.length / MAX_WEEKS);
      weekBuckets = [];
      
      for (let i = 0; i < weeksWithMatches.length; i += groupSize) {
        const groupEnd = Math.min(i + groupSize - 1, weeksWithMatches.length - 1);
        const startWeek = weeksWithMatches[i];
        const endWeek = weeksWithMatches[groupEnd];
        
        // Create a consolidated bucket
        const consolidatedBucket = {
          name: `${format(startWeek.weekStart, 'MMM d')}-${format(endWeek.weekEnd, 'MMM d')}`,
          weekStart: startWeek.weekStart,
          weekEnd: endWeek.weekEnd,
          total: 0,
          playerPoints: {},
          hasMatches: true
        };
        
        // Initialize player points
        relevantPlayers.forEach(playerId => {
          if (playerMap[playerId]) {
            consolidatedBucket.playerPoints[playerId] = 0;
            consolidatedBucket[playerMap[playerId]] = 0;
          }
        });
        
        // Sum points from all weeks in this group
        for (let j = i; j <= groupEnd; j++) {
          const week = weeksWithMatches[j];
          
          relevantPlayers.forEach(playerId => {
            if (playerMap[playerId]) {
              consolidatedBucket.playerPoints[playerId] += week.playerPoints[playerId] || 0;
              consolidatedBucket[playerMap[playerId]] = consolidatedBucket.playerPoints[playerId];
            }
          });
          
          consolidatedBucket.total += week.total;
        }
        
        weekBuckets.push(consolidatedBucket);
      }
    }

    // Cumulative sum for each player's points
    for (let i = 1; i < weekBuckets.length; i++) {
      const prevWeek = weekBuckets[i-1];
      const currWeek = weekBuckets[i];
      
      relevantPlayers.forEach(playerId => {
        if (playerMap[playerId]) {
          currWeek.playerPoints[playerId] += prevWeek.playerPoints[playerId];
          currWeek[playerMap[playerId]] = currWeek.playerPoints[playerId];
        }
      });
      currWeek.total += prevWeek.total;
    }
    
    // Convert to data for stack area chart with both percentage and raw points
    return weekBuckets.map(week => {
      const chartData = { name: week.name };
      let totalPoints = week.total;

      if (selectedPlayer !== "all") {
        const playerName = playerMap[selectedPlayer];
        // Single player selected: create two categories: selected player vs the rest
        const selectedPlayerPoints = week.playerPoints[selectedPlayer] || 0;
        const restPoints = totalPoints - selectedPlayerPoints;

        chartData[playerName] = ((selectedPlayerPoints / totalPoints) * 100).toFixed(1);
        chartData["Team"] = ((restPoints / totalPoints) * 100).toFixed(1);
        chartData[`${playerName}_raw`] = selectedPlayerPoints;
        chartData["Team_raw"] = restPoints;

        return chartData;
      }

      // If total is 0, we can't calculate percentages
      if (totalPoints === 0) {
        relevantPlayers.forEach(playerId => {
          if (playerMap[playerId]) {
            const playerName = playerMap[playerId];
            chartData[playerName] = 0;
            chartData[`${playerName}_raw`] = 0; // Store raw points for tooltip
          }
        });
        return chartData;
      }

      // Calculate percentage for each player and store raw points
      relevantPlayers.forEach(playerId => {
        const playerName = playerMap[playerId];
        if (playerName) {
          const playerPoints = week.playerPoints[playerId];
          chartData[playerName] = ((playerPoints / totalPoints) * 100).toFixed(1);
          chartData[`${playerName}_raw`] = playerPoints; // Store raw points for tooltip
        }
      });
      return chartData;
    });
  }, [filteredMatches, selectedPlayer, players, hasMatchData, getDateRange, isDrawMatch]);

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
            {selectedPlayer !== "all" ? (
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
            ) : (
              <div className="flex items-center justify-center h-full">
                <p className="text-muted-foreground text-center">This metric is only available if a single player is chosen.</p>
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
            {hasMatchData && (matchTypeData[0].value > 0 || matchTypeData[1].value > 0) ? (
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
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length + 2]} />
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
              {hasMatchData ? (
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
          
          <Card>
            <CardHeader>
              <CardTitle>Accumulated Points Distribution</CardTitle>
              <CardDescription>
                Percentage of total accumulated points over time by player
              </CardDescription>
            </CardHeader>
            <CardContent className="h-[300px]">
              {hasMatchData && weeklyPointsData.length > 0 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={weeklyPointsData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <defs>
                      {Object.keys(weeklyPointsData[0] || {})
                        .filter(key => key !== 'name' && typeof key === 'string' && key.trim() !== '')
                        .map((key, index) => (
                          <linearGradient key={key} id={`color-${key.replace(" ", "_")}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor={playerColorMap[key] || COLORS[index % COLORS.length]} stopOpacity={0.9}/>
                            <stop offset="95%" stopColor={playerColorMap[key] || COLORS[index % COLORS.length]} stopOpacity={0.4}/>
                          </linearGradient>
                        ))}
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis label={{ value: 'Points %', angle: -90, position: 'insideLeft' }} />
                    <Tooltip 
                      formatter={(value, name, props) => {
                        // If it's a raw points field (ending with _raw), don't display in the tooltip
                        if (name.endsWith('_raw')) return null;
                        
                        // Get the corresponding raw points value
                        const rawPoints = props.payload[`${name}_raw`];
                        return [`${value}% (${rawPoints} pts)`, name];
                      }}
                    />
                    <Legend />
                    {Object.keys(weeklyPointsData[0] || {})
                      .filter(key => key !== 'name' && !key.endsWith('_raw') && typeof key === 'string' && key.trim() !== '')
                      .map((key, index) => (
                        <Area 
                          key={key}
                          type="monotone" 
                          dataKey={key} 
                          stackId="1"
                          stroke={playerColorMap[key] || COLORS[index % COLORS.length]}
                          fillOpacity={1}
                          fill={`url(#color-${key.replace(" ", "_")})`}
                        />
                      ))}
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="flex items-center justify-center h-full">
                  <p className="text-muted-foreground">No player points data available.</p>
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
              {hasMatchData ? (
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
