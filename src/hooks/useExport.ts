
import { useMemo, useState } from "react";
import { Player, Match } from "@/types/player";
import { useMatches } from "./useMatches";
import { usePlayers } from "./usePlayers";

// Constants for the export feature
const BASE_FEE = 1500000;
const BET_FEE = 30000;

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
  months: number;
}

export const useExport = () => {
  const [range, setRange] = useState<ExportRange>({ months: 3 });
  const [matchType, setMatchType] = useState<'all' | 'singles' | 'doubles'>('all');
  
  const { matches, isLoading: matchesLoading, isDrawMatch } = useMatches();
  const { players, isLoading: playersLoading } = usePlayers();

  // Filter matches based on date range and match type
  const filteredMatches = useMemo(() => {
    if (!matches) return [];

    const now = new Date();
    const startDate = new Date();
    startDate.setMonth(now.getMonth() - range.months);

    return matches.filter(match => {
      const matchDate = new Date(match.match_date);
      const matchTypeFilter = matchType === 'all' || match.match_type === matchType;
      return matchDate >= startDate && matchTypeFilter;
    });
  }, [matches, range.months, matchType]);

  // Generate export data for matches
  const matchExportData = useMemo(() => {
    return filteredMatches.map(match => {
      const winner1Name = match.winner1?.name || 'Unknown';
      const winner2Name = match.winner2?.name || '';
      const loser1Name = match.loser1?.name || 'Unknown';
      const loser2Name = match.loser2?.name || '';
      
      const winnerTeam = match.match_type === 'singles' ? winner1Name : `${winner1Name}, ${winner2Name}`;
      const loserTeam = match.match_type === 'singles' ? loser1Name : `${loser1Name}, ${loser2Name}`;

      return {
        time: new Date(match.match_date).toLocaleString(),
        type: match.match_type,
        winner: winnerTeam,
        loser: loserTeam,
        score: match.score
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
      
      const losses = playerMatches.filter(match => 
        !isDrawMatch(match.score) && (match.loser1_id === player.id || match.loser2_id === player.id)
      ).length;
      
      // Calculate bet fee: 30,000 VND for each loss and draw
      const betFee = (losses + draws) * BET_FEE;
      
      // Base fee is 1,500,000 VND if player is active, 0 otherwise
      const baseFee = player.is_active ? BASE_FEE : 0;

      return {
        name: player.name,
        totalMatches: playerMatches.length,
        wins,
        draws,
        losses,
        baseFee,
        betFee,
        totalFee: baseFee + betFee
      };
    });

    return playerFees;
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
