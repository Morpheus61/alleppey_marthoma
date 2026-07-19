import type { MemberRecord, CertType } from '@/lib/certificates/types'
import { getFamilyMember } from '@/lib/certificates/types'
import { IST_TZ } from '@/lib/dates'

// ── Layout constants ────────────────────────────────────────────────────────
const PAGE = { W: 210, H: 297 }
const MAR          = 20
const LINE         = 6.5
const LINE_LG      = 8
const SIG_Y        = 245
const FOOTER_Y     = 280
const BODY_FONT_SIZE  = 10.5
const LABEL_FONT_SIZE = 8
const TITLE_FONT_SIZE = 14
const NAME_FONT_SIZE  = 13

// ── Church identity ─────────────────────────────────────────────────────────
const CHURCH = {
  name:    'St. George Marthoma Syrian Church',
  place:   'Alappuzha',
  address: 'VCNB Road, Thondankulangara, Alappuzha, Kerala 688001',
  phone:   '0477 225 2521',
  maroon:  [107, 27,  27] as [number, number, number],
  gold:    [201, 168, 76] as [number, number, number],
}

// ── Certificate text ─────────────────────────────────────────────────────────
const TITLES: Record<CertType, string> = {
  baptism:      'Certificate of Holy Baptism',
  communion:    'Certificate of Holy Communion',
  confirmation: 'Certificate of Confirmation',
  matrimony:    'Certificate of Holy Matrimony',
  membership:   'Membership Certificate',
  transfer:     'Transfer Certificate',
}

// ASCII-only subtitles — Unicode decorative chars (e.g. ✦) break in Helvetica
const SUBTITLES: Record<CertType, string> = {
  baptism:      '*   Sacrament of Initiation   *',
  communion:    "*   First Partaking of the Lord's Table   *",
  confirmation: '*   Suvisesha Surusha   *',
  matrimony:    '*   Sacrament of Marriage   *',
  membership:   '*   Certificate of Church Membership   *',
  transfer:     '*   Letter of Transfer of Membership   *',
}

