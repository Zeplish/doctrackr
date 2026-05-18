import twilio from "twilio";
import { db, smsSettingsTable } from "@workspace/db";
import { logger } from "./logger";

export async function getSmsSettings() {
  const [settings] = await db.select().from(smsSettingsTable).limit(1);
  return settings ?? null;
}

export async function ensureSmsSettings() {
  const existing = await getSmsSettings();
  if (!existing) {
    const [created] = await db.insert(smsSettingsTable).values({ enabled: false }).returning();
    return created;
  }
  return existing;
}

export async function sendSms(to: string, body: string, opts?: { skipEnabledCheck?: boolean }): Promise<void> {
  const settings = await getSmsSettings();
  if (!settings?.accountSid || !settings?.authToken || !settings?.fromNumber) {
    throw new Error("SMS not configured: missing Account SID, Auth Token, or From Number");
  }
  if (!opts?.skipEnabledCheck && !settings.enabled) {
    throw new Error("SMS is disabled in settings");
  }

  const client = twilio(settings.accountSid, settings.authToken);
  await client.messages.create({
    body,
    from: settings.fromNumber,
    to,
  });

  logger.info({ to, bodyLength: body.length }, "SMS sent");
}

export function buildStudentSmsBody(opts: {
  orgName: string;
  studentName: string;
  documentType: string;
  expiryDate: string;
  status: string;
}): string {
  const { orgName, studentName, documentType, expiryDate, status } = opts;
  if (status === "overdue" || status === "due_today") {
    return `${orgName}: URGENT – ${studentName}'s ${documentType} has expired (${expiryDate}). Please submit the updated document as soon as possible.`;
  }
  return `${orgName}: Reminder – ${studentName}'s ${documentType} expires on ${expiryDate}. Please submit the updated document before it expires.`;
}

export function buildEmployeeSmsBody(opts: {
  orgName: string;
  employeeName: string;
  documentType: string;
  expiryDate: string;
  status: string;
}): string {
  const { orgName, employeeName, documentType, expiryDate, status } = opts;
  if (status === "overdue" || status === "due_today") {
    return `${orgName}: URGENT – Your ${documentType} has expired (${expiryDate}). Please submit the updated document as soon as possible.`;
  }
  return `${orgName}: Reminder – Your ${documentType} expires on ${expiryDate}. Please submit the updated document before it expires.`;
}
