"use client";

import { useEffect, useState } from "react";
import { BANNERS } from "@/lib/matches";
import { Sparkles, ChevronRight } from "lucide-react";

export function BannerCarousel() {
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const t = setInterval(() => {
      setIdx((i) => (i + 1) % BANNERS.length);
    }, 4500);
    return () => clearInterval(t);
  }, []);

  const open = (href: string) => {
    if (href && href !== "#") {
      window.open(href, "_blank", "noopener,noreferrer");
    }
  };

  return (
    <div className="ac-hero" role="region" aria-label="Featured banners">
      <div
        className="ac-hero-track"
        style={{ transform: `translateX(-${idx * 100}%)` }}
      >
        {BANNERS.map((b, i) => (
          <div
            key={i}
            className="ac-hero-slide"
            onClick={() => open(b.href)}
            role="button"
            tabIndex={0}
            aria-label={b.alt}
          >
            <img src={b.src} alt={b.alt} loading={i === 0 ? "eager" : "lazy"} />
            <div className="ac-hero-overlay" />
            <div className="ac-hero-content">
              <span className="ac-hero-tag">
                <Sparkles size={11} />
                Featured
              </span>
              <h3 className="ac-hero-title">{b.alt}</h3>
              {b.href && b.href !== "#" && (
                <span
                  className="ac-link-btn"
                  style={{ marginTop: 8 }}
                  onClick={(e) => {
                    e.stopPropagation();
                    open(b.href);
                  }}
                >
                  Learn more
                  <ChevronRight size={12} />
                </span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="ac-hero-dots" role="tablist" aria-label="Banner pagination">
        {BANNERS.map((_, i) => (
          <span
            key={i}
            role="tab"
            aria-selected={i === idx}
            tabIndex={0}
            className={`ac-hero-dot ${i === idx ? "ac-hero-dot-active" : ""}`}
            onClick={(e) => {
              e.stopPropagation();
              setIdx(i);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                setIdx(i);
              }
            }}
          />
        ))}
      </div>
    </div>
  );
}
