"use client";

import { useState } from "react";
import type { SmartDealProduct } from "@/lib/smartdeals";

export function ProductMedia({ product, priority = false, large = false }: { product: SmartDealProduct; priority?: boolean; large?: boolean }) {
  const images = product.galleryImages.length ? product.galleryImages : [product.imageUrl].filter(Boolean);
  const hasVideo = Boolean(product.video.source);
  const [selected, setSelected] = useState(hasVideo ? "video" : images[0] || "");
  const [zoom, setZoom] = useState({ active: false, x: 50, y: 50 });
  const showVideo = selected === "video" && hasVideo;
  const selectedImage = selected || images[0] || "";

  return (
    <div className={large ? "amazon-gallery large" : "amazon-gallery"}>
      <div
        className={large ? "product-stage large" : "product-stage"}
        onMouseLeave={() => setZoom((current) => ({ ...current, active: false }))}
        onMouseMove={(event) => {
          if (showVideo || !selectedImage) return;
          const rect = event.currentTarget.getBoundingClientRect();
          setZoom({
            active: true,
            x: Math.max(0, Math.min(100, ((event.clientX - rect.left) / rect.width) * 100)),
            y: Math.max(0, Math.min(100, ((event.clientY - rect.top) / rect.height) * 100)),
          });
        }}
      >
        {showVideo ? (
          <video className="product-video" src={product.video.source} poster={product.video.poster || images[0]} controls playsInline preload="metadata" />
        ) : (
          <>
            <img src={selectedImage} alt={product.title} loading={priority ? "eager" : "lazy"} />
            {selectedImage ? (
              <span
                className={zoom.active ? "media-zoom-pane active" : "media-zoom-pane"}
                aria-hidden="true"
                style={{
                  backgroundImage: `url(${selectedImage})`,
                  backgroundPosition: `${zoom.x}% ${zoom.y}%`,
                }}
              />
            ) : null}
          </>
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
            <button key={image} type="button" className={!showVideo && selectedImage === image ? "active" : ""} onClick={() => setSelected(image)}>
              <img src={image} alt={`${product.title} view ${index + 1}`} loading="lazy" />
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}
