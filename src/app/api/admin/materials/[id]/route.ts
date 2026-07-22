import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { verifyToken } from '@/lib/auth'

// PUT /api/admin/materials/[id] - Update a study material
export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await db.studyMaterial.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    const body = await req.json()
    const { title, description, type, url, courseId, subjectId, chapterId, fileSize, duration, isActive } = body

    // Validate relationships if provided
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
    const finalType = type && validTypes.includes(type) ? type : existing.type

    // Build update data with optional fields
    const updateData: any = {}
    if (title !== undefined) updateData.title = title
    if (description !== undefined) updateData.description = description || null
    if (type !== undefined) updateData.type = finalType
    if (url !== undefined) updateData.url = url
    if (courseId !== undefined) updateData.courseId = courseId || null
    if (subjectId !== undefined) updateData.subjectId = subjectId || null
    if (chapterId !== undefined) updateData.chapterId = chapterId || null
    if (fileSize !== undefined) updateData.fileSize = fileSize || null
    if (duration !== undefined) updateData.duration = duration || null
    if (isActive !== undefined) updateData.isActive = isActive

    const material = await db.studyMaterial.update({
      where: { id },
      data: updateData,
    })

    return NextResponse.json({ material })
  } catch (error: any) {
    console.error('Admin materials PUT error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/materials/[id] - Delete a study material
export async function DELETE(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = req.headers.get('authorization') || ''
    const token = auth.replace('Bearer ', '')
    const payload = verifyToken(token)
    if (!payload || payload.role !== 'admin') {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id } = await params
    const existing = await db.studyMaterial.findUnique({ where: { id } })
    if (!existing) {
      return NextResponse.json({ error: 'Material not found' }, { status: 404 })
    }

    await db.studyMaterial.delete({ where: { id } })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Admin materials DELETE error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
