"use client";

import { useState, useRef } from "react";
import { createClient } from "@/lib/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Camera, Upload, X, Trash2, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import type { MatchPhoto } from "@/hooks/use-match-photos";

interface PhotoGalleryProps {
  matchId: string;
  userId: string | null;
  photos: MatchPhoto[];
  onUpload: (photo: MatchPhoto) => void;
  onDelete: (photoId: string) => void;
  isParticipant: boolean;
}

export function PhotoGallery({
  matchId,
  userId,
  photos,
  onUpload,
  onDelete,
  isParticipant,
}: PhotoGalleryProps) {
  const [uploading, setUploading] = useState(false);
  const [selectedPhoto, setSelectedPhoto] = useState<MatchPhoto | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      toast.error("File too large (max 5MB)");
      return;
    }

    setUploading(true);
    try {
      const supabase = createClient();
      const ext = file.name.split(".").pop();
      const path = `${matchId}/${userId}-${Date.now()}.${ext}`;

      const { error: uploadError } = await supabase.storage
        .from("match-photos")
        .upload(path, file, { contentType: file.type });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("match-photos")
        .getPublicUrl(path);

      const res = await fetch("/api/match-photos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ matchId, storagePath: path }),
      });

      if (!res.ok) throw new Error("Failed to save photo");

      const photo = await res.json();
      photo._publicUrl = publicUrl;
      onUpload(photo);
      toast.success("Photo uploaded");
    } catch (err: any) {
      toast.error(err.message ?? "Upload failed");
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }

  async function handleDelete(photo: MatchPhoto) {
    if (!confirm("Delete this photo?")) return;
    try {
      const res = await fetch("/api/match-photos", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ photoId: photo.id }),
      });
      if (!res.ok) throw new Error("Failed to delete");
      onDelete(photo.id);
      setSelectedPhoto(null);
      toast.success("Photo deleted");
    } catch (err: any) {
      toast.error(err.message);
    }
  }

  function getPublicUrl(path: string) {
    const supabase = createClient();
    return supabase.storage.from("match-photos").getPublicUrl(path).data.publicUrl;
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-semibold font-[family-name:var(--font-barlow-condensed)] flex items-center gap-2">
          <ImageIcon className="h-5 w-5 text-primary" />
          Photos
          {photos.length > 0 && <Badge variant="secondary" className="text-xs">{photos.length}</Badge>}
        </h2>
        {isParticipant && (
          <>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleUpload}
            />
            <Button
              size="sm"
              variant="outline"
              className="gap-1.5"
              disabled={uploading}
              onClick={() => fileInputRef.current?.click()}
            >
              {uploading ? (
                <div className="h-3.5 w-3.5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
              ) : (
                <Upload className="h-3.5 w-3.5" />
              )}
              {uploading ? "Uploading..." : "Upload"}
            </Button>
          </>
        )}
      </div>

      {photos.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-8 text-center">
            <Camera className="h-8 w-8 text-muted-foreground/50 mx-auto mb-2" />
            <p className="text-sm text-muted-foreground">No photos yet</p>
            {isParticipant && (
              <p className="text-xs text-muted-foreground/70 mt-1">Upload photos from this match</p>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-3 gap-2">
          {photos.map((photo, i) => (
            <motion.div
              key={photo.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2, delay: i * 0.03 }}
            >
              <button
                type="button"
                onClick={() => setSelectedPhoto(photo)}
                className="relative aspect-square rounded-xl overflow-hidden group cursor-pointer"
              >
                <img
                  src={photo._publicUrl ?? getPublicUrl(photo.storage_path)}
                  alt={photo.caption ?? "Match photo"}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-200"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/20 transition-colors" />
              </button>
            </motion.div>
          ))}
        </div>
      )}

      <AnimatePresence>
        {selectedPhoto && (
          <motion.div
            className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center p-4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSelectedPhoto(null)}
          >
            <motion.div
              className="relative max-w-2xl w-full"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <img
                src={selectedPhoto._publicUrl ?? getPublicUrl(selectedPhoto.storage_path)}
                alt={selectedPhoto.caption ?? "Match photo"}
                className="w-full rounded-xl"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {selectedPhoto.user_id === userId && (
                  <Button
                    size="icon"
                    variant="destructive"
                    className="h-8 w-8"
                    onClick={() => handleDelete(selectedPhoto)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
                <Button
                  size="icon"
                  variant="secondary"
                  className="h-8 w-8"
                  onClick={() => setSelectedPhoto(null)}
                >
                  <X className="h-4 w-4" />
                </Button>
              </div>
              {selectedPhoto.profiles && (
                <div className="absolute bottom-2 left-2 flex items-center gap-2 bg-black/60 rounded-full px-3 py-1.5">
                  <Avatar className="h-5 w-5">
                    <AvatarImage src={selectedPhoto.profiles.image ?? undefined} />
                    <AvatarFallback className="text-[8px]">{selectedPhoto.profiles.name?.[0] ?? "?"}</AvatarFallback>
                  </Avatar>
                  <span className="text-xs text-white">{selectedPhoto.profiles.name ?? "Unknown"}</span>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
