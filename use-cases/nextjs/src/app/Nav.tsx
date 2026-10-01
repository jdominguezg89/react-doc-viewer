"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const links = [
  { href: "/", label: "Client component" },
  { href: "/server-component", label: "Server component" },
];

export function Nav() {
  const pathname = usePathname();

  return (
    <nav className="topbar__nav" aria-label="Examples">
      {links.map(({ href, label }) => (
        <Link
          key={href}
          href={href}
          className="topbar__link"
          aria-current={pathname === href ? "page" : undefined}
        >
          {label}
        </Link>
      ))}
    </nav>
  );
}
