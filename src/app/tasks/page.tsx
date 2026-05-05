import { redirect } from "next/navigation";

type TasksRedirectProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function TasksRedirectPage({
  searchParams,
}: TasksRedirectProps) {
  const { tab } = await searchParams;

  if (tab === "done") {
    redirect("/app/history");
  }

  redirect(tab === "upcoming" ? "/app?tab=upcoming" : "/app");
}
