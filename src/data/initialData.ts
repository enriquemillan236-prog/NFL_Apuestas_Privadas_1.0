import { NFL_TEAMS } from "./nflTeams";
import { QuinielaData, UserId, UserPick, UserProfile, WeekState } from "../types";
import { OFFICIAL_WEEK_1_GAMES, OFFICIAL_WEEK_2_GAMES } from "./officialSchedule";
import { FULL_SCHEDULE_2026 } from "./fullSchedule2026";

export const INITIAL_USERS: Record<UserId, UserProfile> = {
  enrique: {
    id: "enrique",
    name: "Enrique",
    email: "enriquemillan236@gmail.com",
    avatar: "🏈",
    color: "#3B82F6",
    secondaryColor: "#1D4ED8",
    favoriteTeam: "KC",
    pin: "1234",
    password: "",
    isPasswordSet: false,
    weeksWon: 0,
    totalPicksCorrect: 0,
    totalPicksMade: 0,
    earnings: 0,
  },
  diego: {
    id: "diego",
    name: "Diego",
    email: "dmillane369@gmail.com",
    avatar: "⚡",
    color: "#10B981",
    secondaryColor: "#047857",
    favoriteTeam: "SF",
    pin: "1234",
    password: "",
    isPasswordSet: false,
    weeksWon: 0,
    totalPicksCorrect: 0,
    totalPicksMade: 0,
    earnings: 0,
  },
  adrian: {
    id: "adrian",
    name: "Adrián",
    email: "ayalamillanadrian@gmail.com",
    avatar: "🔥",
    color: "#F59E0B",
    secondaryColor: "#D97706",
    favoriteTeam: "DAL",
    pin: "1234",
    password: "",
    isPasswordSet: false,
    weeksWon: 0,
    totalPicksCorrect: 0,
    totalPicksMade: 0,
    earnings: 0,
  },
  alejandro: {
    id: "alejandro",
    name: "Alejandro",
    email: "alejandroamillan@hotmail.com",
    avatar: "🎯",
    color: "#EC4899",
    secondaryColor: "#BE185D",
    favoriteTeam: "BAL",
    pin: "1234",
    password: "",
    isPasswordSet: false,
    weeksWon: 0,
    totalPicksCorrect: 0,
    totalPicksMade: 0,
    earnings: 0,
  },
  andres: {
    id: "andres",
    name: "Andrés",
    email: "andresayalamillan@gmail.com",
    avatar: "🏆",
    color: "#8B5CF6",
    secondaryColor: "#6D28D9",
    favoriteTeam: "PHI",
    pin: "1234",
    password: "",
    isPasswordSet: false,
    weeksWon: 0,
    totalPicksCorrect: 0,
    totalPicksMade: 0,
    earnings: 0,
  },
};

const W2_GAME_IDS = [
  '401872932', '401872933', '401872937', '401872939',
  '401872946', '401872936', '401872935', '401872938',
  '401872934', '401872940', '401872941', '401872944',
  '401872943', '401872942', '401872945', '401872947'
];

const W2_RAW_PICKS: Record<UserId, string[]> = {
  enrique:   ['BUF','CAR','CHI','PHI','NE', 'GB','TB','BAL','HOU','DEN','LAC','DAL','SEA','SF','KC','LAR'],
  diego:     ['BUF','CAR','CHI','PHI','NE', 'GB','TB','BAL','HOU','DEN','LAC','DAL','ARI','SF','KC','LAR'],
  adrian:    ['BUF','ATL','CHI','PHI','NE', 'GB','TB','BAL','HOU','DEN','LAC','DAL','SEA','SF','KC','LAR'],
  alejandro: ['BUF','CAR','CHI','PHI','PIT','GB','TB','BAL','CIN','DEN','LAC','WAS','SEA','SF','KC','LAR'],
  andres:    ['BUF','CAR','CHI','PHI','NE', 'GB','TB','BAL','HOU','DEN','LAC','WAS','SEA','SF','KC','LAR'],
};

export const INITIAL_WEEK_2_USER_PICKS: Record<UserId, Record<string, UserPick>> = {
  enrique: {},
  diego: {},
  adrian: {},
  alejandro: {},
  andres: {},
};

(['enrique', 'diego', 'adrian', 'alejandro', 'andres'] as UserId[]).forEach((uid) => {
  W2_GAME_IDS.forEach((gid, idx) => {
    INITIAL_WEEK_2_USER_PICKS[uid][gid] = {
      userId: uid,
      gameId: gid,
      selectedTeamId: W2_RAW_PICKS[uid][idx],
      timestamp: '2026-09-17T18:00:00.000Z',
    };
  });
});

