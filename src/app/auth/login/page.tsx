import { redirect } from "next/navigation";

export default function OldLoginRedirectPage() {
  redirect("/login");
}
