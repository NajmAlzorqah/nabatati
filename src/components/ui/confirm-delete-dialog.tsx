"use client"

import { AnimatePresence, motion, useReducedMotion } from "motion/react"
import { Trash2 } from "lucide-react"

export function ConfirmDeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmLabel = "حذف نهائيًا",
  cancelLabel = "إلغاء",
  loading = false,
  icon,
  onConfirm,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  title: string
  description: string
  confirmLabel?: string
  cancelLabel?: string
  loading?: boolean
  icon?: React.ReactNode
  onConfirm: () => void
}) {
  const reduce = useReducedMotion()

  const close = () => {
    if (!loading) onOpenChange(false)
  }

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className="fixed inset-0 z-[60] flex min-h-[100dvh] items-center justify-center overflow-y-auto px-4 py-6"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          role="dialog"
          aria-modal="true"
          aria-label={title}
        >
          <button
            aria-label={cancelLabel}
            onClick={close}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={reduce ? false : { scale: 0.96, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={reduce ? undefined : { scale: 0.96, opacity: 0 }}
            transition={
              reduce
                ? undefined
                : { type: "spring", stiffness: 320, damping: 28 }
            }
            className="relative w-full max-w-sm rounded-2xl border border-border bg-popover p-6 text-popover-foreground shadow-elevated sm:p-7"
          >
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-destructive/10 text-destructive">
                {icon ?? <Trash2 className="h-6 w-6" />}
              </div>
              <div>
                <h2 className="font-heading text-xl font-semibold">{title}</h2>
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {description}
                </p>
              </div>
            </div>

            <p className="mt-6 rounded-2xl bg-destructive/5 px-4 py-2.5 text-xs text-destructive">
              لا يمكن التراجع عن هذا الإجراء.
            </p>

            <div className="mt-6 flex gap-3">
              <button
                onClick={close}
                disabled={loading}
                autoFocus
                className="flex-1 rounded-full border border-border px-5 py-3 text-sm font-medium transition-colors hover:bg-muted disabled:opacity-50"
              >
                {cancelLabel}
              </button>
              <button
                onClick={onConfirm}
                disabled={loading}
                className="flex flex-1 items-center justify-center gap-2 rounded-full bg-destructive px-5 py-3 text-sm font-semibold text-white transition-transform hover:brightness-110 active:scale-[0.98] disabled:opacity-60"
              >
                {loading ? "جارٍ الحذف…" : confirmLabel}
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
