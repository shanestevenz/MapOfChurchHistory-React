import type { Metadata } from 'next'
import Link from 'next/link'

export const metadata: Metadata = {
  title: 'Privacy notice | Map of Church History',
  description: 'How Map of Church History handles contribution and usage data.',
}

export default function PrivacyPage() {
  const contact = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL

  return (
    <main className="mx-auto h-dvh max-w-3xl overflow-y-auto px-5 py-12 sm:px-8">
      <Link href="/" className="text-sm text-muted-foreground underline underline-offset-4">
        Return to the timeline
      </Link>
      <article className="mt-8 space-y-8">
        <header className="space-y-3">
          <h1 className="font-serif text-4xl">Privacy notice</h1>
          <p className="text-sm text-muted-foreground">Last updated September 8, 2026</p>
        </header>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">What this site collects</h2>
          <p className="leading-relaxed text-foreground/85">
            You can browse the public timeline without creating an account. If you submit an edit suggestion,
            the site stores the name you provide (or “Anonymous”), your edit summary, proposed text, supporting
            source, submission time, and the curator’s eventual decision.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Security and abuse prevention</h2>
          <p className="leading-relaxed text-foreground/85">
            Cloudflare Turnstile checks whether a submission appears automated. The server converts your IP
            address into a one-way, secret-keyed identifier used only to enforce a daily submission limit; it does
            not store the raw IP address in the application database. Rate-limit records expire after 48 hours.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Analytics and service providers</h2>
          <p className="leading-relaxed text-foreground/85">
            The production site uses Vercel Analytics to understand aggregate site usage. Vercel hosts the web
            application, Supabase hosts authentication and timeline data, and Cloudflare provides Turnstile abuse
            protection. Each provider processes limited technical data needed to operate its service.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Retention and choices</h2>
          <p className="leading-relaxed text-foreground/85">
            Declined suggestions are retained for 90 days and approved suggestions for one year so curators can
            audit decisions. You may submit without giving your name. Do not include private or sensitive personal
            information in a suggestion.
          </p>
        </section>

        <section className="space-y-2">
          <h2 className="font-serif text-2xl">Contact</h2>
          <p className="leading-relaxed text-foreground/85">
            To ask a privacy question or request removal of a contribution, contact the site operator
            {contact ? (
              <> at <a href={`mailto:${contact}`} className="underline underline-offset-4">{contact}</a>.</>
            ) : (
              '. The operator must publish a contact address here before launch.'
            )}
          </p>
        </section>
      </article>
    </main>
  )
}
