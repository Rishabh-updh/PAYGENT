"use client";

import Link from "next/link";
import Image from "next/image";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import {
  IconHome,
  IconMandate,
  IconAgent,
  IconApproval,
  IconStorm,
  IconLedger,
  IconDispute,
} from "@/app/icons";
import { useFetch } from "@/lib/use-fetch";
import "./dashboard.css";

type DashboardStats = {
  pendingEscalations: number;
  openDisputes: number;
};

const NAV_ITEMS = [
  { href: "/dashboard", label: "Overview", icon: IconHome },
  { href: "/dashboard/mandates", label: "Mandates", icon: IconMandate },
  { href: "/dashboard/agents", label: "Agents", icon: IconAgent },
  { href: "/dashboard/approvals", label: "Approvals", icon: IconApproval, badgeKey: "pendingEscalations" as const },
  { href: "/dashboard/console", label: "Console", icon: IconStorm },
  { href: "/dashboard/ledger", label: "Ledger", icon: IconLedger },
  { href: "/dashboard/disputes", label: "Disputes", icon: IconDispute, badgeKey: "openDisputes" as const },
];

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { data } = useFetch<{ stats: DashboardStats }>("/api/dashboard");

  useEffect(() => {
    const handleReverseNavigation = (event: WheelEvent) => {
      if (event.deltaY < 0 && window.scrollY <= 4) {
        event.preventDefault();
        router.push("/");
      }
    };
    window.addEventListener("wheel", handleReverseNavigation, { passive: false });
    return () => window.removeEventListener("wheel", handleReverseNavigation);
  }, [router]);

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/dashboard";
    return pathname.startsWith(href);
  };

  return (
    <>
      {/* Mobile hamburger */}
      <button className="pg-hamburger" onClick={() => setSidebarOpen(true)} aria-label="Open menu">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <path d="M3 6h18M3 12h18M3 18h18" />
        </svg>
      </button>

      {/* Mobile overlay */}
      <div
        className={`pg-sidebar-overlay ${sidebarOpen ? "open" : ""}`}
        onClick={() => setSidebarOpen(false)}
      />

      {/* Sidebar — position: fixed, own scroll context */}
      <nav className={`pg-sidebar ${sidebarOpen ? "open" : ""}`}>
        <Link href="/" className="pg-sidebar-brand" onClick={() => setSidebarOpen(false)}>
          <Image src="/paygent-logo.png" alt="" width={20} height={27} />
          PAYGENT
        </Link>

        <div className="pg-sidebar-nav">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = isActive(item.href);
            const badgeValue = item.badgeKey && data?.stats?.[item.badgeKey];
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`pg-nav-link ${active ? "active" : ""}`}
                onClick={() => setSidebarOpen(false)}
              >
                <Icon />
                {item.label}
                {badgeValue ? <span className="pg-nav-badge">{badgeValue}</span> : null}
              </Link>
            );
          })}
        </div>

        <div style={{ padding: "16px 22px", borderTop: "1px solid rgba(255,255,255,.06)" }}>
          <Link
            href="/"
            style={{ fontSize: "10px", color: "#5a6362", letterSpacing: ".1em", textDecoration: "none" }}
          >
            ← BACK TO LANDING
          </Link>
        </div>
      </nav>

      {/* Main content area — scrolls independently */}
      <main className="pg-main">
        {children}
      </main>
    </>
  );
}
