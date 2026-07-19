import type { MemberRecord, CertType } from '@/lib/certificates/types'
import { resolveFather, resolveMother, resolveGodfather, resolveGodmother } from '@/lib/certificates/types'
import { IST_TZ } from '@/lib/dates'

const CHURCH = {
  name: 'St. George Marthoma Syrian Church',
  place: 'Alappuzha',
  address: 'VCNB Road, Thondankulangara, Alappuzha, Kerala 688001',
  phone: '0477 225 2521',
  maroon: [107, 27, 27] as [number, number, number],
  gold:   [201, 168, 76] as [number, number, number],
}

const TITLES: Record<CertType, string> = {
  baptism:      'Certificate of Holy Baptism',
  communion:    'Certificate of Holy Communion',
  confirmation: 'Certificate of Confirmation',
  matrimony:    'Certificate of Holy Matrimony',
  membership:   'Membership Certificate',
  transfer:     'Transfer Certificate',
}

const SUBTITLES: Record<CertType, string> = {
  baptism:      '✦   Sacrament of Initiation   ✦',
  communion:    "✦   First Partaking of the Lord's Table   ✦",
  confirmation: '✦   Suvisesha Surusha   ✦',
  matrimony:    '✦   Sacrament of Marriage   ✦',
  membership:   '✦   Certificate of Church Membership   ✦',
  transfer:     '✦   Letter of Transfer of Membership   ✦',
}

const VERSES: Record<CertType, string> = {
  baptism:      '"I baptize you in the name of the Father, the Son, and the Holy Spirit." — Matthew 28:19',
  communion:    '"This is my body, which is given for you. Do this in remembrance of me." — Luke 22:19',
  confirmation: '"I will give you a new heart and put a new spirit in you." — Ezekiel 36:26',
  matrimony:    '"What God has joined together, let no one separate." — Mark 10:9',
  membership:   '"You are fellow citizens with God\'s people and members of his household." — Ephesians 2:19',
  transfer:     '"For we are all one body in Christ." — Romans 12:5',
}

function fmtDate(d: string | null | undefined): string {
  if (!d) return '___'
  const iso = d.length === 10 ? d + 'T00:00:00+05:30' : d
  return new Date(iso).toLocaleDateString('en-IN', {
    timeZone: IST_TZ, day: '2-digit', month: 'long', year: 'numeric',
  })
}

function fmtToday(): string {
  return new Date().toLocaleDateString('en-IN', {
    timeZone: IST_TZ, day: '2-digit', month: 'long', year: 'numeric',
  })
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type jsPDFType = any

function drawHeader(doc: jsPDFType, W: number, mar: number): number {
  let y = mar + 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(18)
  doc.setTextColor(...CHURCH.maroon)
  doc.text('+', W / 2, y, { align: 'center' }); y += 9
  doc.setFontSize(13)
  doc.text(CHURCH.name, W / 2, y, { align: 'center' }); y += 6
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text(CHURCH.place, W / 2, y, { align: 'center' }); y += 5
  doc.setFontSize(8)
  doc.setTextColor(100, 100, 100)
  doc.text(`${CHURCH.address}  |  Ph: ${CHURCH.phone}`, W / 2, y, { align: 'center' }); y += 6
  doc.setDrawColor(...CHURCH.maroon)
  doc.setLineWidth(0.8)
  doc.line(mar, y, W - mar, y); y += 8
  return y
}

function drawTitle(doc: jsPDFType, certType: CertType, W: number, y: number): number {
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CHURCH.maroon)
  doc.text(TITLES[certType], W / 2, y, { align: 'center' }); y += 6
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CHURCH.gold)
  doc.text(SUBTITLES[certType], W / 2, y, { align: 'center' }); y += 8
  doc.setFontSize(8.5)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(120, 120, 120)
  doc.text(VERSES[certType], W / 2, y, { align: 'center', maxWidth: 170 }); y += 10
  return y
}

