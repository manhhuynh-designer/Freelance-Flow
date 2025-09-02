"use client"

export type AppNotification = {
  id: string
  title: string
  body?: string
  time?: string
}

const KEY = 'ff:notifications'
import { browserLocal } from './browser'

export function getNotifications(): AppNotification[] {
  try {
    const raw = browserLocal.getItem(KEY);
    if (!raw) return []
    return JSON.parse(raw) as AppNotification[]
  } catch (e) {
    return []
  }
}

export function emitNotification(n: Omit<AppNotification, 'id' | 'time'>) {
  try {
    const existing = getNotifications()
    const item: AppNotification = {
      id: `${Date.now()}`,
      time: new Date().toISOString(),
      ...n,
    }
    const next = [item, ...existing].slice(0, 50)
    browserLocal.setItem(KEY, JSON.stringify(next))
    // dispatch a storage event-like custom event so UI can listen if needed (guarded)
    try { if (typeof window !== 'undefined') window.dispatchEvent(new CustomEvent('ff:notification', { detail: item })) } catch {}
  } catch (e) {
    // ignore
  }
}
