/**
 * Time and Date Utilities for NFL Apuestas
 * Strictly enforces US Eastern Time (ET) display for all games.
 */

// Mapping of UTC-based time strings to Eastern Time (ET)
const UTC_TO_ET_MAP: Record<string, string> = {
  '00:15': '8:15 PM ET',
  '00:20': '8:20 PM ET',
  '00:25': '8:25 PM ET',
  '00:30': '8:30 PM ET',
  '00:35': '8:35 PM ET',
  '01:15': '9:15 PM ET',
  '01:20': '9:20 PM ET',
  '13:30': '9:30 AM ET', // London games e.g. 9:30 AM ET
  '17:00': '1:00 PM ET',
  '17:05': '1:05 PM ET',
  '20:05': '4:05 PM ET',
  '20:25': '4:25 PM ET',
  '20:30': '4:30 PM ET',
  '21:00': '5:00 PM ET',
  '21:30': '5:30 PM ET',
  '22:00': '6:00 PM ET',
  '23:00': '7:00 PM ET',
  '23:15': '7:15 PM ET',
};

/**
 * Formats any time or ISO date string strictly into US Eastern Time (ET).
 * Examples: "8:15 PM ET", "1:00 PM ET", "4:25 PM ET"
 */
export function formatETTime(timeStr?: string, dateIso?: string): string {
  // 1. If we have a valid ISO string, America/New_York is authoritative
  const isoCandidate = dateIso || (timeStr && (timeStr.includes('T') || timeStr.includes('Z')) ? timeStr : null);
  if (isoCandidate) {
    try {
      const d = new Date(isoCandidate);
      if (!isNaN(d.getTime())) {
        const formatted = d.toLocaleTimeString('en-US', {
          timeZone: 'America/New_York',
          hour: 'numeric',
          minute: '2-digit',
          hour12: true,
        });
        return `${formatted} ET`;
      }
    } catch {}
  }

  if (!timeStr) return 'TBD ET';

  // 2. Already ends with ET
  if (/ET/i.test(timeStr)) {
    return timeStr.trim();
  }

  // 3. Known raw UTC mapping
  const trimmed = timeStr.trim();
  if (UTC_TO_ET_MAP[trimmed]) {
    return UTC_TO_ET_MAP[trimmed];
  }

  // 4. 24h format HH:MM (originated from UTC or local)
  const match24 = trimmed.match(/^(\d{1,2}):(\d{2})$/);
  if (match24) {
    const hours = parseInt(match24[1], 10);
    const mins = match24[2];
    // If hour >= 17 or hour <= 4, it's typically UTC (e.g. 17:00 is 13:00 EDT)
    // UTC - 4 is Eastern Daylight Time (September to November)
    let etHour = (hours - 4 + 24) % 24;
    const ampm = etHour >= 12 ? 'PM' : 'AM';
    const displayHour = etHour % 12 || 12;
    return `${displayHour}:${mins} ${ampm} ET`;
  }

  // 5. 12h format e.g. "8:20 PM" or "17:30 PM"
  const match12 = trimmed.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)?$/i);
  if (match12) {
    let hour = parseInt(match12[1], 10);
    const mins = match12[2];
    const ampm = match12[3] ? match12[3].toUpperCase() : hour >= 12 ? 'PM' : 'AM';
    const displayHour = hour > 12 ? hour - 12 : hour === 0 ? 12 : hour;
    return `${displayHour}:${mins} ${ampm} ET`;
  }

  return `${trimmed} ET`;
}

/**
 * Formats an ISO string or date into Eastern Time in Spanish.
 * Example: "Jue 24 Sep", "Dom 27 Sep"
 */
export function formatETDate(dateOrIso?: string): string {
  if (!dateOrIso) return 'Por definir';

  if (dateOrIso.includes('T') || dateOrIso.includes('Z')) {
    try {
      const d = new Date(dateOrIso);
      if (!isNaN(d.getTime())) {
        const formatter = new Intl.DateTimeFormat('es-ES', {
          timeZone: 'America/New_York',
          weekday: 'short',
          day: 'numeric',
          month: 'short',
        });
        const parts = formatter.format(d);
        // Clean up punctuation: "jue, 24 sept" -> "Jue 24 Sep"
        const clean = parts.replace(',', '').replace('.', '');
        return clean.charAt(0).toUpperCase() + clean.slice(1);
      }
    } catch {}
  }

  return dateOrIso;
}
