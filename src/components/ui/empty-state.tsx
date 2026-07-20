"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { LucideIcon } from "lucide-react";

interface StateAction {
  label: string;
  href?: string;
  onClick?: () => void;
}

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: StateAction;
  secondaryAction?: StateAction;
  className?: string;
}

function ActionButton({ action, variant }: { action: StateAction; variant: "default" | "outline" }) {
  if (action.href) {
    return (
      <Link href={action.href}>
        <Button variant={variant} size="sm">{action.label}</Button>
      </Link>
    );
  }
  return (
    <Button variant={variant} size="sm" onClick={action.onClick}>{action.label}</Button>
  );
}

export function EmptyState({ icon: Icon, title, description, action, secondaryAction, className }: EmptyStateProps) {
  return (
    <div className={`flex flex-col items-center py-16 text-center ${className ?? ""}`}>
      <motion.div
        className="h-16 w-16 rounded-2xl bg-muted flex items-center justify-center mb-4"
        animate={{ y: [0, -6, 0] }}
        transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
      >
        <Icon className="h-8 w-8 text-muted-foreground/40" />
      </motion.div>
      <p className="font-medium text-muted-foreground">{title}</p>
      {description && (
        <p className="text-sm text-muted-foreground/60 mt-0.5 max-w-[260px]">{description}</p>
      )}
      {(action || secondaryAction) && (
        <div className="flex items-center gap-2 mt-4">
          {action && <ActionButton action={action} variant="default" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="outline" />}
        </div>
      )}
    </div>
  );
}
