import { useEffect } from 'react'
import { useQuery } from '@tanstack/react-query'
import { feedbackService } from '../services/feedback.service'
import { useUIStore } from '../stores/ui.store'
import { useAuthStore } from '../stores/auth.store'

export function useFeedbackCount() {
  const setCount = useUIStore(s => s.setFeedbackCount)
  const token = useAuthStore(s => s.token)

  const { data } = useQuery({
    queryKey: ['feedback', 'unread-count'],
    queryFn: () => feedbackService.unreadCount(),
    enabled: !!token,
    refetchInterval: 30_000,
  })

  useEffect(() => {
    if (data?.count !== undefined) {
      setCount(data.count)
    }
  }, [data, setCount])
}
