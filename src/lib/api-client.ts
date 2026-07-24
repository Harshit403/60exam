const API_BASE = '/api'

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {}),
  }
  if (token) {
    headers['Authorization'] = `Bearer ${token}`
  }
  
  const res = await fetch(`${API_BASE}${path}`, { ...options, headers })
  const data = await res.json()
  
  if (!res.ok) {
    throw new Error(data.error || 'API request failed')
  }
  return data
}

export const api = {
  // Admin Auth
  adminLogin: (email: string, password: string) =>
    apiFetch('/admin/auth/login', { method: 'POST', body: JSON.stringify({ email, password }) }),
  
  // Admin Dashboard
  adminDashboard: () => apiFetch('/admin/dashboard'),
  
  // Admin Students
  adminStudents: (search?: string) => apiFetch(`/admin/students${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminGetStudent: (id: string) => apiFetch(`/admin/students/${id}`),
  adminCreateStudent: (data: any) => apiFetch('/admin/students', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateStudent: (id: string, data: any) => apiFetch(`/admin/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteStudent: (id: string) => apiFetch(`/admin/students/${id}`, { method: 'DELETE' }),
  adminChangePassword: (id: string, password: string) =>
    apiFetch(`/admin/students/${id}/password`, { method: 'PUT', body: JSON.stringify({ password }) }),
  
  // Admin Courses
  adminCourses: (search?: string) => apiFetch(`/admin/courses${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminCreateCourse: (data: any) => apiFetch('/admin/courses', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateCourse: (id: string, data: any) => apiFetch(`/admin/courses/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteCourse: (id: string) => apiFetch(`/admin/courses/${id}`, { method: 'DELETE' }),
  
  // Admin Subjects
  adminSubjects: (search?: string, courseId?: string) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (courseId) params.set('courseId', courseId)
    return apiFetch(`/admin/subjects?${params.toString()}`)
  },
  adminCreateSubject: (data: any) => apiFetch('/admin/subjects', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateSubject: (id: string, data: any) => apiFetch(`/admin/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteSubject: (id: string) => apiFetch(`/admin/subjects/${id}`, { method: 'DELETE' }),
  
  // Admin Chapters
  adminChapters: (search?: string, subjectId?: string, courseId?: string) => {
    const params = new URLSearchParams()
    if (search) params.set('search', search)
    if (subjectId) params.set('subjectId', subjectId)
    if (courseId) params.set('courseId', courseId)
    return apiFetch(`/admin/chapters?${params.toString()}`)
  },
  adminCreateChapter: (data: any) => apiFetch('/admin/chapters', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateChapter: (id: string, data: any) => apiFetch(`/admin/chapters/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteChapter: (id: string) => apiFetch(`/admin/chapters/${id}`, { method: 'DELETE' }),
  
  // Admin Reviews
  adminReviews: (search?: string) => apiFetch(`/admin/reviews${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminCreateReview: (data: any) => apiFetch('/admin/reviews', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateReview: (id: string, data: any) => apiFetch(`/admin/reviews/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteReview: (id: string) => apiFetch(`/admin/reviews/${id}`, { method: 'DELETE' }),
  
  // Admin Approvals
  adminApprovals: () => apiFetch('/admin/approvals'),
  adminApproveStudent: (id: string) => apiFetch(`/admin/approvals/${id}/approve`, { method: 'PUT' }),
  adminRejectStudent: (id: string) => apiFetch(`/admin/approvals/${id}/reject`, { method: 'PUT' }),
  adminToggleApproval: (enabled: boolean) => apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify({ key: 'signup_approval', value: enabled ? 'true' : 'false' }) }),
  adminGetSettings: () => apiFetch('/admin/settings'),
  adminUpdateSettings: (settings: Record<string, string>) =>
    apiFetch('/admin/settings', { method: 'PUT', body: JSON.stringify({ settings }) }),
  adminTestSmtp: (data: { host?: string; port?: string; user?: string; pass?: string; from?: string; testEmail?: string }) =>
    apiFetch('/admin/settings/smtp-test', { method: 'POST', body: JSON.stringify(data) }),
  adminChangeOwnPassword: (currentPassword: string, newPassword: string) =>
    apiFetch('/admin/password', { method: 'PUT', body: JSON.stringify({ currentPassword, newPassword }) }),
  
  // Admin Top Performers
  adminTopPerformers: (params?: { search?: string; period?: string; from?: string; to?: string }) => {
    const q = new URLSearchParams()
    if (params?.search) q.set('search', params.search)
    if (params?.period && params.period !== 'all') q.set('period', params.period)
    if (params?.from) q.set('from', params.from)
    if (params?.to) q.set('to', params.to)
    const qs = q.toString()
    return apiFetch(`/admin/top-performers${qs ? `?${qs}` : ''}`)
  },
  
  // Admin Discussions
  adminDiscussions: (search?: string) => apiFetch(`/admin/discussions${search ? `?search=${encodeURIComponent(search)}` : ''}`),
  adminReplyDiscussion: (id: string, reply: string) =>
    apiFetch(`/admin/discussions/${id}/reply`, { method: 'PUT', body: JSON.stringify({ adminReply: reply }) }),
  adminDeleteDiscussion: (id: string) => apiFetch(`/admin/discussions/${id}`, { method: 'DELETE' }),
  adminEditReply: (id: string, content: string) =>
    apiFetch(`/admin/discussions/replies/${id}`, { method: 'PUT', body: JSON.stringify({ content }) }),
  adminDeleteReply: (id: string) => apiFetch(`/admin/discussions/replies/${id}`, { method: 'DELETE' }),

  // Admin Notifications (badge counts)
  adminNotifications: () => apiFetch('/admin/notifications'),
  adminSendNotification: (data: { title: string; message: string; type?: string; targetRole?: string; targetCourseId?: string | null }) =>
    apiFetch('/admin/notifications/send', { method: 'POST', body: JSON.stringify(data) }),

  // Admin Analytics
  adminAnalytics: () => apiFetch('/admin/analytics'),
  
  // Student Auth
  studentSignup: (data: any) => apiFetch('/student/auth/signup', { method: 'POST', body: JSON.stringify(data) }),
  studentLogin: (emailOrMobile: string, password: string) =>
    apiFetch('/student/auth/login', { method: 'POST', body: JSON.stringify({ emailOrMobile, password }) }),
  studentForgotPassword: (email: string) =>
    apiFetch('/student/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) }),
  studentResetPassword: (email: string, otp: string, newPassword: string) =>
    apiFetch('/student/auth/reset-password', { method: 'POST', body: JSON.stringify({ email, otp, newPassword }) }),
  
  // Student Dashboard
  studentDashboard: () => apiFetch('/student/dashboard'),
  
  // Student Study Sessions
  studentStartSession: (data: any) => apiFetch('/student/study-session', { method: 'POST', body: JSON.stringify(data) }),
  studentStudyHistory: (date?: string) => apiFetch(`/student/study-session${date ? `?date=${date}` : ''}`),
  
  // Student Study Plans
  studentStudyPlans: (date?: string) => apiFetch(`/student/study-plan${date ? `?date=${date}` : ''}`),
  studentCreatePlan: (data: any) => apiFetch('/student/study-plan', { method: 'POST', body: JSON.stringify(data) }),
  studentUpdatePlan: (id: string, data: any) => apiFetch(`/student/study-plan/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Study Reminder Preference
  getReminderPreference: () => apiFetch('/student/reminder-preference'),
  setReminderPreference: (enabled: boolean) => apiFetch('/student/reminder-preference', { method: 'PATCH', body: JSON.stringify({ enabled }) }),
  
  // Student Strike
  studentSendStrike: () => apiFetch('/student/strike', { method: 'POST' }),
  
  // Student Profile
  studentProfile: () => apiFetch('/student/profile'),
  studentUpdateProfile: (data: any) => apiFetch('/student/profile', { method: 'PUT', body: JSON.stringify(data) }),
  studentResetStats: () => apiFetch('/student/profile/reset', { method: 'POST' }),
  
  // Student Discussions
  studentDiscussions: () => apiFetch('/student/discussions'),
  studentCreateDiscussion: (data: any) => apiFetch('/student/discussions', { method: 'POST', body: JSON.stringify(data) }),
  
  // Student Reviews
  studentReviews: () => apiFetch('/student/reviews'),
  studentSubmitReview: (data: any) => apiFetch('/student/reviews', { method: 'POST', body: JSON.stringify(data) }),
  
  // Student Achievements
  studentAchievements: () => apiFetch('/student/achievements'),
  
  // Student Syllabus
  studentSyllabus: () => apiFetch('/student/syllabus'),
  studentMarkChapter: (chapterId: string, completed: boolean) =>
    apiFetch('/student/syllabus', { method: 'POST', body: JSON.stringify({ chapterId, completed }) }),

  // Student Leaderboard
  studentLeaderboard: (limit?: number, courseId?: string, period?: 'all' | 'today' | '24h') => {
    const params = new URLSearchParams()
    if (limit) params.set('limit', String(limit))
    if (courseId) params.set('courseId', courseId)
    if (period && period !== 'all') params.set('period', period)
    const qs = params.toString()
    return apiFetch(`/student/leaderboard${qs ? `?${qs}` : ''}`)
  },

  // Student Analytics
  studentAnalytics: () => apiFetch('/student/analytics'),

  // Student Notifications
  studentNotifications: () => apiFetch('/student/notifications'),

  // Student Quizzes
  studentQuizzes: () => apiFetch('/student/quiz'),
  studentQuizDetail: (id: string) => apiFetch(`/student/quiz/${id}`),
  studentSubmitQuiz: (id: string, answers: number[]) =>
    apiFetch(`/student/quiz/${id}/attempt`, { method: 'POST', body: JSON.stringify({ answers }) }),

  // Student Quiz History
  studentQuizHistory: (params?: { courseId?: string; difficulty?: string; passed?: string; page?: number; limit?: number }) => {
    const q = new URLSearchParams()
    if (params?.courseId) q.set('courseId', params.courseId)
    if (params?.difficulty) q.set('difficulty', params.difficulty)
    if (params?.passed) q.set('passed', params.passed)
    if (params?.page) q.set('page', String(params.page))
    if (params?.limit) q.set('limit', String(params.limit))
    const qs = q.toString()
    return apiFetch(`/student/quiz-history${qs ? `?${qs}` : ''}`)
  },

  // Student Notes
  studentNotes: () => apiFetch('/student/notes'),
  studentCreateNote: (data: any) => apiFetch('/student/notes', { method: 'POST', body: JSON.stringify(data) }),
  studentUpdateNote: (id: string, data: any) => apiFetch(`/student/notes/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  studentDeleteNote: (id: string) => apiFetch(`/student/notes/${id}`, { method: 'DELETE' }),

  // Student Materials
  studentMaterials: (params?: { courseId?: string; subjectId?: string; chapterId?: string; type?: string }) => {
    const q = new URLSearchParams()
    if (params?.courseId) q.set('courseId', params.courseId)
    if (params?.subjectId) q.set('subjectId', params.subjectId)
    if (params?.chapterId) q.set('chapterId', params.chapterId)
    if (params?.type) q.set('type', params.type)
    const qs = q.toString()
    return apiFetch(`/student/materials${qs ? `?${qs}` : ''}`)
  },

  // Student Group Study
  studentGroups: () => apiFetch('/student/groups'),
  studentJoinGroup: (id: string) => apiFetch(`/student/groups/${id}`, { method: 'POST' }),
  studentLeaveGroup: (id: string) => apiFetch(`/student/groups/${id}`, { method: 'DELETE' }),
  studentGroupMessages: (id: string) => apiFetch(`/student/groups/${id}/messages`),
  studentSendGroupMessage: (id: string, content: string, type: string = 'text') =>
    apiFetch(`/student/groups/${id}/messages`, { method: 'POST', body: JSON.stringify({ content, type }) }),
  studentGroupCompare: (id: string, memberIds: string[]) =>
    apiFetch(`/student/groups/${id}/compare?members=${memberIds.join(',')}`),

  // IP Logging
  logIp: (data: { path: string; action?: string }) =>
    apiFetch('/ip-log', { method: 'POST', body: JSON.stringify(data) }),

  // Admin Materials
  adminMaterials: () => apiFetch('/admin/materials'),
  adminCreateMaterial: (data: any) => apiFetch('/admin/materials', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateMaterial: (id: string, data: any) => apiFetch(`/admin/materials/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteMaterial: (id: string) => apiFetch(`/admin/materials/${id}`, { method: 'DELETE' }),

  // Admin Quizzes
  adminQuizzes: () => apiFetch('/admin/quiz'),
  adminQuizDetail: (id: string) => apiFetch(`/admin/quiz/${id}`),
  adminCreateQuiz: (data: any) => apiFetch('/admin/quiz', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateQuiz: (id: string, data: any) => apiFetch(`/admin/quiz/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteQuiz: (id: string) => apiFetch(`/admin/quiz/${id}`, { method: 'DELETE' }),
  adminQuizChapters: (id: string) => apiFetch(`/admin/quiz/${id}/chapters`),
  adminSetQuizChapters: (id: string, chapterIds: string[]) =>
    apiFetch(`/admin/quiz/${id}/chapters`, { method: 'PUT', body: JSON.stringify({ chapterIds }) }),

  // Admin Group Study
  adminGroups: () => apiFetch('/admin/groups'),
  adminCreateGroup: (data: any) => apiFetch('/admin/groups', { method: 'POST', body: JSON.stringify(data) }),
  adminUpdateGroup: (id: string, data: any) => apiFetch(`/admin/groups/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  adminDeleteGroup: (id: string) => apiFetch(`/admin/groups/${id}`, { method: 'DELETE' }),
  adminBlockUser: (groupId: string, studentId: string, reason?: string) =>
    apiFetch(`/admin/groups/${groupId}/block`, { method: 'POST', body: JSON.stringify({ studentId, reason }) }),
  adminUnblockUser: (groupId: string, studentId: string) =>
    apiFetch(`/admin/groups/${groupId}/block?studentId=${encodeURIComponent(studentId)}`, { method: 'DELETE' }),
  adminBlockedUsers: () => apiFetch('/admin/blocked-users'),
  adminRemoveGroupMember: (groupId: string, memberId: string) =>
    apiFetch(`/admin/groups/${groupId}/members/${memberId}`, { method: 'DELETE' }),

  // Realtime publish (SSE)
  realtimePublish: (data: any) => apiFetch('/realtime/publish', { method: 'POST', body: JSON.stringify(data) }),

  // Public
  publicReviews: () => apiFetch('/public/reviews'),
  publicCourses: () => apiFetch('/public/courses'),
  publicStats: () => apiFetch('/public/stats'),
  publicLeaderboard: (params?: { daily?: boolean }) => {
    const q = params?.daily ? '?daily=true' : ''
    return apiFetch(`/public/leaderboard${q}`)
  },
  publicDiscussions: (params?: { limit?: number; page?: number; search?: string }) => {
    const q = new URLSearchParams()
    if (params?.limit) q.set('limit', String(params.limit))
    if (params?.page) q.set('page', String(params.page))
    if (params?.search) q.set('search', params.search)
    const qs = q.toString()
    return apiFetch(`/public/discussions${qs ? `?${qs}` : ''}`)
  },
}
