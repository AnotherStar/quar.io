// Resend HTTP API client. We use fetch directly so the project doesn't carry
// an extra SDK dependency. Returns the new email id on success.
//
// Configure via env:
//   RESEND_API_KEY   — secret API key from resend.com
//   RESEND_FROM      — verified "From" address, e.g. "quar.io <noreply@quar.io>"
//
// In dev, if RESEND_API_KEY is missing the call is a no-op and we log the
// payload instead — so the rest of the flow still works without a real key.

interface SendEmailOptions {
  to: string
  subject: string
  html: string
  text?: string
}

export async function sendEmail(opts: SendEmailOptions): Promise<{ id: string | null }> {
  const apiKey = process.env.RESEND_API_KEY
  const from = process.env.RESEND_FROM || 'quar.io <onboarding@resend.dev>'

  if (!apiKey) {
    console.warn('[email] RESEND_API_KEY missing — email not sent. To:', opts.to, 'Subject:', opts.subject)
    console.warn('[email] body preview:', opts.text ?? opts.html.replace(/<[^>]+>/g, ' ').slice(0, 500))
    return { id: null }
  }

  try {
    const res = await $fetch<{ id: string }>('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: {
        from,
        to: [opts.to],
        subject: opts.subject,
        html: opts.html,
        text: opts.text
      }
    })
    return { id: res?.id ?? null }
  } catch (e: any) {
    console.error('[email] resend send failed:', e?.data ?? e?.message ?? e)
    throw e
  }
}
