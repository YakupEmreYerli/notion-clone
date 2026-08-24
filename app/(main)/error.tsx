"use client";

import Image from "next/image";
import Link from "next/link";

import { Button } from "@/components/ui/button";

/**
 * (main) segmentine özel hata sınırı. Kök `app/error.tsx`'in aksine `reset()`
 * sunar: sidebar/editör içindeki geçici bir hatadan sonra tüm uygulamayı
 * yeniden yüklemek gerekmez.
 */
const MainError = ({ reset }: { error: Error; reset: () => void }) => {
  return (
    <div className="dark:bg-dark flex h-full flex-col items-center justify-center space-y-4">
      <Image
        src="/error.svg"
        height={800}
        width={1100}
        priority
        alt="error"
        className="size-75 dark:hidden"
      />
      <Image
        src="/error-dark.svg"
        height={800}
        width={1100}
        priority
        alt="error"
        className="hidden size-75 dark:block"
      />
      <h2 className="text-xl font-medium">Something went wrong!</h2>
      <div className="flex items-center gap-x-2">
        <Button onClick={reset}>Try again</Button>
        <Button variant="ghost" asChild>
          <Link href="/documents">Go back</Link>
        </Button>
      </div>
    </div>
  );
};

export default MainError;