export const INITIAL_WEEKS: Record<number, WeekState> = {
  1: {
    weekNumber: 1,
    name: "Semana 1 (No cuenta - Inaugural)",
    weekType: "regular",
    opensAt: "Martes 06:00 AM",
    locksAt: "Jueves 17:50 PM",
    firstGameTime: "2026-09-10T18:20:00Z",
    isLocked: true,
    isFinished: true,
    basePot: 250,
    rolledOverPot: 0,
    totalPot: 250,
    games: OFFICIAL_WEEK_1_GAMES,
    userPicks: {
      enrique: {},
      diego: {},
      adrian: {},
      alejandro: {},
      andres: {},
    },
    submittedUsers: {},
  },
  2: {
    weekNumber: 2,
    name: "Semana 2",
    weekType: "regular",
    opensAt: "Martes 06:00 AM",
    locksAt: "Jueves 17:50 PM",
    firstGameTime: "2026-09-17T18:20:00Z",
    isLocked: true,
    isFinished: true,
    basePot: 250,
    rolledOverPot: 0,
    totalPot: 250,
    games: OFFICIAL_WEEK_2_GAMES,
    userPicks: INITIAL_WEEK_2_USER_PICKS,
    submittedUsers: {
      enrique: true,
      diego: true,
      adrian: true,
      alejandro: true,
      andres: true,
    },
    submittedAt: {
      enrique: '2026-09-17T18:00:00.000Z',
      diego: '2026-09-17T18:00:00.000Z',
      adrian: '2026-09-17T18:00:00.000Z',
      alejandro: '2026-09-17T18:00:00.000Z',
      andres: '2026-09-17T18:00:00.000Z',
    },
  },
};

// Populate weeks 3 through 18
for (let w = 3; w <= 18; w++) {
  const weekGames = FULL_SCHEDULE_2026[w] || [];
  INITIAL_WEEKS[w] = {
    weekNumber: w,
    name: `Semana ${w}`,
    weekType: "regular",
    opensAt: "Martes 06:00 AM",
    locksAt: "Jueves 17:50 PM",
    firstGameTime: weekGames[0]?.dateIso || "2026-09-25T00:15:00Z",
    isLocked: false,
    isFinished: false,
    basePot: 250,
    rolledOverPot: 0,
    totalPot: 250,
    games: weekGames,
    userPicks: {
      enrique: {},
      diego: {},
      adrian: {},
      alejandro: {},
      andres: {},
    },
    submittedUsers: {},
  };
}

// Postseason weeks
INITIAL_WEEKS[19] = {
  weekNumber: 19,
  name: "Playoffs: Comodines",
  weekType: "playoff",
  opensAt: "Martes 06:00 AM",
  locksAt: "Sábado 13:00 PM",
  firstGameTime: FULL_SCHEDULE_2026[19]?.[0]?.dateIso || "2027-01-16T21:30:00Z",
  isLocked: false,
  isFinished: false,
  basePot: 250,
  rolledOverPot: 0,
  totalPot: 250,
  games: FULL_SCHEDULE_2026[19] || [],
  userPicks: {
    enrique: {},
    diego: {},
    adrian: {},
    alejandro: {},
    andres: {},
  },
  submittedUsers: {},
};

INITIAL_WEEKS[20] = {
  weekNumber: 20,
  name: "Playoffs: Divisional",
  weekType: "playoff",
  opensAt: "Martes 06:00 AM",
  locksAt: "Sábado 13:00 PM",
  firstGameTime: FULL_SCHEDULE_2026[20]?.[0]?.dateIso || "2027-01-23T21:30:00Z",
  isLocked: false,
  isFinished: false,
  basePot: 250,
  rolledOverPot: 0,
  totalPot: 250,
  games: FULL_SCHEDULE_2026[20] || [],
  userPicks: {
    enrique: {},
    diego: {},
    adrian: {},
    alejandro: {},
    andres: {},
  },
  submittedUsers: {},
};

INITIAL_WEEKS[21] = {
  weekNumber: 21,
  name: "Playoffs: Campeonato",
  weekType: "playoff",
  opensAt: "Martes 06:00 AM",
  locksAt: "Domingo 12:00 PM",
  firstGameTime: FULL_SCHEDULE_2026[21]?.[0]?.dateIso || "2027-01-31T20:00:00Z",
  isLocked: false,
  isFinished: false,
  basePot: 250,
  rolledOverPot: 0,
  totalPot: 250,
  games: FULL_SCHEDULE_2026[21] || [],
  userPicks: {
    enrique: {},
    diego: {},
    adrian: {},
    alejandro: {},
    andres: {},
  },
  submittedUsers: {},
};

INITIAL_WEEKS[22] = {
  weekNumber: 22,
  name: "Super Bowl LXI",
  weekType: "superbowl",
  opensAt: "Lunes 06:00 AM",
  locksAt: "Domingo 15:30 PM",
  firstGameTime: FULL_SCHEDULE_2026[22]?.[0]?.dateIso || "2027-02-14T23:30:00Z",
  isLocked: false,
  isFinished: false,
  basePot: 250,
  rolledOverPot: 0,
  totalPot: 250,
  games: FULL_SCHEDULE_2026[22] || [],
  userPicks: {
    enrique: {},
    diego: {},
    adrian: {},
    alejandro: {},
    andres: {},
  },
  submittedUsers: {},
};

export const INITIAL_QUINIELA_STATE: QuinielaData = {
  users: INITIAL_USERS,
  currentWeekId: 2,
  weeks: INITIAL_WEEKS,
  activeUserId: null,
  baseStakePerUser: 50,
  hasCompletedSplash: false,
};
