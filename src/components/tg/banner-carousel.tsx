"use client";

import { useEffect, useState } from "react";
import { BANNERS } from "@/lib/matches";

export function BannerCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % BANNERS.length);
    }, 4000);
    return () => clearInterval(t);
  }, []);

  const open = (href: string) => {
    if (href && href !== "#") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="tg-carousel">
      <div
        style={{
          display: "flex",
          transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)",
          transform: `translateX(-${idx * 100}%)`,
        }}
      >
        {BANNERS.map((b, i) => (
          <div
            key={i}
            style={{ minWidth: "100%", cursor: "pointer", position: "relative" }}
            onClick={() => open(b.href)}
          >
            <img src={b.src} alt={b.alt} />
            {/* Gradient overlay for better text visibility */}
            <div
              style={{
                position: "absolute",
                bottom: 0,
                left: 0,
                right: 0,
                height: "50%",
                background: "linear-gradient(to top, rgba(0,0,0,0.7), transparent)",
              }}
            />
          </div>
        ))}
      </div>

      {/* Dots */}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 8,
          zIndex: 2,
        }}
      >
        {BANNERS.map((_, i) => (
          <span
            key={i}
            onClick={(e) => {
              e.stopPropagation();
              setIdx(i);
            }}
            style={{
              width: i === idx ? 24 : 8,
              height: 8,
              borderRadius: 4,
              background: i === idx ? "#00b050" : "rgba(255,255,255,0.6)",
              transition: "all 0.3s ease",
              cursor: "pointer",
            }}
          />
        ))}
      </div>
    </div>
  );
}
