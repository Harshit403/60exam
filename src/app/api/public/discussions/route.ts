import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'

// GET /api/public/discussions
export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url)
    const limit = parseInt(searchParams.get('limit') || '4')
    const page = parseInt(searchParams.get('page') || '1')
    const search = searchParams.get('search') || ''

    const where: any = {
      parentReplyId: null, // Only top-level discussions
    }
    if (search) {
      where.OR = [
        { title: { contains: search } },
        { content: { contains: search } },
      ]
    }

    const total = await db.discussion.count({ where })

    const discussions = await db.discussion.findMany({
      where,
      take: limit,
      skip: (page - 1) * limit,
      orderBy: { createdAt: 'desc' },
      include: {
        student: { select: { fullName: true, verified: true } },
        replies: {
          include: {
            student: { select: { fullName: true, verified: true } },
          },
          orderBy: { createdAt: 'asc' as const },
        },
      },
    })

    const formatted = discussions.map(d => ({
      id: d.id,
      title: d.title,
      content: d.content,
      authorName: d.student.fullName,
      authorVerified: d.student.verified,
      repliesCount: d.replies.length,
      hasAdminReply: !!d.adminReply,
      adminReply: d.adminReply,
      replies: d.replies.map(r => ({
        id: r.id,
        content: r.content,
        authorName: r.student.fullName,
        authorVerified: r.student.verified,
        createdAt: r.createdAt.toISOString(),
      })),
      createdAt: d.createdAt.toISOString(),
    }))

    return NextResponse.json({
      discussions: formatted,
      total,
      page,
      totalPages: Math.ceil(total / limit),
    })
  } catch (error: any) {
    return NextResponse.json({ discussions: [], total: 0, page: 1, totalPages: 0 })
  }
}
