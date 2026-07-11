"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { useFootballFields } from "@/hooks/use-football-fields";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { MapPin, Search, X, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { FootballField } from "@/types/football-field";

interface FootballFieldSelectorProps {
  value: FootballField | null;
  onSelect: (field: FootballField) => void;
  onClear: () => void;
}

export function FootballFieldSelector({
  value,
  onSelect,
  onClear,
}: FootballFieldSelectorProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [query, setQuery] = useState("");
  const { data: fields, isPending } = useFootballFields(query || undefined);
  const inputRef = useRef<HTMLInputElement>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const handleSearchChange = useCallback((val: string) => {
    setSearch(val);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => setQuery(val), 200);
  }, []);

  useEffect(() => {
    return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [open]);

  if (!open && value) {
    return (
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="w-full justify-start gap-3 text-left h-auto py-3"
            onClick={() => setOpen(true)}
          >
            <MapPin className="h-4 w-4 shrink-0 text-muted-foreground" />
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{value.name}</p>
              <p className="text-xs text-muted-foreground truncate">
                {value.address ? `${value.address}, ` : ""}{value.city}
              </p>
            </div>
            <ChevronRight className="h-4 w-4 shrink-0 text-muted-foreground" />
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="shrink-0 h-9 w-9"
            onClick={() => { onClear(); setOpen(false); }}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
        <Input
          ref={inputRef}
          placeholder="Search football fields..."
          value={search}
          onChange={(e) => handleSearchChange(e.target.value)}
          className="pl-9"
          onBlur={() => {
            setTimeout(() => {
              if (!value) setOpen(false);
            }, 200);
          }}
        />
      </div>

      <div className="max-h-64 overflow-y-auto rounded-lg border">
        {isPending ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            Searching...
          </div>
        ) : !fields?.length ? (
          <div className="p-4 text-center text-sm text-muted-foreground">
            {query ? "No fields found" : "Start typing to search fields"}
          </div>
        ) : (
          <div className="divide-y">
            {fields.map((field) => (
              <button
                key={field.id}
                type="button"
                className={cn(
                  "w-full text-left px-4 py-3 hover:bg-muted/50 transition-colors flex items-start gap-3",
                  value?.id === field.id && "bg-muted",
                )}
                onMouseDown={(e) => {
                  e.preventDefault();
                  onSelect(field);
                  setOpen(false);
                  setSearch("");
                  setQuery("");
                }}
              >
                <MapPin className="h-4 w-4 mt-0.5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{field.name}</p>
                  <p className="text-xs text-muted-foreground truncate">
                    {field.address ? `${field.address}, ` : ""}{field.city}
                  </p>
                </div>
                {value?.id === field.id && (
                  <span className="text-xs text-primary font-medium shrink-0">Selected</span>
                )}
              </button>
            ))}
          </div>
        )}
      </div>

      {value && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="text-xs"
          onClick={() => { onClear(); setSearch(""); setQuery(""); }}
        >
          Clear selection
        </Button>
      )}
    </div>
  );
}
