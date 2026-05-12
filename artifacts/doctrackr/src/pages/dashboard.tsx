import { Layout } from "@/components/layout";
import {
  useGetDashboardStats,
  useGetDashboardExpiringSoon,
  useGetDashboardOverdue,
  useGetDashboardMissing,
  useSendManualReminder,
  GetDashboardExpiringSoonPersonType,
  GetDashboardMissingPersonType,
  GetDashboardOverduePersonType
} from "@workspace/api-client-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { StatusBadge } from "@/components/status-badge";
import { format, parseISO } from "date-fns";
import { Link } from "wouter";
import { Button } from "@/components/ui/button";
import { Send, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useState } from "react";
import { toast } from "sonner";

function DashboardStatCard({ title, value, isLoading, className }: { title: string, value: number | undefined, isLoading: boolean, className?: string }) {
  return (
    <Card className={className}>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        {isLoading ? <Skeleton className="h-8 w-16" /> : <div className="text-2xl font-bold">{value ?? 0}</div>}
      </CardContent>
    </Card>
  );
}

export default function DashboardPage() {
  const { data: stats, isLoading: isStatsLoading } = useGetDashboardStats();
  
  const [personType, setPersonType] = useState<"all" | "student" | "employee">("all");
  const [search, setSearch] = useState("");

  const expiringQuery = useGetDashboardExpiringSoon({ search, personType: personType as GetDashboardExpiringSoonPersonType });
  const overdueQuery = useGetDashboardOverdue({ search, personType: personType as GetDashboardOverduePersonType });
  const missingQuery = useGetDashboardMissing({ search, personType: personType as GetDashboardMissingPersonType });

  const sendReminder = useSendManualReminder();

  const handleSendReminder = async (id: number) => {
    try {
      const res = await sendReminder.mutateAsync({ id });
      if (!res.success) {
        toast.error("SMTP not configured", { description: res.message });
      } else {
        toast.success("Reminder sent successfully");
      }
    } catch (error) {
      toast.error("Failed to send reminder");
    }
  };

  const renderTable = (items: any[], isLoading: boolean) => {
    if (isLoading) {
      return (
        <div className="space-y-2 mt-4">
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
          <Skeleton className="h-10 w-full" />
        </div>
      );
    }
    
    if (!items || items.length === 0) {
      return <div className="text-center py-10 text-muted-foreground border rounded-md mt-4">No items found</div>;
    }

    return (
      <div className="border rounded-md mt-4 bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {items.map((item) => (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="flex flex-col gap-1">
                    <Link 
                      href={`/${item.personType}s/${item.personId}`} 
                      className="font-medium hover:underline text-primary"
                    >
                      {item.personName}
                    </Link>
                    <div>
                      <Badge variant="outline" className={item.personType === "student" ? "bg-blue-50 text-blue-700" : "bg-purple-50 text-purple-700"}>
                        {item.personType}
                      </Badge>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="font-medium">{item.documentTypeName}</div>
                  <div className="text-xs text-muted-foreground capitalize">{item.documentTypeCategory}</div>
                </TableCell>
                <TableCell>
                  {item.expiryDate ? format(parseISO(item.expiryDate), "MMM d, yyyy") : "—"}
                </TableCell>
                <TableCell>
                  <StatusBadge status={item.status} />
                </TableCell>
                <TableCell className="text-right space-x-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => handleSendReminder(item.id)}
                    disabled={sendReminder.isPending}
                  >
                    <Send className="h-3 w-3 mr-1" />
                    Reminder
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    );
  };

  return (
    <Layout title="Dashboard">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        <DashboardStatCard 
          title="Missing" 
          value={stats?.missingDocuments} 
          isLoading={isStatsLoading}
          className="border-gray-300"
        />
        <DashboardStatCard 
          title="Expiring (30 Days)" 
          value={stats?.expiringIn30Days} 
          isLoading={isStatsLoading}
          className="border-amber-300 bg-amber-50/20"
        />
        <DashboardStatCard 
          title="Due Today" 
          value={stats?.dueToday} 
          isLoading={isStatsLoading}
          className="border-orange-300 bg-orange-50/20"
        />
        <DashboardStatCard 
          title="Overdue" 
          value={stats?.overdueDocuments} 
          isLoading={isStatsLoading}
          className="border-red-300 bg-red-50/20"
        />
        <DashboardStatCard 
          title="Active Students" 
          value={stats?.totalActiveStudents} 
          isLoading={isStatsLoading}
        />
        <DashboardStatCard 
          title="Active Employees" 
          value={stats?.totalActiveEmployees} 
          isLoading={isStatsLoading}
        />
        <DashboardStatCard 
          title="Reminders (Month)" 
          value={stats?.remindersSentThisMonth} 
          isLoading={isStatsLoading}
        />
        <DashboardStatCard 
          title="Failed Emails" 
          value={stats?.failedEmails} 
          isLoading={isStatsLoading}
          className={stats?.failedEmails && stats.failedEmails > 0 ? "border-red-300 bg-red-50/10" : ""}
        />
      </div>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Action Items</h2>
        <div className="flex items-center gap-2">
          <div className="relative w-64">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search people..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8"
            />
          </div>
          <Select value={personType} onValueChange={(val: any) => setPersonType(val)}>
            <SelectTrigger className="w-[140px]">
              <SelectValue placeholder="All types" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All People</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="employee">Employees</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <Tabs defaultValue="expiring" className="w-full">
        <TabsList>
          <TabsTrigger value="expiring">Expiring Soon ({expiringQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="overdue" className="text-red-600 data-[state=active]:text-red-700">Overdue ({overdueQuery.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="missing">Missing ({missingQuery.data?.length ?? 0})</TabsTrigger>
        </TabsList>
        <TabsContent value="expiring" className="mt-0">
          {renderTable(expiringQuery.data ?? [], expiringQuery.isLoading)}
        </TabsContent>
        <TabsContent value="overdue" className="mt-0">
          {renderTable(overdueQuery.data ?? [], overdueQuery.isLoading)}
        </TabsContent>
        <TabsContent value="missing" className="mt-0">
          {renderTable(missingQuery.data ?? [], missingQuery.isLoading)}
        </TabsContent>
      </Tabs>
    </Layout>
  );
}
