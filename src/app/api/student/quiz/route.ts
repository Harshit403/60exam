import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/student/quiz - List quizzes available to student with chapter-based lock info
export async function GET(request: Request) {
  try {
    const auth = getAuthFromHeaders(request.headers)
    if (!auth || auth.role !== 'student') {
      return Response.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const student = await db.student.findUnique({
      where: { id: auth.id },
      select: { courseId: true }
    })
    if (!student) return Response.json({ error: 'Student not found' }, { status: 404 })

    // Quizzes that are: active, and either general (no course) or student's course
    const quizzes = await db.quiz.findMany({
      where: {
        isActive: true,
        OR: [
          { courseId: null },
          { courseId: student.courseId }
        ]
      },
      include: {
        questions: { select: { id: true } },
        attempts: {
          where: { studentId: auth.id },
          orderBy: { createdAt: 'desc' }
        },
        course: { select: { title: true } },
        subject: { select: { name: true } },
        chapterLinks: {
          include: {
            chapter: { select: { id: true, name: true } }
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    // Get all completed chapter IDs for this student
    const completedChapters = await db.chapterCompletion.findMany({
      where: { studentId: auth.id },
      select: { chapterId: true }
    })
    const completedChapterIds = new Set(completedChapters.map(c => c.chapterId))

    return Response.json({
      quizzes: quizzes.map(q => {
        const linkedChapters = q.chapterLinks.map(link => ({
          id: link.chapter.id,
          name: link.chapter.name,
          completed: completedChapterIds.has(link.chapterId)
        }))

        const isLocked = linkedChapters.length > 0 && linkedChapters.some(ch => !ch.completed)

        const bestAttempt = q.attempts.reduce((best: any, a: any) => a.score > (best?.score || 0) ? a : best, null)

        return {
          id: q.id,
          title: q.title,
          description: q.description,
          difficulty: q.difficulty,
          points: q.points,
          totalQuestions: q.questions.length,
          courseTitle: q.course?.title || 'General',
          subjectName: q.subject?.name || null,
          bestScore: bestAttempt?.score ?? null,
          lastAttemptPassed: q.attempts.length > 0 ? q.attempts[0].passed : null,
          attemptsCount: q.attempts.length,
          isLocked,
          lockedChapters: linkedChapters
        }
      })
    })
  } catch (error: any) {
    return Response.json({ error: error.message }, { status: 500 })
  }
}
