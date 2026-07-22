import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'

const JWT_SECRET = process.env.JWT_SECRET || 'mission-cs-test-series-secret-key-2024'

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

export function generateToken(payload: { id: string; role: 'admin' | 'student'; email: string }): string {
  return jwt.sign(payload, JWT_SECRET, { expiresIn: '7d' })
}

export function verifyToken(token: string): { id: string; role: 'admin' | 'student'; email: string } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { id: string; role: 'admin' | 'student'; email: string }
  } catch {
    return null
  }
}

export function getAuthFromHeaders(headers: Headers): { id: string; role: 'admin' | 'student'; email: string } | null {
  const auth = headers.get('authorization')
  if (!auth || !auth.startsWith('Bearer ')) return null
  return verifyToken(auth.replace('Bearer ', ''))
}

export function verifyAuth(request: Request): { id: string; role: 'admin' | 'student'; email: string } | null {
  return getAuthFromHeaders(request.headers)
}
