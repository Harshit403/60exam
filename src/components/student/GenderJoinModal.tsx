'use client'

import { useEffect, useState } from 'react'

interface GenderJoinModalProps {
  open: boolean
  title: string
  subtitle?: string
  confirmLabel: string
  onClose: () => void
  onConfirm: (gender: 'male' | 'female') => void
}

export function GenderJoinModal({ open, title, subtitle, confirmLabel, onClose, onConfirm }: GenderJoinModalProps) {
  const [gender, setGender] = useState<'male' | 'female' | null>(null)

  useEffect(() => {
    if (open) setGender(null)
  }, [open])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const selected = (g: 'male' | 'female') => gender === g

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 backdrop-blur-sm" onClick={onClose}>
      <div
        className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl p-6 w-80 mx-4 border border-slate-200 dark:border-slate-700"
        onClick={e => e.stopPropagation()}
      >
        <h3 className="text-sm font-bold text-slate-900 dark:text-slate-100 text-center mb-1">{title}</h3>
        <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center mb-4">
          {subtitle || 'Select your identity and a random anonymous name will be assigned.'}
        </p>
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={() => setGender('male')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all active:scale-95 border-2 ${
              selected('male')
                ? 'bg-indigo-100 dark:bg-indigo-900/40 border-indigo-500 ring-2 ring-indigo-300/60 dark:ring-indigo-500/40'
                : 'bg-indigo-50 dark:bg-indigo-900/20 border-transparent hover:bg-indigo-100 dark:hover:bg-indigo-900/40'
            }`}
          >
            <span className="text-2xl">👨</span>
            <span className="text-xs font-semibold text-indigo-700 dark:text-indigo-400">Male</span>
          </button>
          <button
            onClick={() => setGender('female')}
            className={`flex flex-col items-center gap-2 p-4 rounded-xl transition-all active:scale-95 border-2 ${
              selected('female')
                ? 'bg-pink-100 dark:bg-pink-900/40 border-pink-500 ring-2 ring-pink-300/60 dark:ring-pink-500/40'
                : 'bg-pink-50 dark:bg-pink-900/20 border-transparent hover:bg-pink-100 dark:hover:bg-pink-900/40'
            }`}
          >
            <span className="text-2xl">👩</span>
            <span className="text-xs font-semibold text-pink-700 dark:text-pink-400">Female</span>
          </button>
        </div>
        <button
          onClick={() => gender && onConfirm(gender)}
          disabled={!gender}
          className="w-full mt-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-700 hover:to-pink-700 disabled:opacity-40 disabled:cursor-not-allowed transition-all active:scale-95 shadow-md shadow-indigo-500/20"
        >
          {confirmLabel}
        </button>
        <button onClick={onClose} className="w-full mt-2 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors py-1">
          Cancel
        </button>
      </div>
    </div>
  )
}
