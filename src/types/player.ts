
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
  winner1_id: string;
  winner2_id: string | null;
  loser1_id: string;
  loser2_id: string | null;
  match_type: 'singles' | 'doubles';
  score: string;
  match_date: string;
  created_at: string;
  winner1?: { id: string; name: string };
  winner2?: { id: string; name: string };
  loser1?: { id: string; name: string };
  loser2?: { id: string; name: string };
}
