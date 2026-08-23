"use client";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useNavDrawer } from "@/hooks/useNavDrawer";
import { cn } from "@/lib/utils";
import { useAccountModal } from "@/hooks/useAccountModal";
import { authClient } from "@/lib/auth-client";
import { Check, LogOut } from "lucide-react";
import { ChevronDownSmallIcon } from "./icons/ChevronDownSmallIcon";
import { SlidersIcon } from "./icons/SlidersIcon";
import { useRouter } from "next/navigation";

const actionRowBase =
  "flex h-[28px] cursor-pointer items-center rounded-[6px] px-[6px] transition-colors duration-150 select-none hover:bg-sidebar-hover";

export const UserItem = ({ navDrawer }: { navDrawer?: boolean }) => {
  const router = useRouter();
  const { data: session } = authClient.useSession();
  const user = session?.user;
  const account = useAccountModal();

  const { setInnerPopoverOpen } = useNavDrawer();

  const initial = (user?.name || user?.email || "?").charAt(0).toUpperCase();

  const onSignOut = async () => {
    setInnerPopoverOpen(false);
    await authClient.signOut();
    router.push("/");
    router.refresh();
  };

  const onOpenChange = (open: boolean) => {
    if (!navDrawer) return;
    setInnerPopoverOpen(open);
  };

  return (
    <DropdownMenu onOpenChange={navDrawer ? onOpenChange : undefined}>
      <DropdownMenuTrigger
        className={cn("w-full focus:outline-none", navDrawer && "w-full")}
      >
        <div
          className={cn(
            // workspace-switcher spec: 32px pill, radius 9999, hover rgba(255,255,255,0.05)
            "group flex h-[32px] w-full items-center rounded-full bg-transparent transition-colors duration-100 ease-out hover:bg-sidebar-hover",
            "text-sidebar-workspace-text",
          )}
        >
          {/* workspace-switcher-inner: 30px / min 27, padding 4px 8px, 14px/500 */}
          <div
            className={cn(
              "flex h-[30px] min-h-[27px] w-full min-w-0 items-center rounded-full px-[8px] py-[4px]",
              navDrawer ? "justify-between" : "",
            )}
          >
            <div
              className={cn(
                "flex min-w-0 flex-1 items-center overflow-hidden",
                navDrawer ? "w-full" : "",
              )}
            >
              {/* Avatar slot 22x22 mr-8; gerçek avatar 20x20 radius 4 */}
              <span className="mr-[8px] flex h-[22px] w-[22px] shrink-0 items-center justify-center">
                <Avatar className="size-[20px] shrink-0 rounded-[4px] ring-1 ring-sidebar-border">
                  <AvatarImage
                    src={user?.image ?? undefined}
                    className="rounded-[4px]"
                  />
                  <AvatarFallback className="rounded-[4px] bg-muted text-[13px] font-medium leading-none text-muted-foreground">
                    {initial}
                  </AvatarFallback>
                </Avatar>
              </span>
              {/* workspace-title: 14px/500 line-height 20, ellipsis, wrapper mr-6 */}
              <span className="mr-[6px] truncate whitespace-nowrap text-[14px] font-[500] leading-[20px] text-sidebar-workspace-text overflow-hidden text-ellipsis">
                {user?.name ? `${user.name}'s Zotion` : "Zotion"}
              </span>
            </div>
            <div className="ml-auto flex shrink-0 items-center pl-[3px]">
              <ChevronDownSmallIcon
                className={cn(
                  "h-3 w-auto shrink-0 text-sidebar-icon transition-colors group-hover:text-sidebar-text-active",
                  navDrawer && "hidden",
                )}
              />
            </div>
          </div>
        </div>
      </DropdownMenuTrigger>

      {/* workspace-modal: 300px, translateX(-4px), 8px inner padding */}
      <DropdownMenuContent
        align="start"
        alignOffset={8}
        forceMount
        className="w-[300px] overflow-visible rounded-[6px] border border-sidebar-border bg-popover p-0 text-popover-foreground shadow-[var(--popup-shadow)]"
        style={{ transform: "translateX(-4px)" }}
      >
        <div className="p-2">
          {/* Workspace header: 36x36 avatar + name/plan */}
          <div className="flex items-center gap-2 pb-1">
            <Avatar className="size-9 shrink-0 rounded-[4px]">
              <AvatarImage
                src={user?.image ?? undefined}
                className="rounded-[4px]"
              />
              <AvatarFallback className="rounded-[4px] bg-muted text-[18px] font-medium leading-none text-muted-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-[14px] font-[500] leading-[1.2] text-popover-foreground overflow-hidden text-ellipsis whitespace-nowrap">
                {user?.name ? `${user.name}'s Space` : "Space"}
              </p>
              <p className="truncate text-[12px] leading-[1.3] text-muted-foreground">
                Free Plan · 1 member
              </p>
            </div>
          </div>

          {/* Header separator */}
          <div className="pt-1 pb-2">
            <div className="h-px w-full bg-sidebar-border" />
          </div>

          {/* Settings — çalışan tek üst aksiyon */}
          <button
            type="button"
            onClick={() => {
              setInnerPopoverOpen(false);
              account.onOpen();
            }}
            className={cn(actionRowBase, "text-popover-foreground")}
          >
            <SlidersIcon className="mr-[6px] size-4 shrink-0 text-muted-foreground" />
            <span className="text-[13px] font-[500] text-popover-foreground">
              Settings
            </span>
          </button>

          {/* İkinci separator */}
          <div className="py-2">
            <div className="h-px w-full bg-sidebar-border" />
          </div>

          {/* Workspace bilgisi: aktif workspace + checkmark */}
          <div className="flex h-[28px] w-full items-center gap-[6px] rounded-[6px] px-[4px] py-[2px] pl-[6px]">
            <Avatar className="size-[20px] shrink-0 rounded-[4px]">
              <AvatarImage
                src={user?.image ?? undefined}
                className="rounded-[4px]"
              />
              <AvatarFallback className="rounded-[4px] bg-muted text-[12px] font-medium leading-none text-muted-foreground">
                {initial}
              </AvatarFallback>
            </Avatar>
            <span className="min-w-0 flex-1 truncate text-[13px] font-[400] text-popover-foreground overflow-hidden text-ellipsis whitespace-nowrap">
              {user?.name ? `${user.name}'s Space` : "Space"}
            </span>
            <span className="ml-auto flex shrink-0 items-center">
              <Check className="size-4 text-popover-foreground" strokeWidth={2} />
            </span>
          </div>

          {/* Logout footer: separator + Log out */}
          <div className="pt-2">
            <div className="h-px w-full bg-sidebar-border" />
          </div>
          <button
            type="button"
            onClick={onSignOut}
            className="mt-2 flex h-[28px] w-full cursor-pointer items-center gap-[6px] rounded-[6px] px-[6px] text-left transition-colors duration-150 hover:bg-sidebar-hover"
          >
            <LogOut className="size-4 shrink-0 text-muted-foreground" />
            <span className="text-[12px] font-[400] whitespace-nowrap text-muted-foreground">
              Log out
            </span>
          </button>
        </div>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};