import type { Metadata } from "next";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";
import { ThemeProvider } from "@/components/theme-provider";
import { SitePrefsProvider, PREFS_BOOT_SCRIPT } from "@/lib/prefs";

export const metadata: Metadata = {
  title: {
    default: "مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)",
    template: "%s | مرکز علمی–کاربردی کمیته امداد",
  },
  description:
    "سامانه رسمی مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره) — اخبار و اطلاعیه‌ها، رشته‌های تحصیلی، سامانه‌های آموزشی و ارتباط با مرکز",
  icons: { icon: "/images/logo.png" },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="fa" dir="rtl" suppressHydrationWarning>
      <body className="antialiased bg-background text-foreground min-h-screen flex flex-col">
        {/* اعمال تنظیمات شخصی‌سازی (زبان، فونت، اندازه و…) قبل از رندر
            — تگ script خام (بدون next/script) تا در HTML اولیه حضور داشته باشد
            و باعث ناهماهنگی hydration نشود */}
        <script
          id="prefs-boot"
          dangerouslySetInnerHTML={{ __html: PREFS_BOOT_SCRIPT }}
        />
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          <SitePrefsProvider>{children}</SitePrefsProvider>
          <Toaster />
        </ThemeProvider>
      </body>
    </html>
  );
}
