// services/mail.service.js
const nodemailer = require('nodemailer')

function createTransporter() {
  return nodemailer.createTransport({
    service: 'gmail',
    auth: {
      user: process.env.MAIL_USER,
      pass: process.env.MAIL_PASS?.trim(),
    },
  })
}

// ─── Bestätigungs-E-Mail ──────────────────────────────────────────────────────
exports.sendOrderConfirmation = async ({ to, orderId, items, total, shipping }) => {
  const transporter = createTransporter()

  const itemRows = JSON.parse(typeof items === 'string' ? items : JSON.stringify(items))
    .map(
      (item) => `
      <tr>
        <td style="padding:8px;border-bottom:1px solid #f0e0cc;">${item.name}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0cc;text-align:center;">${item.quantity}</td>
        <td style="padding:8px;border-bottom:1px solid #f0e0cc;text-align:right;">€${Number(item.price).toFixed(2)}</td>
      </tr>`
    )
    .join('')

  const html = `
    <div style="font-family:sans-serif;max-width:560px;margin:auto;color:#333;">
      <div style="background:#D4A574;padding:24px 32px;border-radius:12px 12px 0 0;">
        <h1 style="margin:0;color:#fff;font-size:22px;">Bestellung bestätigt ✓</h1>
      </div>

      <div style="background:#FFF8F2;padding:32px;border:1px solid #f0e0cc;border-top:none;border-radius:0 0 12px 12px;">
        <p>Danke für deine Bestellung! Wir bearbeiten sie so schnell wie möglich.</p>

        <p style="color:#888;font-size:13px;">Bestellnummer: <strong>#${orderId}</strong></p>

        <h3 style="color:#D4A574;margin-bottom:8px;">Deine Artikel</h3>
        <table style="width:100%;border-collapse:collapse;font-size:14px;">
          <thead>
            <tr style="background:#F5E6D3;">
              <th style="padding:8px;text-align:left;">Produkt</th>
              <th style="padding:8px;text-align:center;">Menge</th>
              <th style="padding:8px;text-align:right;">Preis</th>
            </tr>
          </thead>
          <tbody>${itemRows}</tbody>
        </table>

        <div style="margin-top:16px;text-align:right;font-size:15px;">
          <strong>Gesamt: €${Number(total).toFixed(2)}</strong>
        </div>

        <h3 style="color:#D4A574;margin:24px 0 8px;">Lieferadresse</h3>
        <p style="margin:0;font-size:14px;line-height:1.8;">
          ${shipping.address}<br>
          ${shipping.postal} ${shipping.city}<br>
          ${shipping.country}
        </p>
      </div>
    </div>
  `

  await transporter.sendMail({
    from: `"Dein Shop" <${process.env.MAIL_USER}>`,
    to,
    subject: `Bestellbestätigung #${orderId}`,
    html,
  })
}