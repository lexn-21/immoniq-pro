/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Text, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ImmoNIQ'
const SITE_URL = 'https://immoniq.xyz'

interface WgInviteProps {
  member_name?: string
  inviter_name?: string
  listing_title?: string
  vote_url?: string
}

const WgInviteEmail = ({ member_name, inviter_name, listing_title, vote_url }: WgInviteProps) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Du wurdest zum WG-Casting eingeladen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Hi {member_name || ''}!</Heading>
        <Text style={text}>
          {inviter_name || 'Dein Mitbewohner'} hat dich eingeladen, beim Casting für
          eure WG mitzuentscheiden:
        </Text>
        <Text style={highlight}>{listing_title || 'WG-Inserat'}</Text>
        <Text style={text}>
          Über den Link siehst du alle Bewerber und kannst privat mit „Ja / Vielleicht / Nein"
          abstimmen — ohne Account.
        </Text>
        <Button style={button} href={vote_url || SITE_URL}>Bewerber ansehen & abstimmen</Button>
        <Hr style={hr} />
        <Text style={footer}>
          Der Link ist 365 Tage gültig und persönlich für dich. Nicht weitergeben.
          Mit ❤ von {SITE_NAME}.
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: WgInviteEmail,
  subject: (data) => `WG-Casting: ${data.listing_title || 'Neue Bewerber'}`,
  displayName: 'WG-Casting Einladung',
  previewData: {
    member_name: 'Anna',
    inviter_name: 'Leon',
    listing_title: '2-Zi-WG Berlin Mitte',
    vote_url: 'https://immoniq.xyz/wg-casting/abc123',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 16px' }
const highlight = { fontSize: '17px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 16px', padding: '12px 16px', backgroundColor: '#f5f0e1', borderRadius: '8px' }
const button = { backgroundColor: '#c9a227', color: '#0a0a0a', fontSize: '15px', fontWeight: 'bold' as const, borderRadius: '10px', padding: '13px 22px', textDecoration: 'none', display: 'inline-block' as const }
const hr = { borderColor: '#eee', margin: '28px 0 16px' }
const footer = { fontSize: '12px', color: '#999', margin: '0' }
