'use client'

import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'

interface GenderJoinModalProps {
  open: boolean
  title: string
  subtitle?: string
  confirmLabel: string
  savedIdentity?: { gender: 'male' | 'female'; name: string } | null
  onClose: () => void
  onConfirm: (gender: 'male' | 'female') => void
}

export function GenderJoinModal({ open, title, subtitle, confirmLabel, savedIdentity, onClose, onConfirm }: GenderJoinModalProps) {
  const [gender, setGender] = useState<'male' | 'female' | null>(null)

  useEffect(() => {
    if (open) setGender(savedIdentity?.gender ?? null)
  }, [open, savedIdentity])

  const card = (g: 'male' | 'female') =>
    `flex flex-col items-center gap-2 rounded-lg border px-4 py-5 transition-colors cursor-pointer ${
      gender === g
        ? g === 'male'
          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950/40'
          : 'border-pink-500 bg-pink-50 dark:bg-pink-950/40'
        : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:hover:border-slate-600'
    }`

  const label = (g: 'male' | 'female') =>
    `text-xs font-semibold ${
      gender === g
        ? g === 'male'
          ? 'text-indigo-600 dark:text-indigo-400'
          : 'text-pink-600 dark:text-pink-400'
        : 'text-slate-600 dark:text-slate-300'
    }`

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose() }}>
      <DialogContent className="max-w-sm sm:max-w-sm">
        <DialogHeader>
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {savedIdentity
              ? `Your saved identity “${savedIdentity.name}” will be reused for this room.`
              : (subtitle || 'Select your identity and a random anonymous name will be assigned.')}
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-2 gap-3">
          <button type="button" onClick={() => setGender('male')} className={card('male')}>
            <span className="text-3xl leading-none">👨</span>
            <span className={label('male')}>Male</span>
            {gender === 'male' && savedIdentity?.gender === 'male' && (
              <span className="text-[9px] text-slate-400 truncate max-w-full">as {savedIdentity.name}</span>
            )}
          </button>
          <button type="button" onClick={() => setGender('female')} className={card('female')}>
            <span className="text-3xl leading-none">👩</span>
            <span className={label('female')}>Female</span>
            {gender === 'female' && savedIdentity?.gender === 'female' && (
              <span className="text-[9px] text-slate-400 truncate max-w-full">as {savedIdentity.name}</span>
            )}
          </button>
        </div>
        <DialogFooter className="sm:justify-between">
          <Button type="button" variant="outline" onClick={onClose} className="flex-1">
            Cancel
          </Button>
          <Button type="button" disabled={!gender} onClick={() => gender && onConfirm(gender)} className="flex-1">
            {confirmLabel}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
