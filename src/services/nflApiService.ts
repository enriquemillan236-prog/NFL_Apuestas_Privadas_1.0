import { NFLGame, NFLTeam, WeekType, GameStatus } from '../types';
import { NFL_TEAMS } from '../data/nflTeams';
import { FULL_SCHEDULE_2026 } from '../data/fullSchedule2026';
import { formatETDate, formatETTime } from '../utils/timeUtils';

export interface ScoreboardResponse {
  seasonYear: number;
  seasonType: number;
  weekNumber: number;
  games: NFLGame[];
  hasLiveGames: boolean;
  lastUpdated: string;
}

// Map external abbreviations to local dictionary
const ABBREVIATION_MAP: Record<string, string> = {
  WSH: 'WAS',
  LA: 'LAR',
  OAK: 'LV',
  SD: 'LAC',
  STL: 'LAR',
};

/**
 * Format ISO date string into Spanish day and date strictly in Eastern Time (e.g., "Jue 24 Sep")
 */
export function formatGameDate(isoString: string): string {
  return formatETDate(isoString);
}

/**
 * Format ISO date into time string strictly in US Eastern Time (e.g., "8:15 PM ET")
 */
export function formatGameTime(isoString: string): string {
  return formatETTime(undefined, isoString);
}

/**
 * Map external competitor to NFLTeam
 */
function mapTeam(competitor: any): NFLTeam {
  const rawAbbr = competitor.team?.abbreviation || '';
  const cleanAbbr = ABBREVIATION_MAP[rawAbbr] || rawAbbr;
  const existing = NFL_TEAMS[cleanAbbr];

  const recordSummary = competitor.records?.[0]?.summary || existing?.record || '0-0';

  if (existing) {
    return {
      ...existing,
      record: recordSummary,
    };
  }

  // Fallback for TBD or unmapped teams
  return {
    id: cleanAbbr || 'TBD',
    name: competitor.team?.name || 'TBD',
    city: competitor.team?.location || 'NFL',
    abbreviation: cleanAbbr || 'TBD',
    conference: 'AFC',
    division: 'East',
    primaryColor: '#002244',
    secondaryColor: '#B0B7BC',
    logoUrl: competitor.team?.logo || 'https://a.espncdn.com/i/teamlogos/leagues/500/nfl.png',
    record: recordSummary,
  };
}

/**
 * Fetch official NFL scoreboard for a given week & season type.
 * seasonType: 2 = Regular Season, 3 = Postseason
 */
