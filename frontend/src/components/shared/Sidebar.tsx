"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/hooks/useAuth";
import { cn } from "@/lib/utils";
import { LayoutDashboard, FolderPlus, Users, LogOut, Brain } from "lucide-react";

const studentLinks = [
  { href: "/student/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/student/submit", label: "Submit Project", icon: FolderPlus },
];

const facultyLinks = [
  { href: "/faculty/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/faculty/submissions", label: "All Submissions", icon: Users },
];

export default function Sidebar() {
  const pathname = usePathname();
  const { user, logout } = useAuth();
  const links = user?.role === "faculty" ? facultyLinks : studentLinks;

  return (
    <aside className="w-64 bg-white border-r border-gray-200 h-screen sticky top-0 flex flex-col">
      <div className="p-5 border-b border-gray-100">
        <div className="flex items-center gap-2.5">
          <div className="bg-blue-600 rounded-lg p-1.5 text-white">
            <Brain size={18} />
          </div>
          <span className="font-bold text-gray-900 text-base tracking-tight">SmartEval</span>
        </div>
      </div>

      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {links.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={cn(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              pathname === href
                ? "bg-blue-50 text-blue-600"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
            )}
          >
            <Icon size={18} />
            {label}
          </Link>
        ))}
      </nav>

      <div className="p-4 border-t border-gray-200">
        <div className="mb-3 px-3">
          <p className="text-sm font-medium text-gray-800">{user?.full_name}</p>
          <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
        </div>
        <button
          onClick={() => { logout(); window.location.href = "/login"; }}
          className="flex items-center gap-3 w-full px-3 py-2 text-sm text-red-600 hover:bg-red-50 rounded-lg"
        >
          <LogOut size={18} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
