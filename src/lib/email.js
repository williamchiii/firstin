// Server-side email helper — never import from client components.

import { Resend } from "resend";

const CATEGORY_LABEL = {
  immediate:   "Immediate — you will be seen right away",
  emergent:    "Emergent — expect to be seen within 15 minutes",
  urgent:      "Urgent — expect to be seen within 30 minutes",
  "less-urgent": "Less urgent — expect to wait 1–2 hours",
  "non-urgent":  "Non-urgent — expect to wait 2+ hours",
};

export async function sendTriageConfirmation({ to, esi, waitCategory, queuePosition, caseId }) {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) throw new Error("RESEND_API_KEY is not set in .env.local");

  const from = process.env.EMAIL_FROM ?? "triage@firstin.local";
  const categoryLabel = CATEGORY_LABEL[waitCategory] ?? waitCategory;

  const resend = new Resend(apiKey);

  const { error } = await resend.emails.send({
    from,
    to,
    subject: "FirstIn — Your triage confirmation",
    html: `
      <div style="font-family:sans-serif;max-width:480px;margin:0 auto;color:#111">
        <h2 style="font-size:20px;font-weight:600;margin-bottom:4px">You're checked in</h2>
        <p style="color:#555;margin-top:0">Please remain in the waiting area — a staff member will call your name.</p>
        <table style="width:100%;border-collapse:collapse;margin:20px 0">
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px">Priority level</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">ESI ${esi}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px">Wait category</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">${categoryLabel}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;border-bottom:1px solid #eee;color:#888;font-size:13px">Queue position</td>
            <td style="padding:10px 0;border-bottom:1px solid #eee;font-weight:600;text-align:right">#${queuePosition}</td>
          </tr>
          <tr>
            <td style="padding:10px 0;color:#888;font-size:13px">Case reference</td>
            <td style="padding:10px 0;font-family:monospace;font-size:12px;text-align:right;color:#555">${caseId}</td>
          </tr>
        </table>
        <p style="font-size:12px;color:#aaa;margin-top:24px">FirstIn — Emergency Triage System</p>
      </div>
    `,
  });

  if (error) throw new Error(`Resend error: ${error.message}`);
}
