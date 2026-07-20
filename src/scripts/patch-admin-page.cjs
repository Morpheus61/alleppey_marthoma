// Patches admin/page.tsx to add Head-of-Family badge and improved member card display.
// Run: node src/scripts/patch-admin-page.cjs
'use strict'
const fs   = require('fs')
const path = require('path')

const filePath = path.join(__dirname, '..', 'app', '(app)', 'admin', 'page.tsx')
let src = fs.readFileSync(filePath, 'utf8')

// ── 4. Add 'Head of Family' badge after the Admin badge in member card ────────
// Build search strings without JS template-literal confusion
const BT = '`'
const oldBadgeLine = '                  {m.is_admin && <span className={' + BT + '${badge} bg-brand-900 text-white ml-2' + BT + '}>Admin</span>}\n                  {m.status === \'disabled\' && <span className={' + BT + '${badge} bg-gray-200 text-gray-500 ml-2' + BT + '}>Disabled</span>}'
const newBadgeLine = '                  {m.is_admin && <span className={' + BT + '${badge} bg-brand-900 text-white ml-2' + BT + '}>Admin</span>}\n                  {headIds.has(m.id) && <span className={' + BT + '${badge} bg-amber-100 text-amber-800 border border-amber-200 ml-2' + BT + '}>Head of Family</span>}\n                  {m.status === \'disabled\' && <span className={' + BT + '${badge} bg-gray-200 text-gray-500 ml-2' + BT + '}>Disabled</span>}'

if (!src.includes(oldBadgeLine)) {
  console.error('ERROR: badge search string not found in file. Aborting step 4.')
  process.exit(1)
}
src = src.replace(oldBadgeLine, newBadgeLine)

// ── 5. Replace inline phone·house_name with styled house-name badge ──────────
const oldPhoneLine = '                <p className="text-xs text-muted-foreground">{m.phone}{m.house_name ? ' + BT + ' · ${m.house_name}' + BT + ' : \'\'}</p>\n              </div>'
const newPhoneLine = '                <p className="text-xs text-muted-foreground">{m.phone}</p>\n                {m.house_name && (\n                  <span className="inline-block mt-1 text-[10px] bg-amber-50 text-amber-700 border border-amber-200 px-1.5 py-0.5 rounded-full">{m.house_name}</span>\n                )}\n              </div>'

if (!src.includes(oldPhoneLine)) {
  console.error('ERROR: phone line search string not found in file. Aborting step 5.')
  process.exit(1)
}
src = src.replace(oldPhoneLine, newPhoneLine)

fs.writeFileSync(filePath, src, 'utf8')
console.log('admin/page.tsx — badge + phone line patched successfully.')
