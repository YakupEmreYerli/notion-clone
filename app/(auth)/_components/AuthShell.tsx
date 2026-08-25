import Image from "next/image";

/**
 * Auth kabuğu: solda marka paneli, sağda form kolonu.
 *
 * Sol panel `lg` altında tamamen gizlenir — dar ekranda iki kolonu sıkıştırmak
 * yerine form tüm genişliği alır.
 *
 * Route layout'undan ayrı bir bileşen olmasının sebebi: `/register` yalnızca
 * hesapsız bir kurulumda açılabildiği için test/fixture tarafında sayfayı
 * render edemiyoruz — fixture bu kabuğu doğrudan kullanır, böylece görsel
 * doğrulama gerçek kabukla aynı işaretleme üzerinden yapılır.
 */
export const AuthShell = ({ children }: { children: React.ReactNode }) => (
  <div className="flex min-h-screen">
    <aside className="bg-secondary hidden w-[38%] max-w-[560px] flex-col justify-between p-10 lg:flex">
      <div className="flex items-center gap-x-2">
        <Image
          src="/logo.svg"
          height={28}
          width={28}
          alt=""
          className="dark:hidden"
        />
        <Image
          src="/logo-dark.svg"
          height={28}
          width={28}
          alt=""
          className="hidden dark:block"
        />
        <span className="text-foreground text-lg font-semibold">Zotion</span>
      </div>

      <p className="text-muted-foreground max-w-md text-sm leading-relaxed">
        &ldquo;Your notes, databases and plans in one workspace — on your own
        server.&rdquo;
      </p>
    </aside>

    <main className="flex flex-1 items-center justify-center px-6 py-12">
      <div className="w-full max-w-[420px]">{children}</div>
    </main>
  </div>
);
