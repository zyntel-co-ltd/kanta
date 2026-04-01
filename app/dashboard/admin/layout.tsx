import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { userCanAccessAdminPanel } from "@/lib/auth/server";
import AdminPanelSubNav from "@/components/dashboard/admin/AdminPanelSubNav";

/**
 * Server-side guard for `/dashboard/admin/*` — complements middleware (defense in depth).
 */
export default async function AdminSectionLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = await createClient();
  const auth = supabase.auth as unknown as {
    getUser: () => Promise<{ data: { user: { id: string } | null } }>;
  };
  const {
    data: { user },
  } = await auth.getUser();

  if (!user?.id) {
    redirect("/login?redirect=/dashboard/admin");
  }

  const allowed = await userCanAccessAdminPanel(user.id);
  if (!allowed) {
    redirect("/dashboard/home");
  }

  return (
    <>
      <AdminPanelSubNav />
      {children}
    </>
  );
}
