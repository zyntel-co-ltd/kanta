import { redirect } from "next/navigation";

export default function TatPatientsRedirectPage() {
  redirect("/dashboard/tat?tab=patients");
}
