import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/student/notes - List student's notes
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const notes = await db.note.findMany({
      where: { studentId: payload.id },
      include: {
        chapter: { select: { id: true, name: true, subject: { select: { name: true } } } }
      },
      orderBy: [{ pinned: 'desc' }, { updatedAt: 'desc' }]
    })

    return NextResponse.json({ notes })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/student/notes - Create a new note
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { title, content, chapterId, color, pinned } = await req.json()
    if (!title || !content) {
      return NextResponse.json({ error: 'Title and content are required' }, { status: 400 })
    }

    const note = await db.note.create({
      data: {
        studentId: payload.id,
        title,
        content,
        chapterId: chapterId || null,
        color: color || 'default',
        pinned: !!pinned,
      }
    })

    return NextResponse.json({ note })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
