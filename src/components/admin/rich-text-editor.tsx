"use client";

import { useEffect, useRef, useState } from "react";
import {
  Bold,
  Italic,
  Underline,
  List,
  ListOrdered,
  Link2,
  Heading2,
  Heading3,
  Quote,
  AlignRight,
  AlignCenter,
  AlignLeft,
  Undo2,
  ImagePlus,
} from "lucide-react";
import { ImageInput } from "./image-input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function exec(cmd: string, value?: string) {
  document.execCommand(cmd, false, value);
}

export function RichTextEditor({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [imgOpen, setImgOpen] = useState(false);

  // تنظیم محتوای اولیه فقط یک بار
  useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, []);

  const buttons: {
    label: string;
    title: string;
    action: () => void;
    icon: React.ReactNode;
    text?: string;
  }[] = [
    { label: "bold", title: "ضخیم", icon: <Bold className="h-4 w-4" />, action: () => exec("bold") },
    { label: "italic", title: "مورب", icon: <Italic className="h-4 w-4" />, action: () => exec("italic") },
    { label: "underline", title: "زیرخط", icon: <Underline className="h-4 w-4" />, action: () => exec("underline") },
    { label: "h2", title: "عنوان بزرگ", icon: <Heading2 className="h-4 w-4" />, action: () => exec("formatBlock", "h2") },
    { label: "h3", title: "عنوان کوچک", icon: <Heading3 className="h-4 w-4" />, action: () => exec("formatBlock", "h3") },
    { label: "p", title: "پاراگراف", text: "پ", action: () => exec("formatBlock", "p") },
    { label: "ul", title: "فهرست نقطه‌ای", icon: <List className="h-4 w-4" />, action: () => exec("insertUnorderedList") },
    { label: "ol", title: "فهرست شماره‌دار", icon: <ListOrdered className="h-4 w-4" />, action: () => exec("insertOrderedList") },
    { label: "quote", title: "نقل قول", icon: <Quote className="h-4 w-4" />, action: () => exec("formatBlock", "blockquote") },
    { label: "alignR", title: "راست‌چین", icon: <AlignRight className="h-4 w-4" />, action: () => exec("justifyRight") },
    { label: "alignC", title: "وسط‌چین", icon: <AlignCenter className="h-4 w-4" />, action: () => exec("justifyCenter") },
    { label: "alignL", title: "چپ‌چین", icon: <AlignLeft className="h-4 w-4" />, action: () => exec("justifyLeft") },
    {
      label: "link",
      title: "لینک",
      icon: <Link2 className="h-4 w-4" />,
      action: () => {
        const url = window.prompt("آدرس لینک (مثلاً https://…)");
        if (url) exec("createLink", url);
      },
    },
    { label: "img", title: "تصویر", icon: <ImagePlus className="h-4 w-4" />, action: () => setImgOpen(true) },
    { label: "undo", title: "بازگردانی", icon: <Undo2 className="h-4 w-4" />, action: () => exec("undo") },
  ];

  return (
    <div className="rounded-xl border border-input bg-background overflow-hidden focus-within:ring-2 focus-within:ring-ring/40">
      <div className="editor-toolbar flex flex-wrap gap-0.5 p-1.5 border-b border-border bg-muted/50">
        {buttons.map((b) => (
          <button
            key={b.label}
            type="button"
            title={b.title}
            onMouseDown={(e) => {
              e.preventDefault(); // حفظ انتخاب متن
              b.action();
              if (ref.current) onChange(ref.current.innerHTML);
            }}
          >
            {b.icon || b.text}
          </button>
        ))}
      </div>
      <div
        ref={ref}
        contentEditable
        dir="rtl"
        role="textbox"
        aria-multiline="true"
        onInput={() => {
          if (ref.current) onChange(ref.current.innerHTML);
        }}
        className="editor-area rich-content min-h-56 max-h-[420px] overflow-y-auto p-4 text-sm"
      />

      {/* درج تصویر */}
      <Dialog open={imgOpen} onOpenChange={setImgOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-right text-base">
              درج تصویر در متن
            </DialogTitle>
          </DialogHeader>
          <ImageInput
            value=""
            onChange={(url) => {
              if (url) exec("insertImage", url);
              setImgOpen(false);
              if (ref.current) onChange(ref.current.innerHTML);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
