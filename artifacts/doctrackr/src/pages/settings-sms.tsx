import { Layout } from "@/components/layout";
import { useEffect, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetSmsSettings,
  useUpdateSmsSettings,
  useTestSmsSettings,
  getGetSmsSettingsQueryKey,
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { MessageSquare, Send, Info } from "lucide-react";

const smsSchema = z.object({
  accountSid: z.string().optional(),
  authToken: z.string().optional(),
  fromNumber: z.string().optional(),
  enabled: z.boolean(),
}).superRefine((data, ctx) => {
  if (data.enabled) {
    if (!data.accountSid || data.accountSid.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Account SID is required when SMS is enabled", path: ["accountSid"] });
    }
    if (!data.fromNumber || data.fromNumber.trim() === "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "From Number is required when SMS is enabled", path: ["fromNumber"] });
    }
  }
});

type SmsFormValues = z.infer<typeof smsSchema>;

export default function SmsSettingsPage() {
  const qc = useQueryClient();
  const { data: sms, isLoading } = useGetSmsSettings();
  const updateSms = useUpdateSmsSettings();
  const testSms = useTestSmsSettings();

  const [testPhone, setTestPhone] = useState("");

  const form = useForm<SmsFormValues>({
    resolver: zodResolver(smsSchema),
    defaultValues: {
      accountSid: "",
      authToken: "",
      fromNumber: "",
      enabled: false,
    },
  });

  useEffect(() => {
    if (sms) {
      form.reset({
        accountSid: sms.accountSid || "",
        authToken: "",
        fromNumber: sms.fromNumber || "",
        enabled: sms.enabled,
      });
    }
  }, [sms, form]);

  const onSubmit = async (values: SmsFormValues) => {
    try {
      const { authToken, ...rest } = values;
      const data = { ...rest, ...(authToken ? { authToken } : {}) };
      await updateSms.mutateAsync({ data });
      qc.invalidateQueries({ queryKey: getGetSmsSettingsQueryKey() });
      toast.success("SMS settings saved successfully");
    } catch {
      toast.error("Failed to save SMS settings");
    }
  };

  const handleTestSms = async () => {
    const phoneRegex = /^\+[1-9]\d{6,14}$/;
    if (!testPhone || !phoneRegex.test(testPhone)) {
      toast.error("Enter a valid phone number in E.164 format", {
        description: "Example: +12125551234",
      });
      return;
    }
    try {
      const res = await testSms.mutateAsync({ data: { toPhone: testPhone } });
      if (res.success) {
        toast.success("Test SMS sent successfully", {
          description: "Check your phone to confirm.",
        });
      } else {
        toast.error("Failed to send test SMS", { description: res.message });
      }
    } catch {
      toast.error("Error sending test SMS");
    }
  };

  if (isLoading) {
    return (
      <Layout title="SMS Settings">
        <Skeleton className="h-[500px] w-full max-w-3xl" />
      </Layout>
    );
  }

  return (
    <Layout title="SMS Settings">
      <div className="max-w-3xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-primary" />
              <CardTitle>Twilio SMS Settings</CardTitle>
            </div>
            <CardDescription>
              Configure Twilio to send SMS text message reminders to parents and employees alongside email reminders.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="accountSid" render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Account SID</FormLabel>
                      <FormControl>
                        <Input placeholder="ACxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="authToken" render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>Auth Token {sms?.accountSid && "(Leave blank to keep existing)"}</FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="••••••••••••••••••••••••••••••••" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="fromNumber" render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1">
                      <FormLabel>From Number</FormLabel>
                      <FormControl>
                        <Input placeholder="+12125551234" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="enabled" render={({ field }) => (
                    <FormItem className="col-span-2 sm:col-span-1 flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base">Enable SMS Reminders</FormLabel>
                        <p className="text-sm text-muted-foreground">
                          Send SMS alongside email reminders when a phone number is on file.
                        </p>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                        />
                      </FormControl>
                    </FormItem>
                  )} />
                </div>

                <div className="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm text-blue-700">
                  <Info className="h-4 w-4 mt-0.5 shrink-0" />
                  <span>
                    Get your credentials from the{" "}
                    <a href="https://console.twilio.com" target="_blank" rel="noopener noreferrer" className="underline font-medium">
                      Twilio Console
                    </a>
                    . Phone numbers must be in E.164 format (e.g. <strong>+12125551234</strong>).
                    SMS will only send when a phone number is on file for the student's parent or the employee.
                  </span>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateSms.isPending}>Save Settings</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Test Connection</CardTitle>
            <CardDescription>Send a test SMS to verify your Twilio configuration is working.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex items-end gap-4 max-w-md">
              <div className="flex-1 space-y-2">
                <label className="text-sm font-medium leading-none">Recipient Phone</label>
                <Input
                  type="tel"
                  placeholder="+12125551234"
                  value={testPhone}
                  onChange={(e) => setTestPhone(e.target.value)}
                />
              </div>
              <Button
                variant="secondary"
                onClick={handleTestSms}
                disabled={testSms.isPending || !testPhone}
              >
                <Send className="h-4 w-4 mr-2" />
                Send Test
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Phone number must be in E.164 format: +1 followed by 10 digits for US numbers.
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>How SMS Reminders Work</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-muted-foreground space-y-2">
            <p>When SMS is enabled and a phone number is on file, a text message is sent automatically alongside the email reminder.</p>
            <ul className="list-disc pl-4 space-y-1">
              <li><strong>Students:</strong> SMS is sent to Parent/Guardian 1's phone number.</li>
              <li><strong>Employees:</strong> SMS is sent to the employee's phone number.</li>
              <li>If no phone number is on file, only the email is sent — no error is shown.</li>
              <li>Manual reminders sent from the Compliance page also trigger SMS.</li>
              <li>SMS activity is tracked in the SMS Logs page.</li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
