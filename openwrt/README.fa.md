# GVPN برای OpenWrt

`luci-app-gvpn` بستهٔ گرافیکی GVPN است. رابط فارسی آن در **LuCI → Services → GVPN Manager** قرار دارد. مسیر پیش‌فرض Apps Script، پراکسی دستی وب و بدون VPS است؛ هدایت شفاف LAN قابلیت اختیاری حالت Full است.

> ابتدا مسیر معمول `Code.gs` را راه‌اندازی کنید: برای پراکسی دستی وب است و VPS نمی‌خواهد. حالت Full و هدایت خودکار LAN مسیر جداگانه‌ای هستند که به `CodeFull.gs` و سرور tunnel-node روی VPS یا Cloud Run نیاز دارند.

## نیازمندی‌ها و سازگاری

- رابط **firewall4/nftables** (OpenWrt 22.03 به بعد)؛ بسته، `sing-box`، `kmod-nft-tproxy` و `ip-full` را به‌عنوان وابستگی اعلام می‌کند.
- OpenWrt مبتنی بر APK: فایل `.apk` متناسب با SDK و معماری همان روتر. OpenWrt 24.10 و قدیمی‌تر معمولاً IPK/opkg دارد و این APK را نباید روی آن نصب کرد.
- فایل‌های داخل `dist/openwrt` فقط برای معماری‌ای معتبرند که با SDK آن ساخته شده‌اند. ARMv7 و AArch64 فایل جداگانه می‌خواهند. باینری AArch64 روی CPUهای 64 بیتی سازگار ARMv8/ARMv9 قابل اجراست؛ این به معنی سازگاری APK با هر firmware یا هر kernel نیست.
- در وضعیت فعلی آزمون ساخت، هدف شناخته‌شدهٔ پروژه `ipq40xx/chromium` با `arm_cortex-a7_neon-vfpv4` است. برای هدف دیگر، SDK رسمی همان target/release را استفاده کنید؛ وابستگی‌های کرنل باید دقیقاً با firmware روتر هماهنگ باشند.

## نصب

در LuCI از **System → Software → Upload Package** فایل `luci-app-gvpn-*.apk` متناسب با دستگاه را بارگذاری و نصب کنید. یا فایل را با SCP به روتر کپی و اجرا کنید:

```sh
apk add --allow-untrusted /tmp/luci-app-gvpn-*.apk
```

اگر بستهٔ `kmod-nft-tproxy` برای kernel فعلی پیدا نشد، firmware و SDK با هم هم‌نسخه نیستند؛ APK متعلق به SDK/firmware دقیق دستگاه را بسازید. از نصب دستی kmod متعلق به نسخه یا target دیگر خودداری کنید.

## گرفتن اطلاعات Apps Script

در این پروژه «کلید گوگل» کلید Google Cloud API نیست. دو مقدار لازم است: یک `AUTH_KEY` محرمانهٔ مشترک و یک یا چند شناسهٔ Deployment از Web App.

