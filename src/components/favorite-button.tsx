"use client";

import { Heart } from "lucide-react";
import { useFavorites, useToggleFavorite } from "@/hooks/use-favorites";
import { motion } from "framer-motion";

interface FavoriteButtonProps {
  playerId: string;
  size?: "sm" | "md";
}

export function FavoriteButton({ playerId, size = "sm" }: FavoriteButtonProps) {
  const { data: favorites } = useFavorites();
  const toggleFavorite = useToggleFavorite();
  const isFavorited = favorites?.some((f) => f.favorited_player_id === playerId);

  const iconSize = size === "sm" ? "h-4 w-4" : "h-5 w-5";

  return (
    <motion.button
      whileTap={{ scale: 0.8 }}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();
        toggleFavorite.mutate(playerId);
      }}
      className="p-1.5 rounded-full hover:bg-muted transition-colors"
    >
      <Heart className={`${iconSize} ${isFavorited ? "fill-red-500 text-red-500" : "text-muted-foreground"}`} />
    </motion.button>
  );
}
