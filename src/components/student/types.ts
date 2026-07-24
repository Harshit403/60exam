// ─── Types ──────────────────────────────────────────────────────────────

export interface StudentPanelProps { onLogout: () => void }

export type Page = 'dashboard' | 'track' | 'planner' | 'discussion' | 'live-chat' | 'syllabus' | 'profile' | 'quiz' | 'quiz-history' | 'notes' | 'analytics' | 'leaderboard' | 'materials' | 'group-study' | 'reviews'

export interface Subject {
  id: string; name: string; orderNum: number; chapters: Chapter[]
}

export interface Chapter {
  id: string; name: string; subjectId: string; orderNum?: number
}

export interface DashboardData {
  student: {
    id: string; fullName: string; email: string; mobile: string; score: number
    totalStudyMin: number; currentStreak: number; verified: boolean; lastStrikeAt?: string
    course: { id: string; title: string; subjects: Subject[] }
  }
  subjects: Subject[]; totalSubjects: number; totalChapters: number
  completedChapters: number; completionPercent: number; todayStudyMin: number
  achievements: { achievement: { id: string; name: string; icon: string; threshold: number }; unlockedAt: string }[]
}

export interface StudySession {
  id: string; durationMin: number; completed: boolean; date: string
  notes?: string | null
  chapter?: { id: string; name: string; subject: { name: string } } | null
}

export interface StudyPlan {
  id: string; chapterId: string | null; notes: string | null; plannedDate: string
  chapter?: { id: string; name: string; subject: { name: string } } | null
}

export interface Discussion {
  id: string; title: string; content: string; createdAt: string
  student?: { id: string; name: string } | null
  replies: { id: string; content: string; createdAt: string; student?: { id: string; name: string } | null }[]
}

export interface SyllabusSubject {
  id: string; name: string; totalChapters: number; completedChapters: number
  completionPercent: number; chapters: { id: string; name: string; completed: boolean; completedAt: string | null }[]
}

// ─── Quiz Types ────────────────────────────────────────────────────────

export interface QuizListItem {
  id: string; title: string; description?: string | null
  difficulty: 'easy' | 'medium' | 'hard'; points: number
  totalQuestions: number; courseTitle: string; subjectName?: string | null
  bestScore: number | null; lastAttemptPassed: boolean | null; attemptsCount: number
  isLocked?: boolean; lockedChapters?: { id: string; name: string; completed: boolean }[]
}

export interface QuizQuestion {
  id: string; text: string; options: string[]
}

export interface QuizDetail {
  quiz: { id: string; title: string; description?: string | null; difficulty: string; points: number }
  questions: QuizQuestion[]
}

export interface QuizResult {
  score: number; total: number; percentage: number; passed: boolean; pointsEarned: number
  questionResults: {
    questionId: string; questionText: string; options: string[]
    selectedIdx: number; correctIdx: number; explanation?: string | null; isCorrect: boolean
  }[]
}

// ─── Note Types ────────────────────────────────────────────────────────

export interface Note {
  id: string; title: string; content: string; color: string; pinned: boolean
  chapterId?: string | null; createdAt: string; updatedAt: string
  chapter?: { id: string; name: string; subject: { name: string } } | null
}

// ─── Group Study Types ────────────────────────────────────────────────

export interface StudyGroup {
  id: string; name: string; description?: string | null
  maxCapacity: number; subjectId?: string | null; isActive: boolean
  activeMembers: number; totalMembers: number; isFull: boolean
  isCurrentUserMember: boolean; unreadCount: number
  subjectName?: string | null
  members: { studentId: string; studentName: string; joinedAt: string }[]
  createdAt: string
}

export interface GroupMemberInfo {
  id: string; studentId: string; fullName: string; joinedAt: string
  timerState?: TimerState | null
}

export interface TimerState {
  running: boolean; paused: boolean; remaining: number; total: number
  chapterName?: string | null; subjectName?: string | null
  phase?: 'work' | 'break' | null; phaseLabel?: string | null
}

export interface GroupMessage {
  id: string; groupId: string; studentId: string; studentName: string
  content: string; type: 'text' | 'image' | 'system'; createdAt: string
}

export interface BlockedUser {
  id: string; studentId: string; student: { id: string; fullName: string; email: string }
  reason?: string | null; blockedAt: string
}

export interface ComparisonMember {
  userId: string
  isRequester: boolean
  score: number
  totalStudyHours: number
  currentStreak: number
  longestStreak: number
  sessionsLast30: number
  quizAccuracy: number
  totalQuizzes: number
  achievementsUnlocked: number
  totalAchievements: number
  course: string | null
  dailyMinutes: { date: string; minutes: number }[]
  subjectDistribution: { name: string; minutes: number }[]
}

export interface ComparisonData {
  members: ComparisonMember[]
}
