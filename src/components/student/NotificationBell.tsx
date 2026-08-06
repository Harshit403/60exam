'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Bell, CheckCircle2, Trophy, MessageCircle, Flame, Info, X, BellRing } from 'lucide-react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

interface Notification {
  id: string
  type: 'admin-reply' | 'achievement' | 'quiz-passed' | 'streak' | 'info' | 'announcement'
  title: string
  message: string
  timestamp: string
  read: boolean
  link?: string
}

const TYPE_CONFIG = {
  'admin-reply': { icon: MessageCircle, color: 'text-cyan-600 bg-cyan-100 dark:bg-cyan-900/40 dark:text-cyan-300' },
  'achievement': { icon: Trophy, color: 'text-amber-600 bg-amber-100 dark:bg-amber-900/40 dark:text-amber-300' },
  'quiz-passed': { icon: CheckCircle2, color: 'text-emerald-600 bg-emerald-100 dark:bg-emerald-900/40 dark:text-emerald-300' },
  'streak': { icon: Flame, color: 'text-orange-600 bg-orange-100 dark:bg-orange-900/40 dark:text-orange-300' },
  'info': { icon: Info, color: 'text-sky-600 bg-sky-100 dark:bg-sky-900/40 dark:text-sky-300' },
  'announcement': { icon: BellRing, color: 'text-purple-600 bg-purple-100 dark:bg-purple-900/40 dark:text-purple-300' },
}

const NOTIFICATIONS_READ_IDS_KEY = 'mission-cs-notifications-read-ids'

function getReadIds(): Set<string> {
  try { return new Set(JSON.parse(localStorage.getItem(NOTIFICATIONS_READ_IDS_KEY) || '[]')) } catch { return new Set() }
}

function markReadIds(ids: string[]) {
  try {
    const set = getReadIds()
    ids.forEach(id => { if (id) set.add(id) })
    localStorage.setItem(NOTIFICATIONS_READ_IDS_KEY, JSON.stringify([...set]))
  } catch { /* noop */ }
}

function formatTimeAgo(date: string | Date): string {
  const now = new Date()
  const d = new Date(date)
  const diff = Math.floor((now.getTime() - d.getTime()) / 1000)
  if (diff < 60) return 'just now'
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`
  return `${Math.floor(diff / 86400)}d ago`
}

export function NotificationBell({ onNavigate }: { onNavigate?: (page: string) => void }) {
  const [notifications, setNotifications] = useState<Notification[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const bellRef = useRef<HTMLButtonElement>(null)

  const fetchNotifications = useCallback(async () => {
    setLoading(true)
    try {
      const data = await api.studentNotifications()
      setNotifications(data.notifications || [])
    } catch (err) { /* silent fail */ }
    finally { setLoading(false) }
  }, [])

  // Fetch on mount and every 30s
  useEffect(() => {
    fetchNotifications()
    const interval = setInterval(fetchNotifications, 30000)
    return () => clearInterval(interval)
  }, [fetchNotifications])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node) &&
          bellRef.current && !bellRef.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  const readIds = getReadIds()
  const unreadCount = notifications.filter(n => !readIds.has(n.id)).length

  const handleNotificationClick = (n: Notification) => {
    setOpen(false)
    markReadIds([n.id])
    if (n.link && onNavigate) {
      onNavigate(n.link)
    }
  }

  return (
    <div className="relative">
      <button
        ref={bellRef}
        onClick={() => { setOpen(!open); if (!open) fetchNotifications() }}
        className="relative p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900 animate-pulse">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div
          ref={dropdownRef}
          className="absolute right-0 top-full mt-2 w-80 max-w-[calc(100vw-2rem)] bg-white dark:bg-slate-900 rounded-xl shadow-lg border border-slate-200 dark:border-slate-800 z-50 anim-fade-up overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-3 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600 dark:text-slate-400" />
              <h3 className="text-sm font-semibold text-slate-900 dark:text-slate-100">Notifications</h3>
              {unreadCount > 0 && (
                <Badge variant="secondary" className="text-[10px] bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300">
                  {unreadCount} new
                </Badge>
              )}
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-slate-200 dark:hover:bg-slate-800">
              <X className="w-3.5 h-3.5 text-slate-500" />
            </button>
          </div>

          {/* Notifications list */}
          <div className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="p-4 space-y-2">
                {[1, 2, 3].map(i => (
                  <div key={i} className="flex gap-2 animate-pulse">
                    <div className="w-8 h-8 rounded-full bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-1">
                      <div className="h-3 bg-slate-200 dark:bg-slate-800 rounded w-3/4" />
                      <div className="h-2 bg-slate-200 dark:bg-slate-800 rounded w-full" />
                    </div>
                  </div>
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center">
                <Bell className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-2" />
                <p className="text-sm text-slate-500">All caught up!</p>
                <p className="text-xs text-slate-400 mt-1">No new notifications</p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800">
                {notifications.map(n => {
                  const config = TYPE_CONFIG[n.type] || TYPE_CONFIG.info
                  const Icon = config.icon
                  return (
                    <button
                      key={n.id}
                      onClick={() => handleNotificationClick(n)}
                      className="w-full text-left p-3 hover:bg-slate-50 dark:hover:bg-slate-900/50 transition-colors flex gap-3 group"
                    >
                      <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${config.color}`}>
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-xs font-semibold text-slate-900 dark:text-slate-100">{n.title}</p>
                        <p className="text-[11px] text-slate-600 dark:text-slate-400 break-words whitespace-pre-line mt-0.5">{n.message}</p>
                        <p className="text-[10px] text-slate-400 mt-1">{formatTimeAgo(n.timestamp)}</p>
                      </div>
                    </button>
                  )
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {notifications.length > 0 && (
            <div className="p-2 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/50">
              <button
                onClick={() => { markReadIds(notifications.map(n => n.id)); setOpen(false); toast.success('Marked all as read') }}
                className="w-full text-xs text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200 py-1.5 rounded transition-colors"
              >
                Mark all as read
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
