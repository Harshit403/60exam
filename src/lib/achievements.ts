// Achievement definitions - 12 tiers
export const ACHIEVEMENT_TIERS = [
  { name: 'Newcomer', description: 'Begin your CS journey', threshold: 25, icon: '🌱', order: 1 },
  { name: 'First Steps', description: 'You have taken your first steps', threshold: 50, icon: '👣', order: 2 },
  { name: 'Getting Started', description: 'You are getting the hang of it', threshold: 100, icon: '🚀', order: 3 },
  { name: 'Rising Talent', description: 'Your dedication is showing', threshold: 250, icon: '⭐', order: 4 },
  { name: 'Dedicated Star', description: 'A shining star of dedication', threshold: 500, icon: '🌟', order: 5 },
  { name: 'Study Enthusiast', description: 'Enthusiasm drives your progress', threshold: 750, icon: '📚', order: 6 },
  { name: 'Knowledge Master', description: 'Master of knowledge', threshold: 1000, icon: '🎓', order: 7 },
  { name: 'Elite Scholar', description: 'An elite among scholars', threshold: 2000, icon: '🏅', order: 8 },
  { name: 'Academic Pro', description: 'Professional academic excellence', threshold: 3000, icon: '🏆', order: 9 },
  { name: 'Study Legend', description: 'A legend in the making', threshold: 3500, icon: '👑', order: 10 },
  { name: 'Grand Master', description: 'The ultimate grand master', threshold: 5000, icon: '💎', order: 11 },
  { name: 'Supreme Champion', description: 'Beyond legendary status', threshold: 10000, icon: '🔱', order: 12 },
]

// Score calculation: 1 point per minute of study
export function calculateScore(totalStudyMin: number): number {
  return Math.floor(totalStudyMin)
}

// Check and update streak logic
export function checkStreak(lastStudyAt: Date | null, currentStreak: number): { streak: number; verified: boolean } {
  if (!lastStudyAt) return { streak: 0, verified: false }

  const now = new Date()
  const last = new Date(lastStudyAt)
  const diffHours = (now.getTime() - last.getTime()) / (1000 * 60 * 60)

  if (diffHours < 24) {
    // Studied within the last 24 hours
    return { streak: currentStreak, verified: currentStreak >= 7 }
  }
  // More than 24 hours since last study — streak broken
  return { streak: 0, verified: false }
}

// Can student send strike today?
export function canSendStrike(lastStrikeAt: Date | null): boolean {
  if (!lastStrikeAt) return true
  const now = new Date()
  const last = new Date(lastStrikeAt)
  return now.toDateString() !== last.toDateString()
}
