<div dir="rtl" lang="fa" style="text-align:right;font-family:Vazirmatn,sans-serif">

<h1>GVPN Manager برای OpenWrt</h1>

<p><code dir="ltr">luci-app-gvpn</code> یک برنامهٔ گرافیکی برای مدیریت GVPN در LuCI است. مسیر اصلی این راهنما، پراکسی وب با Google Apps Script و بدون VPS است؛ پراکسی را باید روی دستگاه‌های موردنظر تنظیم کنید.</p>

<p><a href="openwrt/README.fa.md">راهنمای کامل فارسی OpenWrt</a> · <a href="README.md">راهنمای انگلیسی</a> · <a href="https://github.com/dreamboxone/gvpn/releases">دریافت نسخه‌ها</a></p>

<h2>پیش‌نیازها</h2>

<ul>
  <li>روتر با OpenWrt و فایروال <code dir="ltr">firewall4/nftables</code>؛ بسته را برای معماری و نسخهٔ firmware خود انتخاب کنید.</li>
  <li>بسته‌های <code dir="ltr">APK</code> فقط برای OpenWrt مبتنی بر APK هستند. روی نسخه‌های قدیمی‌تر مبتنی بر <code dir="ltr">opkg/IPK</code> نصبشان نکنید.</li>
  <li>برای مسیر معمول <code dir="ltr">Apps Script</code> نیازی به VPS نیست. این مسیر برای پراکسی دستی وب است و تونل عمومی <code dir="ltr">TCP/UDP</code> یا هدایت خودکار کل LAN نیست.</li>
</ul>

<h2>۱. ساخت Web App گوگل</h2>

<p>دسترسی به <a href="https://script.google.com/">script.google.com</a> ممکن است فیلتر باشد. اگر سایت باز نمی‌شود، برای ساخت یا مدیریت اسکریپت ابتدا با فیلترشکن وارد شوید.</p>

<ol>
  <li>در <a href="https://script.google.com/">Google Apps Script</a> یک پروژه بسازید و محتوای فایل پیش‌فرض <code dir="ltr">Code.gs</code> را با <a href="assets/apps_script/Code.gs"><code dir="ltr">assets/apps_script/Code.gs</code></a> جایگزین کنید. این ساده‌ترین انتخاب بدون VPS است. اگر از قبل <code dir="ltr">CodeFull.gs</code> منتشر کرده‌اید، بخش پراکسی وب آن هم در حالت Apps Script و بدون tunnel-node کار می‌کند.</li>
  <li>در کد، مقدار قوی و تصادفی برای <code dir="ltr">AUTH_KEY</code> بگذارید و آن را محرمانه نگه دارید؛ همین مقدار را بعداً در LuCI وارد می‌کنید.</li>
  <li>از مسیر <bdi dir="ltr">Deploy → New deployment → Web app</bdi> برنامه را منتشر کنید. گزینهٔ اجرا را روی <bdi dir="ltr">Me</bdi> بگذارید و دسترسی Web App را مطابق راهنمای پروژه تنظیم کنید تا روتر بتواند به آن وصل شود. اگر گوگل درخواست مجوز کرد، آن را تأیید کنید.</li>
  <li>در <bdi dir="ltr">Deploy → Manage deployments</bdi> شناسهٔ Deployment را کپی کنید. فقط خود شناسه را لازم دارید، نه نشانی کامل <code dir="ltr">/exec</code>.</li>
  <li>اگر چند Deployment می‌سازید، همه باید از همان <code dir="ltr">AUTH_KEY</code> مشترک استفاده کنند. در LuCI شناسه‌ها را جداگانه اضافه یا حذف می‌کنید.</li>
</ol>

<p>حالت Full اختیاری و جدا از این راهنماست. فقط در صورت داشتن VPS یا Cloud Run و راه‌اندازی <a href="tunnel-node/README.fa.md"><code dir="ltr">tunnel-node</code></a>، از <a href="assets/apps_script/CodeFull.gs"><code dir="ltr">CodeFull.gs</code></a> استفاده کنید.</p>

<h2>۲. نصب روی روتر</h2>

<p>از بخش <a href="https://github.com/dreamboxone/gvpn/releases">Releases</a> فایل <code dir="ltr">luci-app-gvpn-*.apk</code> متناسب با روترتان را دریافت کنید. در LuCI به <bdi dir="ltr">System → Software → Upload Package</bdi> بروید، فایل را بارگذاری و نصب کنید. یا فایل را با SCP به روتر بفرستید و اجرا کنید:</p>

<pre dir="ltr"><code>apk add --allow-untrusted /tmp/luci-app-gvpn-*.apk</code></pre>

