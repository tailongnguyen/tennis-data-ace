
export const PLAYING_STYLES = [
  'Aggressive Baseliner',
  'Serve and Volley',
  'Counter-Puncher',
  'All-Court Player',
  'Defensive Baseliner'
] as const;

export type PlayingStyle = typeof PLAYING_STYLES[number];

export interface Player {
  id: string;
  name: string;
  age: number;
  playing_style: PlayingStyle;
  ranking_points: number;
  created_at: string;
}

export interface Match {
  id: string;
  player1_id: string;
  player2_id: string;
  match_type: 'singles' | 'doubles';
  score: string;
  location: string; // Changed from optional to required to match DB schema
  match_date: string;
  created_at: string;
}
