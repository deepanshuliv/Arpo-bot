"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useFormatter, useTranslations } from "next-intl";
import {
  CheckCircle,
  Crown,
  LockKey,
  ShieldCheck,
  UserPlus,
  Warning,
  X,
} from "@phosphor-icons/react";
import AdminNav from "@/components/AdminNav";
import AppShell from "@/components/AppShell";
import PasswordInput from "@/components/PasswordInput";
import {
  addSubadmin,
  getTeam,
  isStaffRole,
  removeSubadmin,
  type ErrorCode,
  type TeamMember,
} from "@/lib/api";
import { useSession } from "@/lib/session";
import styles from "./team.module.css";

type TeamError = "EMAIL_TAKEN" | "ALREADY_STAFF" | "INVALID_INPUT" | "FORBIDDEN" | "NOT_FOUND" | "NETWORK" | "SERVER_ERROR";

function toTeamError(code: ErrorCode | undefined): TeamError {
  const known: TeamError[] = ["EMAIL_TAKEN", "ALREADY_STAFF", "INVALID_INPUT", "FORBIDDEN", "NOT_FOUND", "NETWORK"];
  return known.includes(code as TeamError) ? (code as TeamError) : "SERVER_ERROR";
}

export default function TeamPage() {
  const t = useTranslations("team");
  const format = useFormatter();
  const router = useRouter();
  const session = useSession();
  const isMainAdmin = session?.role === "admin";

  const [members, setMembers] = useState<TeamMember[] | null>(null);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [adding, setAdding] = useState(false);
  const [formError, setFormError] = useState<TeamError | null>(null);
  const [listError, setListError] = useState<TeamError | null>(null);
  const [added, setAdded] = useState<string | null>(null);
  const [confirming, setConfirming] = useState<string | null>(null);
  const [removing, setRemoving] = useState<string | null>(null);

  const applyTeam = useCallback((res: Awaited<ReturnType<typeof getTeam>>) => {
    if (res.success && res.data) {
      setMembers(res.data.members);
    } else {
      setMembers([]);
      setListError(toTeamError(res.code));
    }
  }, []);

  useEffect(() => {
    if (session === undefined) return;
    if (!isStaffRole(session?.role)) {
      router.replace("/admin/auth");
      return;
    }
    if (session?.role === "admin") getTeam().then(applyTeam);
  }, [session, router, applyTeam]);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setAdding(true);
    setFormError(null);
    setAdded(null);

    const res = await addSubadmin(name.trim(), email.trim(), password);
    setAdding(false);

    if (res.success && res.data) {
      setAdded(res.data.member.name);
      setName("");
      setEmail("");
      setPassword("");
      getTeam().then(applyTeam);
    } else {
      setFormError(toTeamError(res.code));
    }
  };

  const handleRemove = async (member: TeamMember) => {
    setConfirming(null);
    setRemoving(member._id);
    const res = await removeSubadmin(member._id);
    setRemoving(null);
    if (res.success) {
      setMembers((prev) => prev?.filter((m) => m._id !== member._id) ?? prev);
    } else {
      setListError(toTeamError(res.code));
    }
  };

  return (
    <AppShell
      sidebar={<AdminNav />}
      title={t("title")}
      userName={session?.name ?? ""}
      signOutTo="/admin/auth"
    >
      {session && !isMainAdmin ? (
        <div className={styles.locked}>
          <LockKey size={28} weight="duotone" aria-hidden="true" />
          <p>{t("onlyMainAdmin")}</p>
        </div>
      ) : (
        <div className={styles.content}>
          <section className={styles.membersCol} aria-labelledby="members-title">
            <header>
              <h2 className={styles.heading}>{t("title")}</h2>
              <p className={styles.subtitle}>{t("subtitle")}</p>
            </header>

            <div className={styles.listHead}>
              <h3 id="members-title">{t("members")}</h3>
              {members && <span>{t("count", { count: members.length })}</span>}
            </div>

            {listError && (
              <p className={styles.errorBanner} role="alert">
                <Warning size={16} weight="fill" aria-hidden="true" />
                {t(`errors.${listError}`)}
              </p>
            )}

            {members === null ? (
              <div className={styles.skeleton} aria-busy="true" aria-label={t("loading")}>
                <span />
                <span />
              </div>
            ) : (
              <ul className={styles.memberList}>
                {members.map((m) => (
                  <li key={m._id} className={styles.member}>
                    <span className={styles.avatar} data-role={m.role} aria-hidden="true">
                      {m.name?.trim().charAt(0).toUpperCase() || "?"}
                    </span>
                    <div className={styles.memberBody}>
                      <span className={styles.memberName}>
                        {m.name}
                        {m.role === "admin" && <span className={styles.youTag}>{t("you")}</span>}
                      </span>
                      <span className={styles.memberMeta}>
                        {m.email}
                        {m.createdAt &&
                          ` · ${t("added", {
                            date: format.dateTime(new Date(m.createdAt), {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            }),
                          })}`}
                      </span>
                    </div>

                    <span className={styles.badge} data-role={m.role}>
                      {m.role === "admin" ? (
                        <Crown size={13} weight="fill" aria-hidden="true" />
                      ) : (
                        <ShieldCheck size={13} weight="fill" aria-hidden="true" />
                      )}
                      {m.role === "admin" ? t("roleAdmin") : t("roleSub")}
                    </span>

                    {m.role === "subadmin" &&
                      (removing === m._id ? (
                        <span className={styles.status}>{t("removing")}</span>
                      ) : confirming === m._id ? (
                        <div className={styles.confirm}>
                          <span>{t("confirmRemove", { name: m.name })}</span>
                          <button type="button" className={styles.confirmYes} onClick={() => handleRemove(m)}>
                            {t("confirmYes")}
                          </button>
                          <button type="button" className={styles.linkBtn} onClick={() => setConfirming(null)}>
                            {t("confirmNo")}
                          </button>
                        </div>
                      ) : (
                        <button type="button" className={styles.removeBtn} onClick={() => setConfirming(m._id)}>
                          {t("remove")}
                        </button>
                      ))}
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section className={styles.formCard} aria-labelledby="add-title">
            <span className={styles.formIcon} aria-hidden="true">
              <UserPlus size={22} weight="bold" />
            </span>
            <h3 id="add-title">{t("addTitle")}</h3>
            <p className={styles.formDesc}>{t("addDesc")}</p>

            <ul className={styles.rules}>
              <li data-kind="can">
                <CheckCircle size={16} weight="fill" aria-hidden="true" />
                {t("can")}
              </li>
              <li data-kind="cannot">
                <X size={16} weight="bold" aria-hidden="true" />
                {t("cannot")}
              </li>
            </ul>

            <form className={styles.form} onSubmit={handleAdd}>
              <div className={styles.field}>
                <label htmlFor="sub-name">{t("name")}</label>
                <input
                  id="sub-name"
                  type="text"
                  autoComplete="off"
                  placeholder={t("namePlaceholder")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="sub-email">{t("email")}</label>
                <input
                  id="sub-email"
                  type="email"
                  autoComplete="off"
                  placeholder={t("emailPlaceholder")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className={styles.field}>
                <label htmlFor="sub-password">
                  {t("password")}
                  <span>{t("passwordHint")}</span>
                </label>
                <PasswordInput
                  id="sub-password"
                  autoComplete="new-password"
                  placeholder={t("passwordPlaceholder")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  minLength={6}
                  required
                />
              </div>

              {formError && (
                <p className={styles.errorBanner} role="alert">
                  <Warning size={16} weight="fill" aria-hidden="true" />
                  {t(`errors.${formError}`)}
                </p>
              )}
              {added && (
                <p className={styles.successBanner} role="status">
                  <CheckCircle size={16} weight="fill" aria-hidden="true" />
                  {t("success", { name: added })}
                </p>
              )}

              <button type="submit" className="btn-primary" disabled={adding}>
                {adding ? (
                  <>
                    <span className={styles.spinner} aria-hidden="true" />
                    {t("adding")}
                  </>
                ) : (
                  <>
                    <UserPlus size={16} weight="bold" aria-hidden="true" />
                    {t("submit")}
                  </>
                )}
              </button>
            </form>
          </section>
        </div>
      )}
    </AppShell>
  );
}
