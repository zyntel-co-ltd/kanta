import { redirect } from "next/navigation";

export default function DataImportRedirectPage() {
  redirect("/dashboard/admin/data-bridge?tab=import");
}
