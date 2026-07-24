'use client'

import { useEffect, useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Download, Smartphone, Chrome, Monitor, ShieldCheck } from 'lucide-react'

function getBrowserInfo() {
  if (typeof window === 'undefined') return { isIOS: false, isChrome: false, isEdge: false, isSafari: false, isInstalled: false }
  const ua = navigator.userAgent
  const isIOS = /iPad|iPhone|iPod/.test(ua)
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|Edg/.test(ua)
  const isChrome = /Chrome|CriOS/.test(ua) && !/Edg/.test(ua)
  const isEdge = /Edg/.test(ua)
  const isInstalled = window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true
  return { isIOS, isChrome, isEdge, isSafari, isInstalled }
}

interface PwaInstallDialogProps {
  open: boolean
  onClose: () => void
  deferredPrompt?: any | null
  onInstall?: () => void
}

export function PwaInstallDialog({ open, onClose, deferredPrompt, onInstall }: PwaInstallDialogProps) {
  const [browser, setBrowser] = useState(getBrowserInfo())

  useEffect(() => { setBrowser(getBrowserInfo()) }, [open])

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt()
      const result = await deferredPrompt.userChoice
      if (result.outcome === 'accepted') onClose()
    } else {
      onInstall?.()
    }
  }

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg">
            <Download className="w-5 h-5 text-emerald-600" />
            Install Mission CS App
          </DialogTitle>
          <DialogDescription>
            Get the best experience with our desktop & mobile app
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {/* Try install button */}
          {deferredPrompt && (
            <Button onClick={handleInstall} className="w-full bg-emerald-600 hover:bg-emerald-700 text-white h-11 text-sm gap-2">
              <Smartphone className="w-4 h-4" /> Install Now
            </Button>
          )}

          {/* Browser-specific instructions */}
          <div className="space-y-3">
            <p className="text-xs font-medium text-slate-500 dark:text-slate-400 uppercase tracking-wider">Manual Install Guide</p>

            {browser.isChrome && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-sky-50 dark:bg-sky-950/20 border border-sky-200 dark:border-sky-800/50">
                <Chrome className="w-5 h-5 text-sky-600 shrink-0 mt-0.5" />
                <div className="text-xs text-sky-800 dark:text-sky-200 space-y-1">
                  <p className="font-medium">Google Chrome</p>
                  <p>Click the <strong>Install</strong> icon <span className="inline-block px-1.5 py-0.5 rounded bg-sky-200/60 dark:bg-sky-800/60 text-[10px] font-mono">⊕</span> in the address bar, or select <strong>Add to Home Screen</strong> from the Chrome menu <span className="inline-block px-1.5 py-0.5 rounded bg-sky-200/60 dark:bg-sky-800/60 text-[10px] font-mono">⋮</span></p>
                </div>
              </div>
            )}

            {browser.isEdge && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-blue-50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-800/50">
                <Monitor className="w-5 h-5 text-blue-600 shrink-0 mt-0.5" />
                <div className="text-xs text-blue-800 dark:text-blue-200 space-y-1">
                  <p className="font-medium">Microsoft Edge</p>
                  <p>Click the <strong>Install</strong> button <span className="inline-block px-1.5 py-0.5 rounded bg-blue-200/60 dark:bg-blue-800/60 text-[10px] font-mono">⊕</span> in the address bar, or go to <strong>Settings → Apps → Install this site as an app</strong></p>
                </div>
              </div>
            )}

            {browser.isSafari && browser.isIOS && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50">
                <Smartphone className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
                  <p className="font-medium">Safari (iOS)</p>
                  <p>Tap the <strong>Share</strong> button <span className="inline-block px-1.5 py-0.5 rounded bg-orange-200/60 dark:bg-orange-800/60 text-[10px] font-mono">📤</span> at the bottom of the screen, then scroll down and select <strong>Add to Home Screen</strong></p>
                </div>
              </div>
            )}

            {browser.isSafari && !browser.isIOS && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-orange-50 dark:bg-orange-950/20 border border-orange-200 dark:border-orange-800/50">
                <Monitor className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                <div className="text-xs text-orange-800 dark:text-orange-200 space-y-1">
                  <p className="font-medium">Safari (macOS)</p>
                  <p>Safari does not support app installation on desktop. Please use <strong>Chrome</strong> or <strong>Edge</strong> for the best experience.</p>
                </div>
              </div>
            )}

            {!browser.isChrome && !browser.isEdge && !browser.isSafari && (
              <div className="flex items-start gap-3 p-3 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700">
                <ShieldCheck className="w-5 h-5 text-slate-600 shrink-0 mt-0.5" />
                <div className="text-xs text-slate-600 dark:text-slate-400 space-y-1">
                  <p className="font-medium">Browser Not Supported</p>
                  <p>For the best experience, open this site in <strong>Google Chrome</strong> or <strong>Microsoft Edge</strong> and install from the address bar.</p>
                </div>
              </div>
            )}
          </div>

          {/* Already installed notice */}
          {browser.isInstalled && (
            <div className="text-center text-xs text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/30 rounded-xl p-3 border border-emerald-200 dark:border-emerald-800/50">
              <ShieldCheck className="w-4 h-4 inline mr-1 -mt-0.5" /> App is already installed
            </div>
          )}
        </div>

        <div className="flex justify-end">
          <Button variant="outline" onClick={onClose} className="text-xs">Close</Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
