import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/public/stats
export async function GET() {
  const totalStudents = await db.student.count({ where: { status: 'approved' } })
  const totalCourses = await db.course.count()
  const totalSubjects = await db.subject.count()
  const totalChapters = await db.chapter.count()
  
  return NextResponse.json({
    totalStudents,
    totalCourses,
    totalSubjects,
    totalChapters,
    communitySize: '20k+',
    topRanks: 'AIR 8 & 9',
    evaluationHours: '24 Working Hours'
  })
}
