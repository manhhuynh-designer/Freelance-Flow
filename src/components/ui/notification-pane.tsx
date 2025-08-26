"use client"

import React from "react"
import { Bell, X, Check } from "lucide-react"
import { cn } from "@/lib/utils"

type Notification = {
  id: string
  title: string
  body?: string
  time?: string
  read?: boolean
}

import { getNotifications } from '@/lib/notifications'

const STORAGE_KEY = "ff:notifications"

function saveNotifications(items: Notification[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items))
  } catch (e) {
    // ignore
  }
}

export default function NotificationPane() {
  // Notifications UI removed from header/floating overlay per request.
  // The module remains exported so other parts can import helpers if needed.
  return null;
}
