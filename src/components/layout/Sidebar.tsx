
import { Link, useLocation } from "react-router-dom";
import { useSidebar } from "./SidebarContext";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  LayoutDashboard,
  FileText,
  CheckSquare,
  Settings,
  Users,
  Shield,
  PanelLeft,
  BookOpen,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

const Sidebar = () => {
  const { isOpen, toggle } = useSidebar();
  const location = useLocation();

  const menuItems = [
    {
      icon: <LayoutDashboard size={20} />,
      name: "Dashboard",
      path: "/",
    },
    {
      icon: <FileText size={20} />,
      name: "Documents",
      path: "/documents",
    },
    {
      icon: <BookOpen size={20} />,
      name: "Templates",
      path: "/templates",
    },
    {
      icon: <CheckSquare size={20} />,
      name: "Approvals",
      path: "/approvals",
    },
    {
      icon: <Settings size={20} />,
      name: "Settings",
      path: "/settings",
    },
  ];

  const adminMenuItems = [
    {
      icon: <Users size={20} />,
      name: "User Management",
      path: "/admin",
    },
    {
      icon: <Shield size={20} />,
      name: "Roles & Permissions",
      path: "/admin/roles",
    },
  ];

  const isActive = (path: string) => {
    if (path === "/") {
      return location.pathname === path;
    }
    return location.pathname.startsWith(path);
  };

  return (
    <div
      className={cn(
        "h-screen fixed left-0 top-0 z-40 flex flex-col bg-sidebar text-sidebar-foreground border-r border-sidebar-border transition-all duration-300",
        isOpen ? "w-64" : "w-20"
      )}
    >
      <div className="flex items-center justify-between p-4 border-b border-sidebar-border h-16">
        <div className="flex items-center space-x-2">
          {isOpen && (
            <span className="font-bold text-xl tracking-tight text-white">
              DocFlow
            </span>
          )}
          {!isOpen && <FileText size={24} className="text-sidebar-primary" />}
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="text-sidebar-foreground hover:text-sidebar-foreground hover:bg-sidebar-accent"
          onClick={toggle}
        >
          {isOpen ? <ChevronLeft size={20} /> : <PanelLeft size={20} />}
        </Button>
      </div>

      <div className="flex flex-col justify-between h-full">
        <div className="px-3 py-4 flex flex-col gap-1 overflow-y-auto">
          {menuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {isOpen && <span>{item.name}</span>}
            </Link>
          ))}

          {isOpen && (
            <div className="mt-6 mb-2">
              <div className="px-3 mb-2 text-xs font-semibold text-sidebar-foreground/70">
                ADMIN
              </div>
            </div>
          )}
          {!isOpen && <div className="mt-6 mb-2 border-t border-sidebar-border"></div>}
          {adminMenuItems.map((item) => (
            <Link
              key={item.path}
              to={item.path}
              className={cn(
                "flex items-center rounded-md px-3 py-2 text-sm font-medium transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                isActive(item.path)
                  ? "bg-sidebar-primary text-sidebar-primary-foreground"
                  : "text-sidebar-foreground"
              )}
            >
              <span className="mr-3">{item.icon}</span>
              {isOpen && <span>{item.name}</span>}
            </Link>
          ))}
        </div>

        <div className="p-4 border-t border-sidebar-border mt-auto">
          <div className="flex items-center">
            <Avatar className="h-9 w-9">
              <AvatarImage src="" />
              <AvatarFallback className="bg-sidebar-primary text-sidebar-primary-foreground">JD</AvatarFallback>
            </Avatar>
            {isOpen && (
              <div className="ml-3">
                <p className="text-sm font-medium leading-none">John Doe</p>
                <p className="text-xs text-sidebar-foreground/70">Admin</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