/** Text-based seal fallback used when church-seal.png is not available */
function drawTextSeal(doc: jsPDFType, W: number, H: number): void {
  const cx = W - 52, cy = H - 70
  doc.setDrawColor(...CHURCH.gold)
  doc.setLineWidth(0.6)
  doc.circle(cx, cy, 22)
  doc.setLineWidth(0.3)
  doc.circle(cx, cy, 19)
  doc.setFontSize(6)
  doc.setTextColor(...CHURCH.gold)
  doc.setFont('helvetica', 'bold')
  doc.text('ST. GEORGE',    cx, cy - 7, { align: 'center' })
  doc.text('MARTHOMA',      cx, cy - 2, { align: 'center' })
  doc.text('SYRIAN CHURCH', cx, cy + 3, { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('ALAPPUZHA',     cx, cy + 9, { align: 'center' })
}

/**
 * Draws the church seal as a centered watermark.
 * Loads /church-seal.png and renders it at 15% opacity via canvas.
 * Falls back to the text-based seal if the image is unavailable.
 */
async function drawSeal(doc: jsPDFType, W: number, H: number): Promise<void> {
  try {
    const response = await fetch('/church-seal.png')
    if (!response.ok) { drawTextSeal(doc, W, H); return }

    const blob = await response.blob()
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })

    // Render at 15% opacity for watermark effect using an off-screen canvas
    const px = 400
    const canvas = document.createElement('canvas')
    canvas.width = px; canvas.height = px
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.src = base64
    await new Promise<void>((resolve, reject) => {
      img.onload  = () => resolve()
      img.onerror = () => reject(new Error('Image load failed'))
    })
    ctx.globalAlpha = 0.15
    ctx.drawImage(img, 0, 0, px, px)
    const watermarked = canvas.toDataURL('image/png')

    // Centre on the page — 90 × 90 mm
    const size = 90
    const x = (W - size) / 2
    const y = (H - size) / 2
    doc.addImage(watermarked, 'PNG', x, y, size, size)
  } catch {
    // Image unavailable — fall back to vector text seal
    drawTextSeal(doc, W, H)
  }
}

function drawSignatures(
  doc: jsPDFType, W: number, H: number, mar: number,
  vicarName: string, secretaryName: string,
  secretarySigUrl: string | null, vicarSigUrl: string | null,
): void {
  const sigY = H - 50
  const positions = [
    { x: mar,            label: 'Vicar',          name: vicarName,     sigUrl: vicarSigUrl },
    { x: W / 2 - 22,    label: 'Secretary',       name: secretaryName, sigUrl: secretarySigUrl },
    { x: W - mar - 44,  label: 'Date of Issue',   name: fmtToday(),    sigUrl: null },
  ]
  for (const pos of positions) {
    if (pos.sigUrl) {
      try { doc.addImage(pos.sigUrl, 'PNG', pos.x, sigY - 18, 44, 16) } catch { /* noop */ }
    }
    doc.setDrawColor(80, 80, 80)
    doc.setLineWidth(0.4)
    doc.line(pos.x, sigY, pos.x + 44, sigY)
    doc.setFontSize(8)
    doc.setTextColor(80, 80, 80)
    doc.setFont('helvetica', 'normal')
    doc.text(pos.label, pos.x + 22, sigY + 4, { align: 'center' })
    if (pos.name) {
      doc.setFont('helvetica', 'bold')
      doc.text(pos.name, pos.x + 22, sigY + 9, { align: 'center', maxWidth: 44 })
    }
  }
}

