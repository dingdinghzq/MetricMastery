const fs = require('fs')
const path = require('path')
const PDFDocument = require('pdfkit')
const sharp = require('sharp')

const INPUT_JSON = path.resolve(__dirname, '..', 'items_reference.json')
const OUTPUT_DIR = path.resolve(__dirname, '..', 'printables')
const PUBLIC_DIR = path.resolve(__dirname, '..', 'public')
const OUTPUT_PDF = path.join(OUTPUT_DIR, 'items-reference-printable.pdf')
const MAX_PAGES = 2

function asNumber(value) {
  return Number.isFinite(value) ? value : null
}

function round(value) {
  if (!Number.isFinite(value)) return null
  if (Math.abs(value) >= 100) return Math.round(value)
  if (Math.abs(value) >= 10) return Math.round(value * 10) / 10
  return Math.round(value * 100) / 100
}

function formatMass(mass) {
  if (!mass) return '—'
  if (asNumber(mass.value) !== null) return `${round(mass.value)} g`
  if (asNumber(mass.min) !== null && asNumber(mass.max) !== null) {
    return `${round(mass.min)}–${round(mass.max)} g`
  }
  if (asNumber(mass.max) !== null) return `≤${round(mass.max)} g`
  if (asNumber(mass.min) !== null) return `≥${round(mass.min)} g`
  return '—'
}

function formatDimensions(dim) {
  if (!dim || !dim.kind) return '—'
  switch (dim.kind) {
    case 'rectangle':
      return `${round(dim.width)}×${round(dim.height)} mm`
    case 'cuboid':
      return `${round(dim.length)}×${round(dim.width)}×${round(dim.height)} mm`
    case 'cube':
      return `${round(dim.edge)} mm cube`
    case 'cylinder':
      return `L${round(dim.length)} D${round(dim.diameter)} mm`
    case 'disc':
      return dim.thickness !== undefined
        ? `D${round(dim.diameter)} T${round(dim.thickness)} mm`
        : `D${round(dim.diameter)} mm`
    case 'sphere': {
      if (asNumber(dim.diameter) !== null) return `D${round(dim.diameter)} mm`
      if (asNumber(dim.diameter_min) !== null && asNumber(dim.diameter_max) !== null) {
        return `D${round(dim.diameter_min)}–${round(dim.diameter_max)} mm`
      }
      if (asNumber(dim.diameter_min) !== null) return `D≥${round(dim.diameter_min)} mm`
      return 'sphere'
    }
    case 'length':
      return `L${round(dim.length)} mm`
    case 'height':
      return `H${round(dim.height)} mm`
    case 'width':
      return `W${round(dim.width)} mm`
    default:
      return dim.kind
  }
}

function formatDerived(derived) {
  if (!derived) return '—'
  const parts = []
  if (asNumber(derived.density_g_per_cm3) !== null) parts.push(`density ${round(derived.density_g_per_cm3)} g/cm^3`)
  else if (asNumber(derived.volume_ml) !== null) parts.push(`V ${round(derived.volume_ml)} mL`)
  else if (asNumber(derived.surface_area_cm2) !== null) parts.push(`A ${round(derived.surface_area_cm2)} cm^2`)
  else if (asNumber(derived.surface_area_m2) !== null) parts.push(`A ${round(derived.surface_area_m2)} m^2`)
  else if (asNumber(derived.angle_deg) !== null) parts.push(`angle ${round(derived.angle_deg)} deg`)
  else if (asNumber(derived.diagonal_cm) !== null) parts.push(`diag ${round(derived.diagonal_cm)} cm`)
  return parts.join(' · ') || '—'
}

function tagColor(level) {
  if (level === 'regulated_standard') return '#234f9b'
  if (level === 'common_typical') return '#2f7f46'
  return '#555f73'
}

function truncate(doc, text, maxWidth) {
  const safe = String(text || '')
  if (doc.widthOfString(safe) <= maxWidth) return safe
  let out = safe
  while (out.length > 2 && doc.widthOfString(`${out}…`) > maxWidth) {
    out = out.slice(0, -1)
  }
  return `${out}…`
}

