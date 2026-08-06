'use client'

import { useState, useEffect, useCallback, useMemo, useRef } from 'react'
import { api } from '@/lib/api-client'
import { toast } from 'sonner'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Textarea } from '@/components/ui/textarea'
import { Separator } from '@/components/ui/separator'
import { Checkbox } from '@/components/ui/checkbox'
import { Progress } from '@/components/ui/progress'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SidebarProvider, Sidebar, SidebarContent, SidebarFooter, SidebarGroup, SidebarGroupContent, SidebarHeader, SidebarInset, SidebarMenu, SidebarMenuButton, SidebarMenuItem, SidebarRail, SidebarTrigger, SidebarSeparator } from '@/components/ui/sidebar'
import { QuizzesPage } from './QuizzesPage'
import { AnalyticsPage } from './AnalyticsPage'
import { MaterialsPage } from './MaterialsPage'
import { GroupsPage } from './GroupsPage'
import { IpLogsPage } from './IpLogsPage'
import { LiveStudyPage } from './LiveStudyPage'
import { AdminRoomManagerPage } from './AdminRoomManagerPage'

import {
  LayoutDashboard, Users, BookOpen, BookMarked, FileText, Trophy, Star, ShieldCheck, MessageCircle, Lock, LogOut, Search, Plus, Pencil, Trash2, Check, X, Loader2, Send, Download, User, Mail, Phone, Hash, Activity, Clock, ChevronLeft, ChevronRight, CheckCircle2, XCircle, SunMoon, Brain, Target, BarChart3, Library, Settings, Eye, EyeOff, Award, BookCheck, CalendarDays, Flame, GraduationCap, BellRing, Megaphone, Globe, Mic, Video,
} from 'lucide-react'


// ─── CSS Keyframes (injected once) ─────────────────────────────────
const ANIM_STYLES = `
@keyframes fadeInUp { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:translateY(0) } }
@keyframes fadeIn { from { opacity:0 } to { opacity:1 } }
@keyframes slideDown { from { opacity:0; transform:translateY(-8px) } to { opacity:1; transform:translateY(0) } }
@keyframes shimmer { 0% { background-position:-200% 0 } 100% { background-position:200% 0 } }
@keyframes pulseGlow { 0%,100% { opacity:0.4 } 50% { opacity:0.8 } }
@keyframes scaleIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
@keyframes countUp { from { opacity:0; transform:translateY(4px) } to { opacity:1; transform:translateY(0) } }
@keyframes slideInLeft { from { opacity:0; transform:translateX(-6px) } to { opacity:1; transform:translateX(0) } }
@keyframes checkPop { 0% { transform:scale(0) } 50% { transform:scale(1.2) } 100% { transform:scale(1) } }
.anim-fade-up { animation: fadeInUp .2s ease-out both }
.anim-fade { animation: fadeIn .2s ease-out both }
.anim-slide-down { animation: slideDown .2s ease-out both }
.anim-scale-in { animation: scaleIn .2s ease-out both }
.anim-slide-left { animation: slideInLeft .15s ease-out both }
.anim-check-pop { animation: checkPop .3s ease-out both }
.shimmer-bg {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.06) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
.dark .shimmer-bg {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.04) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
/* Custom scrollbar for admin */
.admin-scroll::-webkit-scrollbar { width: 6px; }
.admin-scroll::-webkit-scrollbar-track { background: transparent; }
.admin-scroll::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.15); border-radius: 3px; }
.admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(0,0,0,0.25); }
.dark .admin-scroll::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.15); }
.dark .admin-scroll::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.25); }
/* Card hover transitions */
.card-lift { transition: transform .2s ease, box-shadow .2s ease; }
.card-lift:hover { transform: translateY(-2px); box-shadow: 0 8px 25px -5px rgba(0,0,0,0.1), 0 4px 10px -4px rgba(0,0,0,0.05); }
.dark .card-lift:hover { box-shadow: 0 8px 25px -5px rgba(0,0,0,0.3), 0 4px 10px -4px rgba(0,0,0,0.2); }
/* Dialog gradient header */
.dialog-gradient-header { background: linear-gradient(135deg, rgba(16,185,129,0.08) 0%, rgba(20,184,166,0.05) 100%); border-bottom: 1px solid rgba(16,185,129,0.1); }
.dark .dialog-gradient-header { background: linear-gradient(135deg, rgba(16,185,129,0.12) 0%, rgba(20,184,166,0.06) 100%); border-bottom: 1px solid rgba(16,185,129,0.15); }
/* Focus ring animation */
.input-focus-ring { transition: box-shadow .2s ease, border-color .2s ease; }
.input-focus-ring:focus { box-shadow: 0 0 0 3px rgba(16,185,129,0.15); border-color: rgba(16,185,129,0.5); }
`

let stylesInjected = false
function InjectStyles() {
  useEffect(() => {
    if (stylesInjected) return
    stylesInjected = true
    const el = document.createElement('style')
    el.textContent = ANIM_STYLES
    document.head.appendChild(el)
  }, [])
  return null
}

// ─── Types ───────────────────────────────────────────────────────
interface AdminPanelProps { onLogout: () => void }
type PageKey = 'dashboard' | 'analytics' | 'students' | 'courses' | 'subjects' | 'chapters' | 'top-performers' | 'reviews' | 'approvals' | 'discussions' | 'quizzes' | 'materials' | 'groups' | 'live-study' | 'discussion-rooms' | 'virtual-libraries' | 'notifications' | 'ip-logs' | 'settings'

// All admin pages, used to validate ?page= so a refresh restores the section
// the admin was on (the panel renders under a single URL).
const ALL_ADMIN_PAGES: PageKey[] = ['dashboard', 'analytics', 'students', 'courses', 'subjects', 'chapters', 'top-performers', 'reviews', 'approvals', 'discussions', 'quizzes', 'materials', 'groups', 'live-study', 'discussion-rooms', 'virtual-libraries', 'notifications', 'ip-logs', 'settings']

interface DashboardData { totalStudents:number; totalCourses:number; totalSubjects:number; totalChapters:number; totalReviews:number; totalDiscussions:number; totalQuizzes?:number; totalQuizAttempts?:number; totalNotes?:number; recentSignups:any[]; weeklySignups?:any[]; activityLog?:any[] }
interface Student { id:string; name:string; email:string; mobile:string; courseId:string; course?:{title:string}; status:string; createdAt:string }
interface Course { id:string; title:string; slug:string; _count?:{students:number;subjects:number} }
interface Subject { id:string; name:string; order:number; courseId:string; course?:{title:string}; _count?:{chapters:number} }
interface Chapter { id:string; name:string; subjectId:string; subject?:{name:string;course?:{title:string}} }
interface TopPerformer { id:string; name:string; mobile:string; email:string; course:string; studyHours:number; studyMinutes:number; subjectsStudied:number }
interface Review { id:string; authorName:string; text:string; rating:number; courseId:string; course?:{title:string}; source:string; status:string; studentId?:string|null }
interface Approval { id:string; name:string; email:string; mobile:string; courseId:string; course?:{title:string}; createdAt:string }
interface Discussion { id:string; title:string; content:string; student?:{name:string;email:string}; adminReply?:string|null; createdAt:string; replies?:DiscussionReply[] }
interface DiscussionReply { id:string; content:string; createdAt:string; student?:{id:string;name:string} }
interface NotificationCounts { pendingApprovals:number; pendingReviews:number; unreadDiscussions:number; total:number }
interface StudentDetail extends Student {
  score:number; totalStudyMin:number; currentStreak:number; lastStudyAt?:string; verified:boolean
  course:{id:string;title:string;slug:string}
  studySessions:{id:string;durationMin:number;completed:boolean;date:string;chapter?:{name:string}}[]
  quizAttempts:{id:string;score:number;totalQuestions:number;passed:boolean;createdAt:string;quiz:{title:string;difficulty:string}}[]
  chapterCompletions:{id:string;completedAt:string;chapter:{name:string;subject:{name:string}}}[] 
  achievements:{id:string;unlockedAt:string;achievement:{id:string;name:string;description:string;icon:string|null;threshold:number}}[]
  discussions:{id:string;title:string;createdAt:string}[]
  reviews:{id:string;text:string;rating:number;createdAt:string}[]
  notes:{id:string;title:string;updatedAt:string}[]
  groupMemberships:{id:string;group:{name:string};joinedAt:string}[]
  studyPlans:{id:string;plannedDate:string;notes?:string}[]
  _stats:{totalStudySessions:number;totalStudyMin:number;totalQuizAttempts:number;passedQuizzes:number;avgScore:number;totalChaptersCompleted:number;totalDiscussions:number;totalReviews:number;totalNotes:number}
}

// ─── Navigation Config ──────────────────────────────────────────
const navSections: { label:string; items:{ key:PageKey; label:string; icon:React.ElementType; color:string }[] }[] = [
  { label:'Overview', items:[
    { key:'dashboard', label:'Dashboard', icon:LayoutDashboard, color:'bg-emerald-500/10 text-emerald-600' },
    { key:'analytics', label:'Analytics', icon:BarChart3, color:'bg-sky-500/10 text-sky-600' },
  ]},
  { label:'Management', items:[
    { key:'students', label:'Students', icon:Users, color:'bg-sky-500/10 text-sky-600' },
    { key:'approvals', label:'Approvals', icon:ShieldCheck, color:'bg-emerald-500/10 text-emerald-600' },
    { key:'top-performers', label:'Top Performers', icon:Trophy, color:'bg-orange-500/10 text-orange-600' },
    { key:'groups', label:'Study Groups', icon:Users, color:'bg-teal-500/10 text-teal-600' },
    { key:'live-study', label:'Live Study', icon:Flame, color:'bg-orange-500/10 text-orange-600' },
    { key:'discussion-rooms', label:'Discussion Rooms', icon:Mic, color:'bg-rose-500/10 text-rose-600' },
    { key:'virtual-libraries', label:'Virtual Libraries', icon:Video, color:'bg-cyan-500/10 text-cyan-600' },
  ]},
  { label:'Content', items:[
    { key:'courses', label:'Courses', icon:BookOpen, color:'bg-amber-500/10 text-amber-600' },
    { key:'subjects', label:'Subjects', icon:BookMarked, color:'bg-violet-500/10 text-violet-600' },
    { key:'chapters', label:'Chapters', icon:FileText, color:'bg-teal-500/10 text-teal-600' },
    { key:'quizzes', label:'Quizzes', icon:Brain, color:'bg-purple-500/10 text-purple-600' },
    { key:'materials', label:'Materials', icon:Library, color:'bg-cyan-500/10 text-cyan-600' },
  ]},
  { label:'Communication', items:[
    { key:'reviews', label:'Reviews', icon:Star, color:'bg-rose-500/10 text-rose-600' },
    { key:'discussions', label:'Discussions', icon:MessageCircle, color:'bg-cyan-500/10 text-cyan-600' },
    { key:'notifications', label:'Send Notification', icon:BellRing, color:'bg-purple-500/10 text-purple-600' },
  ]},
  { label:'System', items:[
    { key:'ip-logs', label:'IP Logs', icon:Globe, color:'bg-sky-500/10 text-sky-600' },
    { key:'settings', label:'Settings', icon:Settings, color:'bg-slate-500/10 text-slate-600' },
  ]},
]

const navItems = navSections.flatMap(s=>s.items)

// ─── Helpers ─────────────────────────────────────────────────────
function StarRating({ rating }: { rating:number }) {
  return <div className="flex items-center gap-0.5">{[1,2,3,4,5].map(s=><Star key={s} className={`size-3.5 ${s<=rating?'fill-amber-400 text-amber-400':'text-muted-foreground/30'}`} />)}</div>
}

function MiniSparkline({ data, color }: { data:number[]; color:string }) {
  const max = Math.max(...data, 1)
  const pts = data.map((v,i)=>`${(i/(data.length-1))*60},${24-(v/max)*20}`).join(' ')
  return <svg width="64" height="28" className="opacity-60"><polyline fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" points={pts} /></svg>
}

function TableSkeleton({ cols=4, rows=5 }: { cols?:number; rows?:number }) {
  return <div className="space-y-3 p-4">
    <div className="flex gap-4">{Array.from({length:cols}).map((_,i)=><Skeleton key={i} className="h-8 flex-1 rounded-lg shimmer-bg" />)}</div>
    {Array.from({length:rows}).map((_,r)=><div key={r} className="flex gap-4" style={{animationDelay:`${r*60}ms`}}>{Array.from({length:cols}).map((_,i)=><Skeleton key={i} className="h-10 flex-1 rounded-lg shimmer-bg" style={{animationDelay:`${(r*cols+i)*30}ms`}} />)}</div>)}
  </div>
}

function ShimmerCard() {
  return <Card className="overflow-hidden"><CardContent className="p-4 space-y-3">
    <div className="flex items-center gap-3"><Skeleton className="size-9 rounded-lg shimmer-bg" /><Skeleton className="h-4 w-20 shimmer-bg" /></div>
    <Skeleton className="h-8 w-16 shimmer-bg" /><Skeleton className="h-3 w-24 shimmer-bg" />
  </CardContent></Card>
}

function EmptyState({ icon:Icon, title, description, action }: { icon:React.ElementType; title:string; description:string; action?:React.ReactNode }) {
  return <Card className="border-dashed"><CardContent className="py-16 text-center">
    <div className="flex size-14 items-center justify-center rounded-2xl bg-muted/50 mx-auto mb-4"><Icon className="size-7 text-muted-foreground/50" /></div>
    <h3 className="font-semibold text-muted-foreground mb-1">{title}</h3>
    <p className="text-sm text-muted-foreground/70 mb-4">{description}</p>
    {action}
  </CardContent></Card>
}

function ActionButton({ icon:Icon, tooltip, onClick, variant='ghost', className='' }: { icon:React.ElementType; tooltip:string; onClick:()=>void; variant?:'ghost'|'default'|'destructive'; className?:string }) {
  return <Button variant={variant} size="icon" onClick={onClick} title={tooltip} className={`relative group ${className}`}>
    <Icon className="size-4" />
    <span className="absolute -top-8 left-1/2 -translate-x-1/2 px-2 py-1 rounded bg-foreground text-background text-[10px] font-medium whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">{tooltip}</span>
  </Button>
}

