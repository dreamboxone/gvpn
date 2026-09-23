<div dir="rtl" lang="fa" style="text-align:right;font-family:Vazirmatn,sans-serif">

<h1>GVPN Manager برای OpenWrt</h1>

<p><code dir="ltr">luci-app-gvpn</code> یک برنامهٔ گرافیکی برای مدیریت GVPN در LuCI است. با فعال‌کردن <code dir="ltr">TPROXY</code> می‌توانید ترافیک <code dir="ltr">TCP/UDP</code> شبکهٔ محلی را از روتر عبور دهید؛ بنابراین لازم نیست روی تک‌تک دستگاه‌ها پراکسی تنظیم کنید.</p>

<p><a href="openwrt/README.fa.md">راهنمای کامل فارسی OpenWrt</a> · <a href="README.md">راهنمای انگلیسی</a> · <a href="https://github.com/dreamboxone/gvpn/releases">دریافت نسخه‌ها</a></p>

<h2>پیش‌نیازها</h2>

<ul>
  <li>روتر با OpenWrt و فایروال <code dir="ltr">firewall4/nftables</code>؛ بسته را برای معماری و نسخهٔ firmware خود انتخاب کنید.</li>
  <li>بسته‌های <code dir="ltr">APK</code> فقط برای OpenWrt مبتنی بر APK هستند. روی نسخه‌های قدیمی‌تر مبتنی بر <code dir="ltr">opkg/IPK</code> نصبشان نکنید.</li>
  <li>برای حالت Full و هدایت خودکار LAN علاوه بر اسکریپت گوگل، باید <code dir="ltr">tunnel-node</code> را روی VPS یا Google Cloud Run اجرا کنید. Apps Script به‌تنهایی فقط درخواست‌های <code dir="ltr">HTTP/HTTPS</code> را relay می‌کند و تونل عمومی <code dir="ltr">TCP/UDP</code> نیست.</li>
</ul>

<h2>۱. ساخت Web App گوگل</h2>

<p>دسترسی به <a href="https://script.google.com/">script.google.com</a> ممکن است فیلتر باشد. اگر سایت باز نمی‌شود، برای ساخت یا مدیریت اسکریپت ابتدا با فیلترشکن وارد شوید.</p>

<ol>
  <li>در <a href="https://script.google.com/">Google Apps Script</a> یک پروژه بسازید و کد <a href="assets/apps_script/CodeFull.gs"><code dir="ltr">assets/apps_script/CodeFull.gs</code></a> را جایگزین کد پیش‌فرض کنید.</li>
  <li>در کد، مقدار قوی و تصادفی برای <code dir="ltr">AUTH_KEY</code> بگذارید و آن را محرمانه نگه دارید؛ همین مقدار را بعداً در LuCI وارد می‌کنید.</li>
  <li>از مسیر <bdi dir="ltr">Deploy → New deployment → Web app</bdi> برنامه را منتشر کنید. گزینهٔ اجرا را روی <bdi dir="ltr">Me</bdi> بگذارید و دسترسی Web App را مطابق راهنمای پروژه تنظیم کنید تا روتر بتواند به آن وصل شود. اگر گوگل درخواست مجوز کرد، آن را تأیید کنید.</li>
  <li>در <bdi dir="ltr">Deploy → Manage deployments</bdi> شناسهٔ Deployment را کپی کنید. فقط خود شناسه را لازم دارید، نه نشانی کامل <code dir="ltr">/exec</code>.</li>
  <li>اگر چند Deployment می‌سازید، همه باید از همان <code dir="ltr">AUTH_KEY</code> مشترک استفاده کنند. در LuCI شناسه‌ها را جداگانه اضافه یا حذف می‌کنید.</li>
</ol>

<p>برای حالت Full، <a href="tunnel-node/README.fa.md"><code dir="ltr">tunnel-node</code></a> را هم راه‌اندازی کنید و <code dir="ltr">CodeFull.gs</code> را به همان Node وصل کنید؛ تا زمانی که Node آماده نیست، Full را برای هدایت LAN فعال نکنید.</p>

<h2>۲. نصب روی روتر</h2>

