import { Layout } from "@/components/layout";
import { useState } from "react";
import { Link } from "wouter";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListStudents,
  useCreateStudent,
  useUpdateStudent,
  useDeleteStudent,
  getListStudentsQueryKey,
  StudentInputStatus,
  ListStudentsStatus
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Search, Plus, Eye, Edit, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";

const studentSchema = z.object({
  fullName: z.string().min(1, "Name is required"),
  dateOfBirth: z.string().nullable().optional(),
  classRoom: z.string().nullable().optional(),
  status: z.enum(["active", "inactive"]),
  parent1Name: z.string().min(1, "Parent 1 name is required"),
  parent1Email: z.string().email("Invalid email address").min(1, "Parent 1 email is required"),
  parent1Phone: z.string().nullable().optional(),
  parent2Name: z.string().nullable().optional(),
  parent2Email: z.string().email("Invalid email address").nullable().optional().or(z.literal('')),
  parent2Phone: z.string().nullable().optional(),
});

type StudentFormValues = z.infer<typeof studentSchema>;

export default function StudentsPage() {
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<ListStudentsStatus>("all");
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: students, isLoading } = useListStudents({ search, status: statusFilter });
  const createStudent = useCreateStudent();
  const updateStudent = useUpdateStudent();
  const deleteStudent = useDeleteStudent();

  const form = useForm<StudentFormValues>({
    resolver: zodResolver(studentSchema),
    defaultValues: {
      fullName: "",
      dateOfBirth: "",
      classRoom: "",
      status: "active",
      parent1Name: "",
      parent1Email: "",
      parent1Phone: "",
      parent2Name: "",
      parent2Email: "",
      parent2Phone: "",
    }
  });

  const onAddSubmit = async (values: StudentFormValues) => {
    try {
      await createStudent.mutateAsync({ data: values as any });
      qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      toast.success("Student created successfully");
      setIsAddOpen(false);
      form.reset();
    } catch (e) {
      toast.error("Failed to create student");
    }
  };

  const onEditSubmit = async (values: StudentFormValues) => {
    if (!editId) return;
    try {
      await updateStudent.mutateAsync({ id: editId!, data: values as any });
      qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      toast.success("Student updated successfully");
      setEditId(null);
    } catch (e) {
      toast.error("Failed to update student");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteStudent.mutateAsync({ id: deleteId! });
      qc.invalidateQueries({ queryKey: getListStudentsQueryKey() });
      toast.success("Student deleted successfully");
    } catch (e) {
      toast.error("Failed to delete student");
    } finally {
      setDeleteId(null);
    }
  };

  const openEdit = (student: any) => {
    form.reset({
      fullName: student.fullName,
      dateOfBirth: student.dateOfBirth || "",
      classRoom: student.classRoom || "",
      status: student.status,
      parent1Name: student.parent1Name,
      parent1Email: student.parent1Email,
      parent1Phone: student.parent1Phone || "",
      parent2Name: student.parent2Name || "",
      parent2Email: student.parent2Email || "",
      parent2Phone: student.parent2Phone || "",
    });
    setEditId(student.id);
  };

  return (
    <Layout title="Students">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <div className="flex flex-1 items-center gap-2">
          <div className="relative w-full max-w-sm">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input 
              placeholder="Search students..." 
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-8 bg-card"
            />
          </div>
          <Select value={statusFilter} onValueChange={(val: any) => setStatusFilter(val)}>
            <SelectTrigger className="w-[140px] bg-card">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => form.reset()}><Plus className="h-4 w-4 mr-2" /> Add Student</Button>
          </DialogTrigger>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Student</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="classRoom" render={({ field }) => (
                    <FormItem><FormLabel>Class/Room</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium mb-2">Parent / Guardian 1</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="parent1Name" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent1Email" render={({ field }) => (
                      <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent1Phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium mb-2">Parent / Guardian 2 (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="parent2Name" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>Name</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent2Email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent2Phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={createStudent.isPending}>Save Student</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Edit Dialog */}
        <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Edit Student</DialogTitle></DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="fullName" render={({ field }) => (
                    <FormItem className="col-span-2"><FormLabel>Full Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="dateOfBirth" render={({ field }) => (
                    <FormItem><FormLabel>Date of Birth</FormLabel><FormControl><Input type="date" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="classRoom" render={({ field }) => (
                    <FormItem><FormLabel>Class/Room</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="status" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Status</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent><SelectItem value="active">Active</SelectItem><SelectItem value="inactive">Inactive</SelectItem></SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>
                
                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium mb-2">Parent / Guardian 1</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="parent1Name" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent1Email" render={({ field }) => (
                      <FormItem><FormLabel>Email *</FormLabel><FormControl><Input type="email" {...field} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent1Phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>

                <div className="border-t pt-4 mt-2">
                  <h3 className="text-sm font-medium mb-2">Parent / Guardian 2 (Optional)</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <FormField control={form.control} name="parent2Name" render={({ field }) => (
                      <FormItem className="col-span-2"><FormLabel>Name</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent2Email" render={({ field }) => (
                      <FormItem><FormLabel>Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                    <FormField control={form.control} name="parent2Phone" render={({ field }) => (
                      <FormItem><FormLabel>Phone</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                    )} />
                  </div>
                </div>
                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateStudent.isPending}>Update Student</Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>

        {/* Delete Dialog */}
        <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete the student and all associated document checklists.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Full Name</TableHead>
              <TableHead>Class/Room</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Primary Parent Email</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-32" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-24 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : students?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No students found
                </TableCell>
              </TableRow>
            ) : (
              students?.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <Link href={`/students/${student.id}`} className="font-medium hover:underline text-primary">
                      {student.fullName}
                    </Link>
                  </TableCell>
                  <TableCell>{student.classRoom || "—"}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className={student.status === "active" ? "bg-green-50 text-green-700" : "bg-gray-100 text-gray-700"}>
                      {student.status}
                    </Badge>
                  </TableCell>
                  <TableCell>{student.parent1Email}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" asChild>
                        <Link href={`/students/${student.id}`}><Eye className="h-4 w-4" /></Link>
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(student)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(student.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
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
