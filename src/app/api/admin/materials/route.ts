import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// GET /api/admin/materials - List all materials (including inactive)
export async function GET(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const materials = await db.studyMaterial.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
      },
    })

    return NextResponse.json({
      materials: materials.map((m) => ({
        id: m.id,
        title: m.title,
        description: m.description,
        type: m.type,
        url: m.url,
        fileSize: m.fileSize,
        duration: m.duration,
        isActive: m.isActive,
        createdAt: m.createdAt,
        updatedAt: m.updatedAt,
        course: m.course ? { id: m.course.id, title: m.course.title } : null,
        subject: m.subject ? { id: m.subject.id, name: m.subject.name } : null,
        chapter: m.chapter ? { id: m.chapter.id, name: m.chapter.name } : null,
      })),
    })
  } catch (error: any) {
    console.error('Admin materials GET error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// POST /api/admin/materials - Create a new study material
export async function POST(req: NextRequest) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await req.json()
    const { title, description, type, url, courseId, subjectId, chapterId, fileSize, duration, isActive } = body

    if (!title || !url) {
      return NextResponse.json({ error: 'Title and URL are required' }, { status: 400 })
    }

    // Validate course/subject/chapter relationships if provided
    if (subjectId) {
      const subject = await db.subject.findUnique({ where: { id: subjectId } })
      if (!subject) return NextResponse.json({ error: 'Invalid subjectId' }, { status: 400 })
      if (courseId && subject.courseId !== courseId) {
        return NextResponse.json({ error: 'Subject does not belong to the selected course' }, { status: 400 })
      }
    }
    if (chapterId) {
      const chapter = await db.chapter.findUnique({ where: { id: chapterId } })
      if (!chapter) return NextResponse.json({ error: 'Invalid chapterId' }, { status: 400 })
      if (subjectId && chapter.subjectId !== subjectId) {
        return NextResponse.json({ error: 'Chapter does not belong to the selected subject' }, { status: 400 })
      }
    }

    const validTypes = ['pdf', 'video', 'link', 'document']
    const finalType = validTypes.includes(type) ? type : 'pdf'

    const material = await db.studyMaterial.create({
      data: {
        title,
        description: description || null,
        type: finalType,
        url,
        courseId: courseId || null,
        subjectId: subjectId || null,
        chapterId: chapterId || null,
        fileSize: fileSize || null,
        duration: duration || null,
        isActive: isActive !== false,
      },
    })

    return NextResponse.json({ material })
  } catch (error: any) {
    console.error('Admin materials POST error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
