import { redirect } from "next/navigation";
import { requireUser } from "@/lib/auth";
import { AppShell } from "@/components/app-shell";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireUser();
  if (!profile) redirect("/login");

  return <AppShell profile={profile}>{children}</AppShell>;
}
