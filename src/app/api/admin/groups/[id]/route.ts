import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// PUT /api/admin/groups/[id] - Update group
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const body = await request.json()
    const { name, description, maxCapacity, isActive } = body

    const existing = await db.studyGroup.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Group not found' }, { status: 404 })

    const allowed: Record<string, any> = {}
    if (name !== undefined) allowed.name = name.trim()
    if (description !== undefined) allowed.description = description?.trim() || null
    if (maxCapacity !== undefined) allowed.maxCapacity = maxCapacity
    if (isActive !== undefined) allowed.isActive = isActive

    const group = await db.studyGroup.update({
      where: { id },
      data: allowed,
      include: {
        _count: { select: { members: true } },
        subject: { select: { name: true } }
      }
    })

    return Response.json({ group })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// DELETE /api/admin/groups/[id] - Delete group
export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params

    const existing = await db.studyGroup.findUnique({ where: { id } })
    if (!existing) return Response.json({ error: 'Group not found' }, { status: 404 })

    await db.studyGroup.delete({ where: { id } })

    return Response.json({ success: true })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
