import { useState } from "react";
import { KeyRound, Lock, Eye, EyeOff, CheckCircle2, AlertCircle, X } from "lucide-react";
import { changeUserPassword, type AppUser } from "@/lib/auth";

interface ChangePasswordModalProps {
  user: AppUser;
  isOpen: boolean;
  onClose: () => void;
}

export function ChangePasswordModal({ user, isOpen, onClose }: ChangePasswordModalProps) {
  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (!isOpen) return null;

  const handleClose = () => {
    setCurrentPassword("");
    setNewPassword("");
    setConfirmPassword("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(false);

    if (!newPassword || newPassword.length < 8) {
      setError("New password must be at least 8 characters long.");
      return;
    }

    if (newPassword !== confirmPassword) {
      setError("New password and confirm password do not match.");
      return;
    }

    setSaving(true);
    try {
      await changeUserPassword({
        email: user.email,
        currentPassword: currentPassword.trim(),
        newPassword: newPassword.trim(),
      });
      setSuccess(true);
      setTimeout(() => {
        handleClose();
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "Failed to update password. Please check current password.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      id="change-password-modal-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in duration-200"
    >
      <div
        id="change-password-modal-container"
        className="bg-card w-full max-w-md rounded-xl border border-border shadow-xl overflow-hidden animate-in zoom-in-95 duration-200"
      >
        <div className="px-6 py-4 border-b border-border flex items-center justify-between bg-muted/40">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-brand/10 text-brand">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-foreground">Change Password</h3>
              <p className="text-xs text-muted-foreground">{user.email}</p>
            </div>
          </div>
          <button
            id="close-change-password-modal"
            type="button"
            onClick={handleClose}
            className="p-1 rounded-md text-muted-foreground hover:text-foreground hover:bg-accent transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div
              id="change-password-error-alert"
              className="p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-xs flex items-start gap-2 animate-in fade-in"
            >
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{error}</span>
            </div>
          )}

          {success && (
            <div
              id="change-password-success-alert"
              className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-700 dark:text-emerald-400 text-xs flex items-center gap-2 animate-in fade-in"
            >
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              <span>Password updated successfully!</span>
            </div>
          )}

          <div className="space-y-1.5">
            <label
              htmlFor="current-password-input"
              className="text-xs font-medium text-foreground block"
            >
              Current Password
            </label>
            <div className="relative">
              <input
                id="current-password-input"
                type={showCurrent ? "text" : "password"}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Enter current password"
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background pr-10 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                disabled={saving || success}
              />
              <button
                type="button"
                onClick={() => setShowCurrent((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="new-password-input"
              className="text-xs font-medium text-foreground block"
            >
              New Password
            </label>
            <div className="relative">
              <input
                id="new-password-input"
                type={showNew ? "text" : "password"}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Enter new password (min. 8 characters)"
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background pr-10 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                disabled={saving || success}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowNew((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">Must contain at least 8 characters.</p>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="confirm-password-input"
              className="text-xs font-medium text-foreground block"
            >
              Confirm New Password
            </label>
            <div className="relative">
              <input
                id="confirm-password-input"
                type={showConfirm ? "text" : "password"}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Confirm new password"
                className="w-full px-3 py-2 text-sm rounded-md border border-input bg-background pr-10 focus:outline-none focus:ring-2 focus:ring-brand/40 focus:border-brand"
                disabled={saving || success}
                minLength={8}
                required
              />
              <button
                type="button"
                onClick={() => setShowConfirm((v) => !v)}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                tabIndex={-1}
              >
                {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="pt-3 flex items-center justify-end gap-2 border-t border-border mt-4">
            <button
              id="cancel-change-password-btn"
              type="button"
              onClick={handleClose}
              className="px-4 py-2 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-accent rounded-md transition"
              disabled={saving}
            >
              Cancel
            </button>
            <button
              id="submit-change-password-btn"
              type="submit"
              disabled={saving || success || !newPassword || !confirmPassword}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold bg-brand text-brand-foreground hover:bg-brand/90 active:bg-brand/95 rounded-md transition shadow-xs disabled:opacity-50 cursor-pointer"
            >
              <Lock className="w-3.5 h-3.5" />
              {saving ? "Updating..." : "Update Password"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
