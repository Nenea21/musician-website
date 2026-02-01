import { google } from 'googleapis';
import nodemailer from 'nodemailer';

export const prerender = false;

export async function POST({ request }) {
  try {
    const data = await request.json();
    const { name, email, phone, eventType, eventDate, location, message } = data;

    // Validate required fields
    if (!name || !email || !phone || !eventType || !eventDate) {
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Toate câmpurile obligatorii trebuie completate.' 
      }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // OAuth2 credentials - these should be in environment variables
    const CLIENT_ID = import.meta.env.GMAIL_CLIENT_ID;
    const CLIENT_SECRET = import.meta.env.GMAIL_CLIENT_SECRET;
    const REDIRECT_URI = import.meta.env.GMAIL_REDIRECT_URI || 'https://developers.google.com/oauthplayground';
    const REFRESH_TOKEN = import.meta.env.GMAIL_REFRESH_TOKEN;
    const USER_EMAIL = import.meta.env.GMAIL_USER_EMAIL || 'cristianalbu93@gmail.com';

    // Check if credentials are configured
    if (!CLIENT_ID || !CLIENT_SECRET || !REFRESH_TOKEN) {
      console.error('Gmail API credentials not configured');
      return new Response(JSON.stringify({ 
        success: false, 
        message: 'Configurarea email-ului nu este completă. Vă rugăm să contactați direct.' 
      }), {
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }

    // Create OAuth2 client
    const oauth2Client = new google.auth.OAuth2(
      CLIENT_ID,
      CLIENT_SECRET,
      REDIRECT_URI
    );

    oauth2Client.setCredentials({
      refresh_token: REFRESH_TOKEN
    });

    // Get access token
    const accessToken = await oauth2Client.getAccessToken();

    // Create transporter using Gmail API
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      auth: {
        type: 'OAuth2',
        user: USER_EMAIL,
        clientId: CLIENT_ID,
        clientSecret: CLIENT_SECRET,
        refreshToken: REFRESH_TOKEN,
        accessToken: accessToken.token
      }
    });

    // Email content
    const emailSubject = `Rezervare Eveniment - ${name}`;
    const emailBody = `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background: #8B0000; color: white; padding: 20px; text-align: center; border-radius: 5px 5px 0 0; }
    .content { background: #f9f9f9; padding: 30px; border: 1px solid #ddd; }
    .section { margin-bottom: 25px; }
    .section-title { color: #8B0000; font-weight: bold; font-size: 16px; margin-bottom: 10px; border-bottom: 2px solid #D4AF37; padding-bottom: 5px; }
    .info-row { padding: 8px 0; }
    .label { font-weight: bold; color: #666; }
    .value { color: #333; }
    .footer { text-align: center; padding: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1 style="margin: 0;">🎻 Rezervare Nouă</h1>
      <p style="margin: 5px 0 0 0;">Aurel Dinu</p>
    </div>
    
    <div class="content">
      <div class="section">
        <div class="section-title">📋 Detalii Client</div>
        <div class="info-row">
          <span class="label">Nume:</span>
          <span class="value">${name}</span>
        </div>
        <div class="info-row">
          <span class="label">Email:</span>
          <span class="value"><a href="mailto:${email}">${email}</a></span>
        </div>
        <div class="info-row">
          <span class="label">Telefon:</span>
          <span class="value"><a href="tel:${phone}">${phone}</a></span>
        </div>
      </div>

      <div class="section">
        <div class="section-title">🎉 Detalii Eveniment</div>
        <div class="info-row">
          <span class="label">Tip Eveniment:</span>
          <span class="value">${eventType}</span>
        </div>
        <div class="info-row">
          <span class="label">Data Eveniment:</span>
          <span class="value">${eventDate}</span>
        </div>
        <div class="info-row">
          <span class="label">Locație:</span>
          <span class="value">${location || 'Nu a fost specificată'}</span>
        </div>
      </div>

      ${message ? `
      <div class="section">
        <div class="section-title">💬 Mesaj</div>
        <div style="background: white; padding: 15px; border-radius: 5px; border-left: 3px solid #D4AF37;">
          ${message.replace(/\n/g, '<br>')}
        </div>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      <p>Acest email a fost trimis automat prin formularul de rezervare de pe site-ul Aurel Dinu</p>
      <p style="margin-top: 10px;">
        <a href="mailto:${email}" style="color: #8B0000; text-decoration: none;">Răspunde direct la ${email}</a>
      </p>
    </div>
  </div>
</body>
</html>
    `.trim();

    // Plain text version
    const textBody = `
Rezervare Nouă - Aurel Dinu

DETALII CLIENT
━━━━━━━━━━━━━━━━━━━━━
Nume: ${name}
Email: ${email}
Telefon: ${phone}

DETALII EVENIMENT
━━━━━━━━━━━━━━━━━━━━━
Tip Eveniment: ${eventType}
Data Eveniment: ${eventDate}
Locație: ${location || 'Nu a fost specificată'}

${message ? `MESAJ\n━━━━━━━━━━━━━━━━━━━━━\n${message}` : ''}

━━━━━━━━━━━━━━━━━━━━━
Acest email a fost trimis automat prin formularul de rezervare.
Răspunde direct la: ${email}
    `.trim();

    // Send email
    const mailOptions = {
      from: `"Website Aurel Dinu" <${USER_EMAIL}>`,
      to: USER_EMAIL,
      replyTo: email,
      subject: emailSubject,
      text: textBody,
      html: emailBody
    };

    await transporter.sendMail(mailOptions);

    console.log('Email sent successfully to:', USER_EMAIL);

    return new Response(JSON.stringify({ 
      success: true, 
      message: 'Mulțumesc pentru rezervare, vă voi contacta în curând.' 
    }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Error sending email:', error);
    return new Response(JSON.stringify({ 
      success: false, 
      message: 'A apărut o eroare la trimiterea mesajului. Vă rugăm să încercați din nou sau să ne contactați direct.' 
    }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' }
    });
  }
}