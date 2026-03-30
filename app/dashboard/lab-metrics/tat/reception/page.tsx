import { redirect } from "next/navigation";

export default function TatReceptionRedirectPage() {
  redirect("/dashboard/tat?tab=reception");
}
