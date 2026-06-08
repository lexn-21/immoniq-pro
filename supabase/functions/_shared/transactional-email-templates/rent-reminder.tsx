/// <reference types="npm:@types/react@18.3.1" />
import * as React from 'npm:react@18.3.1'
import {
  Body, Container, Head, Heading, Html, Preview, Text, Section, Hr,
} from 'npm:@react-email/components@0.0.22'
import type { TemplateEntry } from './registry.ts'

const SITE_NAME = 'ImmoNIQ'

interface Props {
  tenant_name?: string
  property_name?: string
  amount_eur?: string
  iban?: string
  days_overdue?: number
  landlord_name?: string
}

const RentReminderEmail = ({
  tenant_name, property_name, amount_eur, iban, days_overdue, landlord_name,
}: Props) => (
  <Html lang="de" dir="ltr">
    <Head />
    <Preview>Freundliche Erinnerung: Miete {property_name ?? ''}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Freundliche Zahlungserinnerung</Heading>
        <Text style={text}>
          Hallo {tenant_name ?? ''},
        </Text>
        <Text style={text}>
          wir konnten für diesen Monat noch keinen Zahlungseingang Ihrer Miete
          {property_name ? <> für <b>{property_name}</b></> : null} feststellen
          {typeof days_overdue === 'number' && days_overdue > 0
            ? <> (aktuell {days_overdue} Tag{days_overdue === 1 ? '' : 'e'} überfällig)</>
            : null}.
          Vielleicht hat sich die Überweisung nur verzögert — falls bereits gezahlt,
          betrachten Sie diese E-Mail bitte als gegenstandslos.
        </Text>
        <Section style={box}>
          <Text style={boxRow}><b>Betrag:</b> {amount_eur ?? '—'} €</Text>
          {iban ? <Text style={boxRow}><b>IBAN:</b> {iban}</Text> : null}
          <Text style={boxRow}><b>Verwendungszweck:</b> Miete {new Date().toLocaleDateString('de-DE', { month: 'long', year: 'numeric' })}</Text>
        </Section>
        <Text style={text}>
          Bei Fragen oder Schwierigkeiten melden Sie sich bitte kurz — wir
          finden gemeinsam eine Lösung.
        </Text>
        <Hr style={hr} />
        <Text style={footer}>
          Freundliche Grüße{landlord_name ? `, ${landlord_name}` : ''}<br />
          Versendet via {SITE_NAME}
        </Text>
      </Container>
    </Body>
  </Html>
)

export const template = {
  component: RentReminderEmail,
  subject: (d) => `Zahlungserinnerung Miete${d.property_name ? ' · ' + d.property_name : ''}`,
  displayName: 'Mieterinnerung',
  previewData: {
    tenant_name: 'Max Mustermann',
    property_name: 'Hauptstr. 12, Whg 3',
    amount_eur: '850,00',
    iban: 'DE89 3704 0044 0532 0130 00',
    days_overdue: 4,
    landlord_name: 'Ihr Vermieter',
  },
} satisfies TemplateEntry

const main = { backgroundColor: '#ffffff', fontFamily: 'Arial, sans-serif' }
const container = { padding: '24px 28px', maxWidth: '560px' }
const h1 = { fontSize: '22px', fontWeight: 'bold' as const, color: '#0a0a0a', margin: '0 0 18px' }
const text = { fontSize: '15px', color: '#333', lineHeight: '1.6', margin: '0 0 16px' }
const box = { background: '#faf7ec', border: '1px solid #ecdfa6', borderRadius: '10px', padding: '14px 16px', margin: '8px 0 20px' }
const boxRow = { fontSize: '14px', color: '#222', margin: '4px 0' }
const hr = { borderColor: '#eee', margin: '24px 0 16px' }
const footer = { fontSize: '12px', color: '#888', margin: 0 }
