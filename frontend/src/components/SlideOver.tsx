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

