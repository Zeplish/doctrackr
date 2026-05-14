import { Layout } from "@/components/layout";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useListDocumentTypes,
  useCreateDocumentType,
  useUpdateDocumentType,
  useDeleteDocumentType,
  useToggleDocumentTypeActive,
  getListDocumentTypesQueryKey,
  ListDocumentTypesCategory
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Plus, Edit, Trash2, ExternalLink } from "lucide-react";
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
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

const docTypeSchema = z.object({
  name: z.string().min(1, "Name is required"),
  category: z.enum(["student", "employee", "both"]),
  isActive: z.boolean().default(true),
  templateFormUrl: z.union([z.string().url("Must be a valid URL"), z.literal("")]).nullable().optional(),
});

type DocTypeFormValues = z.infer<typeof docTypeSchema>;

export default function DocumentTypesPage() {
  const qc = useQueryClient();
  const [categoryTab, setCategoryTab] = useState<ListDocumentTypesCategory>("all");
  const [showInactive, setShowInactive] = useState(false);
  
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [deleteId, setDeleteId] = useState<number | null>(null);

  const { data: docTypes, isLoading } = useListDocumentTypes({ 
    category: categoryTab, 
    status: showInactive ? "all" : "active" 
  });
  
  const createDocType = useCreateDocumentType();
  const updateDocType = useUpdateDocumentType();
  const deleteDocType = useDeleteDocumentType();
  const toggleActive = useToggleDocumentTypeActive();

  const form = useForm<DocTypeFormValues>({
    resolver: zodResolver(docTypeSchema),
    defaultValues: {
      name: "",
      category: "student",
      isActive: true,
      templateFormUrl: "",
    }
  });

  const normalizeFormUrl = (values: DocTypeFormValues) => ({
    ...values,
    templateFormUrl: values.templateFormUrl?.trim() || null,
  });

  const onAddSubmit = async (values: DocTypeFormValues) => {
    try {
      await createDocType.mutateAsync({ data: normalizeFormUrl(values) as any });
      qc.invalidateQueries({ queryKey: getListDocumentTypesQueryKey() });
      toast.success("Document type created successfully");
      setIsAddOpen(false);
      form.reset();
    } catch (e) {
      toast.error("Failed to create document type");
    }
  };

  const onEditSubmit = async (values: DocTypeFormValues) => {
    if (!editId) return;
    try {
      await updateDocType.mutateAsync({ id: editId!, data: normalizeFormUrl(values) as any });
      qc.invalidateQueries({ queryKey: getListDocumentTypesQueryKey() });
      toast.success("Document type updated successfully");
      setEditId(null);
    } catch (e) {
      toast.error("Failed to update document type");
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await deleteDocType.mutateAsync({ id: deleteId! });
      qc.invalidateQueries({ queryKey: getListDocumentTypesQueryKey() });
      toast.success("Document type deleted successfully");
    } catch (e) {
      toast.error("Failed to delete document type. It may be in use.");
    } finally {
      setDeleteId(null);
    }
  };

  const handleToggleActive = async (id: number) => {
    try {
      await toggleActive.mutateAsync({ id });
      qc.invalidateQueries({ queryKey: getListDocumentTypesQueryKey() });
      toast.success("Status updated successfully");
    } catch (e) {
      toast.error("Failed to toggle status");
    }
  };

  const openEdit = (type: any) => {
    form.reset({
      name: type.name,
      category: type.category,
      isActive: type.isActive,
      templateFormUrl: type.templateFormUrl ?? "",
    });
    setEditId(type.id);
  };

  return (
    <Layout title="Document Types">
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4 mb-6">
        <Tabs value={categoryTab} onValueChange={(val: any) => setCategoryTab(val)} className="w-[400px]">
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="student">Students</TabsTrigger>
            <TabsTrigger value="employee">Employees</TabsTrigger>
            <TabsTrigger value="both">Both</TabsTrigger>
          </TabsList>
        </Tabs>

        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2 text-sm">
            <Switch checked={showInactive} onCheckedChange={setShowInactive} />
            <span className="text-muted-foreground">Show inactive</span>
          </div>

          <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
            <DialogTrigger asChild>
              <Button onClick={() => form.reset({ name: "", category: "student", isActive: true, templateFormUrl: "" })}>
                <Plus className="h-4 w-4 mr-2" /> Add Document Type
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Document Type</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onAddSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="templateFormUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Download URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="https://... (optional)"
                          type="url"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Optional. If provided, parents/staff will receive a direct download link in reminder emails.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={createDocType.isPending}>Save</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Edit Dialog */}
          <Dialog open={!!editId} onOpenChange={(open) => !open && setEditId(null)}>
            <DialogContent>
              <DialogHeader><DialogTitle>Edit Document Type</DialogTitle></DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem><FormLabel>Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  <FormField control={form.control} name="category" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl><SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger></FormControl>
                        <SelectContent>
                          <SelectItem value="student">Student</SelectItem>
                          <SelectItem value="employee">Employee</SelectItem>
                          <SelectItem value="both">Both</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="templateFormUrl" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Form Download URL</FormLabel>
                      <FormControl>
                        <Input
                          {...field}
                          value={field.value ?? ""}
                          placeholder="https://... (optional)"
                          type="url"
                        />
                      </FormControl>
                      <p className="text-xs text-muted-foreground">
                        Optional. If provided, parents/staff will receive a direct download link in reminder emails.
                      </p>
                      <FormMessage />
                    </FormItem>
                  )} />
                  <div className="flex flex-col gap-3 pt-2">
                    <FormField control={form.control} name="isActive" render={({ field }) => (
                      <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3">
                        <div className="space-y-0.5"><FormLabel>Active Status</FormLabel></div>
                        <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                      </FormItem>
                    )} />
                  </div>
                  <div className="flex justify-end pt-4">
                    <Button type="submit" disabled={updateDocType.isPending}>Update</Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Delete Dialog */}
          <AlertDialog open={!!deleteId} onOpenChange={(open) => !open && setDeleteId(null)}>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Delete Document Type?</AlertDialogTitle>
                <AlertDialogDescription>
                  This will permanently delete this document type. If it is already in use by students or employees, consider deactivating it instead so historical records are preserved.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground">Delete</AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>

      <div className="border rounded-md bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Document Name</TableHead>
              <TableHead>Category</TableHead>
              <TableHead>Form URL</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 4 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-5 w-40" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-24" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-16" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))
            ) : docTypes?.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  No document types found
                </TableCell>
              </TableRow>
            ) : (
              docTypes?.map((type) => (
                <TableRow key={type.id} className={!type.isActive ? "opacity-60 bg-muted/20" : ""}>
                  <TableCell>
                    <div className="font-medium">{type.name}</div>
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={
                      type.category === "student" ? "bg-blue-50 text-blue-700" :
                      type.category === "employee" ? "bg-purple-50 text-purple-700" :
                      "bg-teal-50 text-teal-700"
                    }>
                      {type.category}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {type.templateFormUrl ? (
                      <a
                        href={type.templateFormUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-xs text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="h-3 w-3" />
                        View form
                      </a>
                    ) : (
                      <span className="text-xs text-muted-foreground">—</span>
                    )}
                  </TableCell>
                  <TableCell>
                    {type.isActive ? (
                      <Badge variant="outline" className="bg-green-50 text-green-700">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="bg-gray-100 text-gray-700">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(type)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" className="text-destructive" onClick={() => setDeleteId(type.id)}>
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
