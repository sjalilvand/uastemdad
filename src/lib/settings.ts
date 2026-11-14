import { cache } from "react";
import { db } from "./db";

export const DEFAULT_SETTINGS: Record<string, string> = {
  siteName: "مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره)",
  siteShort: "مرکز علمی–کاربردی کمیته امداد",
  tagline: "تربیت نیروی انسانی ماهر و توانمند برای خدمت‌رسانی اثربخش",
  logo: "/images/logo.png",
  address: "تهران – سی متری نیرو هوایی – کوچه ۷/۲۹ – پلاک ۲",
  phones: "02177167008, 02177162711, 02177167969",
  email: "info@uastemdad.ir",
  presidentName: "دکتر مجید ملکشاهی",
  presidentPhoto: "/images/riasat.jpg",
  aboutText:
    "مرکز آموزش علمی کاربردی کمیته امداد امام خمینی(ره) از سال ۱۳۷۵ و با هدف تربیت نیروی انسانی ماهر و توانمند به منظور خدمات‌رسانی مطلوب، اثربخش و هدفمند به جامعه هدف این نهاد تأسیس شده است.",
  statStudents: "500",
  statFaculty: "120",
  statBooks: "35",
  statPrograms: "9",
  mapUrl: "https://www.google.com/maps?q=تهران+سی+متری+نیرو+هوایی",
  // نام مکانی که روی کارت نقشه (صفحهٔ اصلی و تماس با ما) نمایش داده می‌شود؛
  // خالی = نام پیش‌فرض بر اساس زبان انتخابی
  mapDestName: "",
  // راهنمای طبقات ساختمان در صفحهٔ تماس با ما؛ خالی = متن پیش‌فرض
  buildingGuide: "",
  mapLat: "35.74041",
  mapLng: "51.49027",
  tickerEnabled: "1",
  chatWelcome:
    "سلام! من دستیار هوشمند مرکز آموزش علمی–کاربردی کمیته امداد هستم. درباره اخبار مرکز، رشته‌های تحصیلی، سامانه‌ها، آدرس و تلفن‌های تماس می‌توانید از من بپرسید.",
  footerNote:
    "کلیه حقوق این سامانه متعلق به مرکز آموزش علمی–کاربردی کمیته امداد امام خمینی (ره) می‌باشد.",
};

export const getSettings = cache(
  async (): Promise<Record<string, string>> => {
    const map: Record<string, string> = { ...DEFAULT_SETTINGS };
    try {
      const rows = await db.setting.findMany();
      for (const r of rows) {
        if (r.value !== null && r.value !== undefined) map[r.key] = r.value;
      }
    } catch {
      // اگر دیتابیس هنوز آماده نیست، مقادیر پیش‌فرض برگردد
    }
    return map;
  }
);

export function getPhones(settings: Record<string, string>): string[] {
  return (settings.phones || "")
    .split(/[,\n،]/)
    .map((p) => p.trim())
    .filter(Boolean);
}
