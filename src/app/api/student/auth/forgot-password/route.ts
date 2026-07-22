import { db } from '@/lib/db'
import { sendOtpEmail, getSmtpConfig } from '@/lib/email'

// POST /api/student/auth/forgot-password - Send OTP to email
export async function POST(request: Request) {
  try {
    const { email } = await request.json()
    if (!email) return Response.json({ error: 'Email is required' }, { status: 400 })

    const student = await db.student.findUnique({ where: { email } })
    if (!student) {
      return Response.json({ success: true, message: 'If an account with this email exists, an OTP has been sent.' })
    }

    const otp = Math.floor(100000 + Math.random() * 900000).toString()
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000)

    await db.passwordReset.updateMany({
      where: { email, used: false },
      data: { used: true }
    })

    await db.passwordReset.create({
      data: { email, otp, expiresAt }
    })

    const emailSent = await sendOtpEmail(email, otp, student.fullName)
    const smtpConfig = await getSmtpConfig()
    const smtpConfigured = !!(smtpConfig.user && smtpConfig.pass)

    if (!emailSent && smtpConfigured) {
      return Response.json({ error: 'Failed to send email. Please try again.' }, { status: 500 })
    }

    const isDevMode = !smtpConfigured

    return Response.json({
      success: true,
      message: 'If an account with this email exists, an OTP has been sent.',
      ...(isDevMode ? { devOtp: otp } : {})
    })
  } catch (error: any) {
    console.error('Forgot password error:', error.message)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
