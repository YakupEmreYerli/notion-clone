import Image from "next/image";

interface AuthHeaderProps {
  title: string;
  description: string;
}

/** Form kolonunun tepesi: ortalanmış logo + başlık + tek satır açıklama. */
export const AuthHeader = ({ title, description }: AuthHeaderProps) => (
  <div className="mb-8 flex flex-col items-center gap-y-2 text-center">
    <div className="flex items-center gap-x-2">
      <Image
        src="/logo.svg"
        height={26}
        width={26}
        alt=""
        className="dark:hidden"
      />
      <Image
        src="/logo-dark.svg"
        height={26}
        width={26}
        alt=""
        className="hidden dark:block"
      />
      <h1 className="text-xl font-semibold">{title}</h1>
    </div>
    <p className="text-muted-foreground text-sm">{description}</p>
  </div>
);
