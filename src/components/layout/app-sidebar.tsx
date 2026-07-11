"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  Building2,
  MapPin,
  BookOpen,
  ClipboardList,
  MessageSquare,
  AlertTriangle,
  Users,
  Settings,
  Palmtree,
} from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

const navItems = [
  { title: "Overview", url: "/dashboard", icon: LayoutDashboard },
  { title: "Properties", url: "/dashboard/properties", icon: Building2 },
  { title: "Recommendations", url: "/dashboard/recommendations", icon: MapPin },
  { title: "House Manual", url: "/dashboard/house-manual", icon: ClipboardList },
  { title: "Knowledge Base", url: "/dashboard/knowledge-base", icon: BookOpen },
  { title: "Conversations", url: "/dashboard/conversations", icon: MessageSquare },
  { title: "Escalations", url: "/dashboard/escalations", icon: AlertTriangle },
  { title: "Guests", url: "/dashboard/guests", icon: Users },
  { title: "Settings", url: "/dashboard/settings", icon: Settings },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader>
        <Link href="/dashboard" className="flex items-center gap-2 px-2 py-1.5">
          <Palmtree className="h-5 w-5 shrink-0 text-primary" />
          <span className="font-semibold group-data-[collapsible=icon]:hidden">
            Villa Concierge
          </span>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Manage</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const isActive =
                  item.url === "/dashboard"
                    ? pathname === "/dashboard"
                    : pathname.startsWith(item.url);
                return (
                  <SidebarMenuItem key={item.url}>
                    <SidebarMenuButton
                      isActive={isActive}
                      tooltip={item.title}
                      render={<Link href={item.url} />}
                    >
                      <item.icon />
                      <span>{item.title}</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                );
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  );
}
