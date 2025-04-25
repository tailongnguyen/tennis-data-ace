import { useMemo, useState } from "react";
import { Player, Match } from "@/types/player";
import { useMatches } from "./useMatches";
import { usePlayers } from "./usePlayers";

// Constants for the export feature
const BASE_FEE = 1500000;
const BET_FEE = 30000;
const SPECIAL_LOSS_FEE = 60000; // Fee for 6-0 losses
const MAX_DAILY_FEE = 100000; // Maximum fee per player per day

// Helper function to format currency
const formatCurrency = (amount: number) => {
  return new Intl.NumberFormat('vi-VN', { 
    style: 'currency', 
    currency: 'VND',
    maximumFractionDigits: 0
  }).format(amount);
};

// Type for fee calculation
export interface PlayerFee {
  name: string;
  totalMatches: number;
  wins: number;
  draws: number;
  losses: number;
  baseFee: number;
  betFee: number;
  totalFee: number;
}

export interface ExportRange {
  startDate: Date;
  endDate: Date;
}

export const useExport = () => {
  const [range, setRange] = useState<ExportRange>({ 
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 3)), // Default to 3 months ago
    endDate: new Date() 
  });
  const [matchType, setMatchType] = useState<'all' | 'singles' | 'doubles'>('all');
  
  const { matches, isLoading: matchesLoading, isDrawMatch } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();

  // Helper function to calculate daily fee
  const calculateDailyFee = (matches: Match[], playerId: string): number => {
    // Group matches by date
    const dailyFees = matches.reduce((acc: { [key: string]: number }, match) => {
      const date = new Date(match.match_date).toDateString();
      
      if (!acc[date]) {
        acc[date] = 0;
      }

      if (match.loser1_id === playerId || match.loser2_id === playerId) {
        // Add fee based on match result
        if (match.score === "6-0") {
          acc[date] += SPECIAL_LOSS_FEE;
        } else if (!isDrawMatch(match.score)) {
          acc[date] += BET_FEE;
        }
      }

      if (isDrawMatch(match.score) && 
         (match.winner1_id === playerId || match.winner2_id === player.id || 
          match.loser1_id === playerId || match.loser2_id === player.id)) {
        acc[date] += BET_FEE;
      }

      // Cap the daily fee at MAX_DAILY_FEE
      acc[date] = Math.min(acc[date], MAX_DAILY_FEE);

      return acc;
    }, {});

    // Sum up all daily fees
    return Object.values(dailyFees).reduce((sum, fee) => sum + fee, 0);
  };

  // Filter matches based on date range and match type
  const filteredMatches = useMemo(() => {
    if (!matches) return [];

    return matches.filter(match => {
      const matchDate = new Date(match.match_date);
      const matchTypeFilter = matchType === 'all' || match.match_type === matchType;
      return matchDate >= range.startDate && 
             matchDate <= range.endDate && // Changed from < to <= to include the end date
             matchTypeFilter;
    });
  }, [matches, range.startDate, range.endDate, matchType]);

  // Generate export data for matches
  const matchExportData = useMemo(() => {
    return filteredMatches.map(match => {
      const team1player1 = match.winner1?.name || 'Unknown';
      const team1player2 = match.winner2?.name || '';
      const team2player1 = match.loser1?.name || 'Unknown';
      const team2player2 = match.loser2?.name || '';
      
      const team1 = match.match_type === 'singles' ? team1player1 : `${team1player1}, ${team1player2}`;
      const team2 = match.match_type === 'singles' ? team2player1 : `${team2player1}, ${team2player2}`;

      return {
        'Time': new Date(match.match_date).toLocaleString(),
        'Type': match.match_type,
        'Team 1': team1,
        'Team 2': team2,
        'Score': match.score
      };
    });
  }, [filteredMatches]);

  // Calculate fees for each player
  const feeExportData = useMemo(() => {
    if (!players || players.length === 0) return [];

    const playerFees: PlayerFee[] = players.map(player => {
      const playerMatches = filteredMatches.filter(match => 
        match.winner1_id === player.id || 
        match.winner2_id === player.id || 
        match.loser1_id === player.id || 
        match.loser2_id === player.id
      );
      
      const wins = playerMatches.filter(match => 
        !isDrawMatch(match.score) && (match.winner1_id === player.id || match.winner2_id === player.id)
      ).length;
      
      const draws = playerMatches.filter(match => 
        isDrawMatch(match.score)
      ).length;
      
      const lossMatches = playerMatches.filter(match => 
        !isDrawMatch(match.score) && (match.loser1_id === player.id || match.loser2_id === player.id)
      );
      
      const losses = lossMatches.length;
      
      // Calculate total bet fee with daily caps
      const betFee = calculateDailyFee(playerMatches, player.id);
      
      // Base fee is 1,500,000 VND if player is active, 0 otherwise
      const baseFee = player.is_active ? BASE_FEE : 0;
      
      const totalFee = baseFee + betFee;

      return {
        name: player.name,
        totalMatches: playerMatches.length,
        wins,
        draws,
        losses,
        baseFee,
        betFee,
        totalFee
      };
    })
    .filter(fee => fee.betFee > 0)
    .sort((a, b) => b.totalFee - a.totalFee);

    return playerFees.map(fee => ({
      'Player Name': fee.name,
      'Total Matches': fee.totalMatches,
      'Total Wins': fee.wins,
      'Total Draws': fee.draws,
      'Total Losses': fee.losses,
      'Base Fee': formatCurrency(fee.baseFee),
      'Bet Fee': formatCurrency(fee.betFee),
      'Total Fee': formatCurrency(fee.totalFee)
    }));
  }, [filteredMatches, players, isDrawMatch]);

  // Export to CSV format
  const exportToCSV = (data: any[], filename: string) => {
    if (!data.length) {
      return;
    }

    const headers = Object.keys(data[0]);
    const csvContent = [
      headers.join(','),
      ...data.map(row => headers.map(header => {
        const value = row[header];
        // Handle strings with commas by wrapping in quotes
        return typeof value === 'string' && value.includes(',') 
          ? `"${value}"` 
          : value;
      }).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `${filename}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Export to PDF format (placeholder)
  const exportToPDF = (data: any[], filename: string) => {
    console.log('PDF export not implemented yet', data, filename);
    alert('PDF export is not implemented in this version.');
  };

  // Handle export
  const handleExport = (type: 'matches' | 'fees', format: 'csv' | 'pdf') => {
    const data = type === 'matches' ? matchExportData : feeExportData;
    const filename = `tennis-tracker-${type}-${new Date().toISOString().split('T')[0]}`;
    
    if (format === 'csv') {
      exportToCSV(data, filename);
    } else {
      exportToPDF(data, filename);
    }
  };

  return {
    range,
    setRange,
    matchType,
    setMatchType,
    matchExportData,
    feeExportData,
    handleExport,
    isLoading: matchesLoading || playersLoading
  };
};
