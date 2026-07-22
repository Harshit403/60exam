import { db } from '@/lib/db'
import { verifyAuth } from '@/lib/auth'

// GET /api/admin/quiz/[id]/chapters - Get linked chapters for a quiz
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: quizId } = await params

    const quiz = await db.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 })

    const chapterLinks = await db.quizChapterLink.findMany({
      where: { quizId },
      include: {
        chapter: {
          include: {
            subject: { select: { name: true } }
          }
        }
      }
    })

    return Response.json({
      quizId,
      chapters: chapterLinks.map(link => ({
        id: link.chapter.id,
        name: link.chapter.name,
        subjectId: link.chapter.subjectId,
        subjectName: link.chapter.subject?.name || null,
        linkId: link.id
      }))
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}

// PUT /api/admin/quiz/[id]/chapters - Set linked chapters for a quiz
export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = verifyAuth(request)
    if (!auth || auth.role !== 'admin') return Response.json({ error: 'Unauthorized' }, { status: 401 })

    const { id: quizId } = await params

    const quiz = await db.quiz.findUnique({ where: { id: quizId } })
    if (!quiz) return Response.json({ error: 'Quiz not found' }, { status: 404 })

    const { chapterIds } = await request.json()

    if (!Array.isArray(chapterIds)) {
      return Response.json({ error: 'chapterIds must be an array' }, { status: 400 })
    }

    // Delete existing links
    await db.quizChapterLink.deleteMany({
      where: { quizId }
    })

    // Create new links
    if (chapterIds.length > 0) {
      await db.quizChapterLink.createMany({
        data: chapterIds.map((chapterId: string) => ({
          quizId,
          chapterId
        }))
      })
    }

    // Fetch updated links
    const chapterLinks = await db.quizChapterLink.findMany({
      where: { quizId },
      include: {
        chapter: {
          include: {
            subject: { select: { name: true } }
          }
        }
      }
    })

    return Response.json({
      quizId,
      chapters: chapterLinks.map(link => ({
        id: link.chapter.id,
        name: link.chapter.name,
        subjectId: link.chapter.subjectId,
        subjectName: link.chapter.subject?.name || null,
        linkId: link.id
      }))
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
