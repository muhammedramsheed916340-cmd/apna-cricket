"use client";

import { useEffect, useState } from "react";
import { BANNERS } from "@/lib/matches";

export function BannerCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % BANNERS.length);
    }, 3500);
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
          transition: "transform 0.5s ease",
          transform: `translateX(-${idx * 100}%)`,
        }}
      >
        {BANNERS.map((b) => (
          <div
            key={b.alt + b.src}
            style={{ minWidth: "100%", cursor: "pointer" }}
            onClick={() => open(b.href)}
          >
            <img src={b.src} alt={b.alt} />
          </div>
        ))}
      </div>
      <div
        style={{
          position: "absolute",
          bottom: 8,
          left: 0,
          right: 0,
          display: "flex",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {BANNERS.map((_, i) => (
          <span
            key={i}
            style={{
              width: 6,
              height: 6,
              borderRadius: "50%",
              background: i === idx ? "#fff" : "rgba(255,255,255,0.5)",
              transition: "background 0.3s",
            }}
          />
        ))}
      </div>
    </div>
  );
}
