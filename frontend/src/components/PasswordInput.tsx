"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Eye, EyeSlash } from "@phosphor-icons/react";
import s from "./PasswordInput.module.css";

type PasswordInputProps = Omit<React.InputHTMLAttributes<HTMLInputElement>, "type">;

/** Password field with a show / hide (eye) button inside it. */
export default function PasswordInput(props: PasswordInputProps) {
  const t = useTranslations("password");
  const [visible, setVisible] = useState(false);

  return (
    <div className={s.wrap}>
      <input {...props} type={visible ? "text" : "password"} className={s.input} />
      <button
        type="button"
        className={s.eye}
        onClick={() => setVisible((v) => !v)}
        aria-label={visible ? t("hide") : t("show")}
        aria-pressed={visible}
        title={visible ? t("hide") : t("show")}
      >
        {visible ? <EyeSlash size={20} /> : <Eye size={20} />}
      </button>
    </div>
  );
}
