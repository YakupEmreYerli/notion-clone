import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

const NotFound = () => {
  return (
    <div className="dark:bg-dark flex h-full flex-col items-center justify-center space-y-4">
      <Image
        src="/empty.svg"
        height={300}
        width={300}
        alt="not found"
        className="size-75 dark:hidden"
      />
      <Image
        src="/empty-dark.svg"
        height={300}
        width={300}
        alt="not found"
        className="hidden size-75 dark:block"
      />
      <h2 className="text-xl font-medium">This page doesn&apos;t exist</h2>
      <p className="text-muted-foreground text-sm">
        It may have been deleted, or the link is wrong.
      </p>
      <Button asChild>
        <Link href="/">Back to home</Link>
      </Button>
    </div>
  );
};

export default NotFound;
