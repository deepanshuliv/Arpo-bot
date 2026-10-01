"use client";

import { useEffect, useRef } from "react";
import { X } from "@phosphor-icons/react";
import s from "./Modal.module.css";

type ModalProps = {
  onClose: () => void;
  title: string;
  subtitle?: React.ReactNode;
  closeLabel: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
};

/** Centred dialog; closes on Esc, the X or the backdrop. */
export default function Modal({ onClose, title, subtitle, closeLabel, actions, children }: ModalProps) {
  const dialogRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    dialogRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    const overflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = overflow;
      previous?.focus?.();
    };
  }, [onClose]);

  return (
    <div className={s.root}>
      <div className={s.backdrop} onClick={onClose} aria-hidden="true" />
      <div
        ref={dialogRef}
        className={s.dialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        tabIndex={-1}
      >
        <header className={s.head}>
          <div className={s.titles}>
            <h2 id="modal-title">{title}</h2>
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
