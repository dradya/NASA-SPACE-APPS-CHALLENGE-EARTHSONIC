import type { ReactNode } from 'react'

interface PageHeaderProps {
  /** Small label above the title. */
  eyebrow: string
  /** Becomes the page's single h1 and receives focus after navigation. */
  title: ReactNode
  /** One or two sentences under the title. */
  lead: string
}

export function PageHeader({ eyebrow, title, lead }: PageHeaderProps) {
  return (
    <header className="rise max-w-4xl">
      <p className="text-sm font-medium uppercase tracking-[0.2em] text-signal">{eyebrow}</p>
      <h1
        data-page-heading
        tabIndex={-1}
        className="mt-4 font-display text-4xl font-light leading-[1.08] tracking-tight text-ink-100 sm:text-6xl"
      >
        {title}
      </h1>
      <p className="mt-6 max-w-2xl text-lg leading-relaxed text-ink-300">{lead}</p>
    </header>
  )
}