<p>از بخش <a href="https://github.com/dreamboxone/gvpn/releases">Releases</a> فایل <code dir="ltr">luci-app-gvpn-*.apk</code> متناسب با روترتان را دریافت کنید. در LuCI به <bdi dir="ltr">System → Software → Upload Package</bdi> بروید، فایل را بارگذاری و نصب کنید. یا فایل را با SCP به روتر بفرستید و اجرا کنید:</p>

<pre dir="ltr"><code>apk add --allow-untrusted /tmp/luci-app-gvpn-*.apk</code></pre>

<p>فایل ARMv7 را فقط روی هدف‌های سازگار ARMv7 نصب کنید؛ بستهٔ AArch64 برای پردازنده‌های ۶۴ بیتی ARMv8/ARMv9 است. وابستگی‌های کرنل باید با firmware دقیق روتر هماهنگ باشند. اگر <code dir="ltr">kmod-nft-tproxy</code> پیدا نشد، بستهٔ مناسب SDK و firmware خودتان را بسازید و kmod نسخهٔ دیگر را نصب نکنید.</p>

<h2>۳. تنظیم GVPN و هدایت خودکار LAN</h2>

<ol>
  <li>در LuCI صفحهٔ <bdi dir="ltr">Services → GVPN Manager</bdi> را باز کنید. نسخهٔ نصب‌شده در سربرگ صفحه نمایش داده می‌شود.</li>
  <li><code dir="ltr">AUTH_KEY</code> مشترک را وارد و یک یا چند Deployment ID را اضافه کنید.</li>
  <li>برای تونل کامل، حالت <bdi dir="ltr">Full</bdi> را انتخاب کنید. حالت <bdi dir="ltr">Apps Script</bdi> فقط برای پراکسی دستی <code dir="ltr">HTTP/HTTPS</code> است.</li>
  <li>برای عبور خودکار دستگاه‌های LAN، گزینهٔ هدایت LAN با <code dir="ltr">TPROXY</code> را فعال کنید. رابط معمولاً <code dir="ltr">br-lan</code> است؛ در صورت نیاز bridge/VLANهای LAN دیگر را هم اضافه کنید. رابط WAN را اضافه نکنید.</li>
  <li><bdi dir="ltr">Save &amp; Apply</bdi> را بزنید و وضعیت GVPN و هدایت LAN را در کارت‌های بالای صفحه بررسی کنید. برای اجرای خودکار پس از روشن‌شدن روتر، اجرای خودکار سرویس را فعال کنید.</li>
</ol>

<p><code dir="ltr">TPROXY</code> ترافیک عبوری <code dir="ltr">TCP/UDP</code> را از رابط‌های انتخابی می‌گیرد، اما <code dir="ltr">ping/ICMP</code> و ترافیک ساخته‌شده توسط خود روتر را تونل نمی‌کند. برای جلوگیری از نشت DNS، تنظیم DNS اعلام‌شده با DHCP هنگام فعال‌بودن قابلیت موقتاً عوض می‌شود و با خاموش‌کردن آن برمی‌گردد. در صورت خطای Full، ترافیک عمداً مستقیم از WAN خارج نمی‌شود. هم‌زمان، Passwall2 یا شفاف‌ساز دیگری را روی همان رابط LAN برای هدایت فعال نکنید.</p>

<h2>Passwall2 و v2rayN</h2>

<ul>
  <li><bdi dir="ltr">Passwall2:</bdi> اگر هدایت LAN را خود GVPN انجام می‌دهد، Passwall2 لازم نیست. اگر می‌خواهید Passwall2 مسیر‌دهی را مدیریت کند، هدایت <code dir="ltr">TPROXY</code> داخلی GVPN را خاموش و در Passwall2 یک گرهٔ SOCKS5 با نشانی <code dir="ltr">127.0.0.1:8086</code> بسازید. برای <code dir="ltr">TCP/UDP</code> عمومی، Full لازم است.</li>
  <li><bdi dir="ltr">v2rayN در ویندوز:</bdi> اگر لپ‌تاپ به LAN همین روتر وصل است و <code dir="ltr">TPROXY</code> فعال است، در v2rayN پراکسی جداگانه تنظیم نکنید. برای استفادهٔ دستی، IP روتر در LAN را به‌عنوان SOCKS5 با درگاه <code dir="ltr">8086</code> وارد کنید.</li>
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
