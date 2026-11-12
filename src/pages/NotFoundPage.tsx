import { Link } from 'react-router'
import { PageHeader } from '../components/PageHeader'

export function NotFoundPage() {
  return (
    <>
      <PageHeader
        eyebrow="Error 404"
        title="Page not found"
        lead="There is no page at this address. It may have moved, or the link may be mistyped."
      />
      <p className="mt-8">
        <Link
          to="/"
          className="inline-flex min-h-12 items-center rounded-full bg-signal px-7 font-medium text-space-950 hover:bg-ink-100"
        >
          Back to the start
        </Link>
      </p>
    </>
  )
}
