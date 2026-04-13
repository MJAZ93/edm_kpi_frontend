import { useEffect, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import toast from 'react-hot-toast'
import { notificationsService } from '../services/notifications.service'
import { useUIStore } from '../stores/ui.store'
import { useAuthStore } from '../stores/auth.store'

export function useNotificationCount() {
  const setCount = useUIStore(s => s.setNotificationCount)
  const token = useAuthStore(s => s.token)
  const prevCount = useRef<number | null>(null)

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.list({ is_read: false, limit: 5 }),
    enabled: !!token,
    refetchInterval: 30_000, // 30s for faster notification detection
  })

  useEffect(() => {
    if (data?.total === undefined) return

    const newCount = data.total
    setCount(newCount)

    // Show toast when new notifications arrive (not on first load)
    if (prevCount.current !== null && newCount > prevCount.current) {
      const diff = newCount - prevCount.current
      // Show the latest notification title if available
      const latest = data.data?.[0]
      if (latest) {
        toast(latest.title, {
          icon: '🔔',
          duration: 5000,
          position: 'top-right',
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-primary)',
            fontWeight: 600,
            fontSize: 13,
            maxWidth: 360,
          },
        })
      } else {
        toast(`${diff} nova${diff > 1 ? 's' : ''} notificação${diff > 1 ? 'ões' : ''}`, {
          icon: '🔔',
          duration: 4000,
          position: 'top-right',
          style: {
            background: 'var(--color-surface)',
            color: 'var(--color-text)',
            border: '1px solid var(--color-primary)',
            fontWeight: 600,
            fontSize: 13,
          },
        })
      }
    }

    prevCount.current = newCount
  }, [data, setCount])
}
