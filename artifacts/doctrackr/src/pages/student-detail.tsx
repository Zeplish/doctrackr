import { Layout } from "@/components/layout";
import { useParams, Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { useState, useEffect, useRef } from "react";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  useGetStudent,
  useBulkUpdateChecklistItems,
  useSendManualReminder,
  useListEmailLogs,
  getGetStudentQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { StatusBadge } from "@/components/status-badge";
import { ArrowLeft, Save, Send, CalendarIcon, Edit } from "lucide-react";

export default function StudentDetailPage() {
  const params = useParams<{ id: string }>();
  const id = parseInt(params.id ?? "0");
  const qc = useQueryClient();

  const { data: student, isLoading } = useGetStudent(id, { query: { enabled: !!id, queryKey: getGetStudentQueryKey(id) } });
  const bulkUpdate = useBulkUpdateChecklistItems();
  const sendReminder = useSendManualReminder();

  const { data: logsPage, isLoading: logsLoading } = useListEmailLogs({
    personId: id,
    personType: "student",
    limit: 10,
  });

  const [localChecklist, setLocalChecklist] = useState<any[]>([]);
  const isDirty = useRef(false);

  useEffect(() => {
    if (student?.checklistItems) {
      setLocalChecklist(student.checklistItems.map(item => ({
        ...item,
        expiryDate: item.expiryDate ? item.expiryDate.substring(0, 10) : "",
      })));
      isDirty.current = false;
    }
  }, [student]);

  const handleUpdateLocalItem = (itemId: number, field: string, value: string) => {
    setLocalChecklist(prev => 
      prev.map(i => i.id === itemId ? { ...i, [field]: value } : i)
    );
    isDirty.current = true;
  };

  const handleSaveAll = async () => {
    if (!isDirty.current) return;
    
    try {
      const itemsToUpdate = localChecklist.map(item => ({
        id: item.id,
        expiryDate: item.expiryDate ? new Date(item.expiryDate).toISOString() : null,
      }));

      await bulkUpdate.mutateAsync({ data: { items: itemsToUpdate } });
      qc.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
      toast.success("Checklist saved successfully");
      isDirty.current = false;
    } catch (e) {
      toast.error("Failed to save checklist");
    }
  };

  const handleSendReminder = async (itemId: number) => {
    try {
      const res = await sendReminder.mutateAsync({ id: itemId });
      if (!res.success) {
        toast.error("SMTP not configured", { description: res.message });
      } else {
        toast.success("Reminder sent successfully");
        qc.invalidateQueries({ queryKey: getGetStudentQueryKey(id) });
      }
    } catch (e) {
      toast.error("Failed to send reminder");
    }
  };

  if (isLoading) {
    return (
      <Layout title="Loading Student...">
        <Skeleton className="h-6 w-32 mb-6" />
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
          <Skeleton className="h-48" />
        </div>
        <Skeleton className="h-96 w-full" />
      </Layout>
    );
  }

  if (!student) {
    return <Layout title="Student Not Found"><div>Student not found.</div></Layout>;
  }

  return (
    <Layout title={student.fullName}>
      <div className="mb-6">
        <Button variant="ghost" asChild size="sm" className="-ml-3 text-muted-foreground">
          <Link href="/students">
            <ArrowLeft className="h-4 w-4 mr-1" />
            Back to Students
          </Link>
        </Button>
      </div>

      <div className="flex items-center gap-3 mb-6">
        <h1 className="text-3xl font-bold tracking-tight text-foreground">{student.fullName}</h1>
        <Badge variant="outline" className={student.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}>
          {student.status}
        </Badge>
        {student.classRoom && <Badge variant="secondary">{student.classRoom}</Badge>}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Student Info</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="flex justify-between"><span className="text-muted-foreground">DOB</span><span className="font-medium">{student.dateOfBirth ? format(parseISO(student.dateOfBirth), "MMM d, yyyy") : "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Classroom</span><span className="font-medium">{student.classRoom || "—"}</span></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Added</span><span className="font-medium">{format(parseISO(student.createdAt), "MMM d, yyyy")}</span></div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Primary Contact</CardTitle></CardHeader>
          <CardContent className="text-sm space-y-2">
            <div className="font-medium">{student.parent1Name}</div>
            <div><a href={`mailto:${student.parent1Email}`} className="text-primary hover:underline">{student.parent1Email}</a></div>
            {student.parent1Phone && <div>{student.parent1Phone}</div>}
          </CardContent>
        </Card>

        {student.parent2Name ? (
          <Card>
            <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground font-medium">Secondary Contact</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-2">
              <div className="font-medium">{student.parent2Name}</div>
              {student.parent2Email && <div><a href={`mailto:${student.parent2Email}`} className="text-primary hover:underline">{student.parent2Email}</a></div>}
              {student.parent2Phone && <div>{student.parent2Phone}</div>}
            </CardContent>
          </Card>
        ) : (
          <Card className="bg-muted/30 border-dashed flex items-center justify-center text-muted-foreground text-sm">
            No secondary contact
          </Card>
        )}
      </div>

      <div className="flex items-center justify-between mb-4">
        <h2 className="text-xl font-semibold tracking-tight">Compliance Checklist</h2>
        <Button onClick={handleSaveAll} disabled={bulkUpdate.isPending}>
          <Save className="h-4 w-4 mr-2" />
          Save Changes
        </Button>
      </div>

      <div className="border rounded-md bg-card mb-8">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead className="w-[180px]">Expiry Date</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Reminders</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localChecklist.length === 0 ? (
              <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No documents required for this student.</TableCell></TableRow>
            ) : (
              localChecklist.map((item) => (
                <TableRow key={item.id} className="group hover:bg-muted/50 transition-colors">
                  <TableCell className="font-medium">
                    {item.documentTypeName}
                    {item.templateFormUrl && (
                      <a href={item.templateFormUrl} target="_blank" rel="noreferrer" className="block text-xs text-primary hover:underline mt-1 font-normal">View Template</a>
                    )}
                  </TableCell>
                  <TableCell>
                    <Input 
                      type="date" 
                      value={item.expiryDate} 
                      onChange={(e) => handleUpdateLocalItem(item.id, "expiryDate", e.target.value)}
                      className="h-8 text-sm"
                    />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={item.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground space-y-1">
                    <div>Last: {item.lastReminderSentAt ? format(parseISO(item.lastReminderSentAt), "MMM d, yy") : "Never"}</div>
                    {item.nextReminderDueAt && <div>Next: {format(parseISO(item.nextReminderDueAt), "MMM d, yy")}</div>}
                  </TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="outline" 
                      size="sm" 
                      onClick={() => handleSendReminder(item.id)}
                      disabled={sendReminder.isPending}
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

      <h2 className="text-lg font-semibold tracking-tight mb-4">Recent Email Logs</h2>
      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Sent At</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {logsLoading ? (
              <TableRow><TableCell colSpan={4}><Skeleton className="h-8" /></TableCell></TableRow>
            ) : !logsPage?.items || logsPage.items.length === 0 ? (
              <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No recent emails</TableCell></TableRow>
            ) : (
              logsPage.items.map((log) => (
                <TableRow key={log.id}>
                  <TableCell>{log.documentTypeName}</TableCell>
                  <TableCell className="max-w-[300px] truncate" title={log.emailSubject}>{log.emailSubject}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={log.emailStatus === "sent" ? "bg-green-50 text-green-700" : "bg-red-50 text-red-700"}>
                      {log.emailStatus}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right text-muted-foreground text-sm">
                    {format(parseISO(log.sentAt), "MMM d, yyyy h:mm a")}
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
