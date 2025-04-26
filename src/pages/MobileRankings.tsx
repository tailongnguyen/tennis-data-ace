import React, { useState, useEffect, useCallback } from 'react';
import { usePlayers } from "@/hooks/usePlayers";
import { useMatches } from "@/hooks/useMatches";
import { parseISO, subDays, isWithinInterval } from "date-fns";

/**
 * Ultra-minimal mobile rankings component with an explicit Apply button
 * to avoid the double-tap issue on mobile devices
 */
const MobileRankings = () => {
  // Filter controls state
  const [searchTerm, setSearchTerm] = useState('');
  const [matchType, setMatchType] = useState('all');
  const [timeFilter, setTimeFilter] = useState('all');
  
  // Loading and computed data states
  const [isLoadingData, setIsLoadingData] = useState(false);
  const [playerStats, setPlayerStats] = useState<any[]>([]);
  
  // Get data from hooks
  const { players, isLoading: playersLoading } = usePlayers();
  const { matches, isLoading: matchesLoading } = useMatches();
  
  // Track if filters have been changed but not applied
  const [filtersDirty, setFiltersDirty] = useState(false);

  // Function to calculate player stats based on filtered matches
  const calculateStats = useCallback(() => {
    setIsLoadingData(true);
    
    // Define a function to check if a match is a draw
    const isDrawMatch = (match: any) => match.score === '5-5' || match.score === '6-6';
    
    setTimeout(() => {
      try {
        // Start with all matches
        let filteredMatches = [...matches];
        
        // Apply match type filter
        if (matchType !== 'all') {
          filteredMatches = filteredMatches.filter(m => m.match_type === matchType);
        }
        
        // Apply time filter
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
          
          filteredMatches = filteredMatches.filter(match => {
            const matchDate = parseISO(match.match_date);
            return isWithinInterval(matchDate, { start: startDate, end: now });
          });
        }
        
        // Calculate stats for each player
        const calculatedStats = players.map(player => {
          // Get all matches involving this player
          const playerMatches = filteredMatches.filter(match => 
            match.winner1_id === player.id || 
            match.winner2_id === player.id || 
            match.loser1_id === player.id || 
            match.loser2_id === player.id
          );
          
          // Calculate wins, draws, losses
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
        
        // Filter by search term
        let results = calculatedStats;
        if (searchTerm) {
          const searchLower = searchTerm.toLowerCase();
          results = results.filter(player => 
            player.name.toLowerCase().includes(searchLower)
          );
        }
        
        // Sort by points descending
        results = results.sort((a, b) => b.points - a.points);
        
        // Update state with calculated results
        setPlayerStats(results);
        setFiltersDirty(false);
      } catch (error) {
        console.error('Error calculating stats:', error);
      } finally {
        setIsLoadingData(false);
      }
    }, 500); // Add a slight delay for better UX
  }, [players, matches, searchTerm, matchType, timeFilter]);
  
  // Calculate stats when component mounts or when apply is clicked
  useEffect(() => {
    if (!playersLoading && !matchesLoading) {
      calculateStats();
    }
  }, [playersLoading, matchesLoading]);
  
  // Handlers for filter changes
  const handleSearchChange = (value: string) => {
    setSearchTerm(value);
    setFiltersDirty(true);
  };
  
  const handleMatchTypeChange = (value: string) => {
    setMatchType(value as any);
    setFiltersDirty(true);
  };
  
  const handleTimeFilterChange = (value: string) => {
    setTimeFilter(value as any);
    setFiltersDirty(true);
  };
  
  // Apply filters button handler
  const handleApplyFilters = () => {
    calculateStats();
  };
  
  // Rendering helper functions
  const getRankDisplay = (rank: number) => {
    if (rank === 1) return <span className="text-yellow-500 font-bold">1 🥇</span>;
    if (rank === 2) return <span className="text-gray-500 font-bold">2 🥈</span>;
    if (rank === 3) return <span className="text-amber-700 font-bold">3 🥉</span>;
    return <span>{rank}</span>;
  };

  const getRowClass = (rank: number) => {
    if (rank === 1) return "bg-yellow-50 border-b py-3";
    if (rank === 2) return "bg-gray-50 border-b py-3";
    if (rank === 3) return "bg-amber-50/20 border-b py-3";
    return "border-b py-3";
  };

  // Use simplified HTML elements
  return (
    <div className="p-4 max-w-screen-md mx-auto">
      <h1 className="text-3xl font-bold mb-4">Rankings</h1>
      
      {/* Filter controls with Apply button */}
      <div className="mb-6 bg-white p-4 rounded-lg shadow-sm">
        <input 
          type="text" 
          placeholder="Search players..." 
          className="w-full border rounded-md px-3 py-2 mb-3" 
          value={searchTerm}
          onChange={(e) => handleSearchChange(e.target.value)}
        />

        <div className="grid grid-cols-2 gap-3 mb-4">
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium">Match Type</div>
            <div className="flex gap-1 flex-wrap">
              <button 
                className={`px-2 py-1 text-xs rounded-md ${matchType === 'all' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleMatchTypeChange('all')}>
                All
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded-md ${matchType === 'singles' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleMatchTypeChange('singles')}>
                Singles
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded-md ${matchType === 'doubles' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleMatchTypeChange('doubles')}>
                Doubles
              </button>
            </div>
          </div>
          
          <div className="space-y-1">
            <div className="text-xs text-gray-500 font-medium">Time Period</div>
            <div className="flex flex-wrap gap-1">
              <button 
                className={`px-2 py-1 text-xs rounded-md ${timeFilter === 'all' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleTimeFilterChange('all')}>
                All Time
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded-md ${timeFilter === '30d' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleTimeFilterChange('30d')}>
                30 Days
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded-md ${timeFilter === '90d' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleTimeFilterChange('90d')}>
                90 Days
              </button>
              <button 
                className={`px-2 py-1 text-xs rounded-md ${timeFilter === '1y' ? 'bg-blue-100' : 'bg-gray-100'}`}
                onClick={() => handleTimeFilterChange('1y')}>
                Last Year
              </button>
            </div>
          </div>
        </div>
        
        {/* Apply filters button */}
        <button 
          className={`w-full py-2 rounded-md font-medium text-white ${filtersDirty ? 'bg-blue-500' : 'bg-gray-400'}`}
          onClick={handleApplyFilters}
          disabled={!filtersDirty && !isLoadingData}
        >
          {isLoadingData ? 'Updating Rankings...' : filtersDirty ? 'Apply Filters' : 'Filters Applied'}
        </button>
      </div>
      
      {/* Results table */}
      <div className="rounded-md overflow-hidden shadow bg-white">
        <div className="grid grid-cols-12 bg-gray-50 font-medium text-sm p-3">
          <div className="col-span-1">#</div>
          <div className="col-span-4">Player</div>
          <div className="col-span-2 text-center">Pts</div>
          <div className="col-span-2 text-center">Win%</div>
          <div className="col-span-3 text-center">NotL%</div>
        </div>
        
        {playersLoading || matchesLoading || isLoadingData ? (
          <div className="p-8 text-center">
            <div className="inline-block h-6 w-6 animate-spin rounded-full border-2 border-solid border-blue-500 border-r-transparent"></div>
            <div className="mt-2 text-gray-500">Calculating rankings...</div>
          </div>
        ) : playerStats.length === 0 ? (
          <div className="p-6 text-center text-gray-400">No matching players found</div>
        ) : (
          <div>
            {playerStats.map((player, index) => {
              const rank = index + 1;
              return (
                <div key={player.id} className={getRowClass(rank)}>
                  <div className="grid grid-cols-12 p-3">
                    <div className="col-span-1">{getRankDisplay(rank)}</div>
                    <div className="col-span-4 font-medium">{player.name}</div>
                    <div className="col-span-2 text-center">{player.points}</div>
                    <div className="col-span-2 text-center">{Math.round(player.winRate)}%</div>
                    <div className="col-span-3 text-center">{Math.round(player.notLoseRate)}%</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default MobileRankings;