function GradientButton({ children, type='button', onClick, disabled, className='' }: { children:React.ReactNode; type?:'button'|'submit'; onClick?:()=>void; disabled?:boolean; className?:string }) {
  return <Button type={type} onClick={onClick} disabled={disabled} className={`bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm hover:shadow-md transition-all duration-200 ${disabled?'opacity-60 cursor-not-allowed':''} ${className}`}>
    {children}
  </Button>
}

function SearchBar({ value, onChange, placeholder='Search...', className='' }: { value:string; onChange:(v:string)=>void; placeholder?:string; className?:string }) {
  return <div className={`relative ${className}`}>
    <Search className="absolute left-3 top-2.5 size-4 text-muted-foreground/60" />
    <Input placeholder={placeholder} value={value} onChange={e=>onChange(e.target.value)} className="pl-9 input-focus-ring rounded-lg bg-muted/30 border-transparent focus:bg-background focus:border-emerald-500/30 transition-all duration-200" />
  </div>
}

function StatCard({ icon:Icon, label, value, sub, className='' }: { icon:React.ElementType; label:string; value:React.ReactNode; sub?:string; className?:string }) {
  return <div className={`flex flex-col gap-1 p-3 rounded-xl border bg-card ${className}`}>
    <div className="flex items-center gap-1.5 text-muted-foreground"><Icon className="size-3.5" /><span className="text-[10px] font-medium uppercase tracking-wider">{label}</span></div>
    <span className="text-lg font-bold tabular-nums">{value}</span>
    {sub&&<span className="text-[10px] text-muted-foreground/70 truncate">{sub}</span>}
  </div>
}

// ─── Inline SVG Charts ───────────────────────────────────────────
function InlineLineChart({ data, height=200 }: { data:{day:string;signups:number}[]; height?:number }) {
  if (!data.length) return null
  const maxVal = Math.max(...data.map(d=>d.signups), 1)
  const w = 500, h = height, padL = 40, padR = 20, padT = 20, padB = 40
  const plotW = w - padL - padR, plotH = h - padT - padB
  const yScale = (v:number) => padT + plotH - (v/maxVal)*plotH
  const xScale = (i:number) => padL + (i/(data.length-1))*plotW

  const linePath = data.map((d,i)=>`${i===0?'M':'L'}${xScale(i)},${yScale(d.signups)}`).join(' ')
  const areaPath = linePath + ` L${xScale(data.length-1)},${padT+plotH} L${padL},${padT+plotH} Z`
  const yTicks = 5
  const yStep = maxVal / yTicks

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{maxHeight:height}}>
      {/* Grid lines */}
      {Array.from({length:yTicks+1}).map((_,i)=>{
        const val = Math.round(i*yStep)
        const y = yScale(val)
        return <g key={i}><line x1={padL} y1={y} x2={w-padR} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 4" /><text x={padL-8} y={y+4} textAnchor="end" className="fill-muted-foreground" fontSize="11">{val}</text></g>
      })}
      {/* Area fill */}
      <path d={areaPath} fill="#10b981" fillOpacity={0.08} />
      {/* Line */}
      <path d={linePath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
      {/* Dots + labels */}
      {data.map((d,i)=><g key={i}>
        <circle cx={xScale(i)} cy={yScale(d.signups)} r="4" fill="#10b981" />
        <text x={xScale(i)} y={h-8} textAnchor="middle" className="fill-muted-foreground" fontSize="11">{d.day}</text>
      </g>)}
    </svg>
  )
}

function InlineBarChart({ data, height=220 }: { data:TopPerformer[]; height?:number }) {
  if (!data.length) return null
  const maxVal = Math.max(...data.map(d=>d.studyMinutes), 1)
  const barW = Math.min(40, 400/data.length - 8)
  const w = 500, h = height, padL = 40, padR = 20, padT = 10, padB = 60
  const plotW = w - padL - padR, plotH = h - padT - padB
  const yScale = (v:number) => padT + plotH - (v/maxVal)*plotH
  const gap = plotW / data.length

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full" style={{maxHeight:height}}>
      {/* Grid */}
      {[0,0.25,0.5,0.75,1].map((pct,i)=>{
        const y = yScale(maxVal*pct)
        const val = Math.round(maxVal*pct)
        return <g key={i}><line x1={padL} y1={y} x2={w-padR} y2={y} stroke="currentColor" strokeOpacity={0.08} strokeDasharray="4 4" /><text x={padL-8} y={y+4} textAnchor="end" className="fill-muted-foreground" fontSize="11">{val}</text></g>
      })}
      {/* Bars */}
      {data.map((d,i)=>{
        const x = padL + i*gap + gap/2 - barW/2
        const barH = (d.studyMinutes/maxVal)*plotH
        const y = padT + plotH - barH
        const name = d.name.length > 8 ? d.name.slice(0,7)+'…' : d.name
        return <g key={i}>
          <rect x={x} y={y} width={barW} height={barH} fill="#f59e0b" rx="3" className="transition-opacity hover:opacity-80" />
          <text x={padL+i*gap+gap/2} y={h-28} textAnchor="middle" className="fill-muted-foreground" fontSize="10" transform={`rotate(-25,${padL+i*gap+gap/2},${h-28})`}>{name}</text>
        </g>
      })}
    </svg>
  )
}

