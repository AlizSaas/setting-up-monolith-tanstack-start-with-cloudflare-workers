'use client'

import { LucideIcon } from 'lucide-react'
import { Link } from '@tanstack/react-router'
import {
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'

interface NavPrimaryProps {
  items: {
    title: string
    to: string
    icon: LucideIcon
    activeOptions: { exact: boolean }
  }[]
}

export function NavPrimary({ items }: NavPrimaryProps) {
  return (
    <SidebarGroup>
      <SidebarGroupContent>
        <SidebarMenu className="gap-1">
          {items.map((item, index) => (
            <SidebarMenuItem key={index}>
              <SidebarMenuButton 
                asChild 
                tooltip={item.title}
                size="default"
                className="h-11 justify-start px-3 group-data-[collapsible=icon]:h-11 group-data-[collapsible=icon]:w-11 group-data-[collapsible=icon]:justify-center"
              >
                <Link
                  to={item.to}
                  activeOptions={item.activeOptions}
                  activeProps={{
                    'data-active': true,
                  }}
                  className="flex items-center gap-3 w-full"
                >
                  <item.icon className="size-5 shrink-0 transition-all group-data-[collapsible=icon]:size-6" />
                  <span className="truncate font-medium group-data-[collapsible=icon]:hidden">
                    {item.title}
                  </span>
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarGroupContent>
    </SidebarGroup>
  )
}