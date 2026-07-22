import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { canSendStrike } from '@/lib/achievements'

// POST /api/student/strike
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const student = await db.student.findUnique({ where: { id: auth.id } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  
  if (!canSendStrike(student.lastStrikeAt)) {
    return NextResponse.json({ error: 'You can only send one strike per day' }, { status: 400 })
  }
  
  // Add bonus score for strike
  const newScore = student.score + 10
  
  await db.student.update({
    where: { id: auth.id },
    data: { lastStrikeAt: new Date(), score: newScore }
  })
  
  return NextResponse.json({ success: true, newScore, message: 'Strike sent! +10 bonus points' })
}
