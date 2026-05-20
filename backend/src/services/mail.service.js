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
  <div style="font-family:sans-serif;background:#ffffff;padding:40px 20px;text-align:center;">

    <!-- Icon Kreis -->
    <div style="
      width:70px;
      height:70px;
      margin:0 auto 20px auto;
      border-radius:50%;
      background:#F3E3C3;
      display:flex;
      align-items:center;
      justify-content:center;
      box-shadow:0 0 20px rgba(212,165,116,0.4);
    ">
      <span style="font-size:34px;color:#D4A574;">✓</span>
    </div>

    <!-- Titel -->
    <h1 style="margin:0;color:#D4A574;font-size:22px;">
      Bestellung bestätigt
    </h1>

    <p style="color:#666;margin-top:8px;">
      Danke für deine Bestellung! Wir bearbeiten sie sofort.
    </p>

    <!-- Card -->
    <div style="
      max-width:560px;
      margin:30px auto 0 auto;
      background:#FFF8F2;
      border:1px solid #f0e0cc;
      border-radius:12px;
      padding:24px;
      text-align:left;
    ">

      <p style="color:#888;font-size:13px;margin-top:0;">
        Bestellnummer: <strong>#${orderId}</strong>
      </p>

      <h3 style="color:#D4A574;margin:16px 0 8px;">
        Deine Artikel
      </h3>

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

      <h3 style="color:#D4A574;margin:24px 0 8px;">
        Lieferadresse
      </h3>

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