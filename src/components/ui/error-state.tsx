"use client";

import { AlertTriangle, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "Failed to load. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div className={`flex flex-col items-center py-16 text-center ${className ?? ""}`}>
      <div className="h-16 w-16 rounded-2xl bg-destructive/10 flex items-center justify-center mb-4">
        <AlertTriangle className="h-8 w-8 text-destructive/60" />
      </div>
      <p className="font-medium text-muted-foreground">{title}</p>
      <p className="text-sm text-muted-foreground/60 mt-0.5 max-w-[260px]">{description}</p>
      {onRetry && (
        <Button variant="outline" size="sm" className="mt-4 gap-1.5" onClick={onRetry}>
          <RotateCw className="h-3.5 w-3.5" />
          Try again
        </Button>
      )}
    </div>
  );
}
