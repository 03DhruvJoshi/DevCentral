import { useMemo, useState } from "react";
import {
  AlertTriangle,
  AtSign,
  Hash,
  Loader2,
  MapPin,
  Save,
  Trash2,
  User,
} from "lucide-react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "../../../../components/ui/card.js";
import { Button } from "../../../../components/ui/button.js";
import { Input } from "../../../../components/ui/input.js";
import { Badge } from "../../../../components/ui/badge.js";
import { Label } from "../../../../components/ui/label.js";
import { Separator } from "../../../../components/ui/separator.js";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../../../../components/ui/dialog.js";
import { API_BASE_URL } from "../../../admin/types.js";
import { clearAuthStorage } from "../../../../lib/auth.js";
import type { SettingsUser } from "../../types.js";
import {
  getAddress,
  getAuthToken,
  getCurrentUserId,
  persistUser,
} from "../../utils.js";

type GeneralSectionProps = {
  user: SettingsUser;
  onUserUpdate: (next: SettingsUser) => void;
};

export function GeneralSection({ user, onUserUpdate }: GeneralSectionProps) {
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteInput, setDeleteInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteError, setDeleteError] = useState<string | null>(null);

  const [fullName, setFullName] = useState(String(user.name ?? ""));
  const [address, setAddress] = useState(getAddress(user));
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [profileError, setProfileError] = useState<string | null>(null);
  const [profileSuccess, setProfileSuccess] = useState<string | null>(null);

  const currentUserId = useMemo(() => getCurrentUserId(user), [user]);

  const name = String(user.name ?? "—");
  const email = String(user.email ?? "—");
  const role = String(user.role ?? "DEV");

  const handleSaveProfile = async () => {
    if (!fullName.trim()) {
      setProfileError("Name cannot be empty.");
      setProfileSuccess(null);
      return;
    }

    const token = getAuthToken();
    if (!token) {
      setProfileError("You are not authenticated.");
      setProfileSuccess(null);
      return;
    }

    setIsSavingProfile(true);
    setProfileError(null);
    setProfileSuccess(null);

    try {
      const res = await fetch(`${API_BASE_URL}/api/auth/profile`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          name: fullName.trim(),
          address: address.trim(),
        }),
      });

      const data = (await res.json()) as {
        error?: string;
        user?: SettingsUser;
      };

      if (!res.ok || !data.user) {
        throw new Error(data.error ?? "Failed to update profile.");
      }

      const updatedUser = {
        ...user,
        ...data.user,
      };

      persistUser(updatedUser);
      onUserUpdate(updatedUser);
      setProfileSuccess("Profile updated successfully.");
    } catch (err) {
      setProfileError(
        err instanceof Error ? err.message : "Failed to update profile.",
      );
    } finally {
      setIsSavingProfile(false);
    }
  };

  const handleDelete = async () => {
    if (deleteInput !== "DELETE") return;
    if (!currentUserId) {
      setDeleteError("Unable to resolve your user id.");
      return;
    }

    setIsDeleting(true);
    setDeleteError(null);
    try {
      const token = getAuthToken();
      const res = await fetch(
        `${API_BASE_URL}/api/admin/users/${currentUserId}`,
        {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        },
      );
      if (res.ok) {
        clearAuthStorage();
        globalThis.location.href = "/login";
      } else {
        const data = (await res.json()) as { error?: string };
        setDeleteError(data.error ?? "Failed to delete account.");
      }
    } catch {
      setDeleteError("Network error. Please try again.");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-slate-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-slate-100 bg-white">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-slate-100 flex items-center justify-center">
              <User className="w-3.5 h-3.5 text-slate-500" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-slate-900">
                Profile
              </CardTitle>
              <CardDescription className="text-xs mt-0.5">
                Update your account details used across DevCentral.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5 space-y-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center text-xl font-bold text-slate-600 shrink-0 select-none">
              {name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-base font-semibold text-slate-900">{name}</p>
              <p className="text-sm text-slate-400">{email}</p>
              <Badge
                className={`mt-1 text-xs font-medium border hover:bg-transparent ${
                  role === "ADMIN"
                    ? "bg-purple-100 text-purple-700 border-purple-200"
                    : "bg-slate-100 text-slate-600 border-slate-200"
                }`}
              >
                {role === "ADMIN" ? "Platform Admin" : "Standard Developer"}
              </Badge>
            </div>
          </div>

          <Separator className="bg-slate-100" />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <User className="w-3 h-3" /> Full Name
              </Label>
              <Input
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="h-9 bg-white border-slate-200 text-slate-700 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <MapPin className="w-3 h-3" /> Address
              </Label>
              <Input
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Street, City, Country"
                className="h-9 bg-white border-slate-200 text-slate-700 text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <AtSign className="w-3 h-3" /> Email Address
              </Label>
              <Input
                value={email}
                readOnly
                className="h-9 bg-slate-50 border-slate-200 text-slate-700 text-sm cursor-default focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                <Hash className="w-3 h-3" /> User ID
              </Label>
              <Input
                value={currentUserId ?? "—"}
                readOnly
                className="h-9 bg-slate-50 border-slate-200 text-slate-700 text-sm cursor-default font-mono focus-visible:ring-0 focus-visible:ring-offset-0"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <Button
              onClick={() => void handleSaveProfile()}
              disabled={isSavingProfile}
              className="bg-slate-900 hover:bg-slate-800 text-white"
            >
              {isSavingProfile ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Changes
            </Button>
            {profileSuccess && (
              <p className="text-xs text-emerald-700 font-medium">
                {profileSuccess}
              </p>
            )}
            {profileError && (
              <p className="text-xs text-rose-600 font-medium">
                {profileError}
              </p>
            )}
          </div>
        </CardContent>
      </Card>

      <Card className="border-rose-200 shadow-sm overflow-hidden">
        <CardHeader className="px-6 py-4 border-b border-rose-100 bg-rose-50/40">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-rose-100 flex items-center justify-center">
              <AlertTriangle className="w-3.5 h-3.5 text-rose-600" />
            </div>
            <div>
              <CardTitle className="text-sm font-semibold text-rose-800">
                Danger Zone
              </CardTitle>
              <CardDescription className="text-xs mt-0.5 text-rose-600">
                Irreversible and destructive actions.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="px-6 py-5">
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm font-semibold text-slate-800">
                Delete Account
              </p>
              <p className="text-xs text-slate-500 mt-0.5 max-w-sm">
                Permanently deletes your account and associated data. This
                cannot be undone.
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 border-rose-200 text-rose-700 hover:bg-rose-50 shrink-0"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5 mr-1.5" />
              Delete Account
            </Button>
          </div>
        </CardContent>
      </Card>

      <Dialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) {
            setDeleteInput("");
            setDeleteError(null);
          }
        }}
      >
        <DialogContent className="max-w-md rounded-2xl border border-rose-200 p-6 bg-white">
          <DialogHeader>
            <div className="w-10 h-10 rounded-xl bg-rose-100 flex items-center justify-center mb-3">
              <Trash2 className="w-5 h-5 text-rose-600" />
            </div>
            <DialogTitle className="text-slate-900">Delete Account</DialogTitle>
            <DialogDescription className="text-slate-500">
              This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 pt-2">
            <div className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-rose-600" />
                <p>
                  Type{" "}
                  <span className="font-mono font-bold tracking-wide">
                    DELETE
                  </span>{" "}
                  below to confirm.
                </p>
              </div>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                Confirmation
              </Label>
              <Input
                placeholder="Type DELETE to confirm"
                value={deleteInput}
                onChange={(e) => setDeleteInput(e.target.value)}
                className="h-9 bg-slate-50 border-slate-200 text-sm font-mono"
              />
            </div>
            {deleteError && (
              <p className="text-xs text-rose-600 font-medium">{deleteError}</p>
            )}
            <div className="flex gap-3 pt-1">
              <Button
                variant="outline"
                className="flex-1 border-slate-200 text-slate-600"
                onClick={() => {
                  setDeleteOpen(false);
                  setDeleteInput("");
                  setDeleteError(null);
                }}
              >
                Cancel
              </Button>
              <Button
                className="flex-1 bg-rose-600 hover:bg-rose-700 text-white"
                disabled={deleteInput !== "DELETE" || isDeleting}
                onClick={() => void handleDelete()}
              >
                {isDeleting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <Trash2 className="h-4 w-4 mr-2" />
                )}
                Delete Account
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
