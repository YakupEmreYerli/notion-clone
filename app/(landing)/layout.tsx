import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { Navbar } from "./_components/Navbar";

const LandingLayout = ({ children }: { children: React.ReactNode }) => {
  return (
    <div className="dark:bg-dark h-full">
      <Navbar />
      <p className="text-foreground/70 mx-auto flex max-w-4xl items-center justify-center gap-2 rounded-md border bg-[#f9e154]/30 px-4 py-2 text-xs font-medium sm:text-sm">
        <TriangleAlert className="size-5 shrink-0" />
        <span>
          This demo runs on Clerk development keys, so user limits apply. For
          long term use and self-hosting, see
          <Link
            href="https://github.com/adityaphasu/notion-clone/"
            target="_blank"
            rel="noreferrer"
            className="ml-1 underline underline-offset-2 hover:opacity-75"
          >
            README on GitHub.
          </Link>
        </span>
      </p>
      <main className="h-full pt-15">{children}</main>
    </div>
  );
};
export default LandingLayout;
