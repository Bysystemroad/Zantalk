import { redirect } from "next/navigation";
import { NewTaskFlow } from "@/app/app/new/new-task-flow";
import { createClient } from "@/lib/supabase/server";

export default async function NewTaskPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return <NewTaskFlow />;
}
