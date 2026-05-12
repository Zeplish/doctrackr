import { Layout } from "@/components/layout";
import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useGetOrganization,
  useUpdateOrganization,
  getGetOrganizationQueryKey
} from "@workspace/api-client-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage, FormDescription } from "@/components/ui/form";
import { toast } from "sonner";
import { Textarea } from "@/components/ui/textarea";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

const orgSchema = z.object({
  name: z.string().min(1, "Organization name is required"),
  email: z.string().email("Invalid email").optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  address: z.string().optional().or(z.literal('')),
  website: z.string().url("Invalid URL").optional().or(z.literal('')),
  senderName: z.string().optional().or(z.literal('')),
  senderEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  adminCcEmail: z.string().email("Invalid email").optional().or(z.literal('')),
  primaryColor: z.string().optional().or(z.literal('')),
  secondaryColor: z.string().optional().or(z.literal('')),
  tagline: z.string().optional().or(z.literal('')),
  emailFooter: z.string().optional().or(z.literal('')),
});

type OrgFormValues = z.infer<typeof orgSchema>;

export default function OrgSettingsPage() {
  const qc = useQueryClient();
  const { data: org, isLoading } = useGetOrganization();
  const updateOrg = useUpdateOrganization();

  const form = useForm<OrgFormValues>({
    resolver: zodResolver(orgSchema),
    defaultValues: {
      name: "",
      email: "",
      phone: "",
      address: "",
      website: "",
      senderName: "",
      senderEmail: "",
      adminCcEmail: "",
      primaryColor: "",
      secondaryColor: "",
      tagline: "",
      emailFooter: "",
    }
  });

  useEffect(() => {
    if (org) {
      form.reset({
        name: org.name,
        email: org.email || "",
        phone: org.phone || "",
        address: org.address || "",
        website: org.website || "",
        senderName: org.senderName || "",
        senderEmail: org.senderEmail || "",
        adminCcEmail: org.adminCcEmail || "",
        primaryColor: org.primaryColor || "",
        secondaryColor: org.secondaryColor || "",
        tagline: org.tagline || "",
        emailFooter: org.emailFooter || "",
      });
    }
  }, [org, form]);

  const onSubmit = async (values: OrgFormValues) => {
    try {
      await updateOrg.mutateAsync({ data: values as any });
      qc.invalidateQueries({ queryKey: getGetOrganizationQueryKey() });
      toast.success("Organization settings updated");
    } catch (e) {
      toast.error("Failed to update organization settings");
    }
  };

  if (isLoading) {
    return (
      <Layout title="Organization Settings">
        <Skeleton className="h-[600px] w-full max-w-3xl" />
      </Layout>
    );
  }

  return (
    <Layout title="Organization Settings">
      <div className="max-w-3xl">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              <CardTitle>School / Daycare Profile</CardTitle>
            </div>
            <CardDescription>
              Manage your organization's basic information. These details will be used in emails and reports.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <FormField control={form.control} name="name" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Organization Name *</FormLabel><FormControl><Input {...field} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="email" render={({ field }) => (
                    <FormItem><FormLabel>Contact Email</FormLabel><FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="phone" render={({ field }) => (
                    <FormItem><FormLabel>Phone Number</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                  
                  <FormField control={form.control} name="address" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Physical Address</FormLabel><FormControl><Input {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />

                  <FormField control={form.control} name="website" render={({ field }) => (
                    <FormItem className="sm:col-span-2"><FormLabel>Website URL</FormLabel><FormControl><Input type="url" placeholder="https://" {...field} value={field.value || ""} /></FormControl><FormMessage /></FormItem>
                  )} />
                </div>

                <div className="border-t pt-6">
                  <h3 className="text-sm font-medium mb-4">Email Preferences</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField control={form.control} name="senderName" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Default Sender Name</FormLabel>
                        <FormDescription>Name shown on outgoing emails</FormDescription>
                        <FormControl><Input placeholder="e.g. DocTrackr Admin" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                    
                    <FormField control={form.control} name="senderEmail" render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reply-To Email</FormLabel>
                        <FormDescription>Where parents can reply</FormDescription>
                        <FormControl><Input type="email" placeholder="admin@school.com" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="adminCcEmail" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Admin CC Email</FormLabel>
                        <FormDescription>Send a BCC of all reminder emails to this address</FormDescription>
                        <FormControl><Input type="email" {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="emailFooter" render={({ field }) => (
                      <FormItem className="sm:col-span-2">
                        <FormLabel>Email Footer Text</FormLabel>
                        <FormControl><Textarea placeholder="Confidentiality notice, address, etc." {...field} value={field.value || ""} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />
                  </div>
                </div>

                <div className="flex justify-end">
                  <Button type="submit" disabled={updateOrg.isPending}>Save Changes</Button>
                </div>
              </form>
            </Form>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
