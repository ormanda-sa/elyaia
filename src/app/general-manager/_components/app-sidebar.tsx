// src/app/general-manager/_components/app-sidebar.tsx
"use client";

import * as React from "react";

import { NavDocuments } from "./nav-documents";
import { NavMain } from "./nav-main";
import { NavSecondary } from "./nav-secondary";
import { NavUser } from "./nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";

/* --------- SVG Icons محلية بديلة لـ tabler --------- */

type IconProps = React.SVGProps<SVGSVGElement>;

function IconInnerShadowTop(props: IconProps) {
  return (
    <svg
      {...props}
      viewBox="0 0 24 24"
      className={props.className ?? "h-5 w-5"}
    >
      <rect
        x="4"
        y="4"
        width="16"
        height="16"
        rx="4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6 10a6 6 0 0 1 6-4a6 6 0 0 1 6 4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDashboard(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <rect
        x="4"
        y="4"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13"
        y="4"
        width="7"
        height="5"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="4"
        y="13"
        width="7"
        height="7"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <rect
        x="13"
        y="11"
        width="7"
        height="9"
        rx="1.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconListDetails(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <circle cx="6" cy="7" r="0.9" fill="currentColor" />
      <circle cx="6" cy="12" r="0.9" fill="currentColor" />
      <circle cx="6" cy="17" r="0.9" fill="currentColor" />
      <path
        d="M10 7h8M10 12h8M10 17h8"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconChartBar(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <path
        d="M5 19V10M11 19V5M17 19v-8"
        stroke="currentColor"
        strokeWidth="1.8"
        strokeLinecap="round"
      />
      <path
        d="M4 19h16"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFolder(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <path
        d="M4 7a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v7a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconUsers(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <circle
        cx="9"
        cy="9"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4 19a5 5 0 0 1 10 0"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M16 11a2.4 2.4 0 1 0 0-4.8"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
      <path
        d="M18.5 19a4 4 0 0 0-4-3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
      />
    </svg>
  );
}

function IconCamera(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <rect
        x="4"
        y="6"
        width="16"
        height="12"
        rx="2"
        ry="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <circle
        cx="12"
        cy="12"
        r="3.2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 5l2-2h2l2 2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFileDescription(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <path
        d="M7 4h7l4 4v12H7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <path
        d="M14 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M10 12h5M10 15h5"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFileAi(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <rect
        x="6"
        y="4"
        width="12"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10 16l2-6l2 6M9 16h2M13 16h2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function IconSettings(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <circle
        cx="12"
        cy="12"
        r="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M4 12h2M18 12h2M12 4v2M12 18v2M7 7l1.5 1.5M15.5 15.5L17 17M7 17l1.5-1.5M15.5 8.5L17 7"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconHelp(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M10.5 9a1.75 1.75 0 0 1 3 1.1c0 1.2-1.5 1.5-1.5 2.9"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <circle cx="12" cy="16.2" r="0.9" fill="currentColor" />
    </svg>
  );
}

function IconSearch(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <circle
        cx="11"
        cy="11"
        r="5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M15 15l4 4"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconDatabase(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <ellipse
        cx="12"
        cy="6"
        rx="6"
        ry="3"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M6 6v6c0 1.7 2.7 3 6 3s6-1.3 6-3V6M6 12v6c0 1.7 2.7 3 6 3s6-1.3 6-3v-6"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
    </svg>
  );
}

function IconReport(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <rect
        x="6"
        y="4"
        width="12"
        height="16"
        rx="2"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M9 10h6M9 13h4M9 7h3"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function IconFileWord(props: IconProps) {
  return (
    <svg {...props} viewBox="0 0 24 24" className={props.className ?? "h-4 w-4"}>
      <path
        d="M7 4h7l4 4v12H7z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M14 4v4h4"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
      />
      <path
        d="M9 16l1.2-4l1.3 3l1.3-3L14 16"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/* --------- بيانات السايدبار --------- */

const data = {
  user: {
    name: "Super Admin",
    email: "admin@darb.com",
    avatar: "",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/general-manager",
      icon: IconDashboard,
    },
    {
      title: "Lifecycle",
      url: "#",
      icon: IconListDetails,
    },
    {
      title: "Analytics",
      url: "/general-manager/analytics",
      icon: IconChartBar,
    },
    {
      title: "Projects",
      url: "#",
      icon: IconFolder,
    },
    {
      title: "Team",
      url: "#",
      icon: IconUsers,
    },
  ],
  navSecondary: [
    {
      title: "Settings",
      url: "/general-manager/settings",
      icon: IconSettings,
    },
    {
      title: "Get Help",
      url: "#",
      icon: IconHelp,
    },
    {
      title: "Search",
      url: "#",
      icon: IconSearch,
    },
  ],
  documents: [
    {
      name: "متجر",
      url: "/general-manager/stores",
      icon: IconDatabase,
    },
    {
      name: "خطط الاشتراك",
      url: "/general-manager/settings/plans",
      icon: IconReport,
    },
    {
      name: "الاشتراكات",
      url: "/general-manager/subscriptions",
      icon: IconFileWord,
    },
  ],
};

export function AppSidebar(props: React.ComponentProps<typeof Sidebar>) {
  return (
    <Sidebar side="right" collapsible="offcanvas" {...props}>
      <SidebarHeader>
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton
              asChild
              className="data-[slot=sidebar-menu-button]:!p-1.5"
            >
              <a href="#">
                <IconInnerShadowTop className="!size-5" />
                <span className="text-base font-semibold">Darb Filters</span>
              </a>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      <SidebarContent>
        <NavMain items={data.navMain} />
        <NavDocuments items={data.documents} />
        <NavSecondary items={data.navSecondary} className="mt-auto" />
      </SidebarContent>
      <SidebarFooter>
        <NavUser user={data.user} />
      </SidebarFooter>
    </Sidebar>
  );
}
