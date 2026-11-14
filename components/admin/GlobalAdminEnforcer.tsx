'use client'

import React from 'react'
import { AdminRealtimeEnforcementOverlay, useAdminRealtimeEnforcement } from '@/hooks/useAdminRealtimeEnforcement'

export function GlobalAdminEnforcer() {
  useAdminRealtimeEnforcement()
  return <AdminRealtimeEnforcementOverlay />
}

export default GlobalAdminEnforcer
