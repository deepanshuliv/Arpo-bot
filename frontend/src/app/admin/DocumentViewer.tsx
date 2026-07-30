"use client";

import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { ArrowSquareOut, FilePdf, Info, TextAlignLeft } from "@phosphor-icons/react";
import SlideOver from "@/components/SlideOver";
import {
  getDocumentFileUrl,
  getDocumentPassages,
  type DocumentPassage,
  type IndexedDocument,
} from "@/lib/api";
import styles from "./admin.module.css";

