import { Suspense } from "react";
import { redirect } from "next/navigation";
import { LoginSessionGate } from "@/components/auth/login-session-gate";
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

  return (
    <Suspense fallback={null}>
      <LoginSessionGate>
        <LoginForm />
      </LoginSessionGate>
    </Suspense>
  );
}
