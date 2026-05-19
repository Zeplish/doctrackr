import { Layout } from "@/components/layout";
import { useState } from "react";
import { useListSmsLogs } from "@workspace/api-client-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { MessageSquare, ChevronLeft, ChevronRight } from "lucide-react";
import { format } from "date-fns";

type PersonTypeFilter = "student" | "employee" | "all";
type StatusFilter = "sent" | "failed" | "all";

export default function SmsLogsPage() {
  const [personType, setPersonType] = useState<PersonTypeFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [page, setPage] = useState(1);
  const limit = 25;

  const { data, isLoading } = useListSmsLogs({
    personType: personType === "all" ? undefined : personType,
    status: status === "all" ? undefined : status,
    page,
    limit,
  });

  const totalPages = data ? Math.ceil(data.total / limit) : 1;

  return (
    <Layout title="SMS Logs">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex items-center gap-2">
          <Select value={personType} onValueChange={(v) => { setPersonType(v as PersonTypeFilter); setPage(1); }}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Person Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Types</SelectItem>
              <SelectItem value="student">Students</SelectItem>
              <SelectItem value="employee">Employees</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(v) => { setStatus(v as StatusFilter); setPage(1); }}>
            <SelectTrigger className="w-[130px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="sent">Sent</SelectItem>
              <SelectItem value="failed">Failed</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {data && (
          <span className="text-sm text-muted-foreground">
            {data.total} {data.total === 1 ? "record" : "records"}
          </span>
        )}
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Sent At</TableHead>
              <TableHead>Person</TableHead>
              <TableHead>Document</TableHead>
              <TableHead>Phone</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Type</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  {Array.from({ length: 6 }).map((_, j) => (
                    <TableCell key={j}><Skeleton className="h-5 w-full" /></TableCell>
                  ))}
                </TableRow>
              ))
            ) : data?.items.length === 0 ? (
              <TableRow>
                <TableCell colSpan={6} className="text-center py-12">
                  <div className="flex flex-col items-center gap-2 text-muted-foreground">
                    <MessageSquare className="h-8 w-8 opacity-30" />
                    <p className="text-sm">No SMS logs found</p>
                    <p className="text-xs">SMS logs appear here once reminders are sent via Twilio.</p>
                  </div>
                </TableCell>
              </TableRow>
            ) : (
              data?.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                    {format(new Date(log.sentAt), "MMM d, yyyy h:mm a")}
                  </TableCell>
                  <TableCell>
                    <div>
                      <p className="font-medium text-sm">{log.personName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{log.personType}</p>
                    </div>
                  </TableCell>
                  <TableCell className="text-sm">{log.documentTypeName}</TableCell>
                  <TableCell className="text-sm font-mono">{log.recipientPhone}</TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={log.smsStatus === "sent"
                        ? "bg-green-50 text-green-700 border-green-200"
                        : "bg-red-50 text-red-700 border-red-200"}
                    >
                      {log.smsStatus}
                    </Badge>
                    {log.errorMessage && (
                      <p className="text-xs text-destructive mt-1 max-w-[200px] truncate" title={log.errorMessage}>
                        {log.errorMessage}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className="capitalize text-xs">
                      {log.reminderType}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between mt-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page === 1}
          >
            <ChevronLeft className="h-4 w-4 mr-1" /> Previous
          </Button>
          <span className="text-sm text-muted-foreground">
            Page {page} of {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page === totalPages}
          >
            Next <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </div>
      )}
    </Layout>
  );
}