<p>فایل ARMv7 را فقط روی هدف‌های سازگار ARMv7 نصب کنید؛ بستهٔ AArch64 برای پردازنده‌های ۶۴ بیتی ARMv8/ARMv9 است. وابستگی‌های کرنل باید با firmware دقیق روتر هماهنگ باشند. اگر <code dir="ltr">kmod-nft-tproxy</code> پیدا نشد، بستهٔ مناسب SDK و firmware خودتان را بسازید و kmod نسخهٔ دیگر را نصب نکنید.</p>

<h2>۳. تنظیم پراکسی Apps Script</h2>

<ol>
  <li>در LuCI صفحهٔ <bdi dir="ltr">Services → GVPN Manager</bdi> را باز کنید. نسخهٔ نصب‌شده در سربرگ صفحه نمایش داده می‌شود.</li>
  <li><code dir="ltr">AUTH_KEY</code> مشترک را وارد و یک یا چند Deployment ID را اضافه کنید.</li>
  <li>حالت <bdi dir="ltr">Apps Script</bdi> را انتخاب کنید و <code dir="ltr">TPROXY</code> را خاموش بگذارید.</li>
  <li><bdi dir="ltr">Save &amp; Apply</bdi> را بزنید و سرویس را راه‌اندازی کنید. روی دستگاه موردنظر پراکسی HTTP را با IP روتر و پورت <code dir="ltr">8085</code> یا SOCKS5 را با پورت <code dir="ltr">8086</code> تنظیم کنید.</li>
</ol>

<p>برای HTTPS، پراکسی گواهی‌هایی با مرجع صدور محلی خودش می‌سازد. گواهی عمومی روتر در <code dir="ltr">/etc/gvpn/data/mhrv-rs/ca/ca.crt</code> است؛ فقط اگر آگاهانه می‌خواهید HTTPS را از این پراکسی عبور دهید، آن را روی دستگاه‌های تحت کنترل خود به‌عنوان ریشهٔ مورد اعتماد نصب کنید. کلید خصوصی کنار آن، <code dir="ltr">ca.key</code>، را کپی یا منتشر نکنید. اعتماد به این گواهی به روتر امکان مشاهدهٔ محتوای HTTPS می‌دهد؛ بدون آن، دستگاه باید گواهی پراکسی را رد کند.</p>

<p>برای مسیر Apps Script تنها، <code dir="ltr">TPROXY</code> را فعال نکنید. هدایت خودکار همهٔ ترافیک LAN به حالت Full و سرور <code dir="ltr">tunnel-node</code> نیاز دارد؛ انتشار موفق اسکریپت این محدودیت را برطرف نمی‌کند.</p>

<h2>Passwall2 و v2rayN</h2>

<ul>
  <li><bdi dir="ltr">Passwall2:</bdi> برای راه‌اندازی Apps Script، <code dir="ltr">TPROXY</code> داخلی GVPN را خاموش بگذارید. می‌توانید پراکسی SOCKS5 محلی <code dir="ltr">127.0.0.1:8086</code> را در Passwall2 تعریف کنید، اما این کار تونل عمومی TCP/UDP ایجاد نمی‌کند. Full به tunnel-node نیاز دارد.</li>
  <li><bdi dir="ltr">v2rayN در ویندوز:</bdi> برای پراکسی دستی وب، IP روتر در LAN را به‌عنوان SOCKS5 با درگاه <code dir="ltr">8086</code> وارد کنید.</li>
</ul>

<h2>توقف و حذف</h2>

<p>ابتدا هدایت LAN را در LuCI خاموش و <bdi dir="ltr">Save &amp; Apply</bdi> کنید، سپس:</p>

<pre dir="ltr"><code>/etc/init.d/gvpn stop
/etc/init.d/gvpn disable
apk del luci-app-gvpn</code></pre>

<p>ممکن است OpenWrt فایل تنظیمات <code dir="ltr">/etc/config/gvpn</code> را پس از حذف بسته نگه دارد. فقط اگر می‌خواهید تنظیمات و کلید ذخیره‌شده نیز پاک شود، آن فایل را جداگانه حذف کنید.</p>

<h2>ساخت برای هدف دیگر</h2>

<p>SDK رسمی OpenWrt متناسب با target و نسخهٔ firmware را در WSL/Linux استفاده کنید:</p>

<pre dir="ltr"><code>./scripts/build-openwrt.sh /path/to/openwrt-sdk</code></pre>

<p>راهنمای کامل‌تر سازگاری، عیب‌یابی و تست بسته در <a href="openwrt/README.fa.md"><code dir="ltr">openwrt/README.fa.md</code></a> است.</p>

</div>
