import {
  SidebarProvider,
  Sidebar,
  SidebarHeader,
  SidebarContent,
  SidebarGroup,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarInset,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  GraduationCap,
  Users,
  ClipboardCheck,
  FileText,
  Mail,
  Building2,
  Server,
  Bell,
  Settings,
  ChevronRight,
  LogOut,
  KeyRound,
} from "lucide-react";
import { ReactNode } from "react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { Button } from "@/components/ui/button";
import { useLogout } from "@/lib/auth";
import { useLocation as useWouterLocation } from "wouter";

export function Layout({ children, title }: { children: ReactNode; title: string }) {
  const [location] = useLocation();
  const [, setLocation] = useWouterLocation();
  const isSettingsActive = location.startsWith("/settings");
  const logout = useLogout();

  const handleLogout = async () => {
    await logout.mutateAsync();
    setLocation("/login");
  };

  return (
    <SidebarProvider>
      <Sidebar>
        <SidebarHeader className="h-16 flex items-center justify-center border-b border-sidebar-border/50 px-4">
          <div className="flex items-center gap-2 w-full font-bold text-xl tracking-tight text-white">
            <ClipboardCheck className="h-6 w-6 text-sidebar-primary" />
            <span>DocTrackr</span>
          </div>
        </SidebarHeader>
        <SidebarContent>
          <SidebarGroup>
            <SidebarMenu>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location === "/dashboard"}>
                  <Link href="/dashboard" className="flex items-center gap-2">
                    <LayoutDashboard className="h-4 w-4" />
                    <span>Dashboard</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/students")}>
                  <Link href="/students" className="flex items-center gap-2">
                    <GraduationCap className="h-4 w-4" />
                    <span>Students</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/employees")}>
                  <Link href="/employees" className="flex items-center gap-2">
                    <Users className="h-4 w-4" />
                    <span>Employees</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/compliance")}>
                  <Link href="/compliance" className="flex items-center gap-2">
                    <ClipboardCheck className="h-4 w-4" />
                    <span>Compliance</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/document-types")}>
                  <Link href="/document-types" className="flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    <span>Document Types</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton asChild isActive={location.startsWith("/email-logs")}>
                  <Link href="/email-logs" className="flex items-center gap-2">
                    <Mail className="h-4 w-4" />
                    <span>Email Logs</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>

              <Collapsible defaultOpen={isSettingsActive} className="group/collapsible">
                <SidebarMenuItem>
                  <CollapsibleTrigger asChild>
                    <SidebarMenuButton className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        <Settings className="h-4 w-4" />
                        <span>Settings</span>
                      </div>
                      <ChevronRight className="h-4 w-4 transition-transform group-data-[state=open]/collapsible:rotate-90" />
                    </SidebarMenuButton>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    <div className="pl-6 mt-1 flex flex-col gap-1">
                      <SidebarMenuButton asChild isActive={location === "/settings/organization"} size="sm">
                        <Link href="/settings/organization" className="flex items-center gap-2">
                          <Building2 className="h-4 w-4" />
                          <span>Organization</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuButton asChild isActive={location === "/settings/smtp"} size="sm">
                        <Link href="/settings/smtp" className="flex items-center gap-2">
                          <Server className="h-4 w-4" />
                          <span>SMTP</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuButton asChild isActive={location === "/settings/reminders"} size="sm">
                        <Link href="/settings/reminders" className="flex items-center gap-2">
                          <Bell className="h-4 w-4" />
                          <span>Reminders</span>
                        </Link>
                      </SidebarMenuButton>
                      <SidebarMenuButton asChild isActive={location === "/settings/credentials"} size="sm">
                        <Link href="/settings/credentials" className="flex items-center gap-2">
                          <KeyRound className="h-4 w-4" />
                          <span>Credentials</span>
                        </Link>
                      </SidebarMenuButton>
                    </div>
                  </CollapsibleContent>
                </SidebarMenuItem>
              </Collapsible>
            </SidebarMenu>
          </SidebarGroup>
        </SidebarContent>
        <div className="mt-auto p-3 border-t border-sidebar-border/50">
          <Button
            variant="ghost"
            size="sm"
            className="w-full justify-start gap-2 text-white/70 hover:text-white hover:bg-white/10"
            onClick={handleLogout}
            disabled={logout.isPending}
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </Button>
        </div>
      </Sidebar>
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center justify-between border-b px-4 lg:px-8 bg-card text-card-foreground">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="-ml-2" />
            <h1 className="text-lg font-semibold tracking-tight">{title}</h1>
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 lg:p-8 bg-muted/20">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
