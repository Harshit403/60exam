import { NextRequest, NextResponse } from 'next/server'
import { db } from '@/lib/db'
import { getAuthFromHeaders } from '@/lib/auth'

// GET /api/admin/settings
export async function GET(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const settings = await db.setting.findMany()
  const settingsMap: Record<string, string> = {}
  settings.forEach(s => { settingsMap[s.key] = s.value })
  return NextResponse.json({ settings: settingsMap })
}

// PUT /api/admin/settings — single key/value or bulk { settings: { key: value, ... } }
export async function PUT(req: NextRequest) {
  const auth = getAuthFromHeaders(req.headers)
  if (!auth || auth.role !== 'admin') return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  
  const body = await req.json()
  
  // Bulk update
  if (body.settings && typeof body.settings === 'object') {
    const entries = Object.entries(body.settings) as [string, string][]
    const results = await Promise.all(
      entries.map(([key, value]) =>
        db.setting.upsert({ where: { key }, update: { value }, create: { key, value } })
      )
    )
    return NextResponse.json({ settings: results })
  }
  
  // Single update
  const { key, value } = body
  const setting = await db.setting.upsert({
    where: { key },
    update: { value },
    create: { key, value }
  })
  return NextResponse.json({ setting })
}