// ─── Hooks ───────────────────────────────────────────────────────
function useFetch<T>(fetcher:()=>Promise<T>, deps:any[]) {
  const [data, setData] = useState<T|null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string|null>(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const refresh = useCallback(()=>setRefreshKey(k=>k+1), [])
  useEffect(()=>{
    let c=false
    fetcher().then(r=>{if(c)return;setData(r);setError(null);setLoading(false)}).catch(e=>{if(c)return;setError(e.message||'Failed');setLoading(false)})
    return()=>{c=true}
  }, [...deps, refreshKey])
  return { data, loading, error, refresh, setData }
}

function usePagination<T>(items:T[], pageSize=10) {
  const [page, setPage] = useState(1)
  const safeItems = Array.isArray(items) ? items : []
  const totalPages = Math.max(1, Math.ceil(safeItems.length/pageSize))
  const safePage = Math.min(page, totalPages)
  const paginated = safeItems.slice((safePage-1)*pageSize, safePage*pageSize)
  const goTo = (p:number)=>setPage(Math.max(1,Math.min(p,totalPages)))
  if (page>totalPages&&totalPages>0) setPage(totalPages)
  return { page:safePage, totalPages, paginated, goTo, setPage }
}

function exportCSV(filename:string, headers:string[], rows:string[][]) {
  const csv = [headers.join(','),...rows.map(r=>r.map(c=>`"${c.replace(/"/g,'""')}"`).join(','))].join('\n')
  const blob = new Blob([csv],{type:'text/csv;charset=utf-8;'})
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a'); a.href=url; a.download=`${filename}.csv`
  document.body.appendChild(a); a.click(); document.body.removeChild(a)
  setTimeout(()=>URL.revokeObjectURL(url), 100)
}

// ─── Pagination Controls ─────────────────────────────────────────
function PaginationControls({ page, totalPages, goTo }: { page:number; totalPages:number; goTo:(p:number)=>void }) {
  if (totalPages<=1) return null
  return <div className="flex items-center justify-between px-4 py-3 border-t bg-muted/20">
    <p className="text-xs text-muted-foreground font-medium">Page {page} of {totalPages}</p>
    <div className="flex items-center gap-1">
      <Button variant="outline" size="sm" onClick={()=>goTo(page-1)} disabled={page<=1} className="gap-1 text-xs hover:border-emerald-500/30 transition-colors"><ChevronLeft className="size-3.5" /> Prev</Button>
      <Button variant="outline" size="sm" onClick={()=>goTo(page+1)} disabled={page>=totalPages} className="gap-1 text-xs hover:border-emerald-500/30 transition-colors">Next <ChevronRight className="size-3.5" /></Button>
    </div>
  </div>
}

// ─── Styled Table Wrapper ────────────────────────────────────────
function StyledTable({ children }: { children:React.ReactNode }) {
  return <div className="rounded-xl overflow-hidden border shadow-sm">{children}</div>
}

// ─── Reusable form field with icon ───────────────────────────────
function IconField({ icon:Icon, label, ...inputProps }: { icon:React.ElementType; label?:string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return <div className="space-y-1.5">
    {label && <Label className="flex items-center gap-1.5 text-xs font-medium"><Icon className="size-3.5 text-muted-foreground/70" /> {label}</Label>}
    <div className="relative">
      <Icon className="absolute left-2.5 top-2.5 size-4 text-muted-foreground/50" />
      <Input {...inputProps} className={`pl-8 input-focus-ring rounded-lg ${inputProps.className||''}`} />
    </div>
  </div>
}

// ─── Settings Page ───────────────────────────────────────────────
function SettingsPage() {
  const { data: settings, refresh: refreshSettings } = useFetch<any>(() => api.adminGetSettings().then(r => r.settings || r.data || r), [])
  const approvalEnabled = useMemo(() => {
    if (settings) { const v = settings.signup_approval || settings.signupApproval; return v === 'true' || v === true }
    return false
  }, [settings])
  const smtpConfigured = useMemo(() => {
    if (settings) return !!(settings.smtp_host && settings.smtp_user)
    return false
  }, [settings])

  const [smtpHost, setSmtpHost] = useState('')
  const [smtpPort, setSmtpPort] = useState('587')
  const [smtpUser, setSmtpUser] = useState('')
  const [smtpPass, setSmtpPass] = useState('')
  const [smtpFrom, setSmtpFrom] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [saving, setSaving] = useState(false)
  const [testEmail, setTestEmail] = useState('')
  const [testing, setTesting] = useState(false)

  useEffect(() => {
    if (settings) {
      setSmtpHost(settings.smtp_host || '')
      setSmtpPort(settings.smtp_port || '587')
      setSmtpUser(settings.smtp_user || '')
      setSmtpPass(settings.smtp_pass || '')
      setSmtpFrom(settings.smtp_from || '')
    }
  }, [settings])

  const handleSaveSmtp = async () => {
    setSaving(true)
    try {
      await api.adminUpdateSettings({
        smtp_host: smtpHost,
        smtp_port: smtpPort,
        smtp_user: smtpUser,
        smtp_pass: smtpPass,
        smtp_from: smtpFrom,
      })
      toast.success('SMTP configuration saved successfully')
      refreshSettings()
    } catch (e: any) {
      toast.error(e.message || 'Failed to save SMTP settings')
    } finally {
      setSaving(false)
    }
  }

  const handleTestSmtp = async () => {
    if (!testEmail.trim()) { toast.error('Please enter a test email address'); return }
    setTesting(true)
    try {
      await api.adminTestSmtp({
        host: smtpHost,
        port: smtpPort,
        user: smtpUser,
        pass: smtpPass,
        from: smtpFrom,
        testEmail: testEmail,
      })
      toast.success('Test email sent successfully! Check your inbox.')
    } catch (e: any) {
      toast.error(e.message || 'Failed to send test email')
    } finally {
      setTesting(false)
    }
  }

  const handleToggleApproval = async (enabled: boolean) => {
    try {
      await api.adminToggleApproval(enabled)
      toast.success(`Signup approval ${enabled ? 'enabled' : 'disabled'}`)
      refreshSettings()
    } catch (e: any) {
      toast.error(e.message)
    }
  }

  return <div className="space-y-6 anim-fade-up">
    {/* Page Header */}
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Settings</h2>
      <p className="text-sm text-muted-foreground mt-0.5">Configure your platform settings and preferences.</p>
    </div>

    {/* SMTP Configuration Card */}
    <Card className="overflow-hidden card-lift">
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 dark:from-slate-900 dark:to-slate-950 p-5 text-white">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-xl bg-white/10 backdrop-blur-sm">
              <Mail className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold text-base">SMTP Configuration</h3>
              <p className="text-xs text-slate-300 mt-0.5">Configure email delivery settings for your platform</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {smtpConfigured ? (
              <div className="flex items-center gap-1.5 bg-emerald-500/20 text-emerald-300 px-3 py-1.5 rounded-full text-xs font-medium">
                <CheckCircle2 className="size-3.5" /> Configured
              </div>
            ) : (
              <div className="flex items-center gap-1.5 bg-red-500/20 text-red-300 px-3 py-1.5 rounded-full text-xs font-medium">
                <XCircle className="size-3.5" /> Not Configured
              </div>
            )}
          </div>
        </div>
      </div>
      <CardContent className="p-6 space-y-5">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Hash className="size-3.5 text-muted-foreground/70" /> SMTP Host
            </Label>
            <Input placeholder="e.g. smtp.gmail.com" value={smtpHost} onChange={e => setSmtpHost(e.target.value)} className="input-focus-ring rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Hash className="size-3.5 text-muted-foreground/70" /> SMTP Port
            </Label>
            <Input placeholder="587" value={smtpPort} onChange={e => setSmtpPort(e.target.value)} className="input-focus-ring rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <User className="size-3.5 text-muted-foreground/70" /> SMTP Username
            </Label>
            <Input placeholder="e.g. your@gmail.com" value={smtpUser} onChange={e => setSmtpUser(e.target.value)} className="input-focus-ring rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Lock className="size-3.5 text-muted-foreground/70" /> SMTP Password
            </Label>
            <div className="relative">
              <Input type={showPassword ? 'text' : 'password'} placeholder="Enter password" value={smtpPass} onChange={e => setSmtpPass(e.target.value)} className="input-focus-ring rounded-lg pr-10" />
              <Button type="button" variant="ghost" size="icon" className="absolute right-1 top-1/2 -translate-y-1/2 size-7 hover:bg-transparent" onClick={() => setShowPassword(!showPassword)}>
                {showPassword ? <EyeOff className="size-4 text-muted-foreground" /> : <Eye className="size-4 text-muted-foreground" />}
              </Button>
            </div>
          </div>
          <div className="space-y-1.5 md:col-span-2">
            <Label className="flex items-center gap-1.5 text-xs font-medium">
              <Mail className="size-3.5 text-muted-foreground/70" /> From Email / Name
            </Label>
            <Input placeholder="e.g. Platform Name <noreply@example.com>" value={smtpFrom} onChange={e => setSmtpFrom(e.target.value)} className="input-focus-ring rounded-lg" />
          </div>
        </div>

        <div className="flex items-center justify-end pt-2">
          <GradientButton onClick={handleSaveSmtp} disabled={saving}>
            {saving && <Loader2 className="size-4 animate-spin mr-1" />}
            Save Configuration
          </GradientButton>
        </div>

        <Separator />

        {/* Test SMTP Section */}
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Send className="size-4 text-slate-500" />
            <h4 className="font-semibold text-sm">Test SMTP Connection</h4>
          </div>
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 space-y-1.5">
              <Label className="text-xs font-medium">Test Email Recipient</Label>
              <Input type="email" placeholder="recipient@example.com" value={testEmail} onChange={e => setTestEmail(e.target.value)} className="input-focus-ring rounded-lg" />
            </div>
            <div className="flex items-end">
              <Button variant="outline" onClick={handleTestSmtp} disabled={testing} className="gap-1.5 hover:border-emerald-500/50 hover:text-emerald-600 transition-colors">
                {testing ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
                Send Test Email
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>

    {/* Signup Approval Card */}
    <Card className="overflow-hidden relative card-lift">
      <div className={`absolute inset-0 transition-colors duration-500 ${approvalEnabled ? 'bg-emerald-500/5' : 'bg-muted/30'}`} />
      <CardContent className="p-5 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`flex size-10 items-center justify-center rounded-xl ${approvalEnabled ? 'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
              <ShieldCheck className="size-5" />
            </div>
            <div>
              <h3 className="font-semibold">Signup Approval Required</h3>
              <p className="text-sm text-muted-foreground">When enabled, new students must be approved before accessing the platform.</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className={`text-sm font-medium ${approvalEnabled ? 'text-emerald-600' : 'text-muted-foreground'}`}>{approvalEnabled ? 'Enabled' : 'Disabled'}</span>
            <Switch checked={approvalEnabled} onCheckedChange={handleToggleApproval} className="data-[state=checked]:bg-emerald-500 scale-110 transition-transform duration-200" />
          </div>
        </div>
      </CardContent>
    </Card>
  </div>
}

// ─── Send Notification Page ──────────────────────────────────────
function SendNotificationPage() {
  const [title, setTitle] = useState('')
  const [message, setMessage] = useState('')
  const [target, setTarget] = useState<'all' | 'course'>('all')
  const [targetCourseId, setTargetCourseId] = useState('')
  const [sendPush, setSendPush] = useState(true)
  const [sending, setSending] = useState(false)
  const [sentNotifications, setSentNotifications] = useState<any[]>([])
  const [loadingHistory, setLoadingHistory] = useState(true)
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null)
  const [deleting, setDeleting] = useState(false)
  const { data: courses } = useFetch<any[]>(() => api.adminCourses().then(r => r.data || r.courses || r), [])

  const MAX_CHARS = 500

  useEffect(() => {
    api.adminListNotifications()
      .then((res: any) => { setSentNotifications(res.notifications || []); setLoadingHistory(false) })
      .catch(() => setLoadingHistory(false))
  }, [])

  const handleDelete = async (id: string) => {
    setDeleting(true)
    try {
      await api.adminDeleteNotification(id)
      setSentNotifications(prev => prev.filter(n => n.id !== id))
      toast.success('Notification deleted')
    } catch (e: any) {
      toast.error(e.message || 'Failed to delete notification')
    } finally {
      setDeleting(false)
      setDeleteConfirm(null)
    }
  }

  const handleSend = async () => {
    if (!title.trim() || !message.trim()) { toast.error('Title and message are required'); return }
    setSending(true)
    try {
      const result = await api.adminSendNotification({
        title: title.trim(),
        message: message.trim(),
        type: 'announcement',
        targetRole: target === 'all' ? 'all' : 'student',
        targetCourseId: target === 'course' ? targetCourseId : null,
      })
      toast.success('Notification sent successfully!')
      if (result?.notification) {
        setSentNotifications(prev => [result.notification, ...prev])
      }
      const notifTitle = title.trim()
      const notifMessage = message.trim()
      setTitle('')
      setMessage('')

      if (sendPush) {
        try {
          const pushRes = await fetch('/api/admin/push/send', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${localStorage.getItem('token')}` },
            body: JSON.stringify({
              title: notifTitle,
              message: notifMessage,
              targetCourseId: target === 'course' ? targetCourseId : null,
            }),
          })
          const pushData = await pushRes.json()
          if (pushData.sent !== undefined) {
            if (pushData.sent > 0) toast.success(`Push Notification sent to ${pushData.sent} device(s)`)
            else if (pushData.total === 0) toast.info('Push enabled: no devices are subscribed yet')
            else toast.warning(`Push: sent to ${pushData.sent}/${pushData.total} device(s)`)
          } else if (pushData.error) {
            toast.error(`Push failed: ${pushData.error}`)
            console.warn('[Push] API error:', pushData.error)
          }
        } catch (pushErr) {
          console.warn('[Push] Send failed:', pushErr)
        }
      }
    } catch (e: any) {
      toast.error(e.message || 'Failed to send notification')
    } finally {
      setSending(false)
    }
  }

  return <div className="space-y-6 anim-fade-up">
    <div>
      <h2 className="text-2xl font-bold tracking-tight">Send Notification</h2>
      <p className="text-sm text-muted-foreground mt-0.5">Compose and broadcast a push notification to students.</p>
    </div>

    <Card className="overflow-hidden">
      <CardContent className="p-6 space-y-5">
        {/* Target Audience */}
        <div className="space-y-2">
          <Label className="text-sm font-medium">Target Audience</Label>
          <div className="flex gap-2">
            <Button
              variant={target === 'all' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTarget('all')}
              className={target === 'all' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              All Students
            </Button>
            <Button
              variant={target === 'course' ? 'default' : 'outline'}
              size="sm"
              onClick={() => setTarget('course')}
              className={target === 'course' ? 'bg-emerald-600 hover:bg-emerald-700' : ''}
            >
              Specific Course
            </Button>
          </div>
          {target === 'course' && (
            <select
              value={targetCourseId}
              onChange={e => setTargetCourseId(e.target.value)}
              className="flex h-9 w-full rounded-lg border border-input bg-background px-3 py-1 text-sm shadow-sm transition-colors input-focus-ring mt-2"
            >
              <option value="">Select a course...</option>
              {courses?.map((c: any) => (
                <option key={c.id} value={c.id}>{c.title}</option>
              ))}
            </select>
          )}
        </div>

        {/* Title */}
        <div className="space-y-1.5">
          <Label className="text-sm font-medium">Title</Label>
          <Input
            placeholder="e.g. New Study Material Available"
            value={title}
            onChange={e => setTitle(e.target.value)}
            className="input-focus-ring rounded-lg"
          />
        </div>

        {/* Message */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <Label className="text-sm font-medium">Message</Label>
            <span className={`text-xs ${message.length > MAX_CHARS ? 'text-red-500 font-medium' : 'text-muted-foreground'}`}>
              {message.length}/{MAX_CHARS}
            </span>
          </div>
          <textarea
            placeholder="Type your notification message here..."
            value={message}
            onChange={e => setMessage(e.target.value)}
            rows={4}
            className="flex w-full rounded-lg border border-input bg-background px-3 py-2 text-sm shadow-sm transition-colors placeholder:text-muted-foreground focus-visible:outline-none input-focus-ring resize-none"
          />
        </div>

        {/* Push Notification Toggle */}
        <div className="flex items-center gap-3 pt-1">
          <div className="flex items-center gap-2">
            <BellRing className={`size-4 ${sendPush ? 'text-emerald-500' : 'text-muted-foreground'}`} />
            <label className="text-sm font-medium cursor-pointer select-none" onClick={() => setSendPush(!sendPush)}>
              Send as Browser Push Notification
            </label>
          </div>
          <Switch checked={sendPush} onCheckedChange={setSendPush} className="data-[state=checked]:bg-emerald-500" />
        </div>

        <div className="flex justify-end pt-2">
          <GradientButton onClick={handleSend} disabled={sending || !title.trim() || !message.trim()}>
            {sending && <Loader2 className="size-4 animate-spin mr-1" />}
            <Send className="size-4 mr-1" />
            Send Notification
          </GradientButton>
        </div>
      </CardContent>
    </Card>

    {/* History */}
    {loadingHistory ? (
      <div className="space-y-2">
        {[1,2,3].map(i => <Skeleton key={i} className="h-20 rounded-xl shimmer-bg" />)}
      </div>
    ) : sentNotifications.length > 0 ? (
      <div>
        <h3 className="text-lg font-semibold mb-3">Sent Notifications</h3>
        <div className="space-y-2">
          {sentNotifications.map(n => (
            <Card key={n.id} className="card-lift group relative overflow-hidden">
              <CardContent className="p-4 flex items-start justify-between gap-3">
                <div className="space-y-0.5 flex-1 min-w-0">
                  <p className="font-medium text-sm">{n.title}</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{n.message}</p>
                  <p className="text-xs text-muted-foreground/60">
                    {n.targetRole === 'all' || !n.targetRole ? 'All Students' : 'Specific Course'} · {new Date(n.createdAt).toLocaleString()}
                  </p>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <BellRing className="size-4 text-emerald-500 mt-0.5" />
                  <Button variant="ghost" size="icon" className="size-7 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={() => setDeleteConfirm(n.id)} title="Delete notification">
                    <Trash2 className="size-3.5 text-red-500" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    ) : null}

    <AlertDialog open={!!deleteConfirm} onOpenChange={o => { if (!o) setDeleteConfirm(null) }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Notification</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete this notification? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction disabled={deleting} onClick={() => deleteConfirm && handleDelete(deleteConfirm)}
            className="bg-red-600 hover:bg-red-700 text-white">
            {deleting ? <Loader2 className="size-4 animate-spin mr-1" /> : <Trash2 className="size-4 mr-1" />}
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  </div>
}

// ─── Main AdminPanel Component ───────────────────────────────────
export default function AdminPanel({ onLogout }: AdminPanelProps) {
  const [activePage, setActivePage] = useState<PageKey>(() => {
    if (typeof window === 'undefined') return 'dashboard'
    const p = new URLSearchParams(window.location.search).get('page')
    return p && (ALL_ADMIN_PAGES as string[]).includes(p) ? p as PageKey : 'dashboard'
  })
  const [changePasswordOpen, setChangePasswordOpen] = useState(false)

  // Switch the active section and mirror it into ?page= so refreshing the
  // browser doesn't drop the admin back to the dashboard.
  const navigateTo = (key: PageKey) => {
    setActivePage(key)
    try {
      const url = new URL(window.location.href)
      url.searchParams.set('page', key)
      window.history.replaceState({}, '', url.toString())
    } catch { /* ignore */ }
  }

  // Fetch notification badge counts (refreshes every 60s)
  const { data: notifications, refresh: refreshNotifications } = useFetch<NotificationCounts>(
    () => api.adminNotifications(),
    []
  )
  useEffect(() => {
    const interval = setInterval(() => {
      refreshNotifications()
    }, 60000)
    return () => clearInterval(interval)
  }, [refreshNotifications])

  // Resolve a badge count for a given nav item
  const badgeCountFor = (key: PageKey): number => {
    if (!notifications) return 0
    switch (key) {
      case 'approvals': return notifications.pendingApprovals
      case 'reviews': return notifications.pendingReviews
      case 'discussions': return notifications.unreadDiscussions
      default: return 0
    }
  }

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard': return <DashboardPage />
      case 'analytics': return <AnalyticsPage />
      case 'students': return <StudentsPage />
      case 'courses': return <CoursesPage />
      case 'subjects': return <SubjectsPage />
      case 'chapters': return <ChaptersPage />
      case 'top-performers': return <TopPerformersPage />
      case 'reviews': return <ReviewsPage />
      case 'approvals': return <ApprovalsPage />
      case 'discussions': return <DiscussionsPage />
      case 'quizzes': return <QuizzesPage />
      case 'materials': return <MaterialsPage />
      case 'groups': return <GroupsPage />
      case 'live-study': return <LiveStudyPage />
      case 'discussion-rooms': return <AdminRoomManagerPage kind="discussion" />
      case 'virtual-libraries': return <AdminRoomManagerPage kind="library" />
      case 'notifications': return <SendNotificationPage />
      case 'ip-logs': return <IpLogsPage />
      case 'settings': return <SettingsPage />
    }
  }

  return (
    <SidebarProvider>
      <InjectStyles />
      <Sidebar variant="sidebar" collapsible="icon" side="left">
        <SidebarHeader className="p-3 bg-gradient-to-br from-emerald-500/5 via-teal-500/3 to-transparent">
          <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
            <div className="flex size-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-sm shrink-0 shadow-md shadow-emerald-500/20 ring-1 ring-white/10">M</div>
            <div className="group-data-[collapsible=icon]:hidden">
              <h2 className="text-sm font-semibold tracking-[0.15em] text-sidebar-foreground">MISSION CS</h2>
              <p className="text-[10px] text-sidebar-foreground/50 font-medium">Admin Panel</p>
            </div>
          </div>
        </SidebarHeader>
        <SidebarSeparator />
        <SidebarContent className="admin-scroll">
          {navSections.map((section,si)=>(
            <SidebarGroup key={section.label}>
              <div className="px-3 py-1.5 group-data-[collapsible=icon]:hidden">
                <span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-sidebar-foreground/30">{section.label}</span>
              </div>
              <SidebarGroupContent><SidebarMenu>
                {section.items.map(item=>{
                  const isActive = activePage===item.key
                  const badgeCount = badgeCountFor(item.key)
                  return <SidebarMenuItem key={item.key}>
                    <SidebarMenuButton isActive={isActive} onClick={()=>navigateTo(item.key)} tooltip={item.label} className={`group relative transition-all duration-200 ${isActive?'bg-gradient-to-r from-emerald-500/8 to-teal-500/4 dark:from-emerald-500/12 dark:to-teal-500/6':''}`}>
                      <div className={`flex size-8 items-center justify-center rounded-lg transition-all duration-200 ${isActive?item.color+' shadow-sm':'bg-transparent text-muted-foreground group-hover:bg-muted group-hover:scale-105'}`}>
                        <item.icon className="size-4" />
                      </div>
                      <span className="flex-1">{item.label}</span>
                      {badgeCount > 0 && (
                        <>
                          <span className="ml-auto inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-gradient-to-r from-red-500 to-rose-500 px-1.5 text-[10px] font-bold leading-none text-white shadow-sm shadow-red-500/20 ring-2 ring-background group-data-[collapsible=icon]:hidden">
                            {badgeCount > 99 ? '99+' : badgeCount}
                          </span>
                          <span className="absolute right-1 top-1 size-2 rounded-full bg-red-500 ring-2 ring-background hidden group-data-[collapsible=icon]:block animate-pulse" />
                        </>
                      )}
                      {isActive && <div className="absolute left-0 top-0 bottom-0 w-[3px] rounded-r-full bg-gradient-to-b from-emerald-500 to-teal-500 shadow-sm shadow-emerald-500/30" />}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                })}
              </SidebarMenu></SidebarGroupContent>
            </SidebarGroup>
          ))}
        </SidebarContent>
        <SidebarFooter className="border-t border-sidebar-border/50"><SidebarMenu>
          <SidebarMenuItem><SidebarMenuButton tooltip="Toggle Theme" onClick={()=>{const t=document.documentElement.classList.contains('dark')?'light':'dark';document.documentElement.classList.toggle('dark',t==='dark');localStorage.setItem('theme',t)}} className="transition-all duration-200 hover:scale-[1.02]"><SunMoon className="size-4" /><span>Toggle Theme</span></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton tooltip="Change Password" onClick={()=>setChangePasswordOpen(true)} className="transition-all duration-200 hover:scale-[1.02]"><Lock className="size-4" /><span>Change Password</span></SidebarMenuButton></SidebarMenuItem>
          <SidebarMenuItem><SidebarMenuButton tooltip="Logout" onClick={onLogout} className="transition-all duration-200 hover:scale-[1.02] text-red-500 hover:text-red-600"><LogOut className="size-4" /><span>Logout</span></SidebarMenuButton></SidebarMenuItem>
        </SidebarMenu></SidebarFooter>
        <SidebarRail />
      </Sidebar>

      <SidebarInset>
        <header className="flex h-14 items-center gap-3 border-b px-4 bg-background/95 backdrop-blur-lg sticky top-0 z-20">
          <SidebarTrigger className="-ml-1 transition-colors" />
          <Separator orientation="vertical" className="mr-1 h-4" />
          <div className="flex items-center gap-2">
            <div className={`flex size-6 items-center justify-center rounded-md ${navItems.find(n=>n.key===activePage)?.color||'bg-emerald-500/10 text-emerald-600'}`}>
              {(()=>{const NavIcon=navItems.find(n=>n.key===activePage)?.icon||LayoutDashboard;return <NavIcon className="size-3.5"/>})()}
            </div>
            <h1 key={activePage} className="text-sm font-semibold anim-fade-up">{navItems.find(n=>n.key===activePage)?.label||'Dashboard'}</h1>
          </div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-1.5 text-xs text-muted-foreground">
              <div className="flex size-6 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[10px] font-bold shadow-sm">A</div>
              <span>Admin</span>
            </div>
          </div>
        </header>
        <div className="flex-1 p-4 md:p-6 overflow-auto">
          <div key={activePage} className="anim-fade-up">{renderPage()}</div>
        </div>
      </SidebarInset>

      <ChangePasswordDialog open={changePasswordOpen} onOpenChange={setChangePasswordOpen} />
    </SidebarProvider>
  )
}

// ─── 1. Dashboard Page ───────────────────────────────────────────
function DashboardPage() {
  const { data, loading } = useFetch<DashboardData>(()=>api.adminDashboard().then(r=>r.data||r), [])

  const sparkData: Record<string,number[]> = {
    'Total Students':[12,19,15,25,22,30,35],'Courses':[2,3,3,4,4,5,5],
    'Subjects':[5,8,10,12,14,16,18],'Chapters':[20,30,35,45,50,55,60],
    'Reviews':[3,5,8,10,12,15,18],'Discussions':[1,3,5,4,7,9,11],
    'Quizzes':[1,2,2,3,4,4,5],'Quiz Attempts':[0,2,5,8,10,15,22],'Notes':[0,1,3,5,7,10,15],
  }
  const sparkColors: Record<string,string> = {
    'Total Students':'#10b981','Courses':'#f59e0b','Subjects':'#8b5cf6',
    'Chapters':'#14b8a6','Reviews':'#f43f5e','Discussions':'#06b6d4',
    'Quizzes':'#a855f7','Quiz Attempts':'#ec4899','Notes':'#f97316',
  }

  const stats = data ? [
    { label:'Total Students', value:data.totalStudents, icon:Users, gradient:'from-emerald-500 to-teal-500', iconBg:'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400' },
    { label:'Courses', value:data.totalCourses, icon:BookOpen, gradient:'from-amber-500 to-orange-500', iconBg:'bg-amber-500/15 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400' },
    { label:'Subjects', value:data.totalSubjects, icon:BookMarked, gradient:'from-violet-500 to-purple-500', iconBg:'bg-violet-500/15 text-violet-600 dark:bg-violet-500/20 dark:text-violet-400' },
    { label:'Chapters', value:data.totalChapters, icon:FileText, gradient:'from-teal-500 to-cyan-500', iconBg:'bg-teal-500/15 text-teal-600 dark:bg-teal-500/20 dark:text-teal-400' },
    { label:'Reviews', value:data.totalReviews, icon:Star, gradient:'from-rose-500 to-pink-500', iconBg:'bg-rose-500/15 text-rose-600 dark:bg-rose-500/20 dark:text-rose-400' },
    { label:'Discussions', value:data.totalDiscussions, icon:MessageCircle, gradient:'from-cyan-500 to-sky-500', iconBg:'bg-cyan-500/15 text-cyan-600 dark:bg-cyan-500/20 dark:text-cyan-400' },
    { label:'Quizzes', value:data.totalQuizzes||0, icon:Brain, gradient:'from-purple-500 to-violet-500', iconBg:'bg-purple-500/15 text-purple-600 dark:bg-purple-500/20 dark:text-purple-400' },
    { label:'Quiz Attempts', value:data.totalQuizAttempts||0, icon:Target, gradient:'from-pink-500 to-rose-500', iconBg:'bg-pink-500/15 text-pink-600 dark:bg-pink-500/20 dark:text-pink-400' },
    { label:'Notes', value:data.totalNotes||0, icon:BookMarked, gradient:'from-orange-500 to-red-500', iconBg:'bg-orange-500/15 text-orange-600 dark:bg-orange-500/20 dark:text-orange-400' },
  ] : []

  const weeklyData = useMemo(()=>{
    if (data?.weeklySignups?.length) return data.weeklySignups
    return ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'].map(day=>({day,signups:Math.floor(Math.random()*15)+2}))
  }, [data])

  const activityLog = useMemo(()=>{
    if (data?.activityLog?.length) {
      const iconMap: Record<string, React.ElementType> = {
        signup: Users, review: Star, discussion: MessageCircle, approval: ShieldCheck, course: BookOpen,
      }
      const colorMap: Record<string, string> = {
        signup: 'text-emerald-500 bg-emerald-500/10', review: 'text-amber-500 bg-amber-500/10', discussion: 'text-cyan-500 bg-cyan-500/10', approval: 'text-emerald-500 bg-emerald-500/10', course: 'text-sky-500 bg-sky-500/10',
      }
      return data.activityLog.map((item:any)=>({
        ...item,
        icon: iconMap[item.type] || Users,
        color: colorMap[item.type] || 'text-slate-500 bg-slate-500/10',
      }))
    }
    const actions = [
      {type:'signup',text:'New student registered',icon:Users,color:'text-emerald-500 bg-emerald-500/10'},
      {type:'review',text:'New review submitted',icon:Star,color:'text-amber-500 bg-amber-500/10'},
      {type:'discussion',text:'Discussion posted',icon:MessageCircle,color:'text-cyan-500 bg-cyan-500/10'},
      {type:'approval',text:'Student approved',icon:ShieldCheck,color:'text-emerald-500 bg-emerald-500/10'},
      {type:'course',text:'Course updated',icon:BookOpen,color:'text-sky-500 bg-sky-500/10'},
    ]
    return Array.from({length:10}).map((_,i)=>{
      const a=actions[i%actions.length], m=(i+1)*12
      return {...a, time:m<60?`${m}m ago`:`${Math.floor(m/60)}h ago`}
    })
  }, [data])

  // Mini bar chart for quick activity overview
  const miniBarData = useMemo(()=>{
    return weeklyData.map(d=>d.signups)
  },[weeklyData])

  return <div className="space-y-6">
    {/* Welcome + Quick Actions */}
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
      <div className="anim-slide-left">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back, Admin 👋</h2>
        <p className="text-sm text-muted-foreground mt-0.5">Here's what's happening with your platform today.</p>
      </div>
      <div className="flex items-center gap-2 anim-fade-up" style={{animationDelay:'100ms'}}>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs hover:border-emerald-500/50 hover:text-emerald-600 transition-colors" onClick={()=>{}}><BookOpen className="size-3.5" /> Create Course</Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs hover:border-purple-500/50 hover:text-purple-600 transition-colors" onClick={()=>{}}><Brain className="size-3.5" /> Add Quiz</Button>
        <Button variant="outline" size="sm" className="gap-1.5 text-xs hover:border-sky-500/50 hover:text-sky-600 transition-colors" onClick={()=>{}}><Users className="size-3.5" /> View Students</Button>
      </div>
    </div>

    {/* Gradient Stat Cards */}
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-3 gap-3">
      {loading ? Array.from({length:9}).map((_,i)=><ShimmerCard key={i} />)
       : stats.map((s,i)=>(
        <Card key={s.label} className="overflow-hidden relative card-lift anim-fade-up" style={{animationDelay:`${i*30}ms`}}>
          <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${s.gradient}`} />
          <CardContent className="p-4">
            <div className="flex items-start justify-between">
              <div>
                <div className={`flex size-9 items-center justify-center rounded-xl ${s.iconBg} mb-2`}><s.icon className="size-4" /></div>
                <p className="text-2xl font-bold tracking-tight anim-fade-up" style={{animationDelay:`${i*30+100}ms`}}>{s.value}</p>
                <p className="text-[11px] text-muted-foreground mt-0.5 font-medium uppercase tracking-wider">{s.label}</p>
              </div>
              <MiniSparkline data={sparkData[s.label]||[]} color={sparkColors[s.label]||'#888'} />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>

    {/* Chart & Activity */}
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <Card className="lg:col-span-2 card-lift">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Activity className="size-4 text-emerald-500" /> Student Signups - Last 7 Days</CardTitle></CardHeader>
        <CardContent>
          {loading ? <Skeleton className="h-[200px] w-full shimmer-bg rounded-lg" /> : <InlineLineChart data={weeklyData} />}
        </CardContent>
      </Card>
      <Card className="card-lift">
        <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Clock className="size-4 text-amber-500" /> Recent Activity</CardTitle></CardHeader>
        <CardContent className="p-0">
          <div className="max-h-[230px] overflow-y-auto admin-scroll px-4 pb-3">
            {loading ? <div className="space-y-3 pt-2">{Array.from({length:5}).map((_,i)=><Skeleton key={i} className="h-10 w-full shimmer-bg rounded-lg" style={{animationDelay:`${i*100}ms`}} />)}</div>
             : <div className="space-y-0.5">
                {activityLog.map((item:any,i:number)=>{
                  const Icon=item.icon
                  return <div key={i} className="flex items-center gap-3 py-2.5 px-2 rounded-lg border-b last:border-0 anim-slide-left hover:bg-muted/40 transition-colors cursor-default" style={{animationDelay:`${i*50}ms`}}>
                    <div className={`shrink-0 flex size-7 items-center justify-center rounded-lg ${item.color}`}><Icon className="size-3.5" /></div>
                    <span className="text-sm flex-1 truncate">{item.text}</span>
                    <span className="text-[10px] text-muted-foreground/70 shrink-0 font-medium tabular-nums">{item.time}</span>
                  </div>
                })}
              </div>
            }
          </div>
        </CardContent>
      </Card>
    </div>

    {/* Recent Signups Table */}
    <Card className="card-lift">
      <CardHeader><CardTitle className="text-base">Recent Signups (Last 24h)</CardTitle><CardDescription>Students who registered in the last 24 hours</CardDescription></CardHeader>
      <CardContent>
        {loading ? <TableSkeleton cols={4} rows={3} />
         : !data?.recentSignups?.length ? <EmptyState icon={Users} title="No recent signups" description="No students have signed up in the last 24 hours" />
         : <StyledTable><Table>
            <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead>Mobile</TableHead><TableHead>Date</TableHead></TableRow></TableHeader>
            <TableBody>{data.recentSignups.map((s:any,i:number)=>(
              <TableRow key={s.id} className={`transition-all duration-150 hover:bg-emerald-500/5 ${i%2===1?'bg-muted/8':''}`}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.email}</TableCell><TableCell>{s.mobile}</TableCell><TableCell>{new Date(s.createdAt).toLocaleDateString()}</TableCell></TableRow>
            ))}</TableBody>
          </Table></StyledTable>
        }
      </CardContent>
    </Card>
  </div>
}

// ─── 2. Students Page ────────────────────────────────────────────
function StudentsPage() {
  const [search,setSearch]=useState(''), [addOpen,setAddOpen]=useState(false)
  const [editStudent,setEditStudent]=useState<Student|null>(null), [deleteStudent,setDeleteStudent]=useState<Student|null>(null), [passwordStudent,setPasswordStudent]=useState<Student|null>(null)
  const [selectedIds,setSelectedIds]=useState<Set<string>>(new Set()), [bulkAction,setBulkAction]=useState('')
  const [viewStudentId,setViewStudentId]=useState<string|null>(null), [studentDetail,setStudentDetail]=useState<StudentDetail|null>(null), [detailLoading,setDetailLoading]=useState(false)

  const { data:students, loading, refresh } = useFetch<Student[]>(()=>api.adminStudents(search||undefined).then(r=>r.data||r.students||r), [search])

  useEffect(()=>{if(!viewStudentId){setStudentDetail(null);return};setDetailLoading(true);setStudentDetail(null);api.adminGetStudent(viewStudentId).then(r=>{setStudentDetail(r.student||r.data);setDetailLoading(false)}).catch(()=>{setDetailLoading(false);toast.error('Failed to load student details')})},[viewStudentId])
  const { data:courses } = useFetch<Course[]>(()=>api.adminCourses().then(r=>r.data||r.courses||r), [])
  const courseList=courses||[], studentList=students||[], pagination=usePagination(studentList,10)

  const toggleSelect=(id:string)=>setSelectedIds(p=>{const n=new Set(p);if(n.has(id))n.delete(id);else n.add(id);return n})
  const toggleSelectAll=()=>{if(selectedIds.size===pagination.paginated.length)setSelectedIds(new Set());else setSelectedIds(new Set(pagination.paginated.map(s=>s.id)))}

  const handleBulkAction=async()=>{
    if(!bulkAction||selectedIds.size===0)return
    try{const ids=Array.from(selectedIds);for(const id of ids){if(bulkAction==='approve')await api.adminUpdateStudent(id,{status:'APPROVED'});else if(bulkAction==='reject')await api.adminUpdateStudent(id,{status:'REJECTED'});else if(bulkAction==='delete')await api.adminDeleteStudent(id)}
      toast.success(`${selectedIds.size} student(s) ${bulkAction==='delete'?'deleted':bulkAction+'d'}`);setSelectedIds(new Set());setBulkAction('');refresh()
    }catch(e:any){toast.error(e.message)}
  }

  const handleExport=()=>{exportCSV('students',['Name','Email','Mobile','Course','Status','Created'],studentList.map(s=>[s.name,s.email,s.mobile,s.course?.title||'',s.status,new Date(s.createdAt).toLocaleDateString()]));toast.success('CSV exported')}

  const handleAdd=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api.adminCreateStudent({name:fd.get('name'),email:fd.get('email'),mobile:fd.get('mobile'),password:fd.get('password'),courseId:fd.get('courseId')});toast.success('Student created');setAddOpen(false);refresh()}catch(e:any){toast.error(e.message)}}
  const handleEdit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!editStudent)return;const fd=new FormData(e.currentTarget);try{await api.adminUpdateStudent(editStudent.id,{name:fd.get('name'),email:fd.get('email'),mobile:fd.get('mobile'),courseId:fd.get('courseId'),status:fd.get('status')});toast.success('Student updated');setEditStudent(null);refresh()}catch(e:any){toast.error(e.message)}}
  const handleDelete=async()=>{if(!deleteStudent)return;try{await api.adminDeleteStudent(deleteStudent.id);toast.success('Student deleted');setDeleteStudent(null);refresh()}catch(e:any){toast.error(e.message)}}
  const handleChangePassword=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!passwordStudent)return;const fd=new FormData(e.currentTarget);try{await api.adminChangePassword(passwordStudent.id,fd.get('password') as string);toast.success('Password changed');setPasswordStudent(null)}catch(e:any){toast.error(e.message)}}

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <SearchBar value={search} onChange={setSearch} placeholder="Search students..." className="w-full sm:w-72" />
        <Button variant="outline" className="gap-1.5 hover:bg-muted/80 transition-colors" onClick={handleExport}><Download className="size-4" /> Export CSV</Button>
      </div>
      <GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Student</GradientButton>
    </div>

    {selectedIds.size>0&&<div className="flex items-center gap-3 p-3 rounded-xl border bg-emerald-500/5 border-emerald-500/20 anim-slide-down">
      <span className="text-sm font-medium">{selectedIds.size} selected</span>
      <Select value={bulkAction} onValueChange={setBulkAction}><SelectTrigger className="w-36"><SelectValue placeholder="Bulk action" /></SelectTrigger><SelectContent><SelectItem value="approve">Approve</SelectItem><SelectItem value="reject">Reject</SelectItem><SelectItem value="delete">Delete</SelectItem></SelectContent></Select>
      <Button size="sm" onClick={handleBulkAction} disabled={!bulkAction}>Apply</Button>
      <Button size="sm" variant="ghost" onClick={()=>{setSelectedIds(new Set());setBulkAction('')}}>Clear</Button>
    </div>}

    <Card className="card-lift"><CardContent className="p-0">
      {loading ? <TableSkeleton cols={7} /> : !pagination.paginated.length ? <EmptyState icon={Users} title="No students found" description="Try adjusting your search or add a new student" action={<GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Student</GradientButton>} />
       : <StyledTable><Table>
        <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30">
          <TableHead className="w-10"><Checkbox checked={pagination.paginated.length>0&&selectedIds.size===pagination.paginated.length} onCheckedChange={toggleSelectAll} /></TableHead>
          <TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="hidden md:table-cell">Mobile</TableHead><TableHead>Course</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead>
        </TableRow></TableHeader>
        <TableBody>
          {pagination.paginated.map((s,i)=>(
          <TableRow key={s.id} className={`transition-all duration-150 hover:bg-emerald-500/5 ${i%2===1?'bg-muted/8':''}`}>
            <TableCell><Checkbox checked={selectedIds.has(s.id)} onCheckedChange={()=>toggleSelect(s.id)} /></TableCell>
            <TableCell className="font-medium"><button onClick={()=>setViewStudentId(s.id)} className="text-left hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors underline-offset-2 hover:underline cursor-pointer">{s.name}</button></TableCell><TableCell className="text-sm">{s.email}</TableCell>
            <TableCell className="hidden md:table-cell">{s.mobile}</TableCell><TableCell>{s.course?.title||'—'}</TableCell>
            <TableCell><Badge variant={s.status==='APPROVED'?'default':s.status==='REJECTED'?'destructive':'secondary'} className={s.status==='APPROVED'?'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20':''}>{s.status}</Badge></TableCell>
            <TableCell className="text-right"><div className="flex items-center justify-end gap-0.5">
              <ActionButton icon={Pencil} tooltip="Edit" onClick={()=>setEditStudent(s)} />
              <ActionButton icon={Lock} tooltip="Change Password" onClick={()=>setPasswordStudent(s)} />
              <ActionButton icon={Trash2} tooltip="Delete" onClick={()=>setDeleteStudent(s)} className="text-destructive hover:text-destructive/80" />
            </div></TableCell>
          </TableRow>))
        }</TableBody>
      </Table><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}
    </CardContent></Card>

    {/* Add Student */}
    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent className="sm:max-w-md">
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-emerald-500/15 text-emerald-600"><Users className="size-4" /></div> Add Student</DialogTitle><DialogDescription>Create a new student account</DialogDescription></DialogHeader>
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="space-y-3">
          <IconField icon={User} label="Name" name="name" required />
          <IconField icon={Mail} label="Email" name="email" type="email" required />
          <IconField icon={Phone} label="Mobile" name="mobile" required />
        </div>
        <Separator />
        <div className="space-y-3">
          <IconField icon={Lock} label="Password" name="password" type="password" required />
          <div className="space-y-1.5"><Label>Course</Label><Select name="courseId"><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        </div>
        <DialogFooter><GradientButton type="submit">Create Student</GradientButton></DialogFooter>
      </form>
    </DialogContent></Dialog>

    {/* Edit Student */}
    <Dialog open={!!editStudent} onOpenChange={o=>!o&&setEditStudent(null)}><DialogContent className="sm:max-w-md">
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600"><Pencil className="size-4" /></div> Edit Student</DialogTitle></DialogHeader>
      {editStudent&&<form onSubmit={handleEdit} className="space-y-4">
        <div className="space-y-3">
          <IconField icon={User} label="Name" name="name" defaultValue={editStudent.name} required />
          <IconField icon={Mail} label="Email" name="email" type="email" defaultValue={editStudent.email} required />
          <IconField icon={Phone} label="Mobile" name="mobile" defaultValue={editStudent.mobile} required />
        </div>
        <Separator />
        <div className="space-y-3">
          <div className="space-y-1.5"><Label>Course</Label><Select name="courseId" defaultValue={editStudent.courseId||undefined}><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
          <div className="space-y-1.5"><Label>Status</Label><Select name="status" defaultValue={editStudent.status}><SelectTrigger className="w-full input-focus-ring"><SelectValue /></SelectTrigger><SelectContent><SelectItem value="PENDING">PENDING</SelectItem><SelectItem value="APPROVED">APPROVED</SelectItem><SelectItem value="REJECTED">REJECTED</SelectItem></SelectContent></Select></div>
        </div>
        <DialogFooter><GradientButton type="submit">Save Changes</GradientButton></DialogFooter>
      </form>}
    </DialogContent></Dialog>

    {/* Change Student Password */}
    <Dialog open={!!passwordStudent} onOpenChange={o=>!o&&setPasswordStudent(null)}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600"><Lock className="size-4" /></div> Change Password</DialogTitle><DialogDescription>For {passwordStudent?.name}</DialogDescription></DialogHeader>
      <form onSubmit={handleChangePassword} className="space-y-4">
        <IconField icon={Lock} label="New Password" name="password" type="password" required minLength={6} />
        <DialogFooter><GradientButton type="submit">Update Password</GradientButton></DialogFooter>
      </form>
    </DialogContent></Dialog>

    {/* Delete */}
    <AlertDialog open={!!deleteStudent} onOpenChange={o=>!o&&setDeleteStudent(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Student</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete {deleteStudent?.name}? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>

    {/* Student Profile Detail */}
    <Dialog open={!!viewStudentId} onOpenChange={o=>{if(!o){setViewStudentId(null)}}}><DialogContent className="sm:max-w-3xl max-h-[85vh] overflow-y-auto">
      {detailLoading ? <div className="flex items-center justify-center py-16"><Loader2 className="size-8 animate-spin text-emerald-500" /></div>
      : !studentDetail ? <div className="flex items-center justify-center py-16 text-muted-foreground">Failed to load student details</div>
      : <div className="space-y-6">
        {/* Header */}
        <div className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-5">
          <div className="flex items-center gap-4">
            <div className="flex size-14 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white font-bold text-lg shadow-md shrink-0">
              {(studentDetail.name||'?').charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <DialogTitle className="text-xl font-bold truncate">{studentDetail.name}</DialogTitle>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1 text-sm text-muted-foreground">
                <span className="flex items-center gap-1"><Mail className="size-3.5" />{studentDetail.email}</span>
                <span className="flex items-center gap-1"><Phone className="size-3.5" />{studentDetail.mobile}</span>
                <span className="flex items-center gap-1"><GraduationCap className="size-3.5" />{studentDetail.course?.title||'—'}</span>
              </div>
            </div>
            <div className="flex flex-col items-end gap-1.5 shrink-0">
              <Badge variant={studentDetail.status==='APPROVED'?'default':'destructive'} className={studentDetail.status==='APPROVED'?'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20':''}>{studentDetail.status}</Badge>
              <span className="text-[10px] text-muted-foreground">Joined {new Date(studentDetail.createdAt).toLocaleDateString()}</span>
            </div>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <StatCard icon={Clock} label="Study Hours" value={Math.floor(studentDetail._stats.totalStudyMin/60)} sub={`${studentDetail._stats.totalStudyMin}m total`} />
          <StatCard icon={Brain} label="Quiz Avg" value={`${studentDetail._stats.avgScore}%`} sub={`${studentDetail._stats.passedQuizzes}/${studentDetail._stats.totalQuizAttempts} passed`} />
          <StatCard icon={BookCheck} label="Chapters" value={studentDetail._stats.totalChaptersCompleted} sub="completed" />
          <StatCard icon={Flame} label="Streak" value={`${studentDetail.currentStreak}d`} sub={studentDetail.lastStudyAt?`Last: ${new Date(studentDetail.lastStudyAt).toLocaleDateString()}`:'Inactive'} />
          <StatCard icon={Award} label="Score" value={studentDetail.score} sub="points" />
          <StatCard icon={ShieldCheck} label={studentDetail.verified?'Verified':'Unverified'} value={studentDetail.verified?'Yes':'No'} sub="account" />
        </div>

        {/* Quick Stats */}
        <div className="flex flex-wrap gap-4 text-xs text-muted-foreground p-3 rounded-lg bg-muted/30">
          <span className="flex items-center gap-1.5"><BarChart3 className="size-3.5" />{studentDetail._stats.totalStudySessions} sessions</span>
          <span className="flex items-center gap-1.5"><MessageCircle className="size-3.5" />{studentDetail._stats.totalDiscussions} discussions</span>
          <span className="flex items-center gap-1.5"><Star className="size-3.5" />{studentDetail._stats.totalReviews} reviews</span>
          <span className="flex items-center gap-1.5"><FileText className="size-3.5" />{studentDetail._stats.totalNotes} notes</span>
          <span className="flex items-center gap-1.5"><Users className="size-3.5" />{studentDetail.groupMemberships?.length||0} groups</span>
        </div>

        {/* Recent Quiz Attempts */}
        {studentDetail.quizAttempts?.length>0&&<div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Brain className="size-4 text-emerald-500" /> Recent Quiz Attempts</h4>
          <div className="space-y-1.5">
            {studentDetail.quizAttempts.slice(0,5).map(qa=><div key={qa.id} className="flex items-center justify-between p-2.5 rounded-lg bg-muted/20 text-sm">
              <div className="flex items-center gap-2 min-w-0">
                <div className={`flex size-6 items-center justify-center rounded-full ${qa.passed?'bg-emerald-500/15 text-emerald-600':'bg-red-500/15 text-red-500'}`}>{qa.passed?<Check className="size-3.5"/>:<X className="size-3.5"/>}</div>
                <span className="truncate font-medium">{qa.quiz.title}</span>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                <Badge variant="outline" className="text-[10px] px-1.5 h-5">{qa.quiz.difficulty}</Badge>
                <span className="text-xs tabular-nums">{Math.round(qa.score/Math.max(1,qa.totalQuestions)*100)}%</span>
                <span className="text-[10px] text-muted-foreground">{new Date(qa.createdAt).toLocaleDateString()}</span>
              </div>
            </div>)}
          </div>
        </div>}

        {/* Achievements */}
        {studentDetail.achievements?.length>0&&<div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><Award className="size-4 text-amber-500" /> Achievements ({studentDetail.achievements.length})</h4>
          <div className="flex flex-wrap gap-2">
            {studentDetail.achievements.map(a=>(
              <div key={a.id} className="flex items-center gap-2 p-2 rounded-lg bg-amber-500/5 border border-amber-500/10 text-xs">
                <span className="text-lg">{a.achievement.icon||'🏆'}</span>
                <div><p className="font-medium text-amber-700 dark:text-amber-400">{a.achievement.name}</p><p className="text-[10px] text-muted-foreground">{new Date(a.unlockedAt).toLocaleDateString()}</p></div>
              </div>
            ))}
          </div>
        </div>}

        {/* Recent Discussions */}
        {studentDetail.discussions?.length>0&&<div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><MessageCircle className="size-4 text-sky-500" /> Recent Discussions</h4>
          <div className="space-y-1">
            {studentDetail.discussions.slice(0,5).map(d=><div key={d.id} className="p-2.5 rounded-lg bg-muted/20 text-sm flex items-center justify-between">
              <span className="truncate font-medium">{d.title}</span>
              <span className="text-[10px] text-muted-foreground shrink-0 ml-2">{new Date(d.createdAt).toLocaleDateString()}</span>
            </div>)}
          </div>
        </div>}

        {/* Study Sessions / Chapter Completions */}
        {studentDetail.chapterCompletions?.length>0&&<div>
          <h4 className="text-sm font-semibold mb-2 flex items-center gap-2"><BookCheck className="size-4 text-violet-500" /> Completed Chapters</h4>
          <div className="flex flex-wrap gap-1.5">
            {studentDetail.chapterCompletions.slice(0,10).map(cc=>(
              <Badge key={cc.id} variant="secondary" className="bg-violet-500/10 text-violet-700 dark:text-violet-300 border-violet-500/15 text-[10px]">{cc.chapter.name}</Badge>
            ))}
            {studentDetail.chapterCompletions.length>10&&<span className="text-[10px] text-muted-foreground self-center">+{studentDetail.chapterCompletions.length-10} more</span>}
          </div>
        </div>}
      </div>}
    </DialogContent></Dialog>
  </div>
}

// ─── 3. Courses Page ─────────────────────────────────────────────
function CoursesPage() {
  const [search,setSearch]=useState(''), [addOpen,setAddOpen]=useState(false)
  const [editCourse,setEditCourse]=useState<Course|null>(null), [deleteCourse,setDeleteCourse]=useState<Course|null>(null)
  const { data:courses, loading, refresh } = useFetch<Course[]>(()=>api.adminCourses(search||undefined).then(r=>r.data||r.courses||r), [search])
  const courseList=courses||[], pagination=usePagination(courseList,10)

  const handleAdd=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api.adminCreateCourse({title:fd.get('title'),slug:fd.get('slug')});toast.success('Course created');setAddOpen(false);refresh()}catch(e:any){toast.error(e.message)}}
  const handleEdit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!editCourse)return;const fd=new FormData(e.currentTarget);try{await api.adminUpdateCourse(editCourse.id,{title:fd.get('title'),slug:fd.get('slug')});toast.success('Course updated');setEditCourse(null);refresh()}catch(e:any){toast.error(e.message)}}
  const handleDelete=async()=>{if(!deleteCourse)return;try{await api.adminDeleteCourse(deleteCourse.id);toast.success('Course deleted');setDeleteCourse(null);refresh()}catch(e:any){toast.error(e.message)}}

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <SearchBar value={search} onChange={setSearch} placeholder="Search courses..." className="w-full sm:w-72" />
      <GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Course</GradientButton>
    </div>
    <Card className="card-lift"><CardContent className="p-0">{loading?<TableSkeleton cols={5}/>:!pagination.paginated.length?<EmptyState icon={BookOpen} title="No courses found" description="Create your first course to get started" action={<GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Course</GradientButton>}/>:
      <StyledTable><Table>
      <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Title</TableHead><TableHead>Slug</TableHead><TableHead className="hidden sm:table-cell">Students</TableHead><TableHead className="hidden sm:table-cell">Subjects</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {pagination.paginated.map((c,i)=>(
        <TableRow key={c.id} className={`transition-all duration-150 hover:bg-amber-500/5 ${i%2===1?'bg-muted/8':''}`}><TableCell className="font-medium">{c.title}</TableCell><TableCell className="text-sm text-muted-foreground">{c.slug}</TableCell><TableCell className="hidden sm:table-cell">{c._count?.students??0}</TableCell><TableCell className="hidden sm:table-cell">{c._count?.subjects??0}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-0.5"><ActionButton icon={Pencil} tooltip="Edit" onClick={()=>setEditCourse(c)} /><ActionButton icon={Trash2} tooltip="Delete" onClick={()=>setDeleteCourse(c)} className="text-destructive hover:text-destructive/80" /></div></TableCell></TableRow>
      ))}</TableBody>
    </Table><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}</CardContent></Card>

    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600"><BookOpen className="size-4" /></div> Add Course</DialogTitle></DialogHeader>
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="space-y-1.5"><Label>Title</Label><Input name="title" required className="input-focus-ring" /></div>
        <div className="space-y-1.5"><Label>Slug</Label><div className="relative"><Hash className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input name="slug" required placeholder="e.g. computer-science" className="pl-8 input-focus-ring" /></div></div>
        <DialogFooter><GradientButton type="submit">Create Course</GradientButton></DialogFooter>
      </form>
    </DialogContent></Dialog>

    <Dialog open={!!editCourse} onOpenChange={o=>!o&&setEditCourse(null)}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600"><Pencil className="size-4" /></div> Edit Course</DialogTitle></DialogHeader>
      {editCourse&&<form onSubmit={handleEdit} className="space-y-4">
        <div className="space-y-1.5"><Label>Title</Label><Input name="title" defaultValue={editCourse.title} required className="input-focus-ring" /></div>
        <div className="space-y-1.5"><Label>Slug</Label><div className="relative"><Hash className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input name="slug" defaultValue={editCourse.slug} required className="pl-8 input-focus-ring" /></div></div>
        <DialogFooter><GradientButton type="submit">Save Changes</GradientButton></DialogFooter>
      </form>}
    </DialogContent></Dialog>

    <AlertDialog open={!!deleteCourse} onOpenChange={o=>!o&&setDeleteCourse(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Course</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete &quot;{deleteCourse?.title}&quot;?</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>
}

// ─── 4. Subjects Page ────────────────────────────────────────────
function SubjectsPage() {
  const [search,setSearch]=useState(''), [courseFilter,setCourseFilter]=useState(''), [addOpen,setAddOpen]=useState(false)
  const [editSubject,setEditSubject]=useState<Subject|null>(null), [deleteSubject,setDeleteSubject]=useState<Subject|null>(null)
  const { data:subjects, loading, refresh } = useFetch<Subject[]>(()=>api.adminSubjects(search||undefined,courseFilter||undefined).then(r=>r.data||r.subjects||r), [search,courseFilter])
  const { data:courses } = useFetch<Course[]>(()=>api.adminCourses().then(r=>r.data||r.courses||r), [])
  const courseList=courses||[], subjectList=subjects||[], pagination=usePagination(subjectList,10)

  const handleAdd=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api.adminCreateSubject({name:fd.get('name'),courseId:fd.get('courseId'),order:Number(fd.get('order'))});toast.success('Subject created');setAddOpen(false);refresh()}catch(e:any){toast.error(e.message)}}
  const handleEdit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!editSubject)return;const fd=new FormData(e.currentTarget);try{await api.adminUpdateSubject(editSubject.id,{name:fd.get('name'),courseId:fd.get('courseId'),order:Number(fd.get('order'))});toast.success('Subject updated');setEditSubject(null);refresh()}catch(e:any){toast.error(e.message)}}
  const handleDelete=async()=>{if(!deleteSubject)return;try{await api.adminDeleteSubject(deleteSubject.id);toast.success('Subject deleted');setDeleteSubject(null);refresh()}catch(e:any){toast.error(e.message)}}

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <SearchBar value={search} onChange={setSearch} placeholder="Search subjects..." className="w-full sm:w-72" />
        <Select value={courseFilter||'__all__'} onValueChange={v=>setCourseFilter(v==='__all__'?'':v)}><SelectTrigger className="w-full sm:w-48 input-focus-ring"><SelectValue placeholder="All Courses" /></SelectTrigger><SelectContent><SelectItem value="__all__">All Courses</SelectItem>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
      </div>
      <GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Subject</GradientButton>
    </div>
    <Card className="card-lift"><CardContent className="p-0">{loading?<TableSkeleton cols={5}/>:!pagination.paginated.length?<EmptyState icon={BookMarked} title="No subjects found" description="Create your first subject to organize content" action={<GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Subject</GradientButton>}/>:<StyledTable><Table>
      <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Name</TableHead><TableHead>Course</TableHead><TableHead>Order</TableHead><TableHead className="hidden sm:table-cell">Chapters</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {pagination.paginated.map((s,i)=>(
        <TableRow key={s.id} className={`transition-all duration-150 hover:bg-violet-500/5 ${i%2===1?'bg-muted/8':''}`}><TableCell className="font-medium">{s.name}</TableCell><TableCell>{s.course?.title||'—'}</TableCell><TableCell>{s.order}</TableCell><TableCell className="hidden sm:table-cell">{s._count?.chapters??0}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-0.5"><ActionButton icon={Pencil} tooltip="Edit" onClick={()=>setEditSubject(s)} /><ActionButton icon={Trash2} tooltip="Delete" onClick={()=>setDeleteSubject(s)} className="text-destructive hover:text-destructive/80" /></div></TableCell></TableRow>
      ))}</TableBody>
    </Table><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}</CardContent></Card>

    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-violet-500/15 text-violet-600"><BookMarked className="size-4" /></div> Add Subject</DialogTitle></DialogHeader>
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="space-y-1.5"><Label>Course</Label><Select name="courseId" required><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Subject Name</Label><Input name="name" required className="input-focus-ring" /></div>
        <div className="space-y-1.5"><Label>Order</Label><div className="relative"><Hash className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input name="order" type="number" min={1} required className="pl-8 input-focus-ring" /></div></div>
        <DialogFooter><GradientButton type="submit">Create Subject</GradientButton></DialogFooter>
      </form>
    </DialogContent></Dialog>

    <Dialog open={!!editSubject} onOpenChange={o=>!o&&setEditSubject(null)}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600"><Pencil className="size-4" /></div> Edit Subject</DialogTitle></DialogHeader>
      {editSubject&&<form onSubmit={handleEdit} className="space-y-4">
        <div className="space-y-1.5"><Label>Course</Label><Select name="courseId" defaultValue={editSubject.courseId}><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Subject Name</Label><Input name="name" defaultValue={editSubject.name} required className="input-focus-ring" /></div>
        <div className="space-y-1.5"><Label>Order</Label><div className="relative"><Hash className="absolute left-2.5 top-2.5 size-4 text-muted-foreground" /><Input name="order" type="number" min={1} defaultValue={editSubject.order} required className="pl-8 input-focus-ring" /></div></div>
        <DialogFooter><GradientButton type="submit">Save Changes</GradientButton></DialogFooter>
      </form>}
    </DialogContent></Dialog>

    <AlertDialog open={!!deleteSubject} onOpenChange={o=>!o&&setDeleteSubject(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Subject</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete &quot;{deleteSubject?.name}&quot;?</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>
}

// ─── 5. Chapters Page ────────────────────────────────────────────
function ChaptersPage() {
  const [search,setSearch]=useState(''), [courseFilter,setCourseFilter]=useState(''), [subjectFilter,setSubjectFilter]=useState('')
  const [addOpen,setAddOpen]=useState(false), [addCourseId,setAddCourseId]=useState('')
  const [editChapter,setEditChapter]=useState<Chapter|null>(null), [deleteChapter,setDeleteChapter]=useState<Chapter|null>(null)

  const { data:chapters, loading, refresh } = useFetch<Chapter[]>(()=>api.adminChapters(search||undefined,subjectFilter||undefined,courseFilter||undefined).then(r=>r.data||r.chapters||r), [search,courseFilter,subjectFilter])
  const { data:courses } = useFetch<Course[]>(()=>api.adminCourses().then(r=>r.data||r.courses||r), [])
  const { data:subjects } = useFetch<Subject[]>(()=>api.adminSubjects().then(r=>r.data||r.subjects||r), [])
  const courseList=courses||[], subjectList=subjects||[], chapterList=chapters||[], pagination=usePagination(chapterList,10)

  const filteredSubjects=useMemo(()=>courseFilter&&courseFilter!=='__all__'?subjectList.filter(s=>s.courseId===courseFilter):subjectList,[courseFilter,subjectList])
  const addSubjects=useMemo(()=>addCourseId?subjectList.filter(s=>s.courseId===addCourseId):[] as Subject[],[addCourseId,subjectList])

  const handleCourseFilterChange=(v:string)=>{setCourseFilter(v==='__all__'?'':v);setSubjectFilter('')}
  const handleAdd=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api.adminCreateChapter({name:fd.get('name'),subjectId:fd.get('subjectId')});toast.success('Chapter created');setAddOpen(false);setAddCourseId('');refresh()}catch(e:any){toast.error(e.message)}}
  const handleEdit=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();if(!editChapter)return;const fd=new FormData(e.currentTarget);try{await api.adminUpdateChapter(editChapter.id,{name:fd.get('name'),subjectId:fd.get('subjectId')});toast.success('Chapter updated');setEditChapter(null);refresh()}catch(e:any){toast.error(e.message)}}
  const handleDelete=async()=>{if(!deleteChapter)return;try{await api.adminDeleteChapter(deleteChapter.id);toast.success('Chapter deleted');setDeleteChapter(null);refresh()}catch(e:any){toast.error(e.message)}}

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <SearchBar value={search} onChange={setSearch} placeholder="Search chapters..." className="w-full sm:w-64" />
        <Select value={courseFilter||'__all__'} onValueChange={handleCourseFilterChange}><SelectTrigger className="w-full sm:w-44 input-focus-ring"><SelectValue placeholder="All Courses" /></SelectTrigger><SelectContent><SelectItem value="__all__">All Courses</SelectItem>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select>
        <Select value={subjectFilter||'__all__'} onValueChange={v=>setSubjectFilter(v==='__all__'?'':v)}><SelectTrigger className="w-full sm:w-44 input-focus-ring"><SelectValue placeholder="All Subjects" /></SelectTrigger><SelectContent><SelectItem value="__all__">All Subjects</SelectItem>{filteredSubjects.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select>
      </div>
      <GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Chapter</GradientButton>
    </div>
    <Card className="card-lift"><CardContent className="p-0">{loading?<TableSkeleton cols={4}/>:!pagination.paginated.length?<EmptyState icon={FileText} title="No chapters found" description="Create your first chapter to add content" action={<GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Chapter</GradientButton>}/>:<StyledTable><Table>
      <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Name</TableHead><TableHead>Subject</TableHead><TableHead className="hidden sm:table-cell">Course</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {pagination.paginated.map((ch,i)=>(
        <TableRow key={ch.id} className={`transition-all duration-150 hover:bg-teal-500/5 ${i%2===1?'bg-muted/8':''}`}><TableCell className="font-medium">{ch.name}</TableCell><TableCell>{ch.subject?.name||'—'}</TableCell><TableCell className="hidden sm:table-cell">{ch.subject?.course?.title||'—'}</TableCell><TableCell className="text-right"><div className="flex items-center justify-end gap-0.5"><ActionButton icon={Pencil} tooltip="Edit" onClick={()=>setEditChapter(ch)} /><ActionButton icon={Trash2} tooltip="Delete" onClick={()=>setDeleteChapter(ch)} className="text-destructive hover:text-destructive/80" /></div></TableCell></TableRow>
      ))}</TableBody>
    </Table><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}</CardContent></Card>

    {/* Add Chapter - cascading dropdown */}
    <Dialog open={addOpen} onOpenChange={v=>{setAddOpen(v);if(!v)setAddCourseId('')}}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-teal-500/15 text-teal-600"><FileText className="size-4" /></div> Add Chapter</DialogTitle></DialogHeader>
      <form onSubmit={handleAdd} className="space-y-4">
        <div className="space-y-1.5"><Label>Course</Label><Select value={addCourseId} onValueChange={setAddCourseId}><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select course first" /></SelectTrigger><SelectContent>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Subject</Label><Select name="subjectId" required disabled={!addCourseId}><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder={addCourseId?'Select subject':'Select course first'} /></SelectTrigger><SelectContent>{addSubjects.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Chapter Name</Label><Input name="name" required className="input-focus-ring" /></div>
        <DialogFooter><GradientButton type="submit" disabled={!addCourseId}>Create Chapter</GradientButton></DialogFooter>
      </form>
    </DialogContent></Dialog>

    <Dialog open={!!editChapter} onOpenChange={o=>!o&&setEditChapter(null)}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-sky-500/15 text-sky-600"><Pencil className="size-4" /></div> Edit Chapter</DialogTitle></DialogHeader>
      {editChapter&&<form onSubmit={handleEdit} className="space-y-4">
        <div className="space-y-1.5"><Label>Subject</Label><Select name="subjectId" defaultValue={editChapter.subjectId}><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select subject" /></SelectTrigger><SelectContent>{subjectList.map(s=><SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Chapter Name</Label><Input name="name" defaultValue={editChapter.name} required className="input-focus-ring" /></div>
        <DialogFooter><GradientButton type="submit">Save Changes</GradientButton></DialogFooter>
      </form>}
    </DialogContent></Dialog>

    <AlertDialog open={!!deleteChapter} onOpenChange={o=>!o&&setDeleteChapter(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Chapter</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete &quot;{deleteChapter?.name}&quot;?</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>
}

// ─── 6. Top Performers Page ──────────────────────────────────────
const PERIODS = [
  { key: 'all', label: 'All Time' },
  { key: 'today', label: 'Today' },
  { key: 'yesterday', label: 'Yesterday' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
]

function TopPerformersPage() {
  const [search,setSearch]=useState('')
  const [period,setPeriod]=useState('all')
  const [dateRange,setDateRange]=useState<{from:string;to:string}|null>(null)
  const { data:performers, loading } = useFetch<TopPerformer[]>(()=>api.adminTopPerformers({search:search||undefined,period:dateRange?'custom':period||undefined,from:dateRange?.from,to:dateRange?.to}).then(r=>r.data||r.performers||r), [search,period,dateRange])
  const performerList=performers||[], pagination=usePagination(performerList,10)
  const maxHours=useMemo(()=>Math.max(...performerList.map(p=>p.studyMinutes),1),[performerList])

  const handleExport=()=>{exportCSV('top-performers',['Rank','Name','Mobile','Email','Course','Study Minutes','Subjects Studied'],performerList.map((p,i)=>[String(i+1),p.name,p.mobile,p.email,p.course||'',String(p.studyMinutes),String(p.subjectsStudied)]));toast.success('CSV exported')}
  const medalEmoji=(i:number)=>i===0?'🥇':i===1?'🥈':i===2?'🥉':null
  const periodLabel=PERIODS.find(p=>p.key===period)?.label||'All Time'

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchBar value={search} onChange={setSearch} placeholder="Search performers..." className="w-full sm:w-56" />
        <div className="flex rounded-lg border bg-muted/30 p-0.5 gap-0.5">
          {PERIODS.map(p=>(
            <button key={p.key} onClick={()=>{setPeriod(p.key);setDateRange(null)}} className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all ${period===p.key&&!dateRange?'bg-background text-foreground shadow-sm':'text-muted-foreground hover:text-foreground'}`}>{p.label}</button>
          ))}
        </div>
      </div>
      <Button variant="outline" className="gap-1.5 hover:bg-muted/80 transition-colors shrink-0" onClick={handleExport}><Download className="size-4" /> Export CSV</Button>
    </div>

    {!loading&&performerList.length>0&&<Card className="card-lift">
      <CardHeader className="pb-2"><CardTitle className="text-base flex items-center gap-2"><Trophy className="size-4 text-amber-500" /> {periodLabel} Study Hours</CardTitle></CardHeader>
      <CardContent><InlineBarChart data={performerList.slice(0,10)} /></CardContent>
    </Card>}

    <Card className="card-lift"><CardContent className="p-0">{loading?<TableSkeleton cols={6}/>:!pagination.paginated.length?<EmptyState icon={Trophy} title="No performers found" description="Student study data will appear here as they use the platform" />:<StyledTable><Table>
      <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Rank</TableHead><TableHead>Name</TableHead><TableHead className="hidden md:table-cell">Mobile</TableHead><TableHead className="hidden lg:table-cell">Email</TableHead><TableHead>Course</TableHead><TableHead>{periodLabel} Study</TableHead></TableRow></TableHeader>
      <TableBody>
        {pagination.paginated.map((p,i)=>{
          const gi=(pagination.page-1)*10+i, medal=medalEmoji(gi)
          const hrs = Math.floor(p.studyMinutes/60), mins = p.studyMinutes%60
          return <TableRow key={p.id} className={`transition-all duration-150 hover:bg-orange-500/5 ${i%2===1?'bg-muted/8':''}`}>
            <TableCell><div className="flex items-center gap-1.5">{medal?<span className="text-lg">{medal}</span>:<div className="flex size-7 items-center justify-center rounded-full bg-gradient-to-br from-muted to-muted/60 text-muted-foreground text-xs font-bold shadow-sm">{gi+1}</div>}</div></TableCell>
            <TableCell className="font-medium">{p.name}</TableCell><TableCell className="hidden md:table-cell">{p.mobile}</TableCell><TableCell className="hidden lg:table-cell text-sm">{p.email}</TableCell><TableCell>{p.course||'—'}</TableCell>
            <TableCell><div className="flex items-center gap-2"><Badge variant="secondary" className="bg-amber-500/10 text-amber-600 dark:bg-amber-500/20 dark:text-amber-400 border-amber-500/20">{hrs}h {mins}m</Badge><div className="hidden sm:block w-20"><Progress value={(p.studyMinutes/maxHours)*100} className="h-1.5 [&>div]:bg-gradient-to-r [&>div]:from-amber-500 [&>div]:to-orange-500" /></div></div></TableCell>
          </TableRow>
        })
      }</TableBody>
    </Table><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}</CardContent></Card>
  </div>
}

// ─── 7. Reviews Page ─────────────────────────────────────────────
function ReviewsPage() {
  const [search,setSearch]=useState(''), [addOpen,setAddOpen]=useState(false), [deleteReview,setDeleteReview]=useState<Review|null>(null)
  const { data:reviews, loading, refresh } = useFetch<Review[]>(()=>api.adminReviews(search||undefined).then(r=>r.data||r.reviews||r), [search])
  const { data:courses } = useFetch<Course[]>(()=>api.adminCourses().then(r=>r.data||r.courses||r), [])
  const courseList=courses||[], reviewList=reviews||[], pagination=usePagination(reviewList,10)

  const handleExport=()=>{exportCSV('reviews',['Author','Text','Rating','Course','Source','Status'],reviewList.map(r=>[r.authorName,r.text,String(r.rating),r.course?.title||'',r.source,r.status]));toast.success('CSV exported')}
  const handleAdd=async(e:React.FormEvent<HTMLFormElement>)=>{e.preventDefault();const fd=new FormData(e.currentTarget);try{await api.adminCreateReview({authorName:fd.get('authorName'),text:fd.get('text'),rating:Number(fd.get('rating')),courseId:fd.get('courseId')||null});toast.success('Review created');setAddOpen(false);refresh()}catch(e:any){toast.error(e.message)}}
  const handleStatusChange=async(id:string,status:string)=>{try{await api.adminUpdateReview(id,{status});toast.success(`Review ${status.toLowerCase()}`);refresh()}catch(e:any){toast.error(e.message)}}
  const handleDelete=async()=>{if(!deleteReview)return;try{await api.adminDeleteReview(deleteReview.id);toast.success('Review deleted');setDeleteReview(null);refresh()}catch(e:any){toast.error(e.message)}}
  const sourceBadge=(s:string)=>s==='admin'?'bg-slate-100 text-slate-700 border-slate-200':'bg-amber-100 text-amber-700 border-amber-200'

  return <div className="space-y-4">
    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
      <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
        <SearchBar value={search} onChange={setSearch} placeholder="Search reviews..." className="w-full sm:w-72" />
        <Button variant="outline" className="gap-1.5 hover:bg-muted/80 transition-colors" onClick={handleExport}><Download className="size-4" /> Export CSV</Button>
      </div>
      <GradientButton onClick={()=>setAddOpen(true)}><Plus className="size-4" /> Add Review</GradientButton>
    </div>
    <Card className="card-lift"><CardContent className="p-0">{loading?<TableSkeleton cols={7}/>:!pagination.paginated.length?<EmptyState icon={Star} title="No reviews found" description="Reviews from students will appear here" />:<StyledTable><div className="overflow-x-auto"><Table>
      <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Author</TableHead><TableHead className="max-w-[200px]">Text</TableHead><TableHead>Rating</TableHead><TableHead className="hidden md:table-cell">Course</TableHead><TableHead>Source</TableHead><TableHead>Status</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
      <TableBody>
        {pagination.paginated.map((r,i)=>(
        <TableRow key={r.id} className={`transition-all duration-150 hover:bg-rose-500/5 ${i%2===1?'bg-muted/8':''}`}>
          <TableCell className="font-medium">{r.authorName}</TableCell><TableCell className="max-w-[320px]"><p className="whitespace-pre-line break-words text-xs leading-relaxed line-clamp-3">{r.text}</p></TableCell><TableCell><StarRating rating={r.rating} /></TableCell>
          <TableCell className="hidden md:table-cell">{r.course?.title||'—'}</TableCell>
          <TableCell><Badge variant="outline" className={sourceBadge(r.source)}>{r.source}</Badge></TableCell>
          <TableCell><Badge variant={r.status==='approved'?'default':r.status==='rejected'?'destructive':'secondary'} className={r.status==='approved'?'bg-emerald-500/15 text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400 border-emerald-500/20':''}>{r.status}</Badge></TableCell>
          <TableCell className="text-right"><div className="flex items-center justify-end gap-0.5">
            {r.status==='pending'&&r.studentId&&<><Button variant="ghost" size="sm" onClick={()=>handleStatusChange(r.id,'approved')} className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-500/10"><Check className="size-3.5" /> Approve</Button><Button variant="ghost" size="sm" onClick={()=>handleStatusChange(r.id,'rejected')} className="text-destructive hover:text-red-700 hover:bg-destructive/10"><X className="size-3.5" /> Reject</Button></>}
            <ActionButton icon={Trash2} tooltip="Delete" onClick={()=>setDeleteReview(r)} className="text-destructive hover:text-destructive/80" />
          </div></TableCell>
        </TableRow>
      ))}</TableBody>
    </Table></div><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}</CardContent></Card>

    <Dialog open={addOpen} onOpenChange={setAddOpen}><DialogContent>
      <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-rose-500/15 text-rose-600"><Star className="size-4" /></div> Add Review</DialogTitle></DialogHeader>
      <form onSubmit={handleAdd} className="space-y-4">
        <IconField icon={User} label="Author Name" name="authorName" required />
        <div className="space-y-1.5"><Label>Review Text</Label><Textarea name="text" required className="input-focus-ring min-h-[80px]" /></div>
        <div className="space-y-1.5"><Label>Rating</Label><Select name="rating" required><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select rating" /></SelectTrigger><SelectContent>{[1,2,3,4,5].map(r=><SelectItem key={r} value={String(r)}>{r} Star{r>1?'s':''}</SelectItem>)}</SelectContent></Select></div>
        <div className="space-y-1.5"><Label>Course (Optional)</Label><Select name="courseId"><SelectTrigger className="w-full input-focus-ring"><SelectValue placeholder="Select course" /></SelectTrigger><SelectContent>{courseList.map(c=><SelectItem key={c.id} value={c.id}>{c.title}</SelectItem>)}</SelectContent></Select></div>
        <DialogFooter><GradientButton type="submit">Create Review</GradientButton></DialogFooter>
      </form>
    </DialogContent></Dialog>

    <AlertDialog open={!!deleteReview} onOpenChange={o=>!o&&setDeleteReview(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Review</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this review?</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>
}

// ─── 8. Approvals Page ───────────────────────────────────────────
function ApprovalsPage() {
  const [search,setSearch]=useState('')
  const { data:approvals, loading, refresh:refreshApprovals } = useFetch<Approval[]>(()=>api.adminApprovals().then(r=>r.data||r.approvals||r.pendingStudents||r.students||[]), [])

  const handleApprove=async(id:string)=>{try{await api.adminApproveStudent(id);toast.success('Student approved');refreshApprovals()}catch(e:any){toast.error(e.message)}}
  const handleReject=async(id:string)=>{try{await api.adminRejectStudent(id);toast.success('Student rejected');refreshApprovals()}catch(e:any){toast.error(e.message)}}

  const approvalList=Array.isArray(approvals)?approvals:[]
  const filtered=search?approvalList.filter(a=>a.name?.toLowerCase().includes(search.toLowerCase())||a.email?.toLowerCase().includes(search.toLowerCase())||a.mobile?.includes(search)):approvalList
  const pagination=usePagination(filtered,10)

  return <div className="space-y-4">
      <SearchBar value={search} onChange={setSearch} placeholder="Search pending students..." className="w-full sm:w-72" />
      <Card className="card-lift"><CardContent className="p-0">{loading?<TableSkeleton cols={5}/>:!pagination.paginated.length?<EmptyState icon={ShieldCheck} title="No pending approvals" description="All students have been reviewed" />:<StyledTable><Table>
        <TableHeader><TableRow className="bg-gradient-to-r from-muted/60 to-muted/30"><TableHead>Name</TableHead><TableHead>Email</TableHead><TableHead className="hidden md:table-cell">Mobile</TableHead><TableHead>Course</TableHead><TableHead className="text-right">Actions</TableHead></TableRow></TableHeader>
        <TableBody>
          {pagination.paginated.map((a,i)=>(
          <TableRow key={a.id} className={`transition-all duration-150 hover:bg-emerald-500/5 ${i%2===1?'bg-muted/8':''}`}>
            <TableCell className="font-medium"><div className="flex items-center gap-2"><div className="flex size-6 items-center justify-center rounded-full bg-amber-500/10"><XCircle className="size-3.5 text-amber-500" /></div>{a.name}</div></TableCell>
            <TableCell className="text-sm">{a.email}</TableCell><TableCell className="hidden md:table-cell">{a.mobile}</TableCell><TableCell>{a.course?.title||'—'}</TableCell>
            <TableCell className="text-right"><div className="flex items-center justify-end gap-1.5">
              <Button size="sm" className="bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-700 hover:to-teal-700 text-white shadow-sm gap-1" onClick={()=>handleApprove(a.id)}><CheckCircle2 className="size-3.5" /> Accept</Button>
              <Button size="sm" variant="destructive" className="gap-1 shadow-sm" onClick={()=>handleReject(a.id)}><XCircle className="size-3.5" /> Reject</Button>
            </div></TableCell>
          </TableRow>
        ))}</TableBody>
      </Table><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></StyledTable>}</CardContent></Card>
  </div>
}

// ─── 9. Discussions Page ─────────────────────────────────────────
function DiscussionsPage() {
  const [search,setSearch]=useState(''), [replyId,setReplyId]=useState<string|null>(null), [replyText,setReplyText]=useState(''), [deleteId,setDeleteId]=useState<string|null>(null)
  const [editReplyId,setEditReplyId]=useState<string|null>(null), [editReplyText,setEditReplyText]=useState(''), [deleteReplyId,setDeleteReplyId]=useState<string|null>(null)
  const { data:discussions, loading, refresh } = useFetch<Discussion[]>(()=>api.adminDiscussions(search||undefined).then(r=>r.data||r.discussions||r), [search])
  const discussionList=discussions||[], pagination=usePagination(discussionList,10)

  const handleReply=async(id:string)=>{if(!replyText.trim())return;try{await api.adminReplyDiscussion(id,replyText);toast.success('Reply sent');setReplyId(null);setReplyText('');refresh()}catch(e:any){toast.error(e.message)}}
  const handleDelete=async()=>{if(!deleteId)return;try{await api.adminDeleteDiscussion(deleteId);toast.success('Discussion deleted');setDeleteId(null);refresh()}catch(e:any){toast.error(e.message)}}
  const handleEditReply=async()=>{if(!editReplyId||!editReplyText.trim())return;try{await api.adminEditReply(editReplyId,editReplyText);toast.success('Reply updated');setEditReplyId(null);setEditReplyText('');refresh()}catch(e:any){toast.error(e.message)}}
  const handleDeleteReply=async()=>{if(!deleteReplyId)return;try{await api.adminDeleteReply(deleteReplyId);toast.success('Reply deleted');setDeleteReplyId(null);refresh()}catch(e:any){toast.error(e.message)}}

  return <div className="space-y-4">
    <SearchBar value={search} onChange={setSearch} placeholder="Search discussions..." className="w-full sm:w-72" />
    {loading?<div className="space-y-4">{Array.from({length:3}).map((_,i)=><Card key={i}><CardContent className="p-4"><Skeleton className="h-24 w-full shimmer-bg rounded-lg" style={{animationDelay:`${i*100}ms`}} /></CardContent></Card>)}</div>
     :!pagination.paginated.length?<EmptyState icon={MessageCircle} title="No discussions found" description="Student discussions will appear here" />
     :<><div className="space-y-4">{pagination.paginated.map((d,i)=>(
        <Card key={d.id} className="overflow-hidden card-lift anim-fade-up" style={{animationDelay:`${i*40}ms`}}>
          <CardContent className="p-5 space-y-3">
            <div className="flex items-start justify-between">
              <div className="flex items-start gap-3">
                <div className="flex size-9 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-sky-500/20 text-cyan-600 font-semibold text-xs shrink-0 mt-0.5">{((d.student?.name || 'U')).charAt(0).toUpperCase()}</div>
                <div>
                  <h3 className="font-semibold text-sm">{d.title}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-xs text-muted-foreground">{d.student?.name||'Unknown'}</span>
                    <span className="text-[10px] text-muted-foreground/50">&middot;</span>
                    <span className="text-[10px] text-muted-foreground/50 tabular-nums">{new Date(d.createdAt).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
              <ActionButton icon={Trash2} tooltip="Delete" onClick={()=>setDeleteId(d.id)} className="text-destructive hover:text-destructive/80" />
            </div>
            <p className="text-sm text-muted-foreground whitespace-pre-wrap pl-12">{d.content}</p>

            {/* Student Replies */}
            {d.replies && d.replies.length > 0 && (
              <div className="ml-9 space-y-2">
                <Separator />
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                  Replies ({d.replies.length})
                </p>
                {d.replies.map(r => (
                  <div key={r.id} className="rounded-xl bg-muted/30 border border-border/40 p-3.5 text-sm">
                    <div className="flex items-center justify-between gap-2 mb-1.5">
                      <div className="flex items-center gap-2">
                        <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-slate-400 to-slate-500 text-white text-[8px] font-bold">
                          {(r.student?.name || 'R').charAt(0).toUpperCase()}
                        </div>
                        <span className="text-xs font-medium text-foreground/80">{r.student?.name || 'Student'}</span>
                        <span className="text-[10px] text-muted-foreground/50">{new Date(r.createdAt).toLocaleDateString()}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {editReplyId===r.id?<>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-emerald-600" onClick={handleEditReply} disabled={!editReplyText.trim()}><Check className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2" onClick={()=>{setEditReplyId(null);setEditReplyText('')}}><X className="size-3.5" /></Button>
                        </>:<>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-amber-600" onClick={()=>{setEditReplyId(r.id);setEditReplyText(r.content)}}><Pencil className="size-3.5" /></Button>
                          <Button size="sm" variant="ghost" className="h-7 px-2 text-muted-foreground hover:text-destructive" onClick={()=>setDeleteReplyId(r.id)}><Trash2 className="size-3.5" /></Button>
                        </>}
                      </div>
                    </div>
                    {editReplyId===r.id?(
                      <Textarea value={editReplyText} onChange={e=>setEditReplyText(e.target.value)} rows={2} className="input-focus-ring text-sm min-h-[60px] mt-1" autoFocus />
                    ):(
                      <p className="whitespace-pre-wrap text-muted-foreground">{r.content}</p>
                    )}
                  </div>
                ))}
              </div>
            )}

            {d.adminReply&&<div className="ml-9 bg-gradient-to-r from-emerald-500/8 to-teal-500/5 dark:from-emerald-500/12 dark:to-teal-500/8 border border-emerald-500/15 rounded-xl p-3.5 text-sm">
              <div className="flex items-center gap-2 mb-1.5">
                <div className="flex size-5 items-center justify-center rounded-full bg-gradient-to-br from-emerald-500 to-teal-600 text-white text-[8px] font-bold">A</div>
                <p className="text-xs font-semibold text-emerald-600 dark:text-emerald-400">Admin Reply</p>
              </div>
              <p className="whitespace-pre-wrap text-muted-foreground">{d.adminReply}</p>
            </div>}
            {replyId===d.id?<div className="ml-9 space-y-2">
              <Textarea placeholder="Type your reply..." value={replyText} onChange={e=>setReplyText(e.target.value)} rows={3} className="input-focus-ring min-h-[80px]" />
              <div className="flex gap-2"><GradientButton onClick={()=>handleReply(d.id)} disabled={!replyText.trim()}><Send className="size-3.5" /> Send Reply</GradientButton><Button size="sm" variant="outline" onClick={()=>{setReplyId(null);setReplyText('')}}>Cancel</Button></div>
            </div>:!d.adminReply?<Button size="sm" variant="outline" className="ml-9 hover:border-emerald-500/50 hover:text-emerald-600 transition-colors" onClick={()=>{setReplyId(d.id);setReplyText('')}}><MessageCircle className="size-3.5" /> Reply</Button>:null}
          </CardContent>
        </Card>
      ))}</div>
      <Card><PaginationControls page={pagination.page} totalPages={pagination.totalPages} goTo={pagination.goTo} /></Card>
    </>}

    <AlertDialog open={!!deleteId} onOpenChange={o=>!o&&setDeleteId(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Discussion</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this discussion? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDelete} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>

    <AlertDialog open={!!deleteReplyId} onOpenChange={o=>!o&&setDeleteReplyId(null)}><AlertDialogContent>
      <AlertDialogHeader><AlertDialogTitle>Delete Reply</AlertDialogTitle><AlertDialogDescription>Are you sure you want to delete this reply? This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
      <AlertDialogFooter><AlertDialogCancel>Cancel</AlertDialogCancel><AlertDialogAction onClick={handleDeleteReply} className="bg-destructive text-white hover:bg-destructive/90">Delete</AlertDialogAction></AlertDialogFooter>
    </AlertDialogContent></AlertDialog>
  </div>
}

// ─── 10. Change Password Dialog ──────────────────────────────────
function ChangePasswordDialog({ open, onOpenChange }: { open:boolean; onOpenChange:(open:boolean)=>void }) {
  const [currentPassword,setCurrentPassword]=useState(''), [newPassword,setNewPassword]=useState(''), [confirmPassword,setConfirmPassword]=useState(''), [submitting,setSubmitting]=useState(false)

  const handleSubmit=async(e:React.FormEvent)=>{
    e.preventDefault()
    if(newPassword!==confirmPassword){toast.error('New passwords do not match');return}
    if(newPassword.length<6){toast.error('Password must be at least 6 characters');return}
    setSubmitting(true)
    try{await api.adminChangeOwnPassword(currentPassword,newPassword);toast.success('Password changed successfully');onOpenChange(false);setCurrentPassword('');setNewPassword('');setConfirmPassword('')}
    catch(e:any){toast.error(e.message||'Failed to change password')}finally{setSubmitting(false)}
  }

  return <Dialog open={open} onOpenChange={onOpenChange}><DialogContent>
    <DialogHeader className="dialog-gradient-header -mx-6 -mt-6 px-6 pt-6 pb-4"><DialogTitle className="flex items-center gap-2"><div className="flex size-8 items-center justify-center rounded-lg bg-amber-500/15 text-amber-600"><Lock className="size-4" /></div> Change Password</DialogTitle><DialogDescription>Update your admin account password</DialogDescription></DialogHeader>
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="space-y-3">
        <IconField icon={Lock} label="Current Password" type="password" value={currentPassword} onChange={e=>setCurrentPassword(e.target.value)} required />
      </div>
      <Separator />
      <div className="space-y-3">
        <IconField icon={Lock} label="New Password" type="password" value={newPassword} onChange={e=>setNewPassword(e.target.value)} required minLength={6} />
        <IconField icon={Lock} label="Confirm New Password" type="password" value={confirmPassword} onChange={e=>setConfirmPassword(e.target.value)} required minLength={6} />
      </div>
      <DialogFooter><GradientButton type="submit" disabled={submitting}>{submitting&&<Loader2 className="size-4 animate-spin" />} Change Password</GradientButton></DialogFooter>
    </form>
  </DialogContent></Dialog>
}
