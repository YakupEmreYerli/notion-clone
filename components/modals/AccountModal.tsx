"use client";

import { useState } from "react";
import { toast } from "sonner";

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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useAccountModal } from "@/hooks/useAccountModal";
import { authClient } from "@/lib/auth-client";

export const AccountModal = () => {
  const { isOpen, onClose } = useAccountModal();
  const { data: session } = authClient.useSession();

  // `null` means "untouched" so the field always mirrors the current session
  // name until the user starts editing it.
  const [nameDraft, setNameDraft] = useState<string | null>(null);
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [isSavingName, setIsSavingName] = useState(false);
  const [isSavingPassword, setIsSavingPassword] = useState(false);

  const name = nameDraft ?? session?.user?.name ?? "";

  const closeModal = () => {
    setNameDraft(null);
    setCurrentPassword("");
    setNewPassword("");
    onClose();
  };

  const onSaveName = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingName(true);

    const result = await authClient.updateUser({ name });

    setIsSavingName(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to update your name.");
      return;
    }

    setNameDraft(null);
    toast.success("Name updated!");
  };

  const onChangePassword = async (event: React.FormEvent) => {
    event.preventDefault();
    setIsSavingPassword(true);

    const result = await authClient.changePassword({
      currentPassword,
      newPassword,
      revokeOtherSessions: true,
    });

    setIsSavingPassword(false);

    if (result.error) {
      toast.error(result.error.message || "Failed to change your password.");
      return;
    }

    setCurrentPassword("");
    setNewPassword("");
    toast.success("Password changed!");
  };

  const user = session?.user;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeModal()}>
      <DialogContent>
        <DialogHeader className="border-b pb-2">
          <DialogTitle className="text-lg font-medium">My account</DialogTitle>
          <DialogDescription className="sr-only">
            Manage your Zotion account details.
          </DialogDescription>
        </DialogHeader>

        <div className="divide-primary/10 divide-y">
          <div className="flex items-center gap-x-3 pb-3">
            <Avatar>
              <AvatarImage src={user?.image ?? undefined} />
              <AvatarFallback>
                {(user?.name || user?.email || "?").charAt(0).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div className="space-y-0.5">
              <p className="line-clamp-1 text-sm font-medium">{user?.name}</p>
              <p className="text-muted-foreground line-clamp-1 text-xs">
                {user?.email}
              </p>
            </div>
          </div>

          <form onSubmit={onSaveName} className="flex flex-col gap-y-2 py-3">
            <Label htmlFor="account-name">Display name</Label>
            <div className="flex items-center gap-x-2">
              <Input
                id="account-name"
                value={name}
                onChange={(e) => setNameDraft(e.target.value)}
                required
              />
              <Button type="submit" size="sm" disabled={isSavingName}>
                {isSavingName ? <Spinner size="sm" /> : "Save"}
              </Button>
            </div>
          </form>

          <form
            onSubmit={onChangePassword}
            className="flex flex-col gap-y-2 py-3"
          >
            <Label htmlFor="account-current-password">Change password</Label>
            <Input
              id="account-current-password"
              type="password"
              value={currentPassword}
              onChange={(e) => setCurrentPassword(e.target.value)}
              placeholder="Current password"
              autoComplete="current-password"
              required
            />
            <Input
              type="password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              placeholder="New password"
              autoComplete="new-password"
              minLength={8}
              required
            />
            <Button
              type="submit"
              size="sm"
              variant="outline"
              disabled={isSavingPassword}
              className="self-end"
            >
              {isSavingPassword ? <Spinner size="sm" /> : "Update password"}
            </Button>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  );
};
