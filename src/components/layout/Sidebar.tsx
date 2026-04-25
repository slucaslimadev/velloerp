"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  ChartBar,
  Users,
  Kanban,
  Briefcase,
  SignOut,
  X,
  Gear,
  ChatCircleDots,
  Robot,
} from "@phosphor-icons/react";
import { createClient } from "@/lib/supabase/client";
import { VelloLogo } from "@/components/shared/VelloLogo";

const navItems = [
  { href: "/",              label: "Dashboard",    icon: ChartBar      },
  { href: "/leads",         label: "Leads",        icon: Users         },
  { href: "/kanban",        label: "Kanban",       icon: Kanban        },
  { href: "/clientes",      label: "Clientes",     icon: Briefcase     },
  { href: "/conversas",     label: "Conversas",    icon: ChatCircleDots},
  { href: "/agentes",       label: "Agentes Demo", icon: Robot         },
  { href: "/configuracoes", label: "Configurações",icon: Gear          },
];

interface SidebarProps {
  onClose?: () => void;
}

export function Sidebar({ onClose }: SidebarProps) {
  const pathname = usePathname();
  const router   = useRouter();
  const supabase = createClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <aside
      className="flex flex-col h-full w-64"
      style={{
        background: "var(--bg-surface)",
        borderRight: "1px solid var(--border-dim)",
      }}
    >
      {/* Logo */}
      <div
        className="flex items-center justify-between px-5 py-4"
        style={{ borderBottom: "1px solid var(--border-dim)" }}
      >
        <VelloLogo iconSize={38} titleSize={22} showSubtitle />

        {onClose && (
          <button
            onClick={onClose}
            className="lg:hidden p-1.5 rounded-lg transition-colors ml-2"
            style={{ color: "var(--text-3)" }}
          >
            <X size={18} />
          </button>
        )}
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-1">
        {navItems.map(({ href, label, icon: Icon }) => {
          const active =
            href === "/" ? pathname === "/" : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              onClick={onClose}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
              style={{
                fontFamily: "var(--ff-body)",
                color:      active ? "var(--cyan)" : "var(--text-2)",
                background: active ? "rgba(65, 190, 234, 0.08)" : "transparent",
                border:     active
                  ? "1px solid rgba(65, 190, 234, 0.15)"
                  : "1px solid transparent",
              }}
            >
              <Icon
                size={20}
                weight={active ? "duotone" : "regular"}
                style={{ color: active ? "var(--cyan)" : "var(--text-3)" }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div
        className="px-3 py-4"
        style={{ borderTop: "1px solid var(--border-dim)" }}
      >
        <button
          onClick={handleLogout}
          className="flex items-center gap-3 w-full px-3 py-2.5 rounded-xl text-sm font-medium transition-all duration-200"
          style={{ color: "var(--text-3)", fontFamily: "var(--ff-body)" }}
          onMouseEnter={(e) => {
            e.currentTarget.style.color = "#EF4444";
            e.currentTarget.style.background = "rgba(239, 68, 68, 0.08)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.color = "var(--text-3)";
            e.currentTarget.style.background = "transparent";
          }}
        >
          <SignOut size={20} />
          Sair
        </button>
      </div>
    </aside>
  );
}
