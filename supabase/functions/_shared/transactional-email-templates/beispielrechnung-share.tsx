/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Button, Container, Head, Heading, Html, Preview, Section, Text,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ImmoNIQ'
const SITE_URL = 'https://immoniq.xyz'

interface Props {
  savings?: string
  units?: number
  hourlyRate?: number
  downloadUrl?: string
  fileName?: string
  senderNote?: string
}

const Email = ({ savings, units, hourlyRate, downloadUrl, fileName, senderNote }: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Deine ImmonIQ-Beispielrechnung: {savings ?? '–'} € pro Jahr sparen</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Deine Beispielrechnung</Heading>
        <Text style={text}>
          Hier ist die persönliche Ersparnis-Berechnung mit ImmonIQ.
          {units ? ` Basis: ${units} Wohneinheiten` : ''}
          {hourlyRate ? `, ${hourlyRate} €/h Zeitwert` : ''}.
        </Text>

        {savings && (
          <Section style={box}>
            <Text style={boxLabel}>Jährliche Ersparnis</Text>
            <Text style={boxValue}>≈ {savings} €</Text>
          </Section>
        )}

        {senderNote && (
          <Text style={quote}>„{senderNote}“</Text>
        )}

        {downloadUrl && (
          <>
            <Button style={button} href={downloadUrl}>PDF öffnen ({fileName ?? 'beispielrechnung.pdf'})</Button>
            <Text style={muted}>Link ist 7 Tage gültig.</Text>
          </>
        )}

        <Text style={text}>
          Willst du die Zahlen für dein echtes Portfolio? In {SITE_NAME} passiert das automatisch aus deinen Belegen.
        </Text>
        <Button style={buttonSecondary} href={`${SITE_URL}/auth`}>30 Tage kostenlos testen</Button>

        <Text style={footer}>ImmonIQ · Made in Germany</Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: Email,
  subject: (d: Record<string, any>) =>
    d?.savings ? `Deine ImmonIQ-Beispielrechnung: ${d.savings} € pro Jahr sparen` : 'Deine ImmonIQ-Beispielrechnung',
  displayName: 'Beispielrechnung teilen',
  previewData: {
    savings: '1.620',
    units: 5,
    hourlyRate: 45,
    downloadUrl: 'https://immoniq.xyz/beispielrechnung.pdf',
    fileName: 'immoniq-beispielrechnung.pdf',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '24px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 12px' }
const text = { fontSize: '15px', color: '#444', lineHeight: '1.6', margin: '0 0 18px' }
const muted = { fontSize: '12px', color: '#888', margin: '6px 0 22px' }
const quote = {
  fontSize: '14px', color: '#333', lineHeight: '1.6',
  borderLeft: '3px solid #c9a227', padding: '4px 12px', margin: '0 0 22px',
  fontStyle: 'italic' as const,
}
const box = {
  border: '1px solid #eee', borderRadius: '12px', padding: '18px 20px', margin: '0 0 22px',
  background: '#fafaf5',
}
const boxLabel = {
  fontSize: '11px', color: '#888', letterSpacing: '0.18em',
  textTransform: 'uppercase' as const, margin: '0 0 6px',
}
const boxValue = { fontSize: '28px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: 0 }
const button = {
  backgroundColor: '#c9a227', color: '#0a0a0a', fontSize: '15px',
  fontWeight: 'bold' as const, borderRadius: '10px',
  padding: '13px 22px', textDecoration: 'none', display: 'inline-block',
}
const buttonSecondary = {
  backgroundColor: '#0a0a0a', color: '#ffffff', fontSize: '14px',
  fontWeight: 'bold' as const, borderRadius: '10px',
  padding: '11px 20px', textDecoration: 'none', display: 'inline-block', marginTop: '4px',
}
const footer = { fontSize: '12px', color: '#999', margin: '32px 0 0' }
