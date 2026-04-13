import { cn } from "@/lib/utils";
import { Home, Globe, Bell, History, Settings } from "lucide-react";

type NavItem = {
  id: string;
  label: string;
  icon: React.ReactNode;
};

const navItems: NavItem[] = [
  { id: "dashboard", label: "首页", icon: <Home className="h-5 w-5" /> },
  { id: "browser", label: "登录与浏览器", icon: <Globe className="h-5 w-5" /> },
  { id: "notifications", label: "通知设置", icon: <Bell className="h-5 w-5" /> },
  { id: "results", label: "结果与历史", icon: <History className="h-5 w-5" /> },
  { id: "settings", label: "设置与日志", icon: <Settings className="h-5 w-5" /> },
];

type SidebarProps = {
  currentPage: string;
  onNavigate: (page: string) => void;
};

export function Sidebar({ currentPage, onNavigate }: SidebarProps) {
  return (
    <aside className="w-56 bg-muted/40 border-r h-screen flex flex-col">
      <div className="p-4 border-b">
        <h1 className="text-lg font-semibold">Unblind</h1>
        <p className="text-xs text-muted-foreground">盲审结果监控</p>
      </div>
      <nav className="flex-1 p-2">
        {navItems.map((item) => (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={cn(
              "w-full flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors",
              currentPage === item.id
                ? "bg-primary text-primary-foreground"
                : "hover:bg-muted"
            )}
          >
            {item.icon}
            {item.label}
          </button>
        ))}
      </nav>
    </aside>
  );
}
