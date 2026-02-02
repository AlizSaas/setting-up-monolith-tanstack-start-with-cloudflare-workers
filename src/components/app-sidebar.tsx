'use client'

import { BookmarkIcon, Compass, FileText, Import, LayoutDashboardIcon, Settings, Users } from 'lucide-react'

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
} from '@/components/ui/sidebar'

import { Link } from '@tanstack/react-router'

import { type User } from 'better-auth'
import { LucideIcon } from 'lucide-react'
import { NavUser } from './nav-user'
import { NavPrimary } from './nav-primary'

export interface NavPrimaryProps {
  items: {
    title: string
    to: string
    icon: LucideIcon
    activeOptions: { exact: boolean }
  }[]
}

export interface NavUserProps {
  user: User
}

const navItems: NavPrimaryProps['items'] = [
  {
    title: 'Items',
    icon: LayoutDashboardIcon,
    to: '/dashboard',
    activeOptions: { exact: false },
  },
  {
    title: 'Clients',
    icon: Users,
    to: '/clients',
    activeOptions: { exact: false },
  },
  {
    title: 'Invoices',
    icon: FileText,
    to: '/invoices',
    activeOptions: { exact: false },
  }, {
    title:'Setting',
    icon:Settings,
    to:'/settings',
    activeOptions:{exact:false},
  }
]

export function AppSidebar({ user }: NavUserProps) {
  return (
    <Sidebar collapsible="icon" className="border-r">
      <SidebarHeader className="border-b">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton size="lg" asChild className="data-[state=collapsed]:justify-center">
              <Link to="/dashboard" className="flex items-center gap-3 py-2">
                <div className="flex aspect-square size-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg shadow-indigo-500/30 transition-all group-data-[collapsible=icon]:size-10">
                  <BookmarkIcon className="size-5 text-white" />
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight group-data-[collapsible=icon]:hidden">
                  <span className="truncate font-semibold text-base">Recall</span>
                  <span className="truncate text-xs text-muted-foreground">Your AI Knowledge Base</span>
                </div>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarHeader>
      
      <SidebarContent className="px-2 py-4">
        <NavPrimary items={navItems} />
      </SidebarContent>
      
      <SidebarFooter className="border-t mt-auto">
        <NavUser user={user} />
      </SidebarFooter>
      
      <SidebarRail />
    </Sidebar>
  )
}