"use client";

import { useEffect, useState } from "react";
import { Loader2, Save, Building2, Phone, Bot, BarChart3, Palette } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { ImageInput } from "@/components/admin/image-input";
import { useToast } from "@/hooks/use-toast";

const GROUPS: {
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  fields: { key: string; label: string; type?: "text" | "textarea" | "image"; help?: string }[];
}[] = [
  {
    title: "مشخصات مرکز",
    icon: Building2,
    fields: [
      { key: "siteName", label: "نام کامل سایت" },
      { key: "siteShort", label: "نام کوتاه (سربرگ)" },
      { key: "tagline", label: "شعار / توضیح کوتاه" },
      { key: "logo", label: "لوگو", type: "image" },
      { key: "aboutText", label: "متن معرفی (پاصفحه)", type: "textarea" },
      { key: "footerNote", label: "متن کپی‌رایت پاصفحه" },
    ],
  },
  {
    title: "اطلاعات تماس",
    icon: Phone,
    fields: [
      { key: "address", label: "آدرس" },
      {
        key: "phones",
        label: "تلفن‌ها (با ویرگول جدا کنید)",
        help: "مثال: 02177167008, 02177162711",
      },
      { key: "email", label: "ایمیل" },
      { key: "mapUrl", label: "لینک نقشه" },
      {
        key: "presidentName",
        label: "نام ریاست مرکز",
      },
      { key: "presidentPhoto", label: "تصویر ریاست مرکز", type: "image" },
    ],
  },
  {
    title: "آمار صفحه اصلی",
    icon: BarChart3,
    fields: [
      { key: "statStudents", label: "تعداد دانشجویان" },
      { key: "statFaculty", label: "اعضای هیئت علمی" },
      { key: "statPrograms", label: "رشته‌های تحصیلی" },
      { key: "statBooks", label: "کتاب‌های تألیفی" },
    ],
  },
  {
    title: "دستیار هوشمند (چت آنلاین)",
    icon: Bot,
    fields: [
      {
        key: "chatWelcome",
        label: "پیام خوش‌آمد چت",
        type: "textarea",
      },
    ],
  },
  {
    title: "ظاهر",
    icon: Palette,
    fields: [
      {
        key: "themeColor",
        label: "رنگ سازمانی (نمایشی)",
        help: "تم اصلی سامانه زمردی/طلایی است و از این بخش قابل مشاهده است",
      },
    ],
  },
];

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetch("/api/admin/settings")
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.settings) setSettings(data.settings);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const save = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(settings),
      });
      if (!res.ok) throw new Error();
      toast({ title: "تنظیمات با موفقیت ذخیره شد" });
    } catch {
      toast({ title: "خطا در ذخیره تنظیمات", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const set = (k: string, v: string) =>
    setSettings((s) => ({ ...s, [k]: v }));

  if (loading) {
    return (
      <div className="py-16 text-center">
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">تنظیمات سامانه</h1>
          <p className="text-xs text-muted-foreground mt-1">
            این مقادیر در سربرگ، پاصفحه، صفحه اصلی و دستیار هوشمند استفاده می‌شوند
          </p>
        </div>
        <Button
          onClick={save}
          disabled={saving}
          className="h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold"
        >
          {saving ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Save className="h-4 w-4" />
          )}
          ذخیره تغییرات
        </Button>
      </div>

      <div className="space-y-5">
        {GROUPS.map((g) => {
          const Icon = g.icon;
          return (
            <section
              key={g.title}
              className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-3 px-5 py-4 border-b border-border/60 bg-muted/30">
                <div className="h-9 w-9 rounded-lg emerald-gradient flex items-center justify-center">
                  <Icon className="h-4.5 w-4.5 text-white" />
                </div>
                <h2 className="font-extrabold text-sm text-foreground">{g.title}</h2>
              </div>
              <div className="p-5 grid gap-4 sm:grid-cols-2">
                {g.fields.map((f) => (
                  <div
                    key={f.key}
                    className={f.type === "textarea" || f.type === "image" ? "sm:col-span-2" : ""}
                  >
                    <label className="text-xs font-bold text-muted-foreground block mb-1.5">
                      {f.label}
                    </label>
                    {f.type === "textarea" ? (
                      <Textarea
                        value={settings[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        rows={3}
                        className="text-sm"
                      />
                    ) : f.type === "image" ? (
                      <ImageInput
                        value={settings[f.key] || ""}
                        onChange={(v) => set(f.key, v)}
                      />
                    ) : (
                      <Input
                        value={settings[f.key] || ""}
                        onChange={(e) => set(f.key, e.target.value)}
                        className="text-sm"
                      />
                    )}
                    {f.help && (
                      <p className="text-[10px] text-muted-foreground mt-1">{f.help}</p>
                    )}
                  </div>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </div>
  );
}
