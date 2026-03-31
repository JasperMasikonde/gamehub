"use client";

import { useState } from "react";
import { ChevronLeft, ChevronRight, ShoppingCart } from "lucide-react";

interface ProductImageGalleryProps {
  imageUrls: string[];
  name: string;
}

export function ProductImageGallery({ imageUrls, name }: ProductImageGalleryProps) {
  const [current, setCurrent] = useState(0);
  const hasImages = imageUrls.length > 0;

  function prev() { setCurrent((c) => (c - 1 + imageUrls.length) % imageUrls.length); }
  function next() { setCurrent((c) => (c + 1) % imageUrls.length); }

  if (!hasImages) {
    return (
      <div className="aspect-square bg-bg-elevated rounded-2xl flex items-center justify-center border border-bg-border">
        <ShoppingCart size={64} className="text-text-muted opacity-20" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="relative aspect-square bg-bg-elevated rounded-2xl overflow-hidden border border-bg-border">
        <img
          src={imageUrls[current]}
          alt={`${name} ${current + 1}`}
          className="w-full h-full object-cover"
        />
        {imageUrls.length > 1 && (
          <>
            <button
              onClick={prev}
              className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-bg-base/70 border border-bg-border flex items-center justify-center hover:bg-bg-elevated transition-colors"
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={next}
              className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-bg-base/70 border border-bg-border flex items-center justify-center hover:bg-bg-elevated transition-colors"
            >
              <ChevronRight size={16} />
            </button>
            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1.5">
              {imageUrls.map((_, i) => (
                <button
                  key={i}
                  onClick={() => setCurrent(i)}
                  className={`w-1.5 h-1.5 rounded-full transition-colors ${i === current ? "bg-neon-green" : "bg-bg-border"}`}
                />
              ))}
            </div>
          </>
        )}
      </div>
      {imageUrls.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {imageUrls.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`shrink-0 w-14 h-14 rounded-lg overflow-hidden border-2 transition-colors ${
                i === current ? "border-neon-green" : "border-bg-border hover:border-bg-elevated"
              }`}
            >
              <img src={url} alt="" className="w-full h-full object-cover" />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
