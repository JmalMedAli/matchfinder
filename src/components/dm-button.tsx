"use client";

import { useRouter } from "next/navigation";
import { useCreateDM } from "@/hooks/use-conversations";
import { Button } from "@/components/ui/button";
import { MessageCircle } from "lucide-react";
import { toast } from "sonner";

export function DmButton({
  targetId,
  targetName,
  variant = "outline",
  size = "sm",
}: {
  targetId: string;
  targetName?: string;
  variant?: "outline" | "ghost" | "default";
  size?: "sm" | "default" | "lg";
}) {
  const router = useRouter();
  const createDM = useCreateDM();

  function handleClick() {
    createDM.mutate(targetId, {
      onSuccess: (data) => {
        router.push(`/dashboard/conversations/${data.conversation_id}`);
      },
      onError: (err) => {
        toast.error(err.message);
      },
    });
  }

  return (
    <Button
      variant={variant}
      size={size}
      onClick={handleClick}
      disabled={createDM.isPending}
      className="gap-1.5"
    >
      <MessageCircle className="h-3.5 w-3.5" />
      {createDM.isPending ? "Starting..." : `Message${targetName ? ` ${targetName}` : ""}`}
    </Button>
  );
}
