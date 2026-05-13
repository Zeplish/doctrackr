import nodemailer from "nodemailer";
import { db } from "@workspace/db";
import { organizationTable, smtpSettingsTable } from "@workspace/db";
import { eq } from "drizzle-orm";
import { logger } from "./logger";

export async function getTransporter() {
  const [smtp] = await db.select().from(smtpSettingsTable).limit(1);
  if (!smtp || !smtp.host) {
    throw new Error("SMTP not configured");
  }
  return nodemailer.createTransport({
    host: smtp.host,
    port: smtp.port ?? 587,
    secure: true,
    auth: smtp.username && smtp.password
      ? { user: smtp.username, pass: smtp.password }
      : undefined,
  });
}

export async function getOrgAndSmtp() {
  const [org] = await db.select().from(organizationTable).limit(1);
  const [smtp] = await db.select().from(smtpSettingsTable).limit(1);
  return { org, smtp };
}

function applyTemplate(template: string, vars: Record<string, string>): string {
  return template.replace(/\{(\w+)\}/g, (_, key) => vars[key] ?? `{${key}}`);
}

function wrapInHtml(body: string, orgName: string, color: string, logoUrl: string | null, emailFooter: string | null): string {
  const escaped = body
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .split("\n")
    .map((line) => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 8px;">${line || "&nbsp;"}</p>`)
    .join("");
  return `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="font-family:Arial,sans-serif;background-color:#f4f4f4;margin:0;padding:20px;">
  <div style="max-width:600px;margin:0 auto;background:#ffffff;border-radius:8px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color:${color};padding:24px;text-align:center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height:48px;display:block;margin:0 auto 12px;" />` : ""}
      <h1 style="color:#ffffff;margin:0;font-size:22px;">${orgName}</h1>
    </div>
    <div style="padding:32px 24px;">${escaped}</div>
    <div style="background-color:#f9fafb;border-top:1px solid #e5e7eb;padding:16px 24px;text-align:center;">
      <p style="color:#9ca3af;font-size:12px;margin:0;">${emailFooter || `This is an automated reminder from ${orgName}.`}</p>
    </div>
  </div>
</body>
</html>`;
}

export function buildStudentReminderEmail(params: {
  orgName: string;
  senderName: string | null;
  primaryColor: string | null;
  studentName: string;
  documentType: string;
  expiryDate: string;
  status: string;
  orgPhone: string | null;
  orgEmail: string | null;
  orgWebsite: string | null;
  emailFooter: string | null;
  logoUrl: string | null;
  customTemplate?: string | null;
}) {
  const { orgName, senderName, primaryColor, studentName, documentType, expiryDate, status, orgPhone, orgEmail, orgWebsite, emailFooter, logoUrl, customTemplate } = params;
  const color = primaryColor || "#2563eb";
  const subject = `Action Required: Updated ${documentType} Needed for ${studentName}`;

  if (customTemplate) {
    const vars: Record<string, string> = {
      orgName,
      senderName: senderName || orgName,
      studentName,
      documentType,
      expiryDate,
      status: status.replace("_", " "),
    };
    const body = applyTemplate(customTemplate, vars);
    const html = wrapInHtml(body, orgName, color, logoUrl, emailFooter);
    return { subject, html };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: ${color}; padding: 24px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 48px; margin-bottom: 12px; display: block; margin: 0 auto 12px;" />` : ""}
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${orgName}</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px;">Dear Parent/Guardian,</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">We hope you are doing well.</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">This is a friendly reminder from <strong>${orgName}</strong> that your child, <strong>${studentName}</strong>'s <strong>${documentType}</strong> is scheduled to expire on <strong>${expiryDate}</strong>.</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">To help us maintain updated records and ensure uninterrupted compliance, we kindly request that you complete and submit an updated copy at your earliest convenience.</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">If a blank form is attached, kindly print, complete, and return it to the daycare.</p>
      <p style="color: #6b7280; font-size: 14px; font-style: italic;">If you have already submitted the updated document, please disregard this message.</p>
      <div style="background-color: #f9fafb; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 24px 0;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600; width: 140px;">Child Name</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${studentName}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Document Type</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${documentType}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Expiry Date</td><td style="padding: 6px 0; color: #111827; font-size: 14px;">${expiryDate}</td></tr>
          <tr><td style="padding: 6px 0; color: #6b7280; font-size: 14px; font-weight: 600;">Status</td><td style="padding: 6px 0;"><span style="background-color: #fee2e2; color: #dc2626; padding: 2px 10px; border-radius: 12px; font-size: 13px; font-weight: 600;">${status.replace("_", " ").toUpperCase()}</span></td></tr>
        </table>
      </div>
      <p style="color: #374151; font-size: 15px; margin-top: 24px;">Warm regards,</p>
      <p style="color: #374151; font-size: 15px; margin: 0;"><strong>${senderName || orgName}</strong></p>
      <p style="color: #374151; font-size: 14px; margin: 4px 0;">${orgName}</p>
      ${orgPhone ? `<p style="color: #6b7280; font-size: 14px; margin: 2px 0;">${orgPhone}</p>` : ""}
      ${orgEmail ? `<p style="color: #6b7280; font-size: 14px; margin: 2px 0;">${orgEmail}</p>` : ""}
      ${orgWebsite ? `<p style="color: #6b7280; font-size: 14px; margin: 2px 0;">${orgWebsite}</p>` : ""}
    </div>
    <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">${emailFooter || `This is an automated reminder from ${orgName}.`}</p>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export function buildEmployeeReminderEmail(params: {
  orgName: string;
  senderName: string | null;
  primaryColor: string | null;
  employeeName: string;
  documentType: string;
  expiryDate: string;
  emailFooter: string | null;
  logoUrl: string | null;
  customTemplate?: string | null;
}) {
  const { orgName, senderName, primaryColor, employeeName, documentType, expiryDate, emailFooter, logoUrl, customTemplate } = params;
  const color = primaryColor || "#2563eb";
  const subject = `Action Required: Updated ${documentType} Needed`;

  if (customTemplate) {
    const vars: Record<string, string> = {
      orgName,
      senderName: senderName || orgName,
      employeeName,
      documentType,
      expiryDate,
    };
    const body = applyTemplate(customTemplate, vars);
    const html = wrapInHtml(body, orgName, color, logoUrl, emailFooter);
    return { subject, html };
  }

  const html = `<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0"><title>${subject}</title></head>
<body style="font-family: Arial, sans-serif; background-color: #f4f4f4; margin: 0; padding: 20px;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
    <div style="background-color: ${color}; padding: 24px; text-align: center;">
      ${logoUrl ? `<img src="${logoUrl}" alt="${orgName}" style="max-height: 48px; display: block; margin: 0 auto 12px;" />` : ""}
      <h1 style="color: #ffffff; margin: 0; font-size: 22px;">${orgName}</h1>
    </div>
    <div style="padding: 32px 24px;">
      <p style="color: #374151; font-size: 16px;">Dear ${employeeName},</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">This is a reminder that your <strong>${documentType}</strong> is scheduled to expire on <strong>${expiryDate}</strong>.</p>
      <p style="color: #374151; font-size: 15px; line-height: 1.6;">Please complete and submit an updated copy at your earliest convenience so records remain current.</p>
      <p style="color: #6b7280; font-size: 14px; font-style: italic;">If you have already submitted the updated document, please disregard this reminder.</p>
      <p style="color: #374151; font-size: 15px; margin-top: 24px;">Regards,</p>
      <p style="color: #374151; font-size: 15px; margin: 0;"><strong>${senderName || orgName}</strong></p>
      <p style="color: #374151; font-size: 14px; margin: 4px 0;">${orgName}</p>
    </div>
    <div style="background-color: #f9fafb; border-top: 1px solid #e5e7eb; padding: 16px 24px; text-align: center;">
      <p style="color: #9ca3af; font-size: 12px; margin: 0;">${emailFooter || `This is an automated reminder from ${orgName}.`}</p>
    </div>
  </div>
</body>
</html>`;
  return { subject, html };
}

export async function sendReminderEmail(params: {
  transporter: nodemailer.Transporter;
  smtp: { fromEmail: string | null; fromName: string | null };
  org: { adminCcEmail: string | null };
  to: string[];
  cc?: string;
  subject: string;
  html: string;
  attachments?: { filename: string; path: string }[];
}) {
  const { transporter, smtp, org, to, cc, subject, html, attachments } = params;
  const from = smtp.fromName && smtp.fromEmail
    ? `"${smtp.fromName}" <${smtp.fromEmail}>`
    : smtp.fromEmail || "noreply@example.com";

  const mailOptions: nodemailer.SendMailOptions = {
    from,
    to: to.join(", "),
    subject,
    html,
    attachments,
  };

  const ccAddresses: string[] = [];
  if (cc) ccAddresses.push(cc);
  if (org.adminCcEmail) ccAddresses.push(org.adminCcEmail);
  if (ccAddresses.length > 0) mailOptions.cc = ccAddresses.join(", ");

  await transporter.sendMail(mailOptions);
  return ccAddresses.join(", ") || undefined;
}
