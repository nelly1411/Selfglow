// backend/src/services/mail.service.js
const nodemailer = require('nodemailer')

function createTransporter() {
  return nodemailer.createTransport({
    host: process.env.MAIL_HOST || 'smtp-relay.brevo.com',
    port: Number(process.env.MAIL_PORT) || 587,
    secure: Number(process.env.MAIL_PORT) === 465,
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS?.trim(),
    },
  })
}

function formatPrice(value) {
  return Number(value).toLocaleString('de-DE', {
    style: 'currency',
    currency: 'EUR',
  })
}

function parseItems(items) {
  if (!items) return []

  if (typeof items === 'string') {
    try {
      return JSON.parse(items)
    } catch {
      return []
    }
  }

  return Array.isArray(items) ? items : []
}

// ─── Bestätigungs-E-Mail ──────────────────────────────────────────────────────
exports.sendOrderConfirmation = async ({
  to,
  orderId,
  items,
  total,
  shipping,
  paymentMethod,
}) => {
  if (
    !process.env.MAIL_USER ||
    !process.env.MAIL_PASS ||
    !process.env.MAIL_FROM ||
    !to
  ) {
    console.log('Mailversand übersprungen: Mail-Daten oder Empfänger fehlen.')
    return
  }

  const transporter = createTransporter()
  const parsedItems = parseItems(items)

  const itemRows = parsedItems
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0e0cc;">
          ${item.name}
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0e0cc;text-align:center;">
          ${item.quantity || 1}
        </td>
        <td style="padding:8px;border-bottom:1px solid #f0e0cc;text-align:right;">
          ${formatPrice(Number(item.price) * (item.quantity || 1))}
        </td>
      </tr>`
    )
    .join('')

  const html = `
    <div style="font-family:Arial,sans-serif;max-width:560px;margin:auto;color:#333;">
      <div style="background:#D4A574;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Bestellung bestätigt ✓</h1>
      </div>

      <div style="background:#FFF8F2;padding:32px;border:1px solid #f0e0cc;border-top:none;border-radius:0 0 12px 12px;">
        <p>Danke für deine Bestellung bei <strong>SelfGlow</strong>!</p>
        <p>Wir haben deine Bestellung erfolgreich erhalten.</p>

        <p style="color:#888;font-size:13px;">
          Bestellnummer: <strong>#${orderId}</strong>
        </p>

        ${
          paymentMethod
            ? `<p style="color:#888;font-size:13px;">
                Zahlungsmethode: <strong>${paymentMethod}</strong>
              </p>`
            : ''
        }

        <h3 style="color:#D4A574;margin-bottom:8px;">Deine Artikel</h3>

        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#F5E6D3;">
              <th style="padding:8px;text-align:left;">Produkt</th>
              <th style="padding:8px;text-align:center;">Menge</th>
              <th style="padding:8px;text-align:right;">Preis</th>
            </tr>
          </thead>
          <tbody>
            ${
              itemRows ||
              `<tr>
                <td colspan="3" style="padding:8px;">Keine Produktdetails vorhanden.</td>
              </tr>`
            }
          </tbody>
        </table>

        <div style="margin-top:16px;text-align:right;font-size:15px;">
          <strong>Gesamt: ${formatPrice(total)}</strong>
        </div>

        <h3 style="color:#D4A574;margin:24px 0 8px;">Lieferadresse</h3>

        <p style="margin:0;font-size:14px;line-height:1.8;">
          ${shipping?.address || ''}<br>
          ${shipping?.postal || ''} ${shipping?.city || ''}<br>
          ${shipping?.country || ''}
        </p>

        <p style="margin-top:24px;color:#888;font-size:12px;">
          Dies ist eine Demo-Bestellbestätigung für das SelfGlow-Projekt.
        </p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: process.env.MAIL_FROM,
    to,
    subject: `Bestellbestätigung #${orderId}`,
    html,
  })
}