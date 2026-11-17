"""ساخت نشان مربعی دانشگاه از لوگوی اصلی + به‌روزرسانی آیکون‌های PWA
منبع: public/images/logo.png (لاکاپ کامل 1080x480)
خروجی: public/images/emblem.png (512x512) و آیکون‌های public/icons"""
from PIL import Image
import os

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, "public", "images")
ICO = os.path.join(ROOT, "public", "icons")

src = Image.open(os.path.join(IMG, "logo.png")).convert("RGBA")

# برش نشان مشعل (بدون متن تذهیب و بدون کپشن کوچک)
torch = src.crop((925, 0, 1070, 374))  # 145x374
# پاک‌سازی ذرات تذهیبِ حاشیهٔ پایین-چپ
import numpy as np
arr = np.array(torch)
arr[260:, :22, 3] = 0
arr[330:, :40, 3] = 0
torch = Image.fromarray(arr)
print("torch crop:", torch.size)


def on_canvas(im, size=512, scale=0.92, bg=None, radius=0):
    """قرار دادن نشان در وسط بوم مربعی"""
    canvas = Image.new("RGBA", (size, size), bg or (0, 0, 0, 0))
    h = int(size * scale)
    w = int(im.width * h / im.height)
    t = im.resize((w, h), Image.LANCZOS)
    canvas.alpha_composite(t, ((size - w) // 2, (size - h) // 2))
    return canvas


# ۱) نشان شفاف مربعی — برای هدر، فوتر، پنل و فاوآیکون
emblem = on_canvas(torch, 512, scale=0.94)
emblem.save(os.path.join(IMG, "emblem.png"))

# ۲) آیکون‌های PWA — پس‌زمینهٔ سفید برای خوانایی در همهٔ جاها
white = (255, 255, 255, 255)
on_canvas(torch, 512, 0.72, white).save(os.path.join(ICO, "icon-512.png"))
on_canvas(torch, 192, 0.72, white).save(os.path.join(ICO, "icon-192.png"))

# ۳) آیکون maskable — پس‌زمینهٔ زمردی، نشان در ناحیهٔ امن (۶۰٪)
emerald = (11, 93, 81, 255)  # #0B5D51
on_canvas(torch, 512, 0.58, emerald).save(os.path.join(ICO, "icon-maskable-512.png"))

# ۴) apple-touch-icon — iOS شفافیت را سیاه می‌بیند؛ پس‌زمینهٔ سفید
on_canvas(torch, 180, 0.74, white).save(os.path.join(ICO, "apple-touch-icon.png"))

print("done:", os.listdir(ICO))
print("emblem saved:", os.path.getsize(os.path.join(IMG, "emblem.png")), "bytes")
