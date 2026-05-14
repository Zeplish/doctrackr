import { useState } from "react";
import { useLocation } from "wouter";
import { useLogin } from "@/lib/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { FileText, Bell, BarChart3, Users } from "lucide-react";

export default function LoginPage() {
  const [, setLocation] = useLocation();
  const login = useLogin();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await login.mutateAsync({ username, password });
      setLocation("/dashboard");
    } catch {
      setError("Invalid username or password.");
    }
  };

  return (
    <div className="flex min-h-screen">
      {/* Left panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white"
        style={{ backgroundColor: "hsl(232 51% 24%)" }}
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center rounded-lg bg-white/15 p-2">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <span className="text-xl font-bold tracking-tight">DocTrackr</span>
        </div>

        <div>
          <h1 className="text-4xl font-bold leading-tight mb-4">
            Document compliance,<br />without the chaos.
          </h1>
          <p className="text-white/60 text-lg leading-relaxed mb-10">
            Track expiring documents for every student and employee — and stay ahead of renewals automatically.
          </p>

          <div className="grid grid-cols-2 gap-4">
            <div className="rounded-xl bg-white/10 p-4">
              <Bell className="h-5 w-5 text-white/70 mb-2" />
              <p className="font-semibold text-sm mb-1">Automated Reminders</p>
              <p className="text-white/50 text-xs">Email alerts before documents expire</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <FileText className="h-5 w-5 text-white/70 mb-2" />
              <p className="font-semibold text-sm mb-1">Document Tracking</p>
              <p className="text-white/50 text-xs">Expiry dates and reminder history</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <BarChart3 className="h-5 w-5 text-white/70 mb-2" />
              <p className="font-semibold text-sm mb-1">Status Dashboard</p>
              <p className="text-white/50 text-xs">Overdue and missing items at a glance</p>
            </div>
            <div className="rounded-xl bg-white/10 p-4">
              <Users className="h-5 w-5 text-white/70 mb-2" />
              <p className="font-semibold text-sm mb-1">Compliance Reports</p>
              <p className="text-white/50 text-xs">Full audit trail and status views</p>
            </div>
          </div>
        </div>

        <p className="text-white/30 text-xs">
          &copy; {new Date().getFullYear()} DocTrackr. All rights reserved.
        </p>
      </div>

      {/* Right panel */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-2 flex items-center gap-2 lg:hidden">
            <FileText className="h-6 w-6 text-primary" />
            <span className="text-xl font-bold tracking-tight">DocTrackr</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-foreground mb-1">Sign in</h2>
          <p className="text-sm text-muted-foreground mb-8">Access your compliance dashboard</p>

          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="space-y-1.5">
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                type="text"
                autoComplete="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input
                id="password"
                type="password"
                autoComplete="current-password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive font-medium">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={login.isPending}>
              {login.isPending ? "Signing in…" : "Sign In"}
            </Button>
          </form>

        </div>
      </div>
    </div>
  );
}
