"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { authClient } from "@/lib/auth-client";

const MIN_PASSWORD_LENGTH = 8;

export const RegisterForm = () => {
  const router = useRouter();
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);

    // Better Auth tek bir `name` alanı tutuyor; formdaki iki alan burada
    // birleşiyor, böylece şemaya dokunmaya gerek kalmıyor.
    const name = [firstName.trim(), lastName.trim()].filter(Boolean).join(" ");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setIsSubmitting(true);
    const result = await authClient.signUp.email({ name, email, password });

    if (result.error) {
      setIsSubmitting(false);
      setPassword("");
      setConfirmPassword("");
      setError(result.error.message || "Could not create the account.");
      return;
    }

    router.push("/documents");
    router.refresh();
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-y-4">
      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="register-first-name">First Name</Label>
        <Input
          id="register-first-name"
          value={firstName}
          onChange={(e) => setFirstName(e.target.value)}
          placeholder="Ada"
          autoComplete="given-name"
          autoFocus
          required
        />
      </div>

      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="register-last-name">Last Name</Label>
        <Input
          id="register-last-name"
          value={lastName}
          onChange={(e) => setLastName(e.target.value)}
          placeholder="Lovelace"
          autoComplete="family-name"
          required
        />
      </div>

      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="register-email">Email</Label>
        <Input
          id="register-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          autoComplete="email"
          required
        />
      </div>

      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="register-password">Password</Label>
        <Input
          id="register-password"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </div>

      <div className="flex flex-col gap-y-1.5">
        <Label htmlFor="register-confirm-password">Confirm Password</Label>
        <Input
          id="register-confirm-password"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="••••••••"
          autoComplete="new-password"
          minLength={MIN_PASSWORD_LENGTH}
          required
        />
      </div>

      {error && (
        <p role="alert" className="text-destructive text-sm">
          {error}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? <Spinner size="sm" /> : "Register"}
      </Button>
    </form>
  );
};
