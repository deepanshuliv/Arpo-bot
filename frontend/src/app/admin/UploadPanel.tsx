"use client";

import { useRef } from "react";
import { useTranslations } from "next-intl";
import { Check, Eye, FilePdf, Plus, UploadSimple, Warning, X } from "@phosphor-icons/react";
import SlideOver from "@/components/SlideOver";
import type { PdfUploadResult } from "@/lib/api";
import styles from "./admin.module.css";

