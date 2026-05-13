import { Layout } from "@/components/layout";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetOrganization,
  useUpdateOrganization,
  getGetOrganizationQueryKey,
} from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MailOpen, Info } from "lucide-react";

const templateSchema = z.object({
  studentEmailTemplate: z.string().nullable().optional(),
  employeeEmailTemplate: z.string().nullable().optional(),
});

type TemplateFormValues = z.infer<typeof templateSchema>;

const STUDENT_PLACEHOLDER = `Dear Parent/Guardian,

This is a reminder from {orgName} that {studentName}'s {documentType} is scheduled to expire on {expiryDate}.

Please submit an updated copy at your earliest convenience.

Warm regards,
{senderName}
{orgName}`;

const EMPLOYEE_PLACEHOLDER = `Dear {employeeName},

This is a reminder that your {documentType} is scheduled to expire on {expiryDate}.

Please submit an updated copy at your earliest convenience.

Regards,
{senderName}
{orgName}`;

export default function EmailTemplatesPage() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useGetOrganization();
  const updateOrg = useUpdateOrganization();

  const form = useForm<TemplateFormValues>({
    resolver: zodResolver(templateSchema),
    defaultValues: {
      studentEmailTemplate: "",
      employeeEmailTemplate: "",
    }
  });

  useEffect(() => {
    if (org) {
      form.reset({
        studentEmailTemplate: org.studentEmailTemplate ?? "",
        employeeEmailTemplate: org.employeeEmailTemplate ?? "",
      });
    }
  }, [org, form]);

  const onSubmit = async (values: TemplateFormValues) => {
    if (!org) return;
    try {
      await updateOrg.mutateAsync({
        data: {
          name: org.name,
          email: org.email ?? null,
          phone: org.phone ?? null,
          address: org.address ?? null,
          website: org.website ?? null,
          senderName: org.senderName ?? null,
          senderEmail: org.senderEmail ?? null,
          emailFooter: org.emailFooter ?? null,
          primaryColor: org.primaryColor ?? null,
          secondaryColor: org.secondaryColor ?? null,
          tagline: org.tagline ?? null,
          adminCcEmail: org.adminCcEmail ?? null,
          studentEmailTemplate: values.studentEmailTemplate || null,
          employeeEmailTemplate: values.employeeEmailTemplate || null,
        }
      });
      qc.invalidateQueries({ queryKey: getGetOrganizationQueryKey() });
      toast.success("Email templates saved");
    } catch (e) {
      toast.error("Failed to save templates");
    }
  };

  if (isLoading) {
    return (
      <Layout title="Email Templates">
        <Skeleton className="h-[600px] w-full max-w-3xl" />
      </Layout>
    );
  }

  return (
    <Layout title="Email Templates">
      <div className="max-w-3xl space-y-6">
        <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
          <Info className="h-4 w-4 mt-0.5 shrink-0" />
          <div>
            <p className="font-medium mb-1">Available placeholders</p>
            <p className="text-blue-600">
              <code className="bg-blue-100 px-1 rounded">{"{orgName}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{senderName}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{studentName}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{employeeName}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{documentType}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{expiryDate}"}</code>{" "}
              <code className="bg-blue-100 px-1 rounded">{"{status}"}</code>
            </p>
            <p className="text-blue-600 mt-1">Leave blank to use the built-in default template.</p>
          </div>
        </div>

        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MailOpen className="h-5 w-5 text-primary" />
                  <CardTitle>Student Reminder Template</CardTitle>
                </div>
                <CardDescription>
                  Sent to parents when a student document is expiring or overdue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="studentEmailTemplate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body (plain text)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder={STUDENT_PLACEHOLDER}
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>The plain-text body of the reminder email sent to parents.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <MailOpen className="h-5 w-5 text-primary" />
                  <CardTitle>Employee Reminder Template</CardTitle>
                </div>
                <CardDescription>
                  Sent to employees when their own document is expiring or overdue.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <FormField control={form.control} name="employeeEmailTemplate" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email Body (plain text)</FormLabel>
                    <FormControl>
                      <Textarea
                        {...field}
                        value={field.value ?? ""}
                        placeholder={EMPLOYEE_PLACEHOLDER}
                        className="min-h-[200px] font-mono text-sm"
                      />
                    </FormControl>
                    <FormDescription>The plain-text body of the reminder email sent to employees.</FormDescription>
                    <FormMessage />
                  </FormItem>
                )} />
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={updateOrg.isPending}>Save Templates</Button>
            </div>
          </form>
        </Form>
      </div>
    </Layout>
  );
}
