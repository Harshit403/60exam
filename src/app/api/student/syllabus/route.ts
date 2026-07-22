import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/syllabus
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const student = await db.student.findUnique({ where: { id: auth.id } })
  if (!student) return NextResponse.json({ error: 'Student not found' }, { status: 404 })
  
  const subjects = await db.subject.findMany({
    where: { courseId: student.courseId },
    orderBy: { orderNum: 'asc' },
    include: {
      chapters: {
        include: {
          completions: {
            where: { studentId: auth.id },
            select: { id: true, completedAt: true }
          }
        }
      }
    }
  })
  
  const syllabus = subjects.map(subject => {
    const totalChapters = subject.chapters.length
    const completedChapters = subject.chapters.filter(c => c.completions.length > 0).length
    const completionPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
    
    return {
      id: subject.id,
      name: subject.name,
      totalChapters,
      completedChapters,
      completionPercent,
      chapters: subject.chapters.map(c => ({
        id: c.id,
        name: c.name,
        completed: c.completions.length > 0,
        completedAt: c.completions[0]?.completedAt || null
      }))
    }
  })
  
  const totalChapters = syllabus.reduce((acc, s) => acc + s.totalChapters, 0)
  const completedChapters = syllabus.reduce((acc, s) => acc + s.completedChapters, 0)
  const overallPercent = totalChapters > 0 ? Math.round((completedChapters / totalChapters) * 100) : 0
  
  return NextResponse.json({ syllabus, totalChapters, completedChapters, overallPercent })
}

// POST /api/student/syllabus (mark chapter complete/incomplete)
export async function POST(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'student') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const { chapterId, completed } = await req.json()
  
  if (completed) {
    await db.chapterCompletion.upsert({
      where: { studentId_chapterId: { studentId: auth.id, chapterId } },
      update: {},
      create: { studentId: auth.id, chapterId }
    })
  } else {
    await db.chapterCompletion.deleteMany({
      where: { studentId: auth.id, chapterId }
    })
  }
  
  return NextResponse.json({ success: true })
}
