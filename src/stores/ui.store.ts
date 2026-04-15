import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  notificationCount: number
  feedbackCount: number
  toggleSidebar: () => void
  setNotificationCount: (n: number) => void
  setFeedbackCount: (n: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  notificationCount: 0,
  feedbackCount: 0,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setNotificationCount: (n) => set({ notificationCount: n }),
  setFeedbackCount: (n) => set({ feedbackCount: n }),
}))
