import React, { useState } from "react";
import { useTranslation } from "@/lib/i18n";
import { type Card } from "@/lib/card";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AlertTriangle, Loader2, Trash2 } from "lucide-react";

interface CardDeleteDialogProps {
  card: Card;
  linkedNfcToken?: string | null;
  isOpen: boolean;
  onClose: () => void;
  onConfirmDelete: (cardId: string) => Promise<void>;
}

export function CardDeleteDialog({
  card,
  linkedNfcToken,
  isOpen,
  onClose,
  onConfirmDelete,
}: CardDeleteDialogProps) {
  const { t, lang, dir } = useTranslation();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await onConfirmDelete(card.id);
      onClose();
    } catch {
      // Handled by caller
    } finally {
      setIsDeleting(false);
    }
  };

  const cardDisplayName = card.card_name || card.full_name || "Personal Card";

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent dir={dir} className="max-w-md bg-[#0F0F13] border-red-500/20 text-white p-6">
        <DialogHeader className="space-y-2">
          <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/20 flex items-center justify-center text-red-400">
            <Trash2 className="w-5 h-5" />
          </div>
          <DialogTitle className="text-lg font-bold text-white">{t("deleteCardTitle")}</DialogTitle>
          <DialogDescription className="text-sm text-zinc-400">
            {t("deleteCardConfirm").replace("{name}", cardDisplayName)}
          </DialogDescription>
        </DialogHeader>

        {linkedNfcToken && (
          <div className="p-3.5 rounded-xl bg-amber-950/40 border border-amber-500/30 text-amber-200 text-xs flex items-start gap-2.5">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="font-semibold">
                {lang === "ar" ? "تنبيه شريحة NFC المربوطة" : "Linked Physical NFC Warning"}
              </p>
              <p className="text-amber-300/90 leading-relaxed">
                {t("deleteCardNfcWarning").replace("{token}", linkedNfcToken)}
              </p>
            </div>
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2 pt-2">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeleting}
            className="w-full sm:w-auto text-zinc-400 hover:text-white"
          >
            {t("cancel")}
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={handleDelete}
            disabled={isDeleting}
            className="w-full sm:w-auto bg-red-600 hover:bg-red-500 text-white font-medium flex items-center justify-center gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>{t("deleting")}</span>
              </>
            ) : (
              <>
                <Trash2 className="w-4 h-4" />
                <span>{t("delete")}</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
