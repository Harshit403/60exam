import { NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/public/reviews
export async function GET() {
  const reviews = await db.review.findMany({
    where: { status: 'approved' },
    orderBy: { createdAt: 'desc' },
    include: { course: true }
  })
  return NextResponse.json({ reviews })
}
