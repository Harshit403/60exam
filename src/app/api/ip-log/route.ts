import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// POST /api/ip-log - Log a visitor/student IP
export async function POST(request: Request) {
  try {
    let body: any = {}
    try { body = await request.json() } catch { /* empty body is ok */ }

    // Extract studentId from JWT token if present
    const auth = verifyAuth(request)
    const studentId = auth && auth.role === 'student' ? auth.id : (body.studentId || null)

    // Extract IP from headers
    const forwarded = request.headers.get('x-forwarded-for')
    const ipAddress = forwarded ? forwarded.split(',')[0].trim() : (request.headers.get('x-real-ip') || 'unknown')

    // Extract user-agent
    const userAgent = request.headers.get('user-agent') || null

    // Skip logging if studentId is provided but invalid (not a cuid)
    if (studentId && typeof studentId === 'string' && !studentId.startsWith('cm')) {
      // Not a valid student ID, skip student association
      await db.ipLog.create({
        data: {
          studentId: null,
          ipAddress,
          path: body.path || null,
          userAgent,
          action: body.action || null,
        }
      })
      return Response.json({ success: true }, { status: 201 })
    }

    await db.ipLog.create({
      data: {
        studentId: studentId || null,
        ipAddress,
        path: body.path || null,
        userAgent,
        action: body.action || null,
      }
    })

    return Response.json({ success: true }, { status: 201 })
  } catch (error: any) {
    // Silently fail - IP logging should not break the app
    console.error('IP log error:', error.message)
    return Response.json({ success: false, error: error.message }, { status: 500 })
  }
}
