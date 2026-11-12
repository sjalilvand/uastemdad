"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { PageHeader } from "./page-header";
import { usePrefs } from "@/lib/prefs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  UserPlus,
  LogIn,
  Loader2,
  GraduationCap,
  BadgeCheck,
  Bell,
  Star,
  ClipboardList,
  AlertCircle,
  CheckCircle2,
} from "lucide-react";

const DEGREES = ["کاردانی", "کارشناسی", "کارشناسی ارشد", "دکتری"];

export function MemberAuthSection() {
  const { t, locale } = usePrefs();
  const router = useRouter();

  // فرم ورود
  const [identifier, setIdentifier] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginLoading, setLoginLoading] = useState(false);
  const [loginError, setLoginError] = useState("");

  // فرم ثبت‌نام
  const [reg, setReg] = useState({
    firstName: "",
    lastName: "",
    studentId: "",
    nationalId: "",
    email: "",
    phone: "",
    field: "",
    degree: "کارشناسی",
    university: "",
    password: "",
  });
  const [regNewsletter, setRegNewsletter] = useState(true);
  const [regLoading, setRegLoading] = useState(false);
  const [regError, setRegError] = useState("");
  const [regSuccess, setRegSuccess] = useState(false);

  const login = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoginError("");
    setLoginLoading(true);
    try {
      const res = await fetch("/api/member/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier, password: loginPassword }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        router.push("/membership/dashboard");
        router.refresh();
        return;
      }
      if (data.error === "PENDING") setLoginError(t("member.pending"));
      else if (data.error === "REJECTED") setLoginError(t("member.rejected"));
      else setLoginError(t("member.loginFailed"));
    } catch {
      setLoginError(t("common.error"));
    } finally {
      setLoginLoading(false);
    }
  };

  const register = async (e: React.FormEvent) => {
    e.preventDefault();
    setRegError("");
    setRegLoading(true);
    try {
      const res = await fetch("/api/member/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reg, newsletter: regNewsletter }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        setRegSuccess(true);
        return;
      }
      setRegError(data.error || t("common.error"));
    } catch {
      setRegError(t("common.error"));
    } finally {
      setRegLoading(false);
    }
  };

  const field =
    "w-full h-11 rounded-xl border border-input bg-background px-4 text-sm outline-none focus:ring-2 focus:ring-ring/40 transition-shadow";

  const benefits = [
    { icon: Bell, text: t("member.benefit1") },
    { icon: ClipboardList, text: t("member.benefit2") },
    { icon: Star, text: t("member.benefit3") },
    { icon: BadgeCheck, text: t("member.benefit4") },
  ];

  return (
    <>
      <PageHeader
        title={t("member.title")}
        subtitle={t("member.subtitle")}
        breadcrumb={[{ label: t("member.title") }]}
      />
      <div className="mx-auto max-w-7xl px-4 py-10 grid gap-8 lg:grid-cols-3">
        {/* مزایا */}
        <div className="space-y-4">
          <div className="rounded-2xl emerald-gradient pattern-bg p-6 text-white">
            <div className="flex items-center gap-3 mb-4">
              <div className="h-11 w-11 rounded-xl bg-white/15 flex items-center justify-center">
                <GraduationCap className="h-5.5 w-5.5" />
              </div>
              <h3 className="font-extrabold text-sm">{t("member.benefitsTitle")}</h3>
            </div>
            <ul className="space-y-3">
              {benefits.map((b, i) => (
                <li key={i} className="flex items-start gap-2.5 text-xs leading-6 text-white/85">
                  <b.icon className="h-4 w-4 text-gold shrink-0 mt-0.5" />
                  {b.text}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl border border-border bg-card p-5 text-xs text-muted-foreground leading-6">
            {locale === "en"
              ? "After signing up, an administrator reviews and approves your account. Your information is stored securely."
              : locale === "ar"
                ? "بعد التسجيل يقوم المسؤول بمراجعة حسابك والموافقة عليه. تُحفظ معلوماتك بأمان."
                : "پس از ثبت‌نام، حساب شما توسط مدیر بررسی و تأیید می‌شود. اطلاعات شما به‌صورت امن ذخیره می‌گردد."}
          </div>
        </div>

        {/* فرم‌ها */}
        <div className="lg:col-span-2">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 h-12 rounded-xl">
              <TabsTrigger value="login" className="gap-1.5 text-sm">
                <LogIn className="h-4 w-4" />
                {t("member.login")}
              </TabsTrigger>
              <TabsTrigger value="register" className="gap-1.5 text-sm">
                <UserPlus className="h-4 w-4" />
                {t("member.register")}
              </TabsTrigger>
            </TabsList>

            {/* ورود */}
            <TabsContent value="login">
              <form
                onSubmit={login}
                className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-8 space-y-4"
              >
                {loginError && (
                  <div className="flex items-center gap-2 rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-xs font-semibold">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {loginError}
                  </div>
                )}
                <div className="space-y-1.5">
                  <Label htmlFor="identifier" className="text-sm font-semibold">
                    {t("member.loginWith")}
                  </Label>
                  <Input
                    id="identifier"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value)}
                    placeholder="0921…  یا  name@example.com"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="loginPassword" className="text-sm font-semibold">
                    {t("member.password")}
                  </Label>
                  <Input
                    id="loginPassword"
                    type="password"
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    placeholder="••••••"
                    required
                  />
                </div>
                <Button
                  type="submit"
                  disabled={loginLoading}
                  className="w-full h-11 rounded-xl text-sm font-bold gap-2"
                >
                  {loginLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <LogIn className="h-4 w-4" />
                  )}
                  {t("member.loginButton")}
                </Button>
                <p className="text-center text-xs text-muted-foreground">
                  {t("member.noAccount")}{" "}
                  <Link href="/membership" className="text-primary font-bold hover:text-gold">
                    {t("member.register")}
                  </Link>
                </p>
              </form>
            </TabsContent>

            {/* ثبت‌نام */}
            <TabsContent value="register">
              {regSuccess ? (
                <div className="rounded-2xl border border-border bg-card shadow-sm p-8 text-center space-y-3">
                  <CheckCircle2 className="h-12 w-12 text-primary mx-auto" />
                  <p className="text-sm font-semibold leading-7">{t("member.registerSuccess")}</p>
                  <Button asChild variant="outline" size="sm">
                    <Link href="/membership">{t("member.login")}</Link>
                  </Button>
                </div>
              ) : (
                <form
                  onSubmit={register}
                  className="rounded-2xl border border-border bg-card shadow-sm p-6 md:p-8 space-y-4"
                >
                  {regError && (
                    <div className="flex items-center gap-2 rounded-xl bg-destructive/10 text-destructive px-4 py-3 text-xs font-semibold">
                      <AlertCircle className="h-4 w-4 shrink-0" />
                      {regError}
                    </div>
                  )}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-1.5">
                      <Label htmlFor="firstName" className="text-sm font-semibold">
                        {t("member.firstName")} *
                      </Label>
                      <Input
                        id="firstName"
                        value={reg.firstName}
                        onChange={(e) => setReg({ ...reg, firstName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="lastName" className="text-sm font-semibold">
                        {t("member.lastName")} *
                      </Label>
                      <Input
                        id="lastName"
                        value={reg.lastName}
                        onChange={(e) => setReg({ ...reg, lastName: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="studentId" className="text-sm font-semibold">
                        {t("member.studentId")} *
                      </Label>
                      <Input
                        id="studentId"
                        value={reg.studentId}
                        onChange={(e) => setReg({ ...reg, studentId: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="nationalId" className="text-sm font-semibold">
                        {t("member.nationalId")}
                      </Label>
                      <Input
                        id="nationalId"
                        value={reg.nationalId}
                        onChange={(e) => setReg({ ...reg, nationalId: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="email" className="text-sm font-semibold">
                        {t("member.email")} *
                      </Label>
                      <Input
                        id="email"
                        type="email"
                        dir="ltr"
                        value={reg.email}
                        onChange={(e) => setReg({ ...reg, email: e.target.value })}
                        required
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="phone" className="text-sm font-semibold">
                        {t("member.phone")}
                      </Label>
                      <Input
                        id="phone"
                        dir="ltr"
                        value={reg.phone}
                        onChange={(e) => setReg({ ...reg, phone: e.target.value })}
                        placeholder="09…"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="field" className="text-sm font-semibold">
                        {t("member.field")}
                      </Label>
                      <Input
                        id="field"
                        value={reg.field}
                        onChange={(e) => setReg({ ...reg, field: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="degree" className="text-sm font-semibold">
                        {t("member.degree")}
                      </Label>
                      <select
                        id="degree"
                        value={reg.degree}
                        onChange={(e) => setReg({ ...reg, degree: e.target.value })}
                        className={field}
                      >
                        {DEGREES.map((d) => (
                          <option key={d} value={d}>
                            {d}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="space-y-1.5 sm:col-span-2">
                      <Label htmlFor="university" className="text-sm font-semibold">
                        {t("member.university")}
                      </Label>
                      <Input
                        id="university"
                        value={reg.university}
                        onChange={(e) => setReg({ ...reg, university: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor="regPassword" className="text-sm font-semibold">
                        {t("member.password")} *
                      </Label>
                      <Input
                        id="regPassword"
                        type="password"
                        value={reg.password}
                        onChange={(e) => setReg({ ...reg, password: e.target.value })}
                        placeholder={t("member.passwordHint")}
                        minLength={6}
                        required
                      />
                    </div>
                    <div className="flex items-center justify-between gap-3 rounded-xl border border-input bg-background px-4">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold">{t("member.newsletter")}</div>
                        <div className="text-[11px] text-muted-foreground truncate">
                          {t("member.newsletterDesc")}
                        </div>
                      </div>
                      <Switch checked={regNewsletter} onCheckedChange={setRegNewsletter} />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    disabled={regLoading}
                    className="w-full h-11 rounded-xl text-sm font-bold gap-2"
                  >
                    {regLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <UserPlus className="h-4 w-4" />
                    )}
                    {t("member.registerButton")}
                  </Button>
                  <p className="text-center text-xs text-muted-foreground">
                    {t("member.hasAccount")}{" "}
                    <Link href="/membership" className="text-primary font-bold hover:text-gold">
                      {t("member.login")}
                    </Link>
                  </p>
                </form>
              )}
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </>
  );
}
