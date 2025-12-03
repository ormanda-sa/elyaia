"use client";

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { ReactNode, useState } from "react";

type Props = {
  label?: string;
  title?: string;
  description?: string;
  onConfirm: () => void | Promise<void>;
  children?: ReactNode; // لو حاب تمرر محتوى مخصص للزر
  size?: "sm" | "default";
};

export function DeleteConfirmButton({
  label = "حذف",
  title = "تأكيد الحذف",
  description = "هل أنت متأكد أنك تريد حذف هذا العنصر؟ لا يمكن التراجع عن هذه العملية.",
  onConfirm,
  children,
  size = "sm",
}: Props) {
  const [loading, setLoading] = useState(false);

  const handleConfirm = async () => {
    try {
      setLoading(true);
      await onConfirm();
    } finally {
      setLoading(false);
    }
  };

  return (
    <AlertDialog>
      <AlertDialogTrigger asChild>
        <Button
          variant="outline"
          size={size}
          className="rounded-full border-rose-200 bg-rose-50 text-[11px] text-rose-600 hover:bg-rose-100 hover:text-rose-700"
        >
          {children ?? label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent dir="rtl" className="max-w-sm">
        <AlertDialogHeader>
          <AlertDialogTitle className="text-right text-sm">
            {title}
          </AlertDialogTitle>
          <AlertDialogDescription className="text-right text-[11px] leading-relaxed text-slate-500">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-row justify-between gap-2 sm:justify-end">
          <AlertDialogCancel className="text-xs">
            إلغاء
          </AlertDialogCancel>
          <AlertDialogAction
            className="bg-rose-600 text-xs hover:bg-rose-700"
            onClick={handleConfirm}
            disabled={loading}
          >
            {loading ? "جارٍ الحذف..." : "تأكيد الحذف"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
