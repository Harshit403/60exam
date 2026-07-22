import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// PUT /api/student/notes/[id] - Update note
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await db.note.findUnique({ where: { id } })
    if (!existing || existing.studentId !== payload.id) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    const updates = await req.json()
    const allowed = ['title', 'content', 'chapterId', 'color', 'pinned']
    const data: any = {}
    for (const k of allowed) {
      if (k in updates) data[k] = updates[k]
    }

    const note = await db.note.update({ where: { id }, data })
    return NextResponse.json({ note })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/student/notes/[id] - Delete note
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const existing = await db.note.findUnique({ where: { id } })
    if (!existing || existing.studentId !== payload.id) {
      return NextResponse.json({ error: 'Note not found' }, { status: 404 })
    }

    await db.note.delete({ where: { id } })
    return NextResponse.json({ success: true })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
