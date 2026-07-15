/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'

export interface TemplateEntry {
  component: React.ComponentType<any>
  subject: string | ((data: Record<string, any>) => string)
  to?: string
  displayName?: string
  previewData?: Record<string, any>
}

import { template as welcome } from './welcome.tsx'
import { template as newApplication } from './new-application.tsx'
import { template as applicationStatus } from './application-status.tsx'
import { template as adApproved } from './ad-approved.tsx'
import { template as adRejected } from './ad-rejected.tsx'
import { template as invoice } from './invoice.tsx'
import { template as wgInvite } from './wg-invite.tsx'
import { template as rentReminder } from './rent-reminder.tsx'
import { template as beispielrechnungShare } from './beispielrechnung-share.tsx'

export const TEMPLATES: Record<string, TemplateEntry> = {
  'welcome': welcome,
  'new-application': newApplication,
  'application-status': applicationStatus,
  'ad-approved': adApproved,
  'ad-rejected': adRejected,
  'invoice': invoice,
  'wg-invite': wgInvite,
  'rent-reminder': rentReminder,
  'beispielrechnung-share': beispielrechnungShare,
}
