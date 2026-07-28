"use client";

import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import s from "./SlideOver.module.css";

type SlideOverProps = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  closeLabel: string;
  /** "wide" for the document viewer */
  size?: "default" | "wide";
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Panel that slides in from the right; closes on Esc, the X or the backdrop. */
export default function SlideOver({
  open,
  onClose,
  title,
  subtitle,
  closeLabel,
  size = "default",
  actions,
  children,
}: SlideOverProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    panelRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      previous?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  return (
    <div className={s.root}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={panelRef}
        className={s.panel}
        data-size={size}
        role="dialog"
        aria-modal="true"
        aria-labelledby="slideover-title"
        tabIndex={-1}
      >
        <header className={s.head}>
          <div className={s.titles}>
            <h2 id="slideover-title">{title}</h2>
            {subtitle && <p>{subtitle}</p>}
          </div>
          {actions}
          <button type="button" className={s.close} onClick={onClose} aria-label={closeLabel} title={closeLabel}>
            <X size={18} weight="bold" />
          </button>
        </header>
        <div className={s.body}>{children}</div>
      </div>
    </div>
  );
}
