import { BarChart3, Database, MonitorDot, LayoutDashboard, RefreshCw, ClipboardList, MapPin } from 'lucide-react';
import { NavLink } from '@/components/NavLink';
import { useLocation } from 'react-router-dom';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  useSidebar,
} from '@/components/ui/sidebar';
import { ThemeToggle } from './ThemeToggle';

const menuItems = [
  { title: 'Executive Summary', url: '/', icon: LayoutDashboard },
  { title: 'Data RDTR', url: '/data-rdtr', icon: Database },
  { title: 'Sebaran RDTR', url: '/sebaran', icon: MapPin },
  { title: 'Monitoring RDTR', url: '/monitoring', icon: MonitorDot },
  { title: 'Perubahan RDTR', url: '/perubahan', icon: RefreshCw },
  { title: 'Report', url: '/report', icon: ClipboardList },
];

export function AppSidebar() {
  const { state } = useSidebar();
  const collapsed = state === 'collapsed';
  const location = useLocation();

  return (
    <Sidebar collapsible="icon">
      <SidebarHeader className="p-4 border-b border-sidebar-border">
        <div className="flex items-center gap-3">
          <div className="kpi-gradient-blue rounded-lg p-2">
            <BarChart3 className="h-5 w-5 text-primary-foreground" />
          </div>
          {!collapsed && (
            <div>
              <h2 className="font-bold text-sm text-sidebar-accent-foreground">DASHBOARD</h2>
              <p className="text-xs text-sidebar-foreground">RDTR Monitoring</p>
            </div>
          )}
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel className="text-sidebar-foreground/60">Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {menuItems.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild>
                    <NavLink
                      to={item.url}
                      end={item.url === '/'}
                      className="hover:bg-sidebar-accent/50"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-medium"
                    >
                      <item.icon className="mr-2 h-4 w-4" />
                      {!collapsed && <span>{item.title}</span>}
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter className="mt-auto border-t border-sidebar-border p-2">
        <div className="flex justify-center">
          <ThemeToggle collapsed={collapsed} />
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
