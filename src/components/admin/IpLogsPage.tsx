'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { api } from '@/lib/api-client'
import {
  Globe, Search, ChevronLeft, ChevronRight, Monitor, Clock, Filter, User, Wifi,
} from 'lucide-react'

interface IpLogEntry {
  id: string
  studentId: string | null
  ipAddress: string
  path: string | null
  userAgent: string | null
  action: string | null
  createdAt: string
  student: { id: string; fullName: string; email: string } | null
}

interface Stats {
  totalVisits: number
  uniqueIps: number
  uniqueStudents: number
  topIps: { ipAddress: string; _count: { ipAddress: number } }[]
}

const ACTION_COLORS: Record<string, string> = {
  visit: 'bg-sky-100 text-sky-700 dark:bg-sky-900/30 dark:text-sky-400',
  login: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400',
  signup: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400',
}

export function IpLogsPage() {
  const [logs, setLogs] = useState<IpLogEntry[]>([])
  const [stats, setStats] = useState<Stats | null>(null)
  const [loading, setLoading] = useState(true)
  const [page, setPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [search, setSearch] = useState('')
  const [actionFilter, setActionFilter] = useState('')

  const fetchLogs = useCallback(async () => {
    setLoading(true)
    try {
      const params = new URLSearchParams()
      params.set('page', String(page))
      if (search) params.set('search', search)
      if (actionFilter) params.set('action', actionFilter)
      const data = await apiFetch(`/api/admin/ip-logs?${params.toString()}`)
      setLogs(data.logs || [])
      setTotalPages(data.totalPages || 1)
      if (data.stats) setStats(data.stats)
    } catch (err) { console.error('Fetch IP logs error:', err) }
    finally { setLoading(false) }
  }, [page, search, actionFilter])

  useEffect(() => { fetchLogs() }, [fetchLogs])

  const handleSearch = (val: string) => { setSearch(val); setPage(1) }

  const formatTime = (dateStr: string) => {
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now.getTime() - d.getTime()
    const diffMin = Math.floor(diffMs / 60000)
    if (diffMin < 1) return 'just now'
    if (diffMin < 60) return `${diffMin}m ago`
    if (diffMin < 1440) return `${Math.floor(diffMin / 60)}h ago`
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })
  }

  const truncateUA = (ua: string | null) => {
    if (!ua) return '-'
    if (ua.length > 60) return ua.substring(0, 60) + '...'
    return ua
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3 flex-wrap justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-slate-700 to-slate-900 dark:from-slate-200 dark:to-slate-400 flex items-center justify-center shadow-sm">
            <Globe className="w-5 h-5 text-white dark:text-slate-900" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 dark:text-slate-100">IP Logs</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Visitor and student IP tracking</p>
          </div>
        </div>
      </div>

      {/* Stats cards */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <Card className="bg-gradient-to-br from-sky-50 to-sky-100 dark:from-sky-950/30 dark:to-sky-950/20 border-sky-200 dark:border-sky-800/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] font-medium text-sky-600 dark:text-sky-400 uppercase tracking-wider">Total Visits</p>
              <p className="text-xl sm:text-2xl font-bold text-sky-900 dark:text-sky-100">{stats.totalVisits.toLocaleString()}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-950/30 dark:to-emerald-950/20 border-emerald-200 dark:border-emerald-800/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 uppercase tracking-wider">Unique IPs</p>
              <p className="text-xl sm:text-2xl font-bold text-emerald-900 dark:text-emerald-100">{stats.uniqueIps}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-amber-50 to-amber-100 dark:from-amber-950/30 dark:to-amber-950/20 border-amber-200 dark:border-amber-800/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] font-medium text-amber-600 dark:text-amber-400 uppercase tracking-wider">Logged-in Students</p>
              <p className="text-xl sm:text-2xl font-bold text-amber-900 dark:text-amber-100">{stats.uniqueStudents}</p>
            </CardContent>
          </Card>
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-950/30 dark:to-purple-950/20 border-purple-200 dark:border-purple-800/50">
            <CardContent className="p-3 sm:p-4">
              <p className="text-[10px] font-medium text-purple-600 dark:text-purple-400 uppercase tracking-wider">Pages / Log</p>
              <p className="text-xl sm:text-2xl font-bold text-purple-900 dark:text-purple-100">
                {stats.totalVisits > 0 ? (stats.totalVisits / Math.max(stats.uniqueIps, 1)).toFixed(1) : '0'}
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Search & Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            placeholder="Search IP, path, or user agent..."
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            className="w-full h-10 pl-9 pr-4 text-sm bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 outline-none focus:ring-2 focus:ring-sky-400/50 text-slate-800 dark:text-slate-200 placeholder:text-slate-400"
          />
        </div>
        <div className="flex gap-1.5 flex-wrap">
          {['', 'visit', 'login', 'signup'].map(a => (
            <button
              key={a}
              onClick={() => { setActionFilter(a); setPage(1) }}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                actionFilter === a
                  ? 'bg-slate-900 text-white dark:bg-slate-100 dark:text-slate-900'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:hover:bg-slate-700'
              }`}
            >
              {a ? a.charAt(0).toUpperCase() + a.slice(1) : 'All'}
            </button>
          ))}
        </div>
      </div>

      {/* Logs Table */}
      {loading ? (
        <div className="space-y-3">
          {[1, 2, 3, 4, 5].map(i => <Skeleton key={i} className="h-12 rounded-xl" />)}
        </div>
      ) : logs.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Wifi className="w-10 h-10 mx-auto text-slate-300 dark:text-slate-600 mb-3" />
            <p className="text-sm text-slate-500 dark:text-slate-400">No IP logs found</p>
          </CardContent>
        </Card>
      ) : (
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50">
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">IP Address</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Student</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Path</th>
                  <th className="text-left px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Action</th>
                  <th className="hidden lg:table-cell text-left px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">User Agent</th>
                  <th className="text-right px-4 py-3 text-[10px] font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {logs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-800/30 transition-colors">
                    <td className="px-4 py-3">
                      <code className="text-xs font-mono text-slate-800 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded">{log.ipAddress}</code>
                    </td>
                    <td className="px-4 py-3">
                      {log.student ? (
                        <div>
                          <p className="text-xs font-medium text-slate-800 dark:text-slate-200">{log.student.fullName}</p>
                          <p className="text-[10px] text-slate-400">{log.student.email}</p>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">Guest</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs text-slate-600 dark:text-slate-400 font-mono">{log.path || '-'}</span>
                    </td>
                    <td className="px-4 py-3">
                      {log.action ? (
                        <Badge variant="secondary" className={`text-[9px] font-medium border-0 ${ACTION_COLORS[log.action] || 'bg-slate-100 text-slate-600'}`}>
                          {log.action}
                        </Badge>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                    <td className="hidden lg:table-cell px-4 py-3">
                      <span className="text-[10px] text-slate-400 font-mono" title={log.userAgent || ''}>
                        {truncateUA(log.userAgent)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <span className="text-[10px] text-slate-400 whitespace-nowrap">{formatTime(log.createdAt)}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-slate-200 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30">
              <p className="text-[10px] text-slate-500">Page {page} of {totalPages}</p>
              <div className="flex gap-1">
                <button
                  onClick={() => setPage(p => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 dark:text-slate-400 hover:bg-slate-200 dark:hover:bg-slate-700 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Top IPs */}
      {stats && stats.topIps && stats.topIps.length > 0 && (
        <Card>
          <CardContent className="p-4">
            <h3 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-3 flex items-center gap-1.5">
              <Globe className="w-3.5 h-3.5 text-sky-500" /> Top IP Addresses
            </h3>
            <div className="space-y-2">
              {stats.topIps.map(ip => (
                <div key={ip.ipAddress} className="flex items-center justify-between text-xs">
                  <code className="text-slate-700 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded font-mono">{ip.ipAddress}</code>
                  <span className="text-slate-500">{ip._count.ipAddress} visits</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}

async function apiFetch(path: string) {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const headers: Record<string, string> = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(path, { headers })
  if (!res.ok) throw new Error('Failed to fetch')
  return res.json()
}
