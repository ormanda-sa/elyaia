import * as React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  SidebarRail,
} from "@/components/ui/sidebar";

// نوع واضح لعناصر الناف
type NavSubItem = {
  title: string;
  url: string;
  isActive?: boolean;
};

type NavItem = {
  title: string;
  url: string;
  items?: NavSubItem[];
};

const nav: NavItem[] = [
  {
    title: "تنسيق الخلفية",
    url: "#hero-bg",
    items: [],
  },
  {
    title: "النصوص والعداد",
    url: "#hero-texts",
    items: [],
  },
  {
    title: "ألوان الهوية",
    url: "#hero-colors",
    items: [],
  },
  {
    title: "زر البحث",
    url: "#hero-button",
    items: [],
  },
];

export function HeroSettingsSidebar(
  props: React.ComponentProps<typeof Sidebar>,
) {
  return (
    <Sidebar {...props}>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>أقسام الإعدادات</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {nav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url} className="font-medium text-xs">
                      {item.title}
                    </a>
                  </SidebarMenuButton>

                  {item.items && item.items.length > 0 ? (
                    <SidebarMenuSub>
                      {item.items.map((sub) => (
                        <SidebarMenuSubItem key={sub.title}>
                          <SidebarMenuSubButton
                            asChild
                            isActive={sub.isActive}
                          >
                            <a href={sub.url}>{sub.title}</a>
                          </SidebarMenuSubButton>
                        </SidebarMenuSubItem>
                      ))}
                    </SidebarMenuSub>
                  ) : null}
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarRail />
    </Sidebar>
  );
}
