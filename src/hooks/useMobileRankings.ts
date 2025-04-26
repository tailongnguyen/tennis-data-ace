import { useState, useEffect, useMemo } from 'react';
import { usePlayers } from "./usePlayers";
import { useMatches } from "./useMatches";
import { addDays, parseISO, subDays, isWithinInterval } from "date-fns";

type PlayerStats = {
  id: string;
  name: string;
  points: number;
  wins: number;
  draws: number;
  losses: number;
  total: number;
  winRate: number;
  notLoseRate: number;
};

type SortField = 'points' | 'winRate' | 'notLoseRate';
type MatchTypeFilter = 'all' | 'singles' | 'doubles';
type TimeFilter = 'all' | '30d' | '90d' | '1y';

const isDrawMatch = (match: any) => match.score === '5-5' || match.score === '6-6';

/**
 * A pre-calculation hook for player rankings
 * This separates all the heavy calculations from the rendering cycle
 */
export const useMobileRankings = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [matchTypeFilter, setMatchTypeFilter] = useState<MatchTypeFilter>('all');
  const [timeFilter, setTimeFilter] = useState<TimeFilter>('all');
  const [sortField, setSortField] = useState<SortField>('points');
  const [sortAsc, setSortAsc] = useState(false);
  
  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();
  
  // Pre-calculate all player stats ONCE when data changes
  // This separates calculation from rendering
  const allPlayerStats = useMemo(() => {
    if (playersLoading || matchesLoading) return [];
    
    return players.map(player => {
      // Calculate all matches with this player
      const playerMatches = matches.filter(match => 
        match.winner1_id === player.id || 
        match.winner2_id === player.id || 
        match.loser1_id === player.id || 
        match.loser2_id === player.id
      );
      
      // Calculate wins/draws/losses once for each player
      const wins = playerMatches.filter(match => 
        !isDrawMatch(match) && (match.winner1_id === player.id || match.winner2_id === player.id)
      ).length;
      
      const draws = playerMatches.filter(match => isDrawMatch(match)).length;
      
      const losses = playerMatches.filter(match => 
        !isDrawMatch(match) && (match.loser1_id === player.id || match.loser2_id === player.id)
      ).length;
      
      // Calculate points
      let points = 0;
      playerMatches.forEach(match => {
        if (!isDrawMatch(match) && (match.winner1_id === player.id || match.winner2_id === player.id)) {
          points += 3;
        }
        else if (isDrawMatch(match)) {
          points += 1;
        }
        else if (!isDrawMatch(match) && (match.loser1_id === player.id || match.loser2_id === player.id)) {
          points -= 1;
        }
      });
      
      // Calculate other metrics
      const total = wins + draws + losses;
      const winRate = total > 0 ? (wins / total) * 100 : 0;
      const notLoseRate = total > 0 ? ((wins + draws) / total) * 100 : 0;
      
      return {
        id: player.id,
        name: player.name,
        points,
        wins,
        draws,
        losses,
        total,
        winRate,
        notLoseRate
      } as PlayerStats;
    });
  }, [players, matches, playersLoading, matchesLoading]);
  
  // Apply filters and sorting separately from base calculation
  const filteredAndSortedStats = useMemo(() => {
    let result = [...allPlayerStats];
    
    // Start with all matches, then apply filters
    let filteredMatches = [...matches];
    
    // Apply match type filter
    if (matchTypeFilter !== 'all') {
      filteredMatches = filteredMatches.filter(m => m.match_type === matchTypeFilter);
    }
    
    // Apply time filter - use date-fns for proper date handling
    if (timeFilter !== 'all') {
      const now = new Date();
      let startDate: Date;
      
      if (timeFilter === '30d') {
        // Last 30 days
        startDate = subDays(now, 30);
      } else if (timeFilter === '90d') {
        // Last 90 days
        startDate = subDays(now, 90);
      } else if (timeFilter === '1y') {
        // Last 365 days
        startDate = subDays(now, 365);
      }
      
      console.log(`Filtering matches from ${startDate.toISOString()}`);
      filteredMatches = filteredMatches.filter(match => {
        // Properly parse the match date using date-fns parseISO
        const matchDate = parseISO(match.match_date);
        return isWithinInterval(matchDate, { start: startDate, end: now });
      });
    }
    
    // If we have any filters, recalculate player stats
    if (matchTypeFilter !== 'all' || timeFilter !== 'all') {
      
      // Recalculate stats based on filtered matches
      result = players.map(player => {
        const playerMatches = filteredMatches.filter(match => 
          match.winner1_id === player.id || 
          match.winner2_id === player.id || 
          match.loser1_id === player.id || 
          match.loser2_id === player.id
        );
        
        const wins = playerMatches.filter(match => 
          !isDrawMatch(match) && (match.winner1_id === player.id || match.winner2_id === player.id)
        ).length;
        
        const draws = playerMatches.filter(match => isDrawMatch(match)).length;
        
        const losses = playerMatches.filter(match => 
          !isDrawMatch(match) && (match.loser1_id === player.id || match.loser2_id === player.id)
        ).length;
        
        let points = 0;
        playerMatches.forEach(match => {
          if (!isDrawMatch(match) && (match.winner1_id === player.id || match.winner2_id === player.id)) {
            points += 3;
          }
          else if (isDrawMatch(match)) {
            points += 1;
          }
          else if (!isDrawMatch(match) && (match.loser1_id === player.id || match.loser2_id === player.id)) {
            points -= 1;
          }
        });
        
        const total = wins + draws + losses;
        const winRate = total > 0 ? (wins / total) * 100 : 0;
        const notLoseRate = total > 0 ? ((wins + draws) / total) * 100 : 0;
        
        return {
          id: player.id,
          name: player.name,
          points,
          wins,
          draws,
          losses,
          total,
          winRate,
          notLoseRate
        };
      });
    }
    
    // Apply search filter
    if (searchTerm) {
      const lowerSearchTerm = searchTerm.toLowerCase();
      result = result.filter(player => 
        player.name.toLowerCase().includes(lowerSearchTerm)
      );
    }
    
    // Apply sorting
    result.sort((a, b) => {
      const multiplier = sortAsc ? 1 : -1;
      
      switch (sortField) {
        case 'points':
          return (a.points - b.points) * multiplier;
        case 'winRate':
          return (a.winRate - b.winRate) * multiplier;
        case 'notLoseRate':
          return (a.notLoseRate - b.notLoseRate) * multiplier;
        default:
          return 0;
      }
    });
    
    return result;
  }, [allPlayerStats, matchTypeFilter, searchTerm, sortField, sortAsc, players, matches]);
  
  // Handlers as separate functions to avoid inline function creation during render
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
  };
  
  const handleMatchTypeChange = (value: MatchTypeFilter) => {
    setMatchTypeFilter(value);
  };
  
  const handleTimeFilterChange = (value: TimeFilter) => {
    setTimeFilter(value);
  };
  
  const handleSort = (field: SortField) => {
    if (field === sortField) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(false);
    }
  };
  
  return {
    isLoading: playersLoading || matchesLoading,
    playerStats: filteredAndSortedStats,
    searchTerm,
    matchTypeFilter,
    timeFilter,
    sortField,
    sortAsc,
    handleSearchChange,
    handleMatchTypeChange,
    handleTimeFilterChange,
    handleSort
  };
};
