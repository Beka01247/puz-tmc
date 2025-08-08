"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";
import { UserType } from "@/constants/userTypes";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { signOut } from "next-auth/react";
import { Menu } from "lucide-react";

interface NavItem {
  title: string;
  href: string;
}

interface SessionUser {
  id?: string;
  fullName?: string;
}

interface DashboardLayoutProps {
  children: React.ReactNode;
  userType: UserType;
  session: SessionUser | null;
}

const doctorNavItems: NavItem[] = [
  { title: "Аккаунт", href: "/dashboard" },
  { title: "Список пациентов", href: "/dashboard/patients" },
  { title: "Обследование", href: "/examination" },
  { title: "Статистика", href: "/statistics" },
  { title: "Приемы", href: "/appointments" },
];

const nurseNavItems: NavItem[] = [
  { title: "Аккаунт", href: "/dashboard" },
  { title: "Пациенты", href: "/dashboard/patients" },
  { title: "Обследование", href: "/examination" },
  { title: "Статистика", href: "/statistics" },
  { title: "Приемы", href: "/appointments" },
];

// Function to create patient nav items with chat link containing their ID
const getPatientNavItems = (userId: string): NavItem[] => [
  { title: "Аккаунт", href: "/dashboard" },
  {
    title: "Чат с медсестрой",
    href: userId ? `/chat?patientId=${userId}` : "/chat",
  },
  { title: "Мониторинг состояния", href: "/dashboard/monitoring" },
  { title: "Лечение", href: "/dashboard/therapy" },
  { title: "Рекомендации", href: "/dashboard/recomendations" },
  { title: "Файлы", href: "/dashboard/files" },
  { title: "Прием", href: "/dashboard/consultations" },
];

const DashboardLayout = ({
  children,
  userType,
  session,
}: DashboardLayoutProps) => {
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Keep sidebar open by default on desktop screens (>=768px)
  useEffect(() => {
    const handleResize = () => {
      setSidebarOpen(window.innerWidth >= 768);
    };
    handleResize();
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  const navItems =
    userType === UserType.PATIENT
      ? getPatientNavItems(session?.id || "")
      : userType === UserType.NURSE
        ? nurseNavItems
        : doctorNavItems;

  // Extract user name and avatar from session prop
  const userName = session?.fullName || "User";
  const initials = userName
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div className="flex min-h-screen">
      {/* Sidebar & mobile overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 w-64 bg-card border-r transition-transform duration-300 md:relative md:translate-x-0", // Base
          sidebarOpen ? "translate-x-0" : "-translate-x-full" // Toggle
        )}
      >
        <div className="p-6">
          <h2 className="text-2xl font-semibold text-primary">Sapa Telemed</h2>
        </div>
        <nav className="px-4 py-2">
          {navItems.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center px-4 py-2 my-1 text-sm rounded-md transition-colors",
                pathname === item.href
                  ? "bg-primary text-primary-foreground"
                  : "hover:bg-muted"
              )}
              onClick={() => setSidebarOpen(false)} // close after navigation on mobile
            >
              {item.title}
            </Link>
          ))}
        </nav>
      </aside>

      {/* Main content */}
      <div className="flex-1">
        <header className="h-16 border-b flex items-center px-4 md:px-6 bg-card space-x-4">
          {/* Hamburger */}
          <button
            className="md:hidden p-2 rounded-md hover:bg-muted transition-colors"
            onClick={() => setSidebarOpen((prev) => !prev)}
          >
            <Menu size={24} />
          </button>

          <h1 className="text-lg font-semibold flex-1">
            {navItems.find((item) => item.href === pathname)?.title ||
              "Dashboard"}
          </h1>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <div
                className={cn(
                  "flex items-center space-x-3 cursor-pointer",
                  "px-3 py-1.5 rounded-md bg-muted/50 hover:bg-muted transition-colors border border-border"
                )}
              >
                <Avatar>
                  <AvatarImage alt={userName} />
                  <AvatarFallback>{initials}</AvatarFallback>
                </Avatar>
                <span className="text-sm font-medium hidden sm:inline">
                  {userName}
                </span>
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem
                onClick={() => signOut({ callbackUrl: "/sign-in" })}
              >
                Выйти
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </header>
        <main className="p-4 md:p-6">{children}</main>
      </div>
    </div>
  );
};

export default DashboardLayout;
