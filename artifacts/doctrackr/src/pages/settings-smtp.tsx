import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetSmtpSettings,
  useUpdateSmtpSettings,
  useTestSmtpSettings,
  getGetSmtpSettingsQueryKey
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Send, Info } from "lucide-react";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  fromEmail: z.string().email("Invalid email").min(1, "From Email is required"),
  fromName: z.string().min(1, "From Name is required"),
});

type SmtpFormValues = z.infer<typeof smtpSchema>;

export default function SmtpSettingsPage() {
  const qc = useQueryClient();
  const { data: smtp, isLoading } = useGetSmtpSettings();
  const updateSmtp = useUpdateSmtpSettings();
  const testSmtp = useTestSmtpSettings();

  const [testEmail, setTestEmail] = useState("");

  const form = useForm<SmtpFormValues>({
    resolver: zodResolver(smtpSchema),
    defaultValues: {
      host: "",
      port: 465,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
    }
  });

  useEffect(() => {
    if (smtp) {
      form.reset({
        host: smtp.host || "",
        port: smtp.port || 465,
        username: smtp.username || "",
        password: "",
        fromEmail: smtp.fromEmail || "",
        fromName: smtp.fromName || "",
      });
    }
  }, [smtp, form]);

  const onSubmit = async (values: SmtpFormValues) => {
    try {
      const { password, ...rest } = values;
      const data = { ...rest, secure: true, ...(password ? { password } : {}) };
      await updateSmtp.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetSmtpSettingsQueryKey() });
      toast.success("SMTP settings saved successfully");
    } catch (e) {
      toast.error("Failed to save SMTP settings");
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail || !/^\S+@\S+\.\S+$/.test(testEmail)) {
      toast.error("Please enter a valid test email address");
      return;
    }
    try {
      const res = await testSmtp.mutateAsync({ data: { toEmail: testEmail } });
      if (res.success) {
        toast.success("Test email sent successfully", { description: "Check your inbox to confirm." });
      } else {
        toast.error("Failed to send test email", { description: res.message });
      }
    } catch (e) {
      toast.error("Error connecting to SMTP server");
    }
  };

  if (isLoading) {
    return (
      <Layout title="SMTP Settings">
        <Skeleton className="h-[500px] w-full max-w-3xl" />
      </Layout>
    );
  }

  return (
    <Layout title="SMTP Settings">
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Server className="h-5 w-5 text-primary" />
              <CardTitle>Email Server Settings</CardTitle>
            </div>
            <CardDescription>
              Configure your SMTP server to send reminder emails directly from your domain.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="host" render={({ field }) => (
                    <FormItem><FormLabel>SMTP Host</FormLabel><FormControl><Input placeholder="smtp.gmail.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="port" render={({ field }) => (
                    <FormItem>
                      <FormLabel>SMTP Port</FormLabel>
                      <FormControl><Input type="number" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="username" render={({ field }) => (
                    <FormItem><FormLabel>Username</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="password" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password {smtp?.host && "(Leave blank to keep existing)"}</FormLabel>
                      <FormControl><Input type="password" placeholder="••••••••" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="fromName" render={({ field }) => (
                    <FormItem><FormLabel>From Name</FormLabel><FormControl><Input placeholder="DocTrackr System" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="fromEmail" render={({ field }) => (
                    <FormItem><FormLabel>From Email</FormLabel><FormControl><Input type="email" placeholder="no-reply@yourschool.com" {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>SSL/TLS is always enabled. Use port <strong>465</strong> for implicit TLS or <strong>587</strong> for STARTTLS.</span>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSmtp.isPending}>Save Settings</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
            <CardDescription>Send a test email to verify your SMTP configuration is working.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 max-w-md">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium leading-none">Recipient Email</label>
                <Input
                  type="email"
                  placeholder="test@example.com"
                  value={testEmail}
                  onChange={(e) => setTestEmail(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleTestEmail}
                disabled={testSmtp.isPending || !testEmail}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
