import { NavLink } from 'react-router'
import { APP_ROUTES } from '../routes'

const linkBase =
  'inline-flex min-h-11 items-center border-b-2 px-3 text-sm font-medium tracking-wide transition-colors'

export function NavBar() {
  return (
    <nav aria-label="Primary">
      <ul className="flex flex-wrap gap-x-1 gap-y-1">
        {APP_ROUTES.map((route) => (
          <li key={route.key}>
            <NavLink
              to={route.path}
              end={route.path === '/'}
              className={({ isActive }) =>
                `${linkBase} ${
                  isActive
                    ? 'border-signal text-ink-100'
                    : 'border-transparent text-ink-300 hover:text-ink-100'
                }`
              }
            >
              {route.navLabel}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}