export async function fetchNFLScoreboard(
  weekNumber: number = 1,
  seasonType: number = 2
): Promise<ScoreboardResponse> {
  // If weekNumber is 22 or >18, translate into postseason if needed
  let targetSeasonType = seasonType;
  let targetWeek = weekNumber;

  if (weekNumber === 19) {
    targetSeasonType = 3;
    targetWeek = 1; // Wild Card
  } else if (weekNumber === 20) {
    targetSeasonType = 3;
    targetWeek = 2; // Divisional
  } else if (weekNumber === 21) {
    targetSeasonType = 3;
    targetWeek = 3; // Conference
  } else if (weekNumber === 22) {
    targetSeasonType = 3;
    targetWeek = 5; // Super Bowl
  }

  try {
    const url = `https://site.api.espn.com/apis/site/v2/sports/football/nfl/scoreboard?week=${targetWeek}&seasontype=${targetSeasonType}`;

    const res = await fetch(url, {
      headers: {
        Accept: 'application/json',
      },
    });

    if (!res.ok) {
      throw new Error(`Failed to fetch NFL scoreboard: HTTP ${res.status}`);
    }

    const data = await res.json();
    const seasonYear = data.season?.year || 2026;
    const currentApiWeek = data.week?.number || targetWeek;

    let hasLiveGames = false;

    const rawGames: NFLGame[] = (data.events || []).map((event: any, index: number) => {
      const comp = event.competitions?.[0] || {};
      const competitors = comp.competitors || [];
      const homeComp = competitors.find((c: any) => c.homeAway === 'home') || competitors[0];
      const awayComp = competitors.find((c: any) => c.homeAway === 'away') || competitors[1];

      let homeTeam = mapTeam(homeComp);
      let awayTeam = mapTeam(awayComp);

      // Postseason / TBD fallback: if teams are unassigned or TBD, fallback to predefined schedule matchup
      const fallbackGame = FULL_SCHEDULE_2026[weekNumber]?.[index];
      if (
        (homeTeam.id === 'TBD' || awayTeam.id === 'TBD' || homeTeam.id === awayTeam.id) &&
        fallbackGame
      ) {
        homeTeam = fallbackGame.homeTeam;
        awayTeam = fallbackGame.awayTeam;
      }

      const state = comp.status?.type?.state;
      let status: GameStatus = 'scheduled';

      if (state === 'post') {
        status = 'final';
      } else if (state === 'in') {
        status = 'in_progress';
        hasLiveGames = true;
      }

      const homeScore = status !== 'scheduled' ? parseInt(homeComp.score, 10) : undefined;
      const awayScore = status !== 'scheduled' ? parseInt(awayComp.score, 10) : undefined;

      // Period / quarter display
      let quarter: string | undefined;
      const period = comp.status?.period;
      if (status === 'in_progress') {
        if (comp.status?.type?.detail?.toLowerCase().includes('halftime')) {
          quarter = 'Medio Tiempo';
        } else if (period === 5) {
          quarter = 'OT';
        } else if (period) {
          quarter = `${period}Q`;
        }
      } else if (status === 'final') {
        quarter = period && period > 4 ? 'FINAL / TE' : 'FINAL';
      }

      const clock = comp.status?.displayClock || undefined;
      const stadium = comp.venue?.fullName || comp.venue?.address?.city || fallbackGame?.stadium || 'Estadio NFL';
      const tvNetwork = comp.broadcasts?.[0]?.names?.join(' / ') || fallbackGame?.tvNetwork || 'NFL GamePass';
      const spread = comp.odds?.[0]?.details || fallbackGame?.spread || undefined;

      let winnerTeamId: string | undefined;
      if (status === 'final') {
        if (homeScore !== undefined && awayScore !== undefined) {
          if (homeScore > awayScore) {
            winnerTeamId = homeTeam.id;
          } else if (awayScore > homeScore) {
            winnerTeamId = awayTeam.id;
          } else {
            winnerTeamId = 'TIE';
          }
        }
      }

      const weekType: WeekType =
        targetSeasonType === 3
          ? targetWeek === 5
            ? 'superbowl'
            : 'playoff'
          : 'regular';

      return {
        id: event.id || fallbackGame?.id || `nfl_${targetWeek}_${index + 1}`,
        weekId: weekNumber,
        weekType,
        homeTeam,
        awayTeam,
        date: formatGameDate(event.date),
        time: formatGameTime(event.date),
        dateIso: event.date,
        stadium,
        tvNetwork,
        status,
        homeScore: isNaN(homeScore as number) ? undefined : homeScore,
        awayScore: isNaN(awayScore as number) ? undefined : awayScore,
        quarter,
        clock,
        spread,
        winnerTeamId,
      };
    });

    // If events array was empty, fallback to full schedule
    const games = rawGames.length > 0 ? rawGames : (FULL_SCHEDULE_2026[weekNumber] || []);

    return {
      seasonYear,
      seasonType: targetSeasonType,
      weekNumber: weekNumber,
      games,
      hasLiveGames,
      lastUpdated: new Date().toLocaleTimeString('es-MX', { hour12: false }),
    };
  } catch (err) {
    console.warn(`[ESPN API] Fallback to official schedule for week ${weekNumber}:`, err);
    return {
      seasonYear: 2026,
      seasonType: targetSeasonType,
      weekNumber: weekNumber,
      games: FULL_SCHEDULE_2026[weekNumber] || [],
      hasLiveGames: false,
      lastUpdated: new Date().toLocaleTimeString('es-MX', { hour12: false }),
    };
  }
}
