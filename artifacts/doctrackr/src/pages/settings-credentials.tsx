import { Layout } from "@/components/layout";
import { useState } from "react";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";
import { KeyRound } from "lucide-react";
import { useMe } from "@/lib/auth";

const credentialsSchema = z.object({
  currentPassword: z.string().min(1, "Current password is required"),
  newUsername: z.string().min(1, "Username is required"),
  newPassword: z.string().optional().or(z.literal("")),
  confirmPassword: z.string().optional().or(z.literal("")),
}).refine(
  (data) => !data.newPassword || data.newPassword === data.confirmPassword,
  { message: "Passwords do not match", path: ["confirmPassword"] }
);

type CredentialsFormValues = z.infer<typeof credentialsSchema>;

export default function CredentialsSettingsPage() {
  const { data: me } = useMe();
  const [isPending, setIsPending] = useState(false);

  const form = useForm<CredentialsFormValues>({
    resolver: zodResolver(credentialsSchema),
    defaultValues: {
      currentPassword: "",
      newUsername: me?.username ?? "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const currentUsername = me?.username ?? "admin";

  const onSubmit = async (values: CredentialsFormValues) => {
    setIsPending(true);
    try {
      const res = await fetch("/api/auth/credentials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentPassword: values.currentPassword,
          newUsername: values.newUsername !== currentUsername ? values.newUsername : undefined,
          newPassword: values.newPassword || undefined,
        }),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        toast.error((err as any).error ?? "Failed to update credentials");
        return;
      }
      toast.success("Login credentials updated successfully");
      form.reset({
        currentPassword: "",
        newUsername: values.newUsername,
        newPassword: "",
        confirmPassword: "",
      });
    } catch {
      toast.error("Failed to update credentials");
    } finally {
      setIsPending(false);
    }
  };

  return (
    <Layout title="Login Credentials">
      <div className="max-w-lg">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              <CardTitle>Login Credentials</CardTitle>
            </div>
            <CardDescription>
              Change the username or password used to sign in to DocTrackr.
              You must enter your current password to make any changes.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
                <div className="rounded-md bg-muted px-4 py-3 text-sm text-muted-foreground">
                  Current username: <span className="font-medium text-foreground">{currentUsername}</span>
                </div>

                <FormField control={form.control} name="currentPassword" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Current Password *</FormLabel>
                    <FormControl><Input type="password" autoComplete="current-password" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="border-t pt-5 space-y-4">
                  <h3 className="text-sm font-medium">New Credentials</h3>

                  <FormField control={form.control} name="newUsername" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Username</FormLabel>
                      <FormDescription>Leave unchanged to keep the current username</FormDescription>
                      <FormControl><Input autoComplete="username" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="newPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>New Password</FormLabel>
                      <FormDescription>Leave blank to keep the current password</FormDescription>
                      <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />

                  <FormField control={form.control} name="confirmPassword" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm New Password</FormLabel>
                      <FormControl><Input type="password" autoComplete="new-password" {...field} /></FormControl>
                      <FormMessage />
                    </FormItem>
                  )} />
                </div>

                <div className="flex justify-end pt-1">
                  <Button type="submit" disabled={isPending}>
                    {isPending ? "Saving..." : "Save Changes"}
                  </Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
