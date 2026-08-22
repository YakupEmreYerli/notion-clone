"use client";

import { Spinner } from "@/components/spinner";
import { Button } from "@/components/ui/button";
import { useAuthModal } from "@/hooks/useAuthModal";
import { useConvexAuth } from "convex/react";
import { ArrowRight } from "lucide-react";
import Link from "next/link";

export const Heading = () => {
  const { isAuthenticated, isLoading } = useConvexAuth();
  const authModal = useAuthModal();

  return (
    <div className="max-w-5xl space-y-4">
      <h1 className="flex flex-col justify-center text-3xl font-bold sm:text-5xl md:text-5xl">
        <span>
          Your Ideas💡, Documents📕, &{" "}
          <span className="whitespace-nowrap">
            Plans<span aria-hidden="true">🚀</span>
          </span>
        </span>
        <span className="flex justify-center gap-2">
          Welcome to
          <span className="underline underline-offset-4">Zotion</span>
        </span>
      </h1>
      <h2 className="text-base font-medium sm:text-xl">
        Zotion is the connected workspace where <br /> better, faster work
        happens.
      </h2>
      {isLoading && (
        <div className="flex w-full items-center justify-center">
          <Spinner size="md" />
        </div>
      )}
      {isAuthenticated && !isLoading && (
        <Button asChild>
          <Link href="/documents">
            Enter Zotion
            <ArrowRight className="ml-2 h-4 w-4" />
          </Link>
        </Button>
      )}
      {!isAuthenticated && !isLoading && (
        <Button onClick={() => authModal.onOpen("sign-up")}>
          Join Zotion
          <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      )}
    </div>
  );
};
