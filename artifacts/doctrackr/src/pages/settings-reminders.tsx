import { Layout } from "@/components/layout";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetReminderSettings,
  useUpdateReminderSettings,
  getGetReminderSettingsQueryKey
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { Bell, Info } from "lucide-react";

const reminderSchema = z.object({
  daysBeforeExpiry: z.coerce.number().min(1, "Must be at least 1 day"),
  repeatEveryDays: z.coerce.number().min(1, "Must be at least 1 day"),
  overdueRepeatDays: z.coerce.number().min(1, "Must be at least 1 day"),
  cronTime: z.string().min(1, "Cron time is required"),
});

type ReminderFormValues = z.infer<typeof reminderSchema>;

export default function ReminderSettingsPage() {
  const qc = useQueryClient();
  const { data: settings, isLoading } = useGetReminderSettings();
  const updateSettings = useUpdateReminderSettings();

  const form = useForm<ReminderFormValues>({
    resolver: zodResolver(reminderSchema),
    defaultValues: {
      daysBeforeExpiry: 30,
      repeatEveryDays: 3,
      overdueRepeatDays: 7,
      cronTime: "0 9 * * *",
    }
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        daysBeforeExpiry: settings.daysBeforeExpiry,
        repeatEveryDays: settings.repeatEveryDays,
        overdueRepeatDays: settings.overdueRepeatDays,
        cronTime: settings.cronTime,
      });
    }
  }, [settings, form]);

  const onSubmit = async (values: ReminderFormValues) => {
    try {
      await updateSettings.mutateAsync({ data: values as any });
      qc.invalidateQueries({ queryKey: getGetReminderSettingsQueryKey() });
      toast.success("Reminder settings updated successfully");
    } catch (e) {
      toast.error("Failed to update reminder settings");
    }
  };

  if (isLoading) {
    return (
      <Layout title="Reminder Settings">
        <Skeleton className="h-[400px] w-full max-w-2xl" />
      </Layout>
    );
  }

  return (
    <Layout title="Reminder Settings">
      <div className="max-w-2xl space-y-6">
        <div className="bg-blue-50 border border-blue-200 text-blue-800 rounded-lg p-4 flex gap-3 text-sm">
          <Info className="h-5 w-5 shrink-0 text-blue-500 mt-0.5" />
          <p>
            <strong>How it works:</strong> Reminders are sent automatically once per day. The system sends reminders to parents/staff when documents are within the reminder window, and repeats every N days until the document is renewed.
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              <CardTitle>Automatic Reminders</CardTitle>
            </div>
            <CardDescription>
              Configure when and how often automated emails are sent out.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid gap-6">
                  <FormField control={form.control} name="daysBeforeExpiry" render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                      <div className="space-y-0.5">
                        <FormLabel>Start reminders</FormLabel>
                        <FormDescription>Days before expiry to send the first alert</FormDescription>
                      </div>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-24 text-right" {...field} />
                          <span className="text-sm text-muted-foreground w-12">days</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="repeatEveryDays" render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                      <div className="space-y-0.5">
                        <FormLabel>Repeat frequency (pre-expiry)</FormLabel>
                        <FormDescription>Send follow-ups every N days until expiry</FormDescription>
                      </div>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-24 text-right" {...field} />
                          <span className="text-sm text-muted-foreground w-12">days</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="overdueRepeatDays" render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b pb-4">
                      <div className="space-y-0.5">
                        <FormLabel>Overdue frequency</FormLabel>
                        <FormDescription>Send alerts every N days once overdue</FormDescription>
                      </div>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input type="number" className="w-24 text-right" {...field} />
                          <span className="text-sm text-muted-foreground w-12">days</span>
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="cronTime" render={({ field }) => (
                    <FormItem className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="space-y-0.5">
                        <FormLabel>Daily run time</FormLabel>
                        <FormDescription>Cron expression (minute hour * * *)</FormDescription>
                      </div>
                      <FormControl>
                        <div className="flex items-center gap-2">
                          <Input className="w-32 font-mono text-sm" placeholder="0 9 * * *" {...field} />
                        </div>
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end pt-4">
                  <Button type="submit" disabled={updateSettings.isPending}>Save Settings</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
