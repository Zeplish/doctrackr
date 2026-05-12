import { Layout } from "@/components/layout";
import { useState } from "react";
import { Link } from "wouter";
import { format, parseISO } from "date-fns";
import {
  useListChecklistItems,
  useSendManualReminder,
  ListChecklistItemsPersonType,
  ListChecklistItemsStatus
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Send } from "lucide-react";
import { toast } from "sonner";
import { StatusBadge } from "@/components/status-badge";

export default function CompliancePage() {
  const [search, setSearch] = useState("");
  const [personType, setPersonType] = useState<ListChecklistItemsPersonType>("all");
  const [statusFilter, setStatusFilter] = useState<ListChecklistItemsStatus>("all");

  const { data: items, isLoading } = useListChecklistItems({
    search,
    personType,
    status: statusFilter,
  });

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

  return (
    <Layout title="Compliance Tracker">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-4 w-full">
          <div className="relative w-full sm:max-w-sm">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search by name or document..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Select value={personType} onValueChange={(val: any) => setPersonType(val)}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All People</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="employee">Employees</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="missing">Missing</SelectItem>
                <SelectItem value="valid">Valid</SelectItem>
                <SelectItem value="expiring_soon">Expiring Soon</SelectItem>
                <SelectItem value="due_today">Due Today</SelectItem>
                <SelectItem value="overdue">Overdue</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Person</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reminders</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 8 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /><Skeleton className="h-4 w-16 mt-1" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : items?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                  <ClipboardCheck className="mx-auto h-12 w-12 text-muted-foreground/30 mb-3" />
                  <p>No checklist items found matching your filters.</p>
                </TableCell>
              </TableRow>
            ) : (
              items?.map((item) => (
                <TableRow key={item.id} className="group">
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
                    <div className="text-xs text-muted-foreground capitalize mt-0.5">{item.documentTypeCategory}</div>
                  </TableCell>
                  <TableCell>
                    {item.expiryDate ? format(parseISO(item.expiryDate), "MMM d, yyyy") : "—"}
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground space-y-1">
                    <div>Last: {item.lastReminderSentAt ? format(parseISO(item.lastReminderSentAt), "MMM d") : "Never"}</div>
                    {item.nextReminderDueAt && <div>Next: {format(parseISO(item.nextReminderDueAt), "MMM d")}</div>}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={() => handleSendReminder(item.id)}
                      disabled={sendReminder.isPending}
                      className="opacity-0 group-hover:opacity-100 transition-opacity focus:opacity-100"
                    >
                      <Send className="h-3 w-3 mr-1" />
                      Remind
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Layout>
  );
}

import { ClipboardCheck } from "lucide-react";
