export function formatTime12(time24: string): string {
  if (!time24) return "";
  const [hStr, mStr] = time24.split(":");
  let h = parseInt(hStr, 10);
  const m = parseInt(mStr || "0", 10);
  const ampm = h >= 12 ? "PM" : "AM";
  h = h % 12;
  if (h === 0) h = 12;
  const hFormatted = h < 10 ? `0${h}` : `${h}`;
  const mFormatted = m < 10 ? `0${m}` : `${m}`;
  return `${hFormatted}:${mFormatted} ${ampm}`;
}

export function formatTimeRange12(startTime: string, endTime: string): string {
  return `${formatTime12(startTime)}–${formatTime12(endTime)}`;
}

export function getDayName(dateStr: string): string {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d, 12, 0, 0);
  const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
  return days[date.getDay()];
}

export const getDayOfWeekFromDateStr = getDayName;

/**
 * Generate 30-minute slots between startTime and endTime (excluding endTime as start of slot)
 * e.g. 09:00 - 13:00 -> 09:00, 09:30, 10:00, 10:30, 11:00, 11:30, 12:00, 12:30
 */
export function generate30MinSlots(startTime: string, endTime: string): { startTime: string; endTime: string }[] {
  const [sH, sM] = startTime.split(":").map(Number);
  const [eH, eM] = endTime.split(":").map(Number);

  let curMin = sH * 60 + sM;
  const endMin = eH * 60 + eM;
  const slots: { startTime: string; endTime: string }[] = [];

  while (curMin + 30 <= endMin) {
    const startH = Math.floor(curMin / 60).toString().padStart(2, "0");
    const startM = (curMin % 60).toString().padStart(2, "0");

    const nextMin = curMin + 30;
    const endH = Math.floor(nextMin / 60).toString().padStart(2, "0");
    const endM = (nextMin % 60).toString().padStart(2, "0");

    slots.push({
      startTime: `${startH}:${startM}`,
      endTime: `${endH}:${endM}`
    });

    curMin = nextMin;
  }

  return slots;
}

/**
 * Parses user typed time into 24-hour HH:mm format.
 * Supports "10:30", "9:00", "09:30", "2:30 PM", "11am", "3pm", etc.
 */
export function parseTimeTo24(input: string): string | null {
  if (!input) return null;
  const clean = input.trim();
  const match = clean.match(/^(\d{1,2})(?::(\d{2}))?(?::\d{2})?\s*(am|pm)?$/i);
  if (!match) return null;

  let hour = parseInt(match[1], 10);
  const minute = match[2] ? parseInt(match[2], 10) : 0;
  const period = match[3]?.toLowerCase();

  if (minute < 0 || minute > 59) return null;

  if (period) {
    if (hour < 1 || hour > 12) return null;
    if (period === "pm" && hour < 12) hour += 12;
    if (period === "am" && hour === 12) hour = 0;
  } else {
    if (hour < 0 || hour > 23) return null;
  }

  const hStr = hour.toString().padStart(2, "0");
  const mStr = minute.toString().padStart(2, "0");
  return `${hStr}:${mStr}`;
}

export function add30Minutes(time24: string): string {
  if (!time24) return "";
  const [h, m] = time24.split(":").map(Number);
  const total = h * 60 + (m || 0) + 30;
  const endH = Math.floor(total / 60) % 24;
  const endM = total % 60;
  return `${endH.toString().padStart(2, "0")}:${endM.toString().padStart(2, "0")}`;
}
