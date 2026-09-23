# GVPN برای OpenWrt

`luci-app-gvpn` بستهٔ گرافیکی GVPN است. رابط فارسی آن در **LuCI → Services → GVPN Manager** قرار دارد و موتور، تنظیمات، سرویس و هدایت شفاف LAN را مدیریت می‌کند. دستگاه‌های شبکه برای حالت TPROXY نیازی به واردکردن پراکسی ندارند.

> برای Full و هدایت LAN باید `CodeFull.gs` را به‌عنوان Web App در Google Apps Script منتشر کنید و `tunnel-node` را روی VPS یا Google Cloud Run اجرا کنید. این دو جزء بیرون از روتر اجرا می‌شوند. Apps Script معمولی برای عبور همهٔ TCP/UDP کافی نیست.

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

1. فایل [`assets/apps_script/CodeFull.gs`](../assets/apps_script/CodeFull.gs) را در Apps Script بسازید/جایگزین کنید. مقدار قوی و تصادفی `AUTH_KEY` در کد را انتخاب کنید و برای تنظیم پنل نگه دارید.
2. در Apps Script گزینهٔ **Deploy → New deployment → Web app** را بزنید. برای برنامهٔ اجراشونده با حساب خودتان، گزینهٔ اجرا به‌صورت **Me** و دسترسی Web App را مطابق راهنمای CodeFull/امنیت حساب تنظیم کنید؛ این برنامه از هر کسی که URL را بداند محافظت نمی‌شود مگر آنکه `AUTH_KEY` قوی باشد.
3. پس از مجوزدهی، از **Deploy → Manage deployments** شناسهٔ Deployment را کپی کنید. URL کامل `/exec` را وارد نکنید؛ فقط Deployment ID را در LuCI بگذارید.
4. اگر چند Deployment می‌سازید، همه باید از همان `AUTH_KEY` مشترک استفاده کنند. در صفحهٔ GVPN، Deployment IDها را یکی‌یکی در فهرست شناور وارد کنید؛ می‌توانید مقدارهای ذخیره‌شده را ببینید یا حذف کنید.
5. `tunnel-node` را مطابق [`tunnel-node/README.fa.md`](../tunnel-node/README.fa.md) اجرا و `CodeFull.gs` را طوری تنظیم کنید که به همان tunnel-node وصل شود. اگر tunnel-node در دسترس نباشد، مود Full اینترنت را عبور نمی‌دهد.

راهنمای رسمی گوگل: [ساخت Web App در Apps Script](https://developers.google.com/apps-script/guides/web)، [مدیریت deploymentها و شناسه‌ها](https://developers.google.com/apps-script/concepts/deployments)، و [محدودیت مصرف سرویس](https://developers.google.com/apps-script/guides/services/quotas).

## راه‌اندازی GVPN و هدایت خودکار LAN

1. در **Services → GVPN** شناسه‌ها و `AUTH_KEY` را ذخیره کنید.
2. حالت **Full** را انتخاب کنید. حالت `Apps Script` تنها برای HTTP/HTTPS و پراکسی‌های دستی است.
3. برای هدایت خودکار LAN، گزینهٔ **هدایت خودکار ترافیک LAN با TPROXY** را روشن کنید. رابط LAN معمولاً `br-lan` است؛ اگر روتر چند bridge/VLAN دارد، رابط‌های LAN مربوطه را اضافه کنید و WAN را اضافه نکنید.
4. **Save & Apply** را بزنید. برنامه GVPN را به‌عنوان پراکسی SOCKS5 محلی به `sing-box` وصل می‌کند؛ قوانین FW4 فقط TCP/UDP عبوری از رابط‌های انتخاب‌شده را می‌گیرند. شبکه‌های خصوصی/محلی مستثنا هستند تا دسترسی به روتر و شبکهٔ خانه خراب نشود.
5. وضعیت هر دو سرویس و TPROXY را در کارت‌های بالای صفحه ببینید. برای شروع در هر راه‌اندازی، گزینهٔ اجرای خودکار سرویس را فعال کنید.

TPROXY همهٔ جریان‌های TCP/UDP عبوری از رابط‌های LAN انتخابی را بدون تنظیم پراکسی دستگاه می‌گیرد، اما ICMP/ping و ترافیک تولیدشده توسط خود روتر را تونل نمی‌کند. برای جلوگیری از نشت DNS، هنگام فعال‌بودن قابلیت، DNS اعلام‌شده به دستگاه‌ها از طریق DHCPv4/DHCPv6 موقتاً به DNS عمومی گوگل تغییر می‌کند؛ مقادیر قبلی هنگام خاموش‌کردن بازیابی می‌شوند. نام‌های محلی شبکه ممکن است در این حالت resolve نشوند. HTTPS داخل تونل رمزگذاری‌شده باقی می‌ماند؛ این قابلیت HTTPS را MITM نمی‌کند. بسته هنگام خطای Full عمداً به اینترنت مستقیم fallback نمی‌کند تا ترافیک به‌طور ناخواسته از WAN خارج نشود. هم‌زمان‌کردن TPROXY با Passwall2 یا یک شفاف‌ساز دیگر روی همان LAN می‌تواند قوانین مسیریابی را متداخل کند؛ فقط یکی را برای هدایت همان رابط فعال کنید.

## Passwall2 و v2rayN

- با TPROXY داخلی GVPN، Passwall2 برای هدایت کل LAN لازم نیست. اگر می‌خواهید به‌جای آن Passwall2 هدایت را مدیریت کند، GVPN را در حالت پراکسی SOCKS5 اجرا کنید، نود SOCKS به نشانی `127.0.0.1:8086` را در Passwall2 تعریف کنید و TPROXY داخلی GVPN را خاموش نگه دارید. حالت Apps Script برای این سناریو UDP عمومی نمی‌دهد؛ برای TCP/UDP باید Full فعال باشد.
- در Windows/v2rayN نیازی به تنظیم پراکسی دستگاه نیست وقتی دستگاه از LAN روتر استفاده می‌کند و TPROXY روشن است. برای استفادهٔ دستی روی لپ‌تاپ به‌جای TPROXY، SOCKS5 روتر با پورت پیش‌فرض `8086` را به‌عنوان نود SOCKS در v2rayN وارد کنید؛ برای زنجیره‌کردن، راهنمای نسخهٔ v2rayN دربارهٔ proxy chain را ببینید.

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
