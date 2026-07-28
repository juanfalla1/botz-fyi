"use client";

import { useState } from "react";
import type { SmartDealProduct } from "@/lib/smartdeals";

export function ProductMedia({ product, priority = false, large = false }: { product: SmartDealProduct; priority?: boolean; large?: boolean }) {
  const images = product.galleryImages.length ? product.galleryImages : [product.imageUrl].filter(Boolean);
  const hasVideo = Boolean(product.video.source);
  const [selected, setSelected] = useState(hasVideo ? "video" : images[0] || "");
  const showVideo = selected === "video" && hasVideo;

  return (
    <div className={large ? "amazon-gallery large" : "amazon-gallery"}>
      <div className={large ? "product-stage large" : "product-stage"}>
        {showVideo ? (
          <video className="product-video" src={product.video.source} poster={product.video.poster || images[0]} controls playsInline preload="metadata" />
        ) : (
          <img src={selected || images[0]} alt={product.title} loading={priority ? "eager" : "lazy"} />
        )}
      </div>
      {(images.length > 1 || hasVideo) ? (
        <div className="amazon-thumbnails" aria-label="Product media previews">
          {hasVideo ? (
            <button type="button" className={showVideo ? "active video-thumb" : "video-thumb"} onClick={() => setSelected("video")}>
              <span>Play video</span>
            </button>
          ) : null}
          {images.slice(0, 8).map((image, index) => (
            <button key={image} type="button" className={!showVideo && selected === image ? "active" : ""} onClick={() => setSelected(image)}>
              <img src={image} alt={`${product.title} view ${index + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
