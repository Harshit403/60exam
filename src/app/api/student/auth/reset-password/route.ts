import { db } from '@/lib/db'
import { hashPassword } from '@/lib/auth'

// POST /api/student/auth/reset-password - Reset password with OTP
export async function POST(request: Request) {
  try {
    const { email, otp, newPassword } = await request.json()

    if (!email || !otp || !newPassword) {
      return Response.json({ error: 'Email, OTP, and new password are required' }, { status: 400 })
    }

    if (newPassword.length < 6) {
      return Response.json({ error: 'Password must be at least 6 characters' }, { status: 400 })
    }

    // Find the most recent unused OTP for this email
    const resetRecord = await db.passwordReset.findFirst({
      where: {
        email,
        otp,
        used: false,
        expiresAt: { gt: new Date() }
      },
      orderBy: { createdAt: 'desc' }
    })

    if (!resetRecord) {
      return Response.json({ error: 'Invalid or expired OTP. Please request a new one.' }, { status: 400 })
    }

    // Mark OTP as used
    await db.passwordReset.update({
      where: { id: resetRecord.id },
      data: { used: true }
    })

    // Find student and update password
    const student = await db.student.findUnique({ where: { email } })
    if (!student) {
      return Response.json({ error: 'Account not found' }, { status: 404 })
    }

    const hashedPassword = await hashPassword(newPassword)
    await db.student.update({
      where: { id: student.id },
      data: { password: hashedPassword }
    })

    return Response.json({ success: true, message: 'Password reset successfully. Please sign in with your new password.' })
  } catch (error: any) {
    console.error('Reset password error:', error.message)
    return Response.json({ error: 'Something went wrong. Please try again.' }, { status: 500 })
  }
}
