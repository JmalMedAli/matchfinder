"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMatchTemplates, useCreateTemplate, useDeleteTemplate } from "@/hooks/use-match-templates";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { Plus, Trash2, Copy, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface MatchTemplateProps {
  onApply: (template: { title: string; description?: string; maxPlayers: number; positionNeeded?: string }) => void;
}

export function MatchTemplateManager({ onApply }: MatchTemplateProps) {
  const { data: templates } = useMatchTemplates();
  const createTemplate = useCreateTemplate();
  const deleteTemplate = useDeleteTemplate();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");

  function handleCreate() {
    if (!name.trim() || !title.trim()) return;
    createTemplate.mutate(
      { name, title, description: null, location: null, football_field_id: null, max_players: 14, position_needed: null },
      { onSuccess: () => { toast.success("Template saved"); setShowCreate(false); setName(""); setTitle(""); }, onError: (e) => toast.error(e.message) }
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Templates</p>
        <Button variant="outline" size="sm" onClick={() => setShowCreate(!showCreate)} className="gap-1 h-7 text-xs">
          {showCreate ? <X className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
          {showCreate ? "Cancel" : "Save Current"}
        </Button>
      </div>

      <AnimatePresence>
        {showCreate && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }} className="overflow-hidden">
            <div className="flex gap-2 mt-2">
              <Input placeholder="Template name" value={name} onChange={(e) => setName(e.target.value)} className="h-9 text-sm" />
              <Input placeholder="Match title" value={title} onChange={(e) => setTitle(e.target.value)} className="h-9 text-sm" />
              <Button size="sm" onClick={handleCreate} disabled={!name.trim() || !title.trim()} className="h-9">Save</Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {templates && templates.length > 0 && (
        <div className="space-y-1.5">
          {templates.map((t) => (
            <div key={t.id} className="flex items-center gap-2 bg-card border rounded-xl px-3 py-2">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{t.name}</p>
                <p className="text-xs text-muted-foreground truncate">{t.title}</p>
              </div>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => onApply({ title: t.title, description: t.description ?? undefined, maxPlayers: t.max_players, positionNeeded: t.position_needed ?? undefined })}>
                <Copy className="h-3.5 w-3.5" />
              </Button>
              <Button variant="ghost" size="sm" className="h-7 w-7 p-0 text-destructive" onClick={() => deleteTemplate.mutate(t.id)}>
                <Trash2 className="h-3.5 w-3.5" />
              </Button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
