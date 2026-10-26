import { useState, type FormEvent } from 'react'
import { Container } from '../components/Container'
import { SEO } from '../components/SEO'

const endpoint = 'https://formspree.io/f/mjyyypkk'

export function Contact() {
  const [status, setStatus] = useState<'idle' | 'sending' | 'success' | 'error'>('idle')
  const [error, setError] = useState('')
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (status === 'sending') return
    const form = event.currentTarget
    if (!form.reportValidity()) return
    const data = new FormData(form)
    // Honeypot: discard automated submissions without forwarding their content.
    if (String(data.get('_gotcha') || '').trim()) { setStatus('success'); form.reset(); return }
    setStatus('sending')
    setError('')
    try {
      const response = await fetch(endpoint, {
        method: 'POST',
        body: data,
        headers: { Accept: 'application/json' },
      })
      if (!response.ok) throw new Error('The form service could not accept your message.')
      form.reset()
      setStatus('success')
    } catch {
      setStatus('error')
      setError('Your message could not be sent. Please try again or use the email link below.')
    }
  }

  const field = 'mt-2 w-full rounded-lg border border-outline bg-canvas px-4 py-3 text-foreground focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent'
  return (
    <>
      <SEO title="Contact | Simpyll" description="Contact Simpyll about software, writing, collaboration, and clinical technology projects." path="/contact" />
      <main id="main-content" tabIndex={-1} className="min-h-screen bg-canvas py-16 text-foreground sm:py-24">
        <Container>
          <div className="mx-auto max-w-2xl">
            <p className="text-sm font-semibold uppercase tracking-wider text-accent">Get in touch</p>
            <h1 className="mt-4 font-display text-4xl font-semibold sm:text-5xl">Contact Simpyll</h1>
            <p className="mt-5 text-muted">Have a question, collaboration idea, or project inquiry? Send a message below.</p>
            <p className="mt-3 text-sm text-muted">Please do not include patient information, medical records, passwords, or other sensitive data. Messages are processed by Formspree and delivered by email.</p>
            {status === 'success' ? (
              <div role="status" className="mt-8 rounded-lg border border-outline p-6">
                <p className="font-semibold">Thank you — your message was submitted.</p>
                <button type="button" className="mt-4 text-accent underline" onClick={() => setStatus('idle')}>Send another message</button>
              </div>
            ) : (
              <form onSubmit={submit} className="mt-8 space-y-5">
                <div><label htmlFor="contact-name" className="font-medium">Name</label><input id="contact-name" name="name" autoComplete="name" maxLength={120} required className={field} /></div>
                <div><label htmlFor="contact-email" className="font-medium">Email</label><input id="contact-email" name="email" type="email" autoComplete="email" maxLength={254} required className={field} /></div>
                <div><label htmlFor="contact-subject" className="font-medium">Subject</label><input id="contact-subject" name="subject" maxLength={160} required className={field} /></div>
                <div><label htmlFor="contact-message" className="font-medium">Message</label><textarea id="contact-message" name="message" rows={7} maxLength={10000} required className={field} /></div>
                <div className="absolute -left-[10000px]" aria-hidden="true"><label htmlFor="contact-website">Leave this field blank</label><input id="contact-website" name="_gotcha" tabIndex={-1} autoComplete="off" /></div>
                {status === 'error' && <p role="alert" className="text-sm text-red-500">{error}</p>}
                <button type="submit" disabled={status === 'sending'} className="min-h-11 rounded-lg bg-accent px-6 py-3 font-semibold text-canvas disabled:opacity-60">{status === 'sending' ? 'Sending…' : 'Send message'}</button>
              </form>
            )}
            <p className="mt-8 text-sm text-muted">Prefer email? <a href="mailto:simpyll.com@gmail.com" className="text-accent underline">simpyll.com@gmail.com</a></p>
          </div>
        </Container>
      </main>
    </>
  )
}
