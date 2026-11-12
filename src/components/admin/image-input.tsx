"use client";

import { useRef } from "react";
import { Upload, X, Loader2 } from "lucide-react";
import { useState } from "react";

/** ورودی تصویر: لینک مستقیم یا آپلود فایل */
export function ImageInput({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const upload = async (file: File) => {
    setError("");
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/upload", {
        method: "POST",
        body: fd,
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "خطا در آپلود");
      onChange(data.url);
    } catch (e) {
      setError(e instanceof Error ? e.message : "خطا در آپلود");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/photo.jpg یا https://…"
          dir="ltr"
          className="flex-1 h-10 rounded-lg border border-input bg-background px-3 text-xs outline-none focus:ring-2 focus:ring-ring/40 text-left"
        />
        <button
          type="button"
          onClick={() => fileRef.current?.click()}
          disabled={uploading}
          className="h-10 px-3.5 rounded-lg border border-primary/40 text-primary text-xs font-bold inline-flex items-center gap-1.5 hover:bg-secondary transition-colors disabled:opacity-50 shrink-0"
        >
          {uploading ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Upload className="h-3.5 w-3.5" />
          )}
          آپلود
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange("")}
            aria-label="حذف تصویر"
            className="h-10 w-10 rounded-lg border border-destructive/30 text-destructive inline-flex items-center justify-center hover:bg-destructive/10 transition-colors shrink-0"
          >
            <X className="h-4 w-4" />
          </button>
        )}
      </div>
      <input
        ref={fileRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif,image/svg+xml"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      {error && <p className="text-[11px] text-destructive">{error}</p>}
      {value && (
        <div className="h-28 w-full rounded-lg overflow-hidden border border-border bg-secondary relative">
          <img
            src={value}
            alt="پیش‌نمایش"
            className="w-full h-full object-contain"
          />
        </div>
      )}
    </div>
  );
}
