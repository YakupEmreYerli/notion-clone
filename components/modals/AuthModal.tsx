"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Spinner } from "@/components/spinner";
import { useAuthModal } from "@/hooks/useAuthModal";
import { authClient } from "@/lib/auth-client";

export const AuthModal = () => {
  const router = useRouter();
  const { isOpen, mode, onClose, setMode } = useAuthModal();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isSignUp = mode === "sign-up";

  const switchMode = () => {
    setMode(isSignUp ? "sign-in" : "sign-up");
    setError(null);
    setPassword("");
  };

  const closeModal = () => {
    setError(null);
    setPassword("");
    onClose();
  };

  const onSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setIsSubmitting(true);

    const result = isSignUp
      ? await authClient.signUp.email({ name, email, password })
      : await authClient.signIn.email({ email, password });

    setIsSubmitting(false);

    if (result.error) {
      setError(result.error.message || "Something went wrong. Try again.");
      return;
    }

    setName("");
    setEmail("");
    setPassword("");
    onClose();
    router.push("/documents");
    router.refresh();
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent className="dark:bg-dark sm:max-w-96">
        <DialogHeader className="items-center">
          <Image
            src="/logo.svg"
            height={40}
            width={40}
            alt="Zotion"
            className="dark:hidden"
          />
          <Image
            src="/logo-dark.svg"
            height={40}
            width={40}
            alt="Zotion"
            className="hidden dark:block"
          />
          <DialogTitle className="text-center text-lg font-semibold">
            {isSignUp ? "Join Zotion" : "Log in to Zotion"}
          </DialogTitle>
          <DialogDescription className="text-center text-sm">
            {isSignUp
              ? "Create an account to start writing."
              : "Welcome back. Pick up where you left off."}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={onSubmit} className="flex flex-col gap-y-3">
          {isSignUp && (
            <div className="flex flex-col gap-y-1.5">
              <Label htmlFor="auth-name">Name</Label>
              <Input
                id="auth-name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Ada Lovelace"
                autoComplete="name"
                required
              />
            </div>
          )}
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
              autoComplete="email"
              required
            />
          </div>
          <div className="flex flex-col gap-y-1.5">
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              autoComplete={isSignUp ? "new-password" : "current-password"}
              minLength={8}
              required
            />
          </div>

          {error && <p className="text-sm text-red-500">{error}</p>}

          <Button type="submit" disabled={isSubmitting} className="mt-1 w-full">
            {isSubmitting ? (
              <Spinner size="sm" />
            ) : isSignUp ? (
              "Create account"
            ) : (
              "Log in"
            )}
          </Button>
        </form>

        <p className="text-muted-foreground text-center text-sm">
          {isSignUp ? "Already have an account?" : "New to Zotion?"}{" "}
          <button
            type="button"
            className="text-primary font-medium underline underline-offset-4"
            onClick={switchMode}
          >
            {isSignUp ? "Log in" : "Create one"}
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
};
