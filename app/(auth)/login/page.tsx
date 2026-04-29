import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getServerUser } from "@/lib/api/server";
import { LoginForm } from "./login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = (await searchParams) ?? {};
  const leakedEmail = params.email;
  const leakedPassword = params.password;
  if (leakedEmail || leakedPassword) {
    const nextValue = params.next;
    const next =
      typeof nextValue === "string"
        ? nextValue
        : Array.isArray(nextValue)
          ? nextValue[0]
          : undefined;
    const safeTarget = next ? `/login?next=${encodeURIComponent(next)}` : "/login";
    redirect(safeTarget);
  }

  const user = await getServerUser();
  if (user) redirect("/dashboard");

  // useSearchParams() in LoginForm requires Suspense per Next.js 16.
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
