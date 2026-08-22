"use client";

import { useRouter } from "next/navigation";
import { LogOut, Settings } from "lucide-react";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useAccountModal } from "@/hooks/useAccountModal";
import { authClient } from "@/lib/auth-client";

export const UserButton = () => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const account = useAccountModal();

  const user = session?.user;

  if (!user) return null;

  const onSignOut = async () => {
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger className="rounded-full outline-hidden">
        <Avatar className="h-7 w-7">
          <AvatarImage src={user.image ?? undefined} />
          <AvatarFallback className="text-xs">
            {(user.name || user.email || "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60" forceMount>
        <div className="flex flex-col space-y-1 p-2">
          <p className="line-clamp-1 text-sm font-medium">{user.name}</p>
          <p className="text-muted-foreground line-clamp-1 text-xs">
            {user.email}
          </p>
        </div>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="text-muted-foreground cursor-pointer"
          onClick={account.onOpen}
        >
          <Settings className="size-4" />
          Manage Account
        </DropdownMenuItem>
        <DropdownMenuItem
          className="text-muted-foreground cursor-pointer"
          onClick={onSignOut}
        >
          <LogOut className="size-4" />
          Log Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};
