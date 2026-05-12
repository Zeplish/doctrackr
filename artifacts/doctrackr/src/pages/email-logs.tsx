import { Layout } from "@/components/layout";
import { useState } from "react";
import { format, parseISO } from "date-fns";
import {
  useListEmailLogs,
  ListEmailLogsPersonType,
  ListEmailLogsStatus
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EmailLogsPage() {
  const [page, setPage] = useState(1);
  const [personType, setPersonType] = useState<ListEmailLogsPersonType>("all");
  const [statusFilter, setStatusFilter] = useState<ListEmailLogsStatus>("all");

  const { data: logsPage, isLoading } = useListEmailLogs({
    page,
    limit: 50,
    personType,
    status: statusFilter,
  });

  return (
    <Layout title="Email Logs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6 bg-card p-4 rounded-xl border shadow-sm">
        <div className="flex flex-1 flex-col sm:flex-row items-center gap-4 w-full">
          <div className="flex items-center gap-4 w-full sm:w-auto">
            <Select value={personType} onValueChange={(val: any) => { setPersonType(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[150px]">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Recipients</SelectItem>
                <SelectItem value="student">Students</SelectItem>
                <SelectItem value="employee">Employees</SelectItem>
              </SelectContent>
            </Select>

            <Select value={statusFilter} onValueChange={(val: any) => { setStatusFilter(val); setPage(1); }}>
              <SelectTrigger className="w-full sm:w-[160px]">
                <SelectValue placeholder="All Statuses" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Statuses</SelectItem>
                <SelectItem value="sent">Sent</SelectItem>
                <SelectItem value="failed">Failed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground whitespace-nowrap">
          {logsPage?.total ? `${logsPage.total} total logs` : '0 total logs'}
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent At</TableHead>
              <TableHead>Recipient</TableHead>
              <TableHead>Document Type</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 10 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                </TableRow>
              ))
            ) : !logsPage?.items || logsPage.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-12 text-muted-foreground">
                  No email logs found.
                </TableCell>
              </TableRow>
            ) : (
              logsPage.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="whitespace-nowrap text-muted-foreground text-sm">
                    {format(parseISO(log.sentAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <div className="font-medium">{log.personName}</div>
                    <div className="text-xs text-muted-foreground">{log.recipientEmail}</div>
                  </TableCell>
                  <TableCell>
                    <div className="font-medium max-w-[250px] truncate" title={log.emailSubject}>{log.emailSubject}</div>
                    <div className="text-xs text-muted-foreground">{log.documentTypeName}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="secondary" className="capitalize text-xs">
                      {log.reminderType}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={log.emailStatus === "sent" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                      {log.emailStatus}
                    </Badge>
                    {log.emailStatus === "failed" && (
                       <span className="block text-[10px] text-red-500 mt-1 max-w-[150px] truncate">Failed</span>
                    )}
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
      
      {logsPage && logsPage.total > 50 && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => Math.max(1, p - 1))}
            disabled={page === 1 || isLoading}
          >
            Previous
          </Button>
          <div className="text-sm font-medium">Page {page}</div>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage(p => p + 1)}
            disabled={page * 50 >= logsPage.total || isLoading}
          >
            Next
          </Button>
        </div>
      )}
    </Layout>
  );
}
