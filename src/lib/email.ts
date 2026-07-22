import nodemailer from 'nodemailer'
import { db } from '@/lib/db'

interface SmtpConfig {
  host: string
  port: number
  user: string
  pass: string
  from: string
}

// SMTP Configuration - tries DB settings first, then environment variables
async function getSmtpConfig(): Promise<SmtpConfig> {
  try {
    const settings = await db.setting.findMany({
      where: { key: { in: ['smtp_host', 'smtp_port', 'smtp_user', 'smtp_pass', 'smtp_from'] } }
    })
    const settingsMap: Record<string, string> = {}
    settings.forEach(s => { settingsMap[s.key] = s.value })

    if (settingsMap.smtp_host && settingsMap.smtp_user && settingsMap.smtp_pass) {
      return {
        host: settingsMap.smtp_host,
        port: parseInt(settingsMap.smtp_port || '587'),
        user: settingsMap.smtp_user,
        pass: settingsMap.smtp_pass,
        from: settingsMap.smtp_from || `MISSION CS Test Series <${settingsMap.smtp_user}>`,
      }
    }
  } catch (e) {
    // DB might not be available during seed, fall through to env vars
  }

  return {
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587'),
    user: process.env.SMTP_USER || '',
    pass: process.env.SMTP_PASS || '',
    from: process.env.SMTP_FROM || 'MISSION CS Test Series <noreply@missioncstestseries.com>',
  }
}

function createTransporter(config: SmtpConfig) {
  return nodemailer.createTransport({
    host: config.host,
    port: config.port,
    secure: config.port === 465,
    auth: { user: config.user, pass: config.pass },
  })
}

// Send OTP email for password reset
export async function sendOtpEmail(email: string, otp: string, studentName: string): Promise<boolean> {
  const config = await getSmtpConfig()
  if (!config.user || !config.pass) {
    console.log(`[DEV MODE] OTP for ${email}: ${otp}`)
    return true
  }

  try {
    const transporter = createTransporter(config)
    await transporter.sendMail({
      from: config.from,
      to: email,
      subject: 'Password Reset OTP - MISSION CS Test Series',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="margin: 0; padding: 0; background-color: #f8fafc; font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;">
          <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #f8fafc; padding: 40px 0;">
            <tr>
              <td align="center">
                <table role="presentation" width="600" cellspacing="0" cellpadding="0" style="background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 24px rgba(0,0,0,0.08);">
                  <tr>
                    <td style="background: linear-gradient(135deg, #0f172a, #1e293b); padding: 32px 40px; text-align: center;">
                      <h1 style="margin: 0; color: #ffffff; font-size: 24px; font-weight: 700; letter-spacing: 1px;">MISSION CS</h1>
                      <p style="margin: 4px 0 0; color: #94a3b8; font-size: 12px; letter-spacing: 3px; text-transform: uppercase;">TEST SERIES</p>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding: 40px;">
                      <p style="margin: 0 0 8px; font-size: 16px; color: #1e293b;">Hello ${studentName},</p>
                      <p style="margin: 0 0 24px; font-size: 14px; color: #64748b; line-height: 1.6;">
                        We received a request to reset your password. Use the OTP below to proceed:
                      </p>
                      <table role="presentation" width="100%" cellspacing="0" cellpadding="0">
                        <tr>
                          <td align="center" style="padding: 24px 0;">
                            <div style="display: inline-block; background: linear-gradient(135deg, #f0fdf4, #ecfdf5); border: 2px dashed #16a34a; border-radius: 12px; padding: 20px 48px;">
                              <span style="font-size: 36px; font-weight: 800; color: #15803d; letter-spacing: 8px; font-family: 'Courier New', monospace;">${otp}</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                      <p style="margin: 24px 0 0; font-size: 13px; color: #94a3b8; line-height: 1.6;">
                        This OTP is valid for <strong style="color: #475569;">10 minutes</strong>. If you didn't request this, please ignore this email.
                      </p>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color: #f8fafc; padding: 24px 40px; border-top: 1px solid #e2e8f0;">
                      <p style="margin: 0; font-size: 12px; color: #94a3b8; text-align: center;">
                        © ${new Date().getFullYear()} MISSION CS Test Series. All rights reserved.<br>
                        This is an automated email, please do not reply.
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
    return true
  } catch (error: any) {
    console.error('Email send error:', error.message)
    return false
  }
}

export { getSmtpConfig }