function resolveLocalImagePath(imageUrl) {
  if (!imageUrl || typeof imageUrl !== 'string') return null
  if (!imageUrl.startsWith('/')) return null
  return path.resolve(PUBLIC_DIR, `.${imageUrl}`)
}

async function loadPdfImageBuffer(filePath, cache) {
  if (!filePath || !fs.existsSync(filePath)) return null
  if (cache.has(filePath)) return cache.get(filePath)

  try {
    const rawBuffer = fs.readFileSync(filePath)

    const thumbnailBuffer = await sharp(rawBuffer)
      .rotate()
      .resize({ width: 280, height: 280, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 58, mozjpeg: true })
      .toBuffer()

    cache.set(filePath, thumbnailBuffer)
    return thumbnailBuffer
  } catch {
    cache.set(filePath, null)
    return null
  }
}

function drawPageHeader(doc, items, pageNumber, pageCount, margin, pageWidth) {
  const contentWidth = pageWidth - margin * 2
  const date = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  })

  const regulatedCount = items.filter((item) => item.standard_level === 'regulated_standard').length
  const commonCount = items.filter((item) => item.standard_level === 'common_typical').length
  const categories = new Set(items.map((item) => item.category).filter(Boolean)).size

  doc.fillColor('#1f2937').font('Helvetica-Bold').fontSize(pageNumber === 1 ? 22 : 18)
  doc.text('MetricMastery — Printable Items Reference', margin, margin)

  doc.font('Helvetica').fontSize(9).fillColor('#4b5563')
  doc.text(
    `${items.length} items · ${categories} categories · Regulated ${regulatedCount} · Common ${commonCount} · Generated ${date}`,
    margin,
    margin + (pageNumber === 1 ? 28 : 24)
  )

  doc.font('Helvetica-Bold').fontSize(8).fillColor('#475569')
  doc.text(`Page ${pageNumber} / ${pageCount}`, margin, margin + (pageNumber === 1 ? 42 : 38), { width: contentWidth, align: 'right' })

  return margin + (pageNumber === 1 ? 58 : 52)
}

async function drawItemCard(doc, item, x, y, cardWidth, cardHeight, imageCache) {
  doc.roundedRect(x, y, cardWidth, cardHeight, 8).fill('#ffffff')
  doc.roundedRect(x, y, cardWidth, cardHeight, 8).lineWidth(0.6).stroke('#dbe3ee')

  const imagePad = 7
  const imageBox = cardHeight - imagePad * 2
  const imageX = x + imagePad
  const imageY = y + imagePad
  const textX = imageX + imageBox + 8
  const textWidth = cardWidth - imageBox - imagePad * 2 - 8

  const imagePath = resolveLocalImagePath(item.image_url)
  const imageBuffer = await loadPdfImageBuffer(imagePath, imageCache)

  if (imageBuffer) {
    try {
      doc.save()
      doc.roundedRect(imageX, imageY, imageBox, imageBox, 6).clip()
      doc.image(imageBuffer, imageX, imageY, { fit: [imageBox, imageBox], align: 'center', valign: 'center' })
      doc.restore()
    } catch {
      doc.restore()
      doc.roundedRect(imageX, imageY, imageBox, imageBox, 6).fill('#eef2f7')
      doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
      doc.text('NO IMG', imageX, imageY + imageBox / 2 - 4, { width: imageBox, align: 'center' })
    }
  } else {
    doc.roundedRect(imageX, imageY, imageBox, imageBox, 6).fill('#eef2f7')
    doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(8)
    doc.text('NO IMG', imageX, imageY + imageBox / 2 - 4, { width: imageBox, align: 'center' })
  }

  doc.fillColor('#0f172a').font('Helvetica-Bold').fontSize(8.2)
  doc.text(item.display_name || 'Unnamed item', textX, y + 7, {
    width: textWidth,
    height: 18,
    ellipsis: true
  })

  doc.fillColor('#334155').font('Helvetica').fontSize(6.8)
  const line1 = `m ${formatMass(item.mass_g)}  |  ${formatDimensions(item.dimensions_mm)}`
  const line2 = formatDerived(item.derived_metrics)
  doc.text(truncate(doc, line1, textWidth), textX, y + 27, { width: textWidth })
  doc.text(truncate(doc, line2, textWidth), textX, y + 37, { width: textWidth })

  const category = item.category ? String(item.category).replace(/_/g, ' ') : 'uncategorized'
  const levelLabel = item.standard_level === 'regulated_standard'
    ? 'regulated'
    : item.standard_level === 'common_typical'
      ? 'common'
      : 'item'

  doc.fillColor('#64748b').font('Helvetica-Bold').fontSize(6.5)
  doc.text(`category: ${category}`, textX, y + 48, { width: textWidth * 0.62, ellipsis: true })

  doc.fillColor(tagColor(item.standard_level)).font('Helvetica-Bold').fontSize(6.5)
  doc.text(levelLabel.toUpperCase(), textX + textWidth * 0.64, y + 48, {
    width: textWidth * 0.36,
    align: 'right',
    ellipsis: true
  })
}

