import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/public/courses
export async function GET() {
  const courses = await db.course.findMany({
    orderBy: { createdAt: 'asc' },
    include: {
      subjects: {
        orderBy: { orderNum: 'asc' },
        include: { chapters: true }
      },
      _count: { select: { students: true } }
    }
  })
  return NextResponse.json({ courses })
}
