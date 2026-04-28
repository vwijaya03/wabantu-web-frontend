"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { authApi } from "@/lib/api/auth";
import { toApiError } from "@/lib/api/client";

const schema = z.object({
  name: z.string().min(2, "Minimal 2 karakter").max(120),
  businessName: z.string().min(2, "Minimal 2 karakter").max(200),
  email: z.email({ message: "Email tidak valid" }),
  password: z
    .string()
    .min(8, "Minimal 8 karakter")
    .regex(/[a-zA-Z]/, "Harus mengandung huruf")
    .regex(/[0-9]/, "Harus mengandung angka"),
});
type FormValues = z.infer<typeof schema>;

export default function RegisterPage() {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({ resolver: zodResolver(schema) });

  const onSubmit = async (values: FormValues) => {
    setSubmitting(true);
    try {
      await authApi.register(values);
      toast.success("Akun berhasil dibuat");
      router.replace("/dashboard");
      router.refresh();
    } catch (err) {
      const e = toApiError(err);
      toast.error(e.message || "Gagal mendaftar");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-2 text-center">
        <h1 className="text-2xl font-bold tracking-tight">Daftar gratis</h1>
        <p className="text-sm text-muted-foreground">
          Sudah punya akun?{" "}
          <Link
            href="/login"
            className="font-medium text-primary hover:underline"
          >
            Masuk
          </Link>
        </p>
      </div>
      <form className="space-y-4" onSubmit={handleSubmit(onSubmit)} noValidate>
        <div className="space-y-2">
          <Label htmlFor="name">Nama Anda</Label>
          <Input
            id="name"
            autoComplete="name"
            placeholder="Budi Santoso"
            {...register("name")}
          />
          {errors.name && (
            <p className="text-xs text-destructive">{errors.name.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="businessName">Nama bisnis</Label>
          <Input
            id="businessName"
            placeholder="Toko Sembako Pak Budi"
            {...register("businessName")}
          />
          {errors.businessName && (
            <p className="text-xs text-destructive">
              {errors.businessName.message}
            </p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="owner@toko-anda.id"
            {...register("email")}
          />
          {errors.email && (
            <p className="text-xs text-destructive">{errors.email.message}</p>
          )}
        </div>
        <div className="space-y-2">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            {...register("password")}
          />
          {errors.password && (
            <p className="text-xs text-destructive">
              {errors.password.message}
            </p>
          )}
        </div>
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Membuat akun..." : "Daftar Sekarang"}
        </Button>
        <p className="text-center text-xs text-muted-foreground">
          Dengan mendaftar, Anda menyetujui syarat layanan dan kebijakan
          privasi kami.
        </p>
      </form>
    </div>
  );
}
