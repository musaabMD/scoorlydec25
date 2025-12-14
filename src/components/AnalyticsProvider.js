'use client'

import { useEffect } from 'react'
import { inject } from '@vercel/analytics'

export default function AnalyticsProvider() {
  useEffect(() => {
    inject()
  }, [])

  return null
}
