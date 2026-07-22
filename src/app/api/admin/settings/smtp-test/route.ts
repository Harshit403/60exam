import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import nodemailer from 'nodemailer'

// POST /api/admin/settings/smtp-test — Test SMTP configuration
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await req.json()
  const { host, port, user, pass, from, testEmail } = body

  // If body has SMTP fields, test those; otherwise test from DB settings
  let smtpHost = host
  let smtpPort = port ? parseInt(port) : 587
  let smtpUser = user
  let smtpPass = pass
  let smtpFrom = from

  if (!smtpHost || !smtpUser || !smtpPass) {
    // Try reading from DB
    const settings = await db.setting.findMany({
      where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] } }
    })
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => { settingsMap[s.key] = s.value })

    smtpHost = smtpHost || settingsMap.smtp_host
    smtpPort = smtpPort || parseInt(settingsMap.smtp_port || '587')
    smtpUser = smtpUser || settingsMap.smtp_user
    smtpPass = smtpPass || settingsMap.smtp_pass
    smtpFrom = smtpFrom || settingsMap.smtp_from
  }

  if (!smtpHost || !smtpUser || !smtpPass) {
    return NextResponse.json({ error: 'SMTP is not configured. Please provide host, user, and password.' }, { status: 400 })
  }

  const recipientEmail = testEmail || smtpUser

  try {
    const transporter = nodemailer.createTransport({
      host: smtpHost,
      port: smtpPort,
      secure: smtpPort === 465,
      auth: { user: smtpUser, pass: smtpPass },
    })

    await transporter.sendMail({
      from: smtpFrom || `MISSION CS Test Series <${smtpUser}>`,
      to: recipientEmail,
      subject: 'SMTP Test Email — MISSION CS Test Series',
      html: `
        <!DOCTYPE html>
        <html>
        <head><meta charset="utf-8"></head>
        <body style="margin:0;padding:0;background:#f8fafc;font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background:#f8fafc;padding:40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background:#fff;border-radius:16px;overflow:hidden;box-shadow:0 4px 24px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background:linear-gradient(135deg,#0f172a,#1e293b);padding:32px 40px;text-align:center;">
                      <h1 style="margin:0;color:#fff;font-size:24px;font-weight:700;letter-spacing:1px;">MISSION CS</h1>
                      <p style="margin:4px 0 0;color:#94a3b8;font-size:12px;letter-spacing:3px;text-transform:uppercase;">TEST SERIES</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:40px;text-align:center;">
                      <div style="display:inline-block;width:64px;height:64px;background:linear-gradient(135deg,#10b981,#059669);border-radius:50%;line-height:64px;margin-bottom:20px;">
                        <span style="font-size:32px;color:#fff;">✓</span>
                      </div>
                      <h2 style="margin:0 0 12px;color:#1e293b;font-size:20px;">SMTP Configuration Test</h2>
                      <p style="margin:0 0 24px;color:#64748b;font-size:14px;line-height:1.6;">
                        This is a test email from your MISSION CS Test Series admin panel.<br>
                        If you received this email, your SMTP configuration is working correctly! 🎉
                      </p>
                      <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:16px 24px;display:inline-block;">
                        <p style="margin:0;color:#15803d;font-size:14px;font-weight:600;">✅ SMTP Connection Successful</p>
                        <p style="margin:4px 0 0;color:#166534;font-size:12px;">Host: ${smtpHost}:${smtpPort}</p>
                      </div>
                      <p style="margin:24px 0 0;font-size:12px;color:#94a3b8;">Sent at ${new Date().toISOString()}</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background:#f8fafc;padding:24px 40px;border-top:1px solid #e2e8f0;">
                      <p style="margin:0;font-size:12px;color:#94a3b8;text-align:center;">
                        © ${new Date().getFullYear()} MISSION CS Test Series. All rights reserved.<br>
                        This is an automated test email.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
        </html>
      `,
    })

    return NextResponse.json({ success: true, message: `Test email sent successfully to ${recipientEmail}` })
  } catch (error: any) {
    return NextResponse.json({
      error: `SMTP test failed: ${error.message}`,
      details: error.code || 'CONNECTION_ERROR',
    }, { status: 500 })
  }
}
