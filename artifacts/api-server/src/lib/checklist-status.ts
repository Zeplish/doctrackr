import { addDays, differenceInDays, isToday, isPast, parseISO, startOfDay } from "date-fns";

export type DocumentStatus = "missing" | "valid" | "expiring_soon" | "due_today" | "overdue";

export function computeDocumentStatus(expiryDate: string | null): DocumentStatus {
  if (!expiryDate) return "missing";
  const expiry = parseISO(expiryDate);
  const today = startOfDay(new Date());
  const expiryStart = startOfDay(expiry);
  const diffDays = differenceInDays(expiryStart, today);
  if (isToday(expiry)) return "due_today";
  if (diffDays < 0) return "overdue";
  if (diffDays <= 30) return "expiring_soon";
  return "valid";
}

export function computeDaysUntilExpiry(expiryDate: string | null): number | null {
  if (!expiryDate) return null;
  const expiry = parseISO(expiryDate);
  const today = startOfDay(new Date());
  const expiryStart = startOfDay(expiry);
  return differenceInDays(expiryStart, today);
}

export function computeNextReminderDate(
  expiryDate: string | null,
  daysBeforeExpiry: number,
  repeatEveryDays: number,
  overdueRepeatDays: number,
  lastReminderSentAt: Date | null
): Date | null {
  if (!expiryDate) return null;
  const expiry = parseISO(expiryDate);
  const today = new Date();
  const startRemindingDate = addDays(expiry, -daysBeforeExpiry);

  if (today < startRemindingDate) return startRemindingDate;

  const status = computeDocumentStatus(expiryDate);
  if (status === "overdue") {
    if (!lastReminderSentAt) return today;
    return addDays(lastReminderSentAt, overdueRepeatDays);
  }

  // Within reminder window
  if (!lastReminderSentAt) return startRemindingDate < today ? today : startRemindingDate;
  return addDays(lastReminderSentAt, repeatEveryDays);
}
