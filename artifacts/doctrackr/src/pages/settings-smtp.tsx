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
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Server, Send } from "lucide-react";
import { Separator } from "@/components/ui/separator";

const smtpSchema = z.object({
  host: z.string().min(1, "Host is required"),
  port: z.coerce.number().min(1).max(65535),
  username: z.string().min(1, "Username is required"),
  password: z.string().optional(),
  fromEmail: z.string().email("Invalid email").min(1, "From Email is required"),
  fromName: z.string().min(1, "From Name is required"),
  secure: z.boolean(),
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
      port: 587,
      username: "",
      password: "",
      fromEmail: "",
      fromName: "",
      secure: true,
    }
  });

  useEffect(() => {
    if (smtp) {
      form.reset({
        host: smtp.host || "",
        port: smtp.port || 587,
        username: smtp.username || "",
        password: "", // Don't populate password
        fromEmail: smtp.fromEmail || "",
        fromName: smtp.fromName || "",
        secure: smtp.secure ?? true,
      });
    }
  }, [smtp, form]);

  const onSubmit = async (values: SmtpFormValues) => {
    try {
      // Create a payload that only includes password if it's provided
      const payload: any = { ...values };
      if (!values.password) {
        delete payload.password;
      }
      
      await updateSmtp.mutateAsync({ data: payload });
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
      const res = await testSmtp.mutateAsync({ data: { toEmail: testEmail } as any });
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
        <Skeleton className="h-[600px] w-full max-w-3xl" />
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
              Configure your custom SMTP server to send reminder emails directly from your domain.
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
                    <FormItem><FormLabel>SMTP Port</FormLabel><FormControl><Input type="number" {...field} /></FormControl><FormMessage /></FormItem>
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

                <FormField control={form.control} name="secure" render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                    <div className="space-y-0.5">
                      <FormLabel className="text-base">Use SSL/TLS</FormLabel>
                      <FormDescription>Enable secure connection (recommended for port 465/587)</FormDescription>
                    </div>
                    <FormControl><Switch checked={field.value} onCheckedChange={field.onChange} /></FormControl>
                  </FormItem>
                )} />

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
                <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                  Recipient Email
                </label>
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
