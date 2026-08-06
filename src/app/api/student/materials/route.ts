import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'
import { ensureStudyMaterialSharedColumn } from '@/lib/ensure-columns'

// GET /api/student/materials
// Returns all active study materials, optionally filtered, grouped by course → subject → chapter.
export async function GET(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req.headers)
    if (!auth || auth.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudyMaterialSharedColumn()

    const student = await db.student.findUnique({ where: { id: auth.id } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const { searchParams } = new URL(req.url)
    const courseId = searchParams.get('courseId') || undefined
    const subjectId = searchParams.get('subjectId') || undefined
    const chapterId = searchParams.get('chapterId') || undefined
    const type = searchParams.get('type') || undefined

    // Build where filter
    const where: any = { isActive: true }
    if (courseId) where.courseId = courseId
    if (subjectId) where.subjectId = subjectId
    if (chapterId) where.chapterId = chapterId
    if (type && ['pdf', 'video', 'link', 'document'].includes(type)) {
      where.type = type
    }

    const materials = await db.studyMaterial.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      include: {
        course: { select: { id: true, title: true, slug: true } },
        subject: { select: { id: true, name: true } },
        chapter: { select: { id: true, name: true } },
        sharedBy: { select: { id: true, fullName: true } },
      },
    })

    // Flatten list for the client (with course/subject/chapter info)
    const flat = materials.map((m) => ({
      id: m.id,
      title: m.title,
      description: m.description,
      type: m.type,
      url: m.url,
      fileSize: m.fileSize,
      duration: m.duration,
      isActive: m.isActive,
      createdAt: m.createdAt,
      course: m.course ? { id: m.course.id, title: m.course.title, slug: m.course.slug } : null,
      subject: m.subject ? { id: m.subject.id, name: m.subject.name } : null,
      chapter: m.chapter ? { id: m.chapter.id, name: m.chapter.name } : null,
      sharedBy: m.sharedBy ? { id: m.sharedBy.id, fullName: m.sharedBy.fullName } : null,
      mine: m.sharedById === auth.id,
    }))

    // Group by course → subject → chapter
    const grouped: Record<
      string,
      {
        course: { id: string; title: string; slug?: string } | null
        subjects: Record<
          string,
          {
            subject: { id: string; name: string } | null
            chapters: Record<
              string,
              {
                chapter: { id: string; name: string } | null
                materials: typeof flat
              }
            >
            materials: typeof flat // materials with no specific chapter
          }
        >
        materials: typeof flat // materials with no specific subject
      }
    > = {}

    const generalKey = '__general__'

    for (const m of flat) {
      const cKey = m.course?.id || generalKey
      if (!grouped[cKey]) {
        grouped[cKey] = {
          course: m.course,
          subjects: {},
          materials: [],
        }
      }

      if (!m.subject) {
        grouped[cKey].materials.push(m)
        continue
      }

      const sKey = m.subject.id
      if (!grouped[cKey].subjects[sKey]) {
        grouped[cKey].subjects[sKey] = {
          subject: m.subject,
          chapters: {},
          materials: [],
        }
      }

      if (!m.chapter) {
        grouped[cKey].subjects[sKey].materials.push(m)
        continue
      }

      const chKey = m.chapter.id
      if (!grouped[cKey].subjects[sKey].chapters[chKey]) {
        grouped[cKey].subjects[sKey].chapters[chKey] = {
          chapter: m.chapter,
          materials: [],
        }
      }
      grouped[cKey].subjects[sKey].chapters[chKey].materials.push(m)
    }

    // Convert grouped object into an array for easy client consumption
    const groupedArray = Object.values(grouped).map((g) => ({
      course: g.course,
      materials: g.materials,
      subjects: Object.values(g.subjects).map((s) => ({
        subject: s.subject,
        materials: s.materials,
        chapters: Object.values(s.chapters).map((c) => ({
          chapter: c.chapter,
          materials: c.materials,
        })),
      })),
    }))

    return NextResponse.json({
      materials: flat,
      grouped: groupedArray,
      total: flat.length,
    })
  } catch (error: any) {
    console.error('Student materials GET error:', error)
    return NextResponse.json({ error: error.message || 'Failed to fetch materials' }, { status: 500 })
  }
}

// POST /api/student/materials - Student shares their own note/material
export async function POST(req: NextRequest) {
  try {
    const auth = getAuthFromHeaders(req.headers)
    if (!auth || auth.role !== 'student') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    await ensureStudyMaterialSharedColumn()

    const student = await db.student.findUnique({ where: { id: auth.id } })
    if (!student) {
      return NextResponse.json({ error: 'Student not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, type, url, courseId, subjectId, chapterId, fileSize, duration } = body

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
        sharedById: auth.id,
        isActive: true,
      },
    })

    return NextResponse.json({ material })
  } catch (error: any) {
    console.error('Student materials POST error:', error)
    return NextResponse.json({ error: error.message || 'Failed to share note' }, { status: 500 })
  }
}
