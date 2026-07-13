"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Star, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PostMatchReviewPromptProps {
  matchTitle: string;
  onSubmit: (rating: number, comment: string) => void;
  isPending: boolean;
}

export function PostMatchReviewPrompt({ matchTitle, onSubmit, isPending }: PostMatchReviewPromptProps) {
  const [dismissed, setDismissed] = useState(false);
  const [rating, setRating] = useState(0);
  const [hoveredStar, setHoveredStar] = useState(0);
  const [comment, setComment] = useState("");
  const [submitted, setSubmitted] = useState(false);

  if (dismissed || submitted) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="bg-gradient-to-r from-primary/10 via-primary/5 to-transparent border border-primary/20 rounded-2xl p-4"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <p className="font-semibold text-sm">How was the match?</p>
            <p className="text-xs text-muted-foreground mt-0.5">Rate &quot;{matchTitle}&quot;</p>
          </div>
          <button onClick={() => setDismissed(true)} className="text-muted-foreground hover:text-foreground">
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Star rating */}
        <div className="flex gap-1 mb-3">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="transition-transform hover:scale-110"
            >
              <Star
                className={`h-7 w-7 transition-colors ${
                  star <= (hoveredStar || rating)
                    ? "fill-amber-500 text-amber-500"
                    : "text-muted-foreground/30"
                }`}
              />
            </button>
          ))}
        </div>

        {/* Comment */}
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Leave a comment (optional)..."
          className="w-full h-16 text-sm rounded-xl border bg-background/50 px-3 py-2 resize-none focus:outline-none focus:ring-1 focus:ring-primary/50"
        />

        <div className="flex gap-2 mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={() => setDismissed(true)}
            className="rounded-xl"
          >
            Skip
          </Button>
          <Button
            size="sm"
            onClick={() => {
              onSubmit(rating, comment);
              setSubmitted(true);
            }}
            disabled={rating === 0 || isPending}
            className="rounded-xl"
          >
            {isPending ? "Submitting..." : "Submit Review"}
          </Button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
