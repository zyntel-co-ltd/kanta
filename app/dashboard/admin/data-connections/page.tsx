import { redirect } from "next/navigation";

export default function DataConnectionsRedirectPage() {
  redirect("/dashboard/admin/data-bridge?tab=connection");
}
