import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const auth = verifyAuth(req)
  if (!auth || auth.role !== 'admin') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { id } = await params

  try {
    const messages = await db.groupMessage.findMany({
      where: { groupId: id },
      include: { student: { select: { fullName: true } } },
      orderBy: { createdAt: 'asc' },
      take: 200,
    })

    return NextResponse.json({
      messages: messages.map(m => ({
        id: m.id,
        content: m.content,
        type: m.type,
        createdAt: m.createdAt,
        studentId: m.studentId,
        studentName: m.student.fullName,
      })),
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}