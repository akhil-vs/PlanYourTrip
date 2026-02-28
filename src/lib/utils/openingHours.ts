export interface ParsedOpeningWindow {
  openMinutes: number;
  closeMinutes: number;
}

export function parseOpeningHoursWindow(
  openingHours?: string
): ParsedOpeningWindow | null {
  if (!openingHours) return null;
  const text = openingHours.trim();
  if (!text) return null;

  if (/24\s*\/\s*7/i.test(text) || /open\s*24\s*hours/i.test(text)) {
    return { openMinutes: 0, closeMinutes: 23 * 60 + 59 };
  }

  const match = text.match(/(\d{1,2}):(\d{2})\s*[-–]\s*(\d{1,2}):(\d{2})/);
  if (!match) return null;

  const openH = Number(match[1]);
  const openM = Number(match[2]);
  const closeH = Number(match[3]);
  const closeM = Number(match[4]);
  if (
    !Number.isFinite(openH) ||
    !Number.isFinite(openM) ||
    !Number.isFinite(closeH) ||
    !Number.isFinite(closeM)
  ) {
    return null;
  }

  let openMinutes = openH * 60 + openM;
  let closeMinutes = closeH * 60 + closeM;
  openMinutes = Math.max(0, Math.min(23 * 60 + 59, openMinutes));
  closeMinutes = Math.max(0, Math.min(23 * 60 + 59, closeMinutes));

  // Cross-midnight windows are not modeled yet; treat as full day.
  if (closeMinutes < openMinutes) {
    return { openMinutes: 0, closeMinutes: 23 * 60 + 59 };
  }

  return { openMinutes, closeMinutes };
}