async function main() {
  const raw = fs.readFileSync(INPUT_JSON, 'utf8')
  const items = JSON.parse(raw)

  items.sort((a, b) => {
    const cat = String(a.category || '').localeCompare(String(b.category || ''))
    if (cat !== 0) return cat
    return String(a.display_name || '').localeCompare(String(b.display_name || ''))
  })

  fs.mkdirSync(OUTPUT_DIR, { recursive: true })

  const doc = new PDFDocument({ size: 'A4', layout: 'landscape', margin: 24 })
  doc.pipe(fs.createWriteStream(OUTPUT_PDF))
  const imageCache = new Map()

  const pageWidth = doc.page.width
  const pageHeight = doc.page.height
  const margin = 24
  const contentWidth = pageWidth - margin * 2

  const columns = 4
  const gutter = 10
  const cardWidth = (contentWidth - gutter * (columns - 1)) / columns
  const cardHeight = 60

  const rowsFirstPage = Math.floor((pageHeight - (margin + 58) - margin) / (cardHeight + 8))
  const rowsOtherPages = Math.floor((pageHeight - (margin + 52) - margin) / (cardHeight + 8))
  const perFirstPage = rowsFirstPage * columns
  const perOtherPage = rowsOtherPages * columns
  const maxCapacity = perFirstPage + perOtherPage * Math.max(0, MAX_PAGES - 1)
  const visibleItems = items.slice(0, maxCapacity)

  const pageCount = Math.min(
    MAX_PAGES,
    visibleItems.length <= perFirstPage ? 1 : 1 + Math.ceil((visibleItems.length - perFirstPage) / perOtherPage)
  )

  let itemIndex = 0
  for (let page = 1; page <= pageCount; page += 1) {
    if (page > 1) doc.addPage({ size: 'A4', layout: 'landscape', margin: 24 })

    doc.rect(0, 0, pageWidth, pageHeight).fill('#f8fafc')
    const gridTop = drawPageHeader(doc, items, page, pageCount, margin, pageWidth)
    const rows = page === 1 ? rowsFirstPage : rowsOtherPages

    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        if (itemIndex >= visibleItems.length) break
        const item = visibleItems[itemIndex]
        const x = margin + col * (cardWidth + gutter)
        const y = gridTop + row * (cardHeight + 8)
        await drawItemCard(doc, item, x, y, cardWidth, cardHeight, imageCache)
        itemIndex += 1
      }
    }
  }

  if (items.length > visibleItems.length) {
    doc.fillColor('#7f1d1d').font('Helvetica-Bold').fontSize(8)
    doc.text(
      `Note: ${items.length - visibleItems.length} items omitted to keep max ${MAX_PAGES} pages.`,
      margin,
      pageHeight - margin - 10,
      { width: contentWidth, align: 'right' }
    )
  }

  doc.end()
  console.log(`Generated: ${OUTPUT_PDF}`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
