"use client";

import { useScrollTop } from "@/hooks/useScrollTop";
import { cn } from "@/lib/utils";
import { Logo } from "./Logo";
import { ModeToggle } from "@/components/mode-toggle";
import { useConvexAuth } from "convex/react";
import { UserButton } from "@/components/user-button";
import { useAuthModal } from "@/hooks/useAuthModal";
import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/spinner";
import Link from "next/link";

export const Navbar = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const scrolled = useScrollTop();
  const authModal = useAuthModal();

  return (
    <nav
      className={cn(
        "bg-background dark:bg-dark sticky inset-x-0 top-0 z-50 mx-auto flex w-full items-center p-6",
        scrolled && "border-b shadow-xs",
      )}
    >
      <Logo />
      <div className="flex w-full items-center justify-end md:ml-auto">
        <div className="flex items-center gap-x-2">
          {isLoading && <Spinner />}
          {!isLoading && !isAuthenticated && (
            <>
              <Button
                className="hidden md:block"
                variant="ghost"
                size="sm"
                onClick={() => authModal.onOpen("sign-in")}
              >
                Log In
              </Button>
              <Button size="sm" onClick={() => authModal.onOpen("sign-up")}>
                Join Zotion
              </Button>
            </>
          )}

          {isAuthenticated && !isLoading && (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/documents"> Enter Zotion </Link>
              </Button>
              <UserButton />
            </>
          )}
          <ModeToggle />
        </div>
      </div>
    </nav>
  );
};
