const nodemailer = require("nodemailer");

module.exports = async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed." });
  }

  const { email, institutionalId, otp, expiresAt } = req.body || {};

  if (!email || !institutionalId || !otp || !expiresAt) {
    return res.status(400).json({ error: "Missing OTP email payload." });
  }

  const smtpUser = process.env.SMTP_USER;
  const smtpPass = process.env.SMTP_PASS;
  const fromEmail = process.env.OTP_FROM_EMAIL || smtpUser;

  if (!smtpUser || !smtpPass || !fromEmail) {
    return res.status(500).json({
      error:
        "Mail service is not configured on this deployment yet. Add SMTP_USER, SMTP_PASS, and optionally OTP_FROM_EMAIL in Vercel.",
    });
  }

  try {
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: smtpUser,
        pass: smtpPass,
      },
    });

    const info = await transporter.sendMail({
      from: fromEmail,
      to: email,
      subject: "FindIt password reset OTP",
      html: `
        <div style="font-family: Arial, sans-serif; color: #1f2937; line-height: 1.6;">
          <h2 style="margin-bottom: 12px;">FindIt Password Reset</h2>
          <p>A password reset was requested for institutional ID <strong>${escapeHtml(institutionalId)}</strong>.</p>
          <p>Your one-time password is:</p>
          <p style="font-size: 28px; font-weight: 700; letter-spacing: 0.18em;">${escapeHtml(otp)}</p>
          <p>This OTP expires at <strong>${escapeHtml(new Date(expiresAt).toLocaleString("en-IN"))}</strong>.</p>
          <p>If you did not request this reset, you can safely ignore this email.</p>
        </div>
      `,
      text: `FindIt password reset for ${institutionalId}. Your OTP is ${otp}. It expires at ${new Date(expiresAt).toLocaleString("en-IN")}.`,
    });

    return res.status(200).json({
      ok: true,
      status: "sent",
      id: info.messageId || "",
    });
  } catch (error) {
    return res.status(500).json({
      error: error instanceof Error ? error.message : "Unexpected OTP mail failure.",
    });
  }
};

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
