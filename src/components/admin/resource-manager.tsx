"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Pencil,
  Trash2,
  Search,
  RefreshCw,
  Loader2,
  Image as ImageIcon,
  CheckCircle2,
  XCircle,
} from "lucide-react";
import { getResource, type FieldDef } from "@/lib/admin-resources";
import { formatJalali, toFa } from "@/lib/jalali";
import { ImageInput } from "./image-input";
import { RichTextEditor } from "./rich-text-editor";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

type Row = Record<string, unknown>;

export function ResourceManager({ resourceKey }: { resourceKey: string }) {
  const def = useMemo(() => getResource(resourceKey)!, [resourceKey]);
  const [items, setItems] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Row | null>(null); // null = بسته، {} = جدید
  const [form, setForm] = useState<Row>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState<Row | null>(null);
  const [dynamicOptions, setDynamicOptions] = useState<
    Record<string, { value: string; label: string }[]>
  >({});

  const load = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/${resourceKey}`);
      const data = await res.json();
      setItems(data.items || []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [resourceKey]);

  // بارگذاری گزینه‌های انتخابی داینامیک (مثلاً دسته‌بندی‌ها)
  useEffect(() => {
    const resKeys = [
      ...new Set(def.fields.map((f) => f.optionsResource).filter(Boolean)),
    ] as string[];
    for (const rk of resKeys) {
      if (dynamicOptions[rk]) continue;
      fetch(`/api/admin/${rk}`)
        .then((r) => (r.ok ? r.json() : null))
        .then((data) => {
          if (!data?.items) return;
          const labelField =
            def.fields.find((f) => f.optionsResource === rk)
              ?.optionsLabelField || "title";
          setDynamicOptions((prev) => ({
            ...prev,
            [rk]: data.items.map((it: Row) => ({
              value: String(it.id),
              label: String(it[labelField] || "—"),
            })),
          }));
        })
        .catch(() => {});
    }
  }, [def, editing !== null]);

  const filtered = items.filter((it) => {
    if (!query.trim()) return true;
    const hay = [
      ...def.searchable.map((s) => String(it[s] || "")),
      ...(it.parent as { label?: string } | undefined)?.label
        ? [String((it.parent as { label?: string }).label)]
        : [],
    ]
      .join(" ")
      .toLowerCase();
    return hay.includes(query.trim().toLowerCase());
  });

  const openNew = () => {
    const init: Row = {};
    for (const f of def.fields) {
      init[f.name] =
        f.defaultValue !== undefined ? f.defaultValue : f.type === "boolean" ? true : "";
    }
    setForm(init);
    setError("");
    setEditing({});
  };

  const openEdit = (it: Row) => {
    const init: Row = {};
    for (const f of def.fields) {
      const v = it[f.name];
      init[f.name] = v === null || v === undefined ? (f.type === "boolean" ? true : "") : v;
      if (f.type === "date" && v) init[f.name] = new Date(String(v)).toISOString();
    }
    setForm(init);
    setError("");
    setEditing(it);
  };

  const save = async () => {
    setSaving(true);
    setError("");
    try {
      const isNew = !editing?.id;
      const res = await fetch(
        isNew ? `/api/admin/${resourceKey}` : `/api/admin/${resourceKey}/${editing!.id}`,
        {
          method: isNew ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "خطا در ذخیره");
      setEditing(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در ذخیره");
    } finally {
      setSaving(false);
    }
  };

  const doDelete = async () => {
    if (!deleteTarget) return;
    try {
      const res = await fetch(
        `/api/admin/${resourceKey}/${deleteTarget.id}`,
        { method: "DELETE" }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data?.error || "خطا در حذف");
      }
      setDeleteTarget(null);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در حذف");
      setDeleteTarget(null);
    }
  };

  const setField = (name: string, value: unknown) =>
    setForm((f) => ({ ...f, [name]: value }));

  const renderCell = (it: Row, col: { name: string; label: string; type?: string }) => {
    const v = it[col.name];
    switch (col.type) {
      case "image":
        return v ? (
          <img
            src={String(v)}
            alt=""
            className="h-11 w-16 rounded-lg object-cover border border-border bg-secondary"
          />
        ) : (
          <div className="h-11 w-16 rounded-lg border border-dashed border-border flex items-center justify-center text-muted-foreground/40">
            <ImageIcon className="h-4 w-4" />
          </div>
        );
      case "badge": {
        const map: Record<string, { label: string; cls: string }> = {
          NEWS: { label: "خبر", cls: "bg-primary/10 text-primary" },
          ANNOUNCEMENT: { label: "اطلاعیه", cls: "bg-gold/15 text-yellow-700 dark:text-gold" },
          main: { label: "منوی اصلی", cls: "bg-primary/10 text-primary" },
          quick: { label: "منوی سریع", cls: "bg-gold/15 text-yellow-700 dark:text-gold" },
          board: { label: "هیئت امنا", cls: "bg-primary/10 text-primary" },
          president: { label: "ریاست", cls: "bg-gold/15 text-yellow-700 dark:text-gold" },
          staff: { label: "همکاران", cls: "bg-secondary text-foreground/70" },
          managers: { label: "مدیران گروه", cls: "bg-secondary text-foreground/70" },
        };
        const m = map[String(v)] || { label: String(v), cls: "bg-secondary text-foreground/70" };
        return (
          <span className={cn("rounded-full px-2.5 py-1 text-[11px] font-bold", m.cls)}>
            {m.label}
          </span>
        );
      }
      case "bool":
        return v ? (
          <CheckCircle2 className="h-4.5 w-4.5 text-green-600" />
        ) : (
          <XCircle className="h-4.5 w-4.5 text-muted-foreground/40" />
        );
      case "date":
        return v ? (
          <span className="text-xs text-muted-foreground whitespace-nowrap">
            {formatJalali(String(v))}
          </span>
        ) : (
          "—"
        );
      case "number":
        return <span className="tabular-fa text-xs">{toFa(Number(v) || 0)}</span>;
      default:
        if (col.name === "url")
          return (
            <span dir="ltr" className="text-xs text-muted-foreground block max-w-56 truncate text-left">
              {String(v || "—")}
            </span>
          );
        return (
          <span className="text-sm font-semibold block max-w-72 truncate">
            {String(v || "—")}
          </span>
        );
    }
  };

  const renderField = (f: FieldDef) => {
    const value = form[f.name];
    switch (f.type) {
      case "textarea":
        return (
          <Textarea
            value={String(value || "")}
            onChange={(e) => setField(f.name, e.target.value)}
            rows={4}
            className="text-sm"
          />
        );
      case "richtext":
        return (
          <RichTextEditor
            value={String(value || "")}
            onChange={(v) => setField(f.name, v)}
          />
        );
      case "number":
        return (
          <Input
            type="number"
            value={String(value ?? 0)}
            onChange={(e) => setField(f.name, Number(e.target.value))}
            className="text-sm"
          />
        );
      case "boolean":
        return (
          <div className="flex items-center gap-2.5 h-10">
            <Switch
              checked={Boolean(value)}
              onCheckedChange={(v) => setField(f.name, v)}
            />
            <span className="text-xs text-muted-foreground">
              {Boolean(value) ? "فعال" : "غیرفعال"}
            </span>
          </div>
        );
      case "image":
        return (
          <ImageInput
            value={String(value || "")}
            onChange={(v) => setField(f.name, v)}
          />
        );
      case "color":
        return (
          <div className="flex items-center gap-2">
            <input
              type="color"
              value={String(value || "#0B5D51")}
              onChange={(e) => setField(f.name, e.target.value)}
              className="h-10 w-14 rounded-lg border border-input cursor-pointer bg-background p-1"
            />
            <Input
              value={String(value || "")}
              onChange={(e) => setField(f.name, e.target.value)}
              dir="ltr"
              className="text-xs flex-1"
            />
          </div>
        );
      case "select": {
        const opts =
          f.options ||
          (f.optionsResource ? dynamicOptions[f.optionsResource] : undefined) ||
          [];
        const labelField = f.optionsLabelField;
        // برای منو: نمایش والد برای شناخت ساختار
        const items2 = f.optionsResource
          ? (dynamicOptions[f.optionsResource] || [])
          : opts;
        void labelField;
        return (
          <Select
            value={String(value ?? "") || "__none"}
            onValueChange={(v) => setField(f.name, v === "__none" ? "" : v)}
          >
            <SelectTrigger className="h-10 text-sm">
              <SelectValue placeholder="انتخاب کنید…" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="__none">— بدون انتخاب —</SelectItem>
              {items2.map((o) => (
                <SelectItem key={o.value} value={o.value}>
                  {o.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        );
      }
      default:
        return (
          <Input
            value={String(value || "")}
            onChange={(e) => setField(f.name, e.target.value)}
            className="text-sm"
          />
        );
    }
  };

  return (
    <div>
      {/* سربرگ */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <div>
          <h1 className="text-xl font-extrabold text-foreground">{def.label}</h1>
          <p className="text-xs text-muted-foreground mt-1">
            {def.description || `مدیریت ${def.label} سامانه`}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="جستجو…"
              className="pr-9 w-44 md:w-64 h-10 text-sm"
            />
          </div>
          <Button
            variant="outline"
            size="icon"
            onClick={load}
            aria-label="بازخوانی"
            className="h-10 w-10"
          >
            <RefreshCw className={cn("h-4 w-4", loading && "animate-spin")} />
          </Button>
          <Button
            onClick={openNew}
            className="h-10 gap-2 bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold"
          >
            <Plus className="h-4 w-4" />
            افزودن {def.singular}
          </Button>
        </div>
      </div>

      {error && !editing && (
        <p className="mb-4 text-xs text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5">
          {error}
        </p>
      )}

      {/* جدول */}
      <div className="bg-card rounded-2xl border border-border shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-right">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                {def.listColumns.map((c) => (
                  <th
                    key={c.name}
                    className="px-4 py-3.5 text-xs font-bold text-muted-foreground whitespace-nowrap"
                  >
                    {c.label}
                  </th>
                ))}
                <th className="px-4 py-3.5 text-xs font-bold text-muted-foreground w-24">
                  عملیات
                </th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={def.listColumns.length + 1} className="py-16 text-center">
                    <Loader2 className="h-6 w-6 animate-spin mx-auto text-primary" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={def.listColumns.length + 1}
                    className="py-16 text-center text-sm text-muted-foreground"
                  >
                    موردی ثبت نشده است
                  </td>
                </tr>
              ) : (
                filtered.map((it) => (
                  <tr
                    key={String(it.id)}
                    className="border-b border-border/50 last:border-0 hover:bg-secondary/30 transition-colors"
                  >
                    {def.listColumns.map((c) => (
                      <td key={c.name} className="px-4 py-3 align-middle">
                        {renderCell(it, c)}
                      </td>
                    ))}
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          aria-label="ویرایش"
                          onClick={() => openEdit(it)}
                          className="h-8 w-8 rounded-lg border border-border inline-flex items-center justify-center text-primary hover:bg-secondary transition-colors"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          aria-label="حذف"
                          onClick={() => setDeleteTarget(it)}
                          className="h-8 w-8 rounded-lg border border-border inline-flex items-center justify-center text-destructive hover:bg-destructive/10 transition-colors"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        <div className="px-4 py-3 border-t border-border/50 text-[11px] text-muted-foreground">
          {toFa(filtered.length)} مورد از {toFa(items.length)} مورد
        </div>
      </div>

      {/* فرم ویرایش / ایجاد */}
      <Dialog open={editing !== null} onOpenChange={(o) => !o && setEditing(null)}>
        <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto" dir="rtl">
          <DialogHeader>
            <DialogTitle className="text-right">
              {editing?.id ? `ویرایش ${def.singular}` : `افزودن ${def.singular} جدید`}
            </DialogTitle>
            <DialogDescription className="text-right text-xs">
              فیلدهای ستاره‌دار الزامی هستند
            </DialogDescription>
          </DialogHeader>

          <div className="grid sm:grid-cols-2 gap-4">
            {def.fields.map((f) => (
              <div
                key={f.name}
                className={cn("space-y-1.5", f.span === 2 && "sm:col-span-2")}
              >
                <label className="text-xs font-bold text-muted-foreground">
                  {f.label}
                  {f.required && <span className="text-destructive"> *</span>}
                </label>
                {renderField(f)}
                {f.help && (
                  <p className="text-[10px] text-muted-foreground">{f.help}</p>
                )}
              </div>
            ))}
          </div>

          {error && (
            <p className="text-xs text-destructive bg-destructive/10 rounded-lg px-3.5 py-2.5">
              {error}
            </p>
          )}

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/60">
            <Button
              variant="outline"
              onClick={() => setEditing(null)}
              className="text-sm"
              disabled={saving}
            >
              انصراف
            </Button>
            <Button
              onClick={save}
              disabled={saving}
              className="bg-primary hover:bg-primary/90 text-primary-foreground text-sm font-bold gap-2"
            >
              {saving && <Loader2 className="h-4 w-4 animate-spin" />}
              ذخیره
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* تأیید حذف */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent dir="rtl">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-right">
              حذف این مورد؟
            </AlertDialogTitle>
            <AlertDialogDescription className="text-right text-sm">
              «{String(deleteTarget?.[def.titleField] || "")}» به‌طور کامل حذف
              خواهد شد و این عمل قابل بازگشت نیست.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2">
            <AlertDialogCancel className="text-sm">انصراف</AlertDialogCancel>
            <AlertDialogAction
              onClick={doDelete}
              className="bg-destructive hover:bg-destructive/90 text-white text-sm"
            >
              حذف قطعی
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