export async function generateCertificatePDF(params: {
  certType: CertType
  certNo: string
  member: MemberRecord
  extras: Record<string, string>
  vicarName: string
  secretaryName: string
  secretarySigUrl: string | null
  vicarSigUrl: string | null
}): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const { certType, certNo, member: m, extras, vicarName, secretaryName, secretarySigUrl, vicarSigUrl } = params

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210, H = 297, mar = 20

  // Outer border
  doc.setDrawColor(...CHURCH.maroon); doc.setLineWidth(1.5)
  doc.rect(mar - 6, mar - 6, W - (mar - 6) * 2, H - (mar - 6) * 2)
  doc.setDrawColor(...CHURCH.gold); doc.setLineWidth(0.4)
  doc.rect(mar - 2, mar - 2, W - (mar - 2) * 2, H - (mar - 2) * 2)

  let y = drawHeader(doc, W, mar)
  y = drawTitle(doc, certType, W, y)

  doc.setFont('helvetica', 'normal'); doc.setFontSize(10); doc.setTextColor(40, 40, 40)

  const fatherName = resolveFather(m)
  const motherName = resolveMother(m)
  const godfather  = resolveGodfather(m)
  const godmother  = resolveGodmother(m)

  const body = (t: string) => { doc.text(t, mar, y, { maxWidth: W - mar * 2 }); y += 6 }
  const bold  = (t: string, xx: number, yy: number) => {
    doc.setFont('helvetica', 'bold'); doc.text(t, xx, yy)
    const w = doc.getTextWidth(t); doc.setFont('helvetica', 'normal'); return w
  }

  if (certType === 'baptism') {
    body('This is to certify that')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    body(m.full_name); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    body(`born on ${fmtDate(m.date_of_birth)} to ${fatherName} (Father)`)
    body(`and ${motherName} (Mother), residing at ${m.address || '___'},`)
    const bx = mar + bold('was administered the Holy Sacrament of ', mar, y)
    bold('Baptism', bx, y); y += 6
    body(`on ${extras.baptismDate || fmtDate(m.baptism_date)}, at this church, by the Rev. ${extras.vicar || vicarName}.`)
    body(`Godparents: ${godfather} & ${godmother}`)
    body(`Baptism Register No: ${m.baptism_register_no || extras.registerNo || '___'}`)
  }

  if (certType === 'communion') {
    body('This is to certify that')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    body(m.full_name); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    body(`child of ${fatherName} and ${motherName},`)
    body(`residing at ${m.address || '___'},`)
    const cx  = mar + bold('was admitted to the ', mar, y)
    const cx2 = cx + bold('Holy Communion', cx, y)
    doc.text(' for the first time on', cx2, y); y += 6
    body(`${extras.communionDate || '___'}, at this church, by the Rev. ${extras.vicar || vicarName}.`)
    body(`Communion Register No: ${extras.registerNo || '___'}`)
  }

  if (certType === 'confirmation') {
    body('This is to certify that')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    body(m.full_name); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    body(`child of ${fatherName} and ${motherName},`)
    body(`residing at ${m.address || '___'},`)
    body('having received instruction in the Christian faith, was received into full communicant')
    const fx = mar + bold('membership of the Marthoma Syrian Church through the rite of ', mar, y)
    bold('Confirmation', fx, y); y += 6
    body(`on ${extras.confirmationDate || fmtDate(m.confirmation_date)}, by the Rev. ${extras.vicar || vicarName}.`)
    body(`Confirmation Register No: ${m.confirmation_register_no || '___'}`)
  }

  if (certType === 'matrimony') {
    const ax  = mar + bold('This is to certify that the Holy Sacrament of ', mar, y)
    const ax2 = ax + bold('Matrimony', ax, y)
    doc.text(' was solemnized between', ax2, y); y += 8
    bold('Groom: ', mar, y)
    doc.text(extras.groomName || '________________', mar + 18, y); y += 6
    body(`Son of ${extras.groomFather || '___'}, residing at ${extras.groomAddress || '___'}`)
    bold('Bride: ', mar, y)
    doc.text(extras.brideName || '________________', mar + 15, y); y += 6
    body(`Daughter of ${extras.brideFather || '___'}, residing at ${extras.brideAddress || '___'}`)
    body(`on ${extras.marriageDate || '___'}, officiated by the Rev. ${extras.vicar || vicarName}.`)
    body(`Witnesses: ${extras.witness1 || '___'} & ${extras.witness2 || '___'}`)
    body(`Marriage Register No: ${extras.registerNo || '___'}`)
  }

  if (certType === 'membership') {
    body('This is to certify that')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    body(m.full_name); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    body(`child of ${fatherName} and ${motherName},`)
    body(`residing at ${m.address || '___'},`)
    const mx  = mar + bold('is a bonafide ', mar, y)
    const mx2 = mx + bold('communicant member', mx, y)
    doc.text(' of this parish, enrolled in the', mx2, y); y += 6
    body(`Family Register under Ward: ${m.ward || '___'}   Register No: ${m.family_register_no || '___'}`)
    body(`Baptism Date: ${fmtDate(m.baptism_date)}   Confirmation Date: ${fmtDate(m.confirmation_date)}`)
    body(`This certificate is issued for ${extras.purpose || '___'} purposes.`)
  }

  if (certType === 'transfer') {
    body('To the Vicar / Secretary,')
    doc.setFont('helvetica', 'bold')
    doc.text(extras.receivingParish || '___________________', mar, y); y += 8
    doc.setFont('helvetica', 'normal')
    body('This is to certify that')
    doc.setFont('helvetica', 'bold'); doc.setFontSize(12)
    body(m.full_name); doc.setFontSize(10); doc.setFont('helvetica', 'normal')
    body(`child of ${fatherName} and ${motherName},`)
    body(`residing at ${m.address || '___'},`)
    body('has been a bonafide communicant member in good standing of this parish.')
    body(`Baptism Date: ${fmtDate(m.baptism_date)}   Confirmation Date: ${fmtDate(m.confirmation_date)}`)
    body(`Family Register No: ${m.family_register_no || '___'}   Ward: ${m.ward || '___'}`)
    body('We hereby commend this member to your fellowship and request their enrolment')
    body(`in your parish register with effect from ${extras.transferDate || '___'}.`)
    doc.setFont('helvetica', 'italic'); doc.setTextColor(100, 100, 100)
    body('No dues are pending against this member as of the date of issue.')
    doc.setFont('helvetica', 'normal'); doc.setTextColor(40, 40, 40)
  }

  await drawSeal(doc, W, H)
  drawSignatures(doc, W, H, mar, vicarName, secretaryName, secretarySigUrl, vicarSigUrl)

  // Footer
  doc.setDrawColor(200, 200, 200); doc.setLineWidth(0.3)
  doc.line(mar, H - 20, W - mar, H - 20)
  doc.setFontSize(8); doc.setTextColor(130, 130, 130)
  doc.text(
    `Certificate No: ${certNo}   |   Issued by ${CHURCH.name}, ${CHURCH.place}`,
    W / 2, H - 15, { align: 'center' },
  )

  doc.save(`${TITLES[certType].replace(/ /g, '_')}_${m.full_name.replace(/ /g, '_')}.pdf`)
}
