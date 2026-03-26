import { redirect } from "next/navigation";

export default function BrandSettingsRedirectPage() {
  redirect("/dashboard/admin/hospital");
}
