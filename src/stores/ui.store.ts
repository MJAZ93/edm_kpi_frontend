import { create } from 'zustand'

interface UIStore {
  sidebarOpen: boolean
  notificationCount: number
  toggleSidebar: () => void
  setNotificationCount: (n: number) => void
}

export const useUIStore = create<UIStore>((set) => ({
  sidebarOpen: true,
  notificationCount: 0,
  toggleSidebar: () => set(s => ({ sidebarOpen: !s.sidebarOpen })),
  setNotificationCount: (n) => set({ notificationCount: n }),
}))
