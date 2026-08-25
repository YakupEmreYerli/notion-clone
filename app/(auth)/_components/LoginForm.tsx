"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { authClient } from "@/lib/auth-client";

export const LoginForm = () => {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = await authClient.signIn.email({ email, password });

    if (result.error) {
      setIsSubmitting(false);
      setPassword("");
      setError(result.error.message || "Could not sign in. Try again.");
      return;
    }

    // isSubmitting bilerek sıfırlanmıyor: yönlendirme sürerken buton kilitli
    // kalsın, aynı formun iki kez gönderilmesi engellensin.
    router.push("/documents");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="login-email">Email</Label>
        <Input
          id="login-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="login-password">Password</Label>
        <Input
          id="login-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="current-password"
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? <Spinner size="sm" /> : "Log in"}
      </Button>
    </form>
  );
};