const VERSES: Record<CertType, string> = {
  baptism:      '"I baptize you in the name of the Father, the Son, and the Holy Spirit." -- Matthew 28:19',
  communion:    '"This is my body, which is given for you. Do this in remembrance of me." -- Luke 22:19',
  confirmation: '"I will give you a new heart and put a new spirit in you." -- Ezekiel 36:26',
  matrimony:    '"What God has joined together, let no one separate." -- Mark 10:9',
  membership:   '"You are fellow citizens with God\'s people and members of his household." -- Ephesians 2:19',
  transfer:     '"For we are all one body in Christ." -- Romans 12:5',
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Doc = any

// ── Text helpers ─────────────────────────────────────────────────────────────

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

/** Collapse a multiline address field to a single printable line */
function cleanAddress(addr: string | null): string {
  if (!addr) return '___'
  return addr
    .replace(/\r?\n/g, ', ')
    .replace(/\s{2,}/g, ' ')
    .replace(/,\s*,/g, ',')
    .trim()
}

/**
 * Returns "child of …" sentence, or null when both parents are missing.
 * Never prints "— & —" or "___ and ___" placeholders.
 */
function parentLine(
  father: string | null | undefined,
  mother: string | null | undefined,
): string | null {
  const f = (father?.trim() && father.trim() !== '\u2014') ? father.trim() : null
  const m = (mother?.trim() && mother.trim() !== '\u2014') ? mother.trim() : null
  if (!f && !m) return null
  if (f && m)  return 'child of ' + f + ' (Father) and ' + m + ' (Mother),'
  if (f)       return 'child of ' + f + ' (Father),'
  return              'child of ' + m + ' (Mother),'
}

// ── Document structure ───────────────────────────────────────────────────────

function drawBorders(doc: Doc): void {
  const { W, H } = PAGE
  // Outer border — maroon, thick
  doc.setDrawColor(...CHURCH.maroon)
  doc.setLineWidth(1.8)
  doc.rect(12, 12, W - 24, H - 24)
  // Inner border — gold, thin
  doc.setDrawColor(...CHURCH.gold)
  doc.setLineWidth(0.4)
  doc.rect(16, 16, W - 32, H - 32)
}

/** Returns y where the title block should start */
function drawHeader(doc: Doc): number {
  const W = PAGE.W
  let y = 26
  // + cross symbol (ASCII — renders cleanly in Helvetica)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(20)
  doc.setTextColor(...CHURCH.maroon)
  doc.text('+', W / 2, y, { align: 'center' }); y += 9
  // Church name
  doc.setFontSize(14)
  doc.text(CHURCH.name, W / 2, y, { align: 'center' }); y += 7
  // Place
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(11)
  doc.text(CHURCH.place, W / 2, y, { align: 'center' }); y += 5
  // Address line
  doc.setFontSize(8)
  doc.setTextColor(110, 110, 110)
  doc.text(CHURCH.address + '  |  Ph: ' + CHURCH.phone, W / 2, y, { align: 'center' }); y += 6
  // Maroon divider
  doc.setDrawColor(...CHURCH.maroon)
  doc.setLineWidth(0.8)
  doc.line(MAR, y, W - MAR, y); y += 10
  return y
}

/** Returns y where the certificate body should start */
function drawTitle(doc: Doc, certType: CertType, y: number): number {
  const W = PAGE.W
  doc.setFontSize(TITLE_FONT_SIZE)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(...CHURCH.maroon)
  doc.text(TITLES[certType], W / 2, y, { align: 'center' }); y += 7
  // Subtitle — ASCII-only decoration
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(...CHURCH.gold)
  doc.text(SUBTITLES[certType], W / 2, y, { align: 'center' }); y += 9
  // Thin gold divider under subtitle
  doc.setDrawColor(...CHURCH.gold)
  doc.setLineWidth(0.3)
  doc.line(MAR + 20, y, W - MAR - 20, y); y += 7
  // Scripture verse — may wrap
  doc.setFontSize(9)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(130, 130, 130)
  const vl = doc.splitTextToSize(VERSES[certType], W - MAR * 2 - 10)
  doc.text(vl, W / 2, y, { align: 'center' }); y += vl.length * 5 + 8
  // Reset to body style
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(40, 40, 40)
  return y
}

/** Text-based seal fallback — used when church-seal.png is unavailable */
function drawTextSeal(doc: Doc): void {
  const { W, H } = PAGE
  const cx = W - 48   // fixed bottom-right
  const cy = H - 58
  doc.setDrawColor(...CHURCH.gold)
  doc.setLineWidth(0.5)
  doc.circle(cx, cy, 22)
  doc.setLineWidth(0.3)
  doc.circle(cx, cy, 18)
  doc.setFontSize(5.5)
  doc.setTextColor(180, 150, 60)
  doc.setFont('helvetica', 'bold')
  doc.text('ST. GEORGE',         cx, cy - 8,  { align: 'center' })
  doc.text('MARTHOMA',           cx, cy - 3,  { align: 'center' })
  doc.text('SYRIAN CHURCH',      cx, cy + 2,  { align: 'center' })
  doc.setFont('helvetica', 'normal')
  doc.text('ALAPPUZHA',          cx, cy + 7,  { align: 'center' })
  doc.text('LIGHTED TO LIGHTEN', cx, cy + 12, { align: 'center' })
  doc.setTextColor(40, 40, 40)
}

/**
 * Church seal — fixed bottom-right at (W-68, H-80), size 44x44 mm.
 * Loads /church-seal.png at 15 % opacity; falls back to text rings.
 */
async function drawSeal(doc: Doc): Promise<void> {
  const { W, H } = PAGE
  try {
    const response = await fetch('/church-seal.png')
    if (!response.ok) throw new Error('no seal image')
    const blob   = await response.blob()
    const base64 = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload  = () => resolve(reader.result as string)
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
    const canvas  = document.createElement('canvas')
    canvas.width  = 200
    canvas.height = 200
    const ctx = canvas.getContext('2d')!
    const img = new Image()
    img.src   = base64
    await new Promise<void>(r => { img.onload = () => r() })
    ctx.globalAlpha = 0.15   // watermark opacity
    ctx.drawImage(img, 0, 0, 200, 200)
    doc.addImage(canvas.toDataURL('image/png'), 'PNG', W - 68, H - 80, 44, 44)
  } catch {
    drawTextSeal(doc)
  }
}

/**
 * Signature block — ALWAYS at SIG_Y = 245 mm. Never floats.
 * Three equal columns: Vicar | Secretary | Date of Issue
 */
async function drawSignatures(
  doc: Doc,
  vicarName: string,
  secretaryName: string,
  secretarySigUrl: string | null,
  vicarSigUrl: string | null,
): Promise<void> {
  const W    = PAGE.W
  const sigY = SIG_Y   // hard-coded, never calculated from body y
  const cols   = [MAR, W / 2 - 22, W - MAR - 44]
  const labels = ['Vicar', 'Secretary', 'Date of Issue']
  const names  = [vicarName, secretaryName, fmtToday()]
  const sigs   = [vicarSigUrl, secretarySigUrl, null]
  for (let i = 0; i < 3; i++) {
    const x = cols[i]
    if (sigs[i]) {
      try { doc.addImage(sigs[i]!, 'PNG', x, sigY - 18, 44, 14, undefined, 'FAST') }
      catch { /* skip on error */ }
    }
    doc.setDrawColor(80, 80, 80)
    doc.setLineWidth(0.4)
    doc.line(x, sigY, x + 44, sigY)
    doc.setFontSize(LABEL_FONT_SIZE)
    doc.setTextColor(100, 100, 100)
    doc.setFont('helvetica', 'normal')
    doc.text(labels[i], x + 22, sigY + 5, { align: 'center' })
    if (names[i]) {
      doc.setFont('helvetica', 'bold')
      doc.setFontSize(9)
      doc.setTextColor(40, 40, 40)
      doc.text(names[i], x + 22, sigY + 11, { align: 'center', maxWidth: 44 })
    }
  }
}

function drawFooter(doc: Doc, certNo: string): void {
  const { W } = PAGE
  doc.setDrawColor(180, 180, 180)
  doc.setLineWidth(0.3)
  doc.line(MAR, FOOTER_Y, W - MAR, FOOTER_Y)
  doc.setFontSize(7.5)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(140, 140, 140)
  doc.text(
    'Certificate No: ' + certNo + '   |   Issued by ' + CHURCH.name + ', ' + CHURCH.place,
    W / 2, FOOTER_Y + 5, { align: 'center' },
  )
}

// ── Certificate body (all six types) ────────────────────────────────────────

function drawBody(
  doc: Doc,
  certType: CertType,
  m: MemberRecord,
  extras: Record<string, string>,
  vicarName: string,
  startY: number,
): void {
  const W     = PAGE.W
  const MAX_Y = 230   // body must not intrude on the signature block

  let y = startY

  doc.setFont('helvetica', 'normal')
  doc.setFontSize(BODY_FONT_SIZE)
  doc.setTextColor(40, 40, 40)

  /** Print one auto-wrapped line; returns false when MAX_Y is exceeded */
  const ln = (text: string, extraSpace = 0): boolean => {
    if (y > MAX_Y) return false
    const parts = doc.splitTextToSize(text, W - MAR * 2)
    doc.text(parts, MAR, y)
    y += LINE * parts.length + extraSpace
    return true
  }

  /** Print member name bold+large; Malayalam name right-aligned on same baseline */
  const printName = (): void => {
    if (y > MAX_Y) return
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(NAME_FONT_SIZE)
    doc.setTextColor(40, 40, 40)
    doc.text(m.full_name, MAR, y)
    if (m.full_name_ml) {
      doc.setFont('helvetica', 'normal')
      doc.setFontSize(9)
      doc.setTextColor(100, 100, 100)
      doc.text(m.full_name_ml, W - MAR, y, { align: 'right' })
      doc.setTextColor(40, 40, 40)
    }
    y += LINE_LG
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(BODY_FONT_SIZE)
  }

  /**
   * Print bold inline text at (x, current y), return width consumed.
   * Caller is responsible for advancing y after the full line is built.
   */
  const bRun = (text: string, x: number): number => {
    doc.setFont('helvetica', 'bold')
    doc.text(text, x, y)
    const w = doc.getTextWidth(text)
    doc.setFont('helvetica', 'normal')
    return w
  }

  // Resolve parents/godparents without the '—' fallback (treat '—' as missing)
  const father    = m.father_name?.trim()    || getFamilyMember(m.family_members, 'Father')    || null
  const mother    = m.mother_name?.trim()    || getFamilyMember(m.family_members, 'Mother')    || null
  const godfather = m.godfather?.trim()      || getFamilyMember(m.family_members, 'Godfather') || null
  const godmother = m.godmother?.trim()      || getFamilyMember(m.family_members, 'Godmother') || null
  const addr      = cleanAddress(m.address)

  /** Look up an extras field — supports both 'spaced key' and camelCase forms */
  const ex = (spaced: string, camel?: string): string =>
    extras[spaced] || (camel ? (extras[camel] ?? '') : '') || ''

  // ── BAPTISM ─────────────────────────────────────────────────────────────
  if (certType === 'baptism') {
    ln('This is to certify that')
    printName()
    if (m.date_of_birth) ln('born on ' + fmtDate(m.date_of_birth) + ',')
    const pLine = parentLine(father, mother)
    if (pLine) ln(pLine)
    if (addr !== '___') ln('residing at ' + addr + ',')
    y += 3

    if (y <= MAX_Y) {
      const prefix = 'was administered the Holy Sacrament of '
      doc.text(prefix, MAR, y)
      bRun('Baptism', MAR + doc.getTextWidth(prefix))
      y += LINE
    }

    const bVicar = ex('officiating minister', 'vicar') || vicarName
    ln('on ' + (ex('baptism date', 'baptismDate') || fmtDate(m.baptism_date)) + ', at this church, by the Rev. ' + bVicar + '.')

    const gf = ex('godfather') || godfather
    const gm = ex('godmother') || godmother
    if (gf || gm) ln('Godparents: ' + (gf || '___') + ' & ' + (gm || '___'))

    const bReg = m.baptism_register_no || ex('baptism register no', 'registerNo')
    if (bReg) ln('Baptism Register No: ' + bReg)
  }

  // ── COMMUNION ────────────────────────────────────────────────────────────
  if (certType === 'communion') {
    ln('This is to certify that')
    printName()
    const pLine = parentLine(father, mother)
    if (pLine) ln(pLine)
    if (addr !== '___') ln('residing at ' + addr + ',')

    if (y <= MAX_Y) {
      const p1 = 'was admitted to the '
      doc.text(p1, MAR, y)
      const x1 = MAR + doc.getTextWidth(p1)
      const x2 = x1 + bRun('Holy Communion', x1)
      doc.text(' for the first time', x2, y)
      y += LINE
    }

    const cVicar = ex('officiating minister', 'vicar') || vicarName
    ln('on ' + (ex('communion date', 'communionDate') || '___') + ', at this church, by the Rev. ' + cVicar + '.')

    const cReg = ex('communion register no', 'registerNo')
    if (cReg) ln('Communion Register No: ' + cReg)
  }

  // ── CONFIRMATION ─────────────────────────────────────────────────────────
  if (certType === 'confirmation') {
    ln('This is to certify that')
    printName()
    const pLine = parentLine(father, mother)
    if (pLine) ln(pLine)
    if (addr !== '___') ln('residing at ' + addr + ',')
    ln('having received instruction in the Christian faith, was received into full communicant')

    if (y <= MAX_Y) {
      const p1 = 'membership of the Marthoma Syrian Church through the rite of '
      doc.text(p1, MAR, y)
      bRun('Confirmation', MAR + doc.getTextWidth(p1))
      y += LINE
    }

    const bishop    = ex('bishop')
    const cnVicar   = ex('officiating minister', 'vicar') || vicarName
    const byLine    = bishop
      ? 'by the Rt. Rev. ' + bishop + ' and the Rev. ' + cnVicar + '.'
      : 'by the Rev. ' + cnVicar + '.'
    ln('on ' + (ex('confirmation date', 'confirmationDate') || fmtDate(m.confirmation_date)) + ', ' + byLine)

    const cnReg = m.confirmation_register_no || ex('confirmation register no', 'registerNo')
    if (cnReg) ln('Confirmation Register No: ' + cnReg)
  }

  // ── MATRIMONY ────────────────────────────────────────────────────────────
  if (certType === 'matrimony') {
    if (y <= MAX_Y) {
      const p1 = 'This is to certify that the Holy Sacrament of '
      doc.text(p1, MAR, y)
      const x1 = MAR + doc.getTextWidth(p1)
      const x2 = x1 + bRun('Matrimony', x1)
      doc.text(' was solemnized between', x2, y)
      y += LINE + 2
    }

    const groomName = ex('groomName') || m.full_name
    const brideName = ex('brideName') || ex('spouse name', 'spouseName') || '___'

    if (y <= MAX_Y) {
      const gw = bRun('Groom: ', MAR)
      doc.text(groomName, MAR + gw, y)
      y += LINE
    }
    if (ex('groomFather')) ln('Son of ' + ex('groomFather') + ', residing at ' + cleanAddress(ex('groomAddress') || null))

    if (y <= MAX_Y) {
      const bw = bRun('Bride: ', MAR)
      doc.text(brideName, MAR + bw, y)
      y += LINE
    }
    if (ex('brideFather')) ln('Daughter of ' + ex('brideFather') + ', residing at ' + cleanAddress(ex('brideAddress') || null))

    const mVicar = ex('officiating minister', 'vicar') || vicarName
    ln('on ' + (ex('marriage date', 'marriageDate') || '___') + ', officiated by the Rev. ' + mVicar + '.')

    const w1 = ex('witness 1', 'witness1')
    const w2 = ex('witness 2', 'witness2')
    if (w1 || w2) ln('Witnesses: ' + (w1 || '___') + ' & ' + (w2 || '___'))

    const mReg = ex('marriage register no', 'registerNo')
    if (mReg) ln('Marriage Register No: ' + mReg)
  }

  // ── MEMBERSHIP ───────────────────────────────────────────────────────────
  if (certType === 'membership') {
    ln('This is to certify that')
    printName()
    const pLine = parentLine(father, mother)
    if (pLine) ln(pLine)
    if (addr !== '___') ln('residing at ' + addr + ',')

    if (y <= MAX_Y) {
      const p1 = 'is a bonafide '
      doc.text(p1, MAR, y)
      const x1 = MAR + doc.getTextWidth(p1)
      const x2 = x1 + bRun('communicant member', x1)
      doc.text(' of this parish, enrolled in the', x2, y)
      y += LINE
    }

    ln('Family Register under Ward: ' + (m.ward || '___') + '   Register No: ' + (m.family_register_no || '___'))
    if (m.baptism_date || m.confirmation_date) {
      ln('Baptism Date: ' + fmtDate(m.baptism_date) + '   Confirmation Date: ' + fmtDate(m.confirmation_date))
    }
    const purpose = ex('purpose')
    if (purpose) ln('This certificate is issued for ' + purpose + ' purposes.')
  }

  // ── TRANSFER ─────────────────────────────────────────────────────────────
  if (certType === 'transfer') {
    ln('To the Vicar / Secretary,')
    if (y <= MAX_Y) {
      doc.setFont('helvetica', 'bold')
      const rp    = ex('transferring to', 'receivingParish') || '___________________'
      const rpPts = doc.splitTextToSize(rp, W - MAR * 2)
      doc.text(rpPts, MAR, y)
      y += LINE * rpPts.length + 2
      doc.setFont('helvetica', 'normal')
    }
    ln('This is to certify that')
    printName()
    const pLine = parentLine(father, mother)
    if (pLine) ln(pLine)
    if (addr !== '___') ln('residing at ' + addr + ',')
    ln('has been a bonafide communicant member in good standing of this parish.')
    if (m.baptism_date || m.confirmation_date) {
      ln('Baptism Date: ' + fmtDate(m.baptism_date) + '   Confirmation Date: ' + fmtDate(m.confirmation_date))
    }
    ln('Family Register No: ' + (m.family_register_no || '___') + '   Ward: ' + (m.ward || '___'))
    ln('We hereby commend this member to your fellowship and request their enrolment')
    ln('in your parish register with effect from ' + (ex('date', 'transferDate') || '___') + '.')
    if (y <= MAX_Y) {
      doc.setFont('helvetica', 'italic')
      doc.setTextColor(100, 100, 100)
      ln('No dues are pending against this member as of the date of issue.')
      doc.setFont('helvetica', 'normal')
      doc.setTextColor(40, 40, 40)
    }
  }
}

// ── Public API ───────────────────────────────────────────────────────────────

export interface GeneratePDFParams {
  certType: CertType
  certNo: string
  member: MemberRecord
  extras: Record<string, string>
  vicarName: string
  secretaryName: string
  secretarySigUrl: string | null
  vicarSigUrl: string | null
}

export async function generateCertificatePDF(params: GeneratePDFParams): Promise<void> {
  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })

  // 1. Borders — drawn first, behind everything
  drawBorders(doc)

  // 2. Header — returns y where title starts
  let y = drawHeader(doc)

  // 3. Title block — returns y where body starts (~95 mm)
  y = drawTitle(doc, params.certType, y)

  // 4. Body — cert-type specific, capped at MAX_Y = 230 mm
  drawBody(doc, params.certType, params.member, params.extras, params.vicarName, y)

  // 5. Seal — fixed bottom-right, drawn after body
  await drawSeal(doc)

  // 6. Signatures — ALWAYS at SIG_Y = 245 mm, never floats
  await drawSignatures(
    doc, params.vicarName, params.secretaryName,
    params.secretarySigUrl, params.vicarSigUrl,
  )

  // 7. Footer
  drawFooter(doc, params.certNo)

  // 8. Save PDF
  const safeMember = params.member.full_name.replace(/[^a-zA-Z0-9_\- ]/g, '').replace(/ /g, '_')
  const safeTitle  = TITLES[params.certType].replace(/ /g, '_')
  doc.save(safeTitle + '_' + safeMember + '.pdf')
}