> دسترسی به [script.google.com](https://script.google.com/) ممکن است فیلتر باشد. برای بازکردن پنل Google Apps Script و ساخت یا مدیریت Deployment، ابتدا با فیلترشکن به این نشانی وارد شوید.

1. در Apps Script محتوای فایل پیش‌فرض `Code.gs` را با [`assets/apps_script/Code.gs`](../assets/apps_script/Code.gs) جایگزین کنید. مقدار قوی و تصادفی `AUTH_KEY` در کد انتخاب کنید و برای تنظیم پنل نگه دارید. اگر قبلاً `CodeFull.gs` را منتشر کرده‌اید، بخش پراکسی وب آن نیز در حالت Apps Script بدون tunnel-node کار می‌کند.
2. در Apps Script گزینهٔ **Deploy → New deployment → Web app** را بزنید. گزینهٔ اجرا را **Me** بگذارید و دسترسی Web App را طوری تنظیم کنید که روتر بتواند به آن برسد؛ برای محافظت از Deployment از `AUTH_KEY` قوی استفاده کنید.
3. پس از مجوزدهی، از **Deploy → Manage deployments** شناسهٔ Deployment را کپی کنید. URL کامل `/exec` را وارد نکنید؛ فقط Deployment ID را در LuCI بگذارید.
4. اگر چند Deployment می‌سازید، همه باید از همان `AUTH_KEY` مشترک استفاده کنند. در صفحهٔ GVPN، Deployment IDها را یکی‌یکی در فهرست شناور وارد کنید؛ می‌توانید مقدارهای ذخیره‌شده را ببینید یا حذف کنید.

حالت Full اختیاری است و به [`CodeFull.gs`](../assets/apps_script/CodeFull.gs) و راه‌اندازی جداگانهٔ [`tunnel-node`](../tunnel-node/README.fa.md) نیاز دارد؛ بدون آن سرور ترافیک تونل عبور نمی‌کند.

راهنمای رسمی گوگل: [ساخت Web App در Apps Script](https://developers.google.com/apps-script/guides/web)، [مدیریت deploymentها و شناسه‌ها](https://developers.google.com/apps-script/concepts/deployments)، و [محدودیت مصرف سرویس](https://developers.google.com/apps-script/guides/services/quotas).

## راه‌اندازی پراکسی Apps Script

1. در **Services → GVPN** شناسه‌ها و `AUTH_KEY` را ذخیره کنید.
2. حالت **Apps Script** را انتخاب کنید و **هدایت خودکار ترافیک LAN با TPROXY** را خاموش بگذارید.
3. **Save & Apply** را بزنید و سرویس را راه‌اندازی کنید. روی دستگاه موردنظر، IP روتر را به‌عنوان پراکسی HTTP با پورت `8085` یا SOCKS5 با پورت `8086` برای ترافیک وب تنظیم کنید.
4. وضعیت موتور را در کارت بالای صفحه بررسی کنید. در صورت نیاز، اجرای خودکار سرویس را فعال کنید.

Apps Script به‌تنهایی نمی‌تواند همهٔ TCP/UDP یا کل LAN را به‌صورت شفاف عبور دهد. بدون tunnel-node فعال در حالت Full، گزینهٔ TPROXY داخلی GVPN را روشن نکنید.

برای HTTPS، گواهی مرجع صدور محلی GVPN در `/etc/gvpn/data/mhrv-rs/ca/ca.crt` ساخته می‌شود. فقط روی دستگاه‌های تحت کنترل خود و در صورت تصمیم آگاهانه به استفاده از پراکسی HTTPS، این گواهی عمومی را مورد اعتماد قرار دهید. کلید خصوصی کنار آن (`ca.key`) را هرگز کپی یا منتشر نکنید. با اعتماد به این گواهی، روتر می‌تواند محتوای HTTPS را ببیند؛ بدون آن، دستگاه باید گواهی پراکسی را رد کند.

## Passwall2 و v2rayN

- برای مسیر Apps Script، TPROXY داخلی GVPN را خاموش بگذارید. می‌توانید پراکسی SOCKS5 محلی `127.0.0.1:8086` را در Passwall2 تعریف کنید؛ این کار UDP عمومی یا تونل شفاف LAN ایجاد نمی‌کند.
- در Windows/v2rayN، برای پراکسی دستی وب، IP روتر و پورت SOCKS5 پیش‌فرض `8086` را وارد کنید؛ برای زنجیره‌کردن، راهنمای نسخهٔ v2rayN دربارهٔ proxy chain را ببینید.

## توقف و حذف

برای توقف، هدایت LAN را در LuCI خاموش و **Save & Apply** کنید، سپس سرویس را Stop کنید. برای حذف:

```sh
/etc/init.d/gvpn stop
/etc/init.d/gvpn disable
apk del luci-app-gvpn
```

UCI ممکن است فایل پیکربندی `/etc/config/gvpn` را به‌عنوان فایل تنظیمات نگه دارد. اگر قصد حذف دائمی اطلاعات حساب/کلید را دارید، پس از بررسی مسیر و پشتیبان‌گیری، آن فایل را جداگانه از روتر حذف کنید.

## ساخت از SDK

SDK باید در WSL/Linux بازشده و `.config` آن برای target دستگاه آماده شده باشد:

```sh
./scripts/build-openwrt.sh /path/to/openwrt-sdk
```

اسکریپت target/معماری پکیج را از SDK تشخیص می‌دهد، وابستگی ARM را برمی‌دارد، APK می‌سازد و ساختار بسته را بررسی می‌کند. برای ARMv7 و AArch64 هر بار SDK همان معماری/target را بدهید. خروجی هر معماری در `dist/openwrt/<package-architecture>/` قرار می‌گیرد. SDKهای WSL آماده‌شده در این محیط: `/home/khava/owrt/aether-ipq-sdk` برای ARMv7 و `/home/khava/owrt/aarch64-filogic-sdk-25.12.5` برای AArch64 Cortex-A53.
