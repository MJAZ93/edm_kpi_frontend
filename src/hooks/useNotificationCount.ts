import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { notificationsService } from '../services/notifications.service'
import { useUIStore } from '../stores/ui.store'
import { useAuthStore } from '../stores/auth.store'

export function useNotificationCount() {
  const setCount = useUIStore(s => s.setNotificationCount)
  const token = useAuthStore(s => s.token)

  const { data } = useQuery({
    queryKey: ['notifications', 'unread-count'],
    queryFn: () => notificationsService.list({ is_read: false, limit: 1 }),
    enabled: !!token,
    refetchInterval: 60_000,
  })

  useEffect(() => {
    if (data?.total !== undefined) setCount(data.total)
  }, [data, setCount])
}
