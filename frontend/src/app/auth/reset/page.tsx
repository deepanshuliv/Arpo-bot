"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { useTranslations } from "next-intl";
import { ArrowLeft, ArrowRight, CheckCircle, LockKey, WarningCircle } from "@phosphor-icons/react";
import PasswordInput from "@/components/PasswordInput";
import SiteHeader, { headerStyles } from "@/components/SiteHeader";
import { getResetStatus, resetPassword } from "@/lib/api";
import { FieldError, serverError, validate, type AuthField, type FieldErrors } from "../formErrors";
import TrailPanel from "../TrailPanel";
import styles from "../auth.module.css";

