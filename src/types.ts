export type UserId = 'enrique' | 'diego' | 'adrian' | 'alejandro' | 'andres';

export interface UserProfile {
  id: UserId;
  name: string;
  email: string;
  avatar: string;
  color: string;
  secondaryColor: string;
  favoriteTeam: string;
  pin: string;
  password?: string;
  isPasswordSet?: boolean;
  hasPassword?: boolean;
  weeksWon: number;
  totalPicksCorrect: number;
  totalPicksMade: number;
  earnings: number; // in Bolivianos (Bs.)
}

export type ApuestasData = QuinielaData;

export interface NFLTeam {
  id: string;
  name: string;
  city: string;
  abbreviation: string;
  conference: 'AFC' | 'NFC';
  division: 'East' | 'North' | 'South' | 'West';
  primaryColor: string;
  secondaryColor: string;
  logoUrl: string;
  record: string;
}

export type GameStatus = 'scheduled' | 'in_progress' | 'final';

export type WeekType = 'regular' | 'playoff' | 'superbowl';

export interface NFLGame {
  id: string;
  weekId: number;
  weekType: WeekType;
  homeTeam: NFLTeam;
  awayTeam: NFLTeam;
  date: string;
  time: string;
  dateIso?: string;
  stadium: string;
  tvNetwork: string;
  status: GameStatus;
  homeScore?: number;
  awayScore?: number;
  quarter?: string;
  clock?: string;
  spread?: string;
  overUnder?: number;
  winnerTeamId?: string;
}

export interface UserPick {
  userId: UserId;
  gameId: string;
  selectedTeamId: string;
  // For playoffs / Super Bowl exact score predictions (+- 7 pts margin)
  predictedHomeScore?: number;
  predictedAwayScore?: number;
  timestamp: string;
}

export interface WeekState {
  weekNumber: number;
  name: string;
  weekType: WeekType;
  opensAt: string; // Tuesday morning e.g. "Martes 06:00 AM"
  locksAt: string; // 30 min before first game kickoff
  firstGameTime: string;
  isLocked: boolean;
  isFinished: boolean;
  basePot: number; // default per week ($1,000 for 5 users x $200)
  rolledOverPot: number; // accumulated from previous ties (3+ winners)
  totalPot: number;
  games: NFLGame[];
  userPicks: Record<UserId, Record<string, UserPick>>; // userId -> gameId -> UserPick
  submittedUsers?: Partial<Record<UserId, boolean>>; // true if user confirmed and sealed their bets with APOSTAR
  submittedAt?: Partial<Record<UserId, string>>; // timestamp when APOSTAR was pressed
  winners?: UserId[]; // calculated when finished
  potDistributed?: {
    type: 'single_winner' | 'split_two' | 'rollover_tie';
    amountPerWinner: number;
    amountRolledOver: number;
    winners: UserId[];
  };
}

export interface QuinielaData {
  users: Record<UserId, UserProfile>;
  currentWeekId: number;
  weeks: Record<number, WeekState>;
  activeUserId: UserId | null;
  baseStakePerUser: number; // e.g. 200
  hasCompletedSplash: boolean;
}
