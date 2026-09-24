'use strict';
'require view';
'require form';
'require fs';
'require ui';
'require poll';
'require uci';

// The Makefile stamps the package version in as "<version>-r<release>".
// Spell that out in Persian rather than showing the raw build tag.
function versionLabel(raw) {
	var parts = /^(.+)-r(\d+)$/.exec(raw);
	if (!parts)
		return _('نسخه') + ' ' + raw;
	return _('نسخه') + ' ' + parts[1] + ' -' + _('ویرایش') + ' ' + parts[2];
}

return view.extend({
	load: function() {
		return uci.load('gvpn').then(function() {
			var ids = uci.get('gvpn', 'main', 'script_ids');
			var legacyId = uci.get('gvpn', 'main', 'script_id');
			if ((!ids || !ids.length) && legacyId) {
				uci.set('gvpn', 'main', 'script_ids', [ legacyId ]);
				uci.unset('gvpn', 'main', 'script_id');
			}
			return fs.exec('/usr/libexec/gvpn/status').then(function(res) {
				var status = JSON.parse(res.stdout);
				uci.set('gvpn', 'main', 'autostart', status.autostart ? '1' : '0');
				return status;
			}).catch(function() {
				return { running: false, autostart: false, transparent: false };
			});
		});
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(function() {
			return uci.apply();
		}).then(function() {
			var action = uci.get('gvpn', 'main', 'autostart') === '1' ? 'enable' : 'disable';
			return fs.exec('/etc/init.d/gvpn', [ action ]);
		}).then(L.bind(function() {
			return this._service('restart', _('تنظیمات اعمال شد و سرویس دوباره راه‌اندازی شد.'));
		}, this));
	},

	render: function(status) {
		if (!document.getElementById('gvpn-font-style')) {
			var fontStyle = E('style', { 'id': 'gvpn-font-style' }, '@font-face{font-family:GVPN-Vazirmatn;src:url(/luci-static/resources/gvpn/Vazirmatn-wght.woff2) format("woff2");font-style:normal;font-weight:100 900;font-display:swap}.gvpn-page,.gvpn-page *,#modal,.modal,.modal *{font-family:GVPN-Vazirmatn,Vazirmatn,sans-serif!important}.gvpn-page .cbi-input-invalid + .cbi-tooltip-container,.gvpn-page .cbi-tooltip-error{direction:rtl;text-align:right}');
			document.head.appendChild(fontStyle);
		}
		var state = E('span', { 'class': 'label gvpn-state gvpn-state-off' }, _('نامشخص'));
		var startup = E('span', {}, _('نامشخص'));
		var endpoint = E('span', {}, '—');
		var socksEndpoint = E('span', {}, '—');
		var feedback = E('div', { 'class': 'cbi-section' });
		var savedKey = E('code', { 'style': 'display:none; direction:ltr; overflow-wrap:anywhere' });
		var transparentState;
		var keyToggle = E('button', { 'class': 'cbi-button', 'click': function(ev) {
			ev.preventDefault();
			if (savedKey.style.display === 'none') {
				savedKey.textContent = uci.get('gvpn', 'main', 'auth_key') || _('کلیدی ذخیره نشده است.');
				savedKey.style.display = 'block';
				keyToggle.textContent = _('پنهان‌کردن AUTH_KEY');
			} else {
				savedKey.textContent = '';
				savedKey.style.display = 'none';
				keyToggle.textContent = _('نمایش AUTH_KEY ذخیره‌شده');
			}
		} }, _('نمایش AUTH_KEY ذخیره‌شده'));

		function refresh() {
			return fs.exec('/usr/libexec/gvpn/status').then(function(res) {
				var current = JSON.parse(res.stdout);
				status.running = current.running;
				status.autostart = current.autostart;
				state.textContent = current.running ? _('در حال اجرا') : _('متوقف');
				state.className = current.running ? 'label gvpn-state gvpn-state-on' : 'label gvpn-state gvpn-state-off';
				startup.textContent = current.autostart ? _('فعال') : _('غیرفعال');
				if (transparentState) {
					transparentState.textContent = current.transparent ? _('فعال') : _('غیرفعال');
					transparentState.className = current.transparent ? 'label gvpn-state gvpn-state-on' : 'label gvpn-state gvpn-state-off';
				}
			}).catch(function() {
				state.textContent = _('وضعیت در دسترس نیست');
				state.className = 'label gvpn-state gvpn-state-off';
			});
		}

		function service(action, message) {
			return fs.exec('/etc/init.d/gvpn', [ action ]).then(function() {
				feedback.textContent = message;
				return refresh();
			}).catch(function(err) {
				feedback.textContent = err.message || _('عملیات ناموفق بود.');
			});
		}

		var m = new form.Map('gvpn', 'GVPN Manager');
		var saveForm = m.save;
		m.save = function(callback, silent) {
			return saveForm.call(this, callback, true).catch(function(err) {
				if (!silent) {
					var detail = err && err.message ? err.message : String(err);
					if (detail.indexOf('contains an invalid input value') !== -1)
						detail = 'مقدار یکی از فیلدها معتبر نیست. فیلد قرمز را بررسی کنید. برای Deployment ID فقط شناسهٔ کامل را از Google Apps Script وارد کنید.';
					var modal = ui.showModal('خطا در ذخیره‌سازی', [
						E('div', { 'dir': 'rtl', 'lang': 'fa', 'style': 'font-family:GVPN-Vazirmatn,Vazirmatn,sans-serif;text-align:right' }, [
							E('p', {}, 'ذخیرهٔ تنظیمات انجام نشد:'),
							E('p', {}, [ E('em', { 'style': 'white-space:pre-wrap' }, detail) ]),
							E('div', { 'class': 'right' }, [
								E('button', { 'class': 'cbi-button', 'click': ui.hideModal }, 'بستن')
							])
						])
					]);
					var modalTitle = modal.querySelector('h4');
					modalTitle.setAttribute('dir', 'rtl');
					modalTitle.setAttribute('lang', 'fa');
					modalTitle.style.fontFamily = 'GVPN-Vazirmatn,Vazirmatn,sans-serif';
					modalTitle.style.textAlign = 'right';
				}

				return Promise.reject(err);
			});
		};
		var s = m.section(form.NamedSection, 'main', 'gvpn', _('تنظیمات پراکسی'));
		s.anonymous = true;

		var mode = s.option(form.ListValue, 'mode', _('حالت اتصال'));
		mode.value('apps_script', _('Apps Script — پراکسی وب و هدایت آزمایشی LAN'));
		mode.value('full', _('Full — تونل کامل TCP/UDP و هدایت LAN'));
		mode.value('direct', _('اتصال مستقیم'));
		mode.default = 'apps_script';
		mode.description = _('Apps Script با Code.gs بدون VPS کار می‌کند. هدایت خودکار LAN در این حالت فقط برای وب TCP/80 و TCP/443 است و روی دستگاه‌های کاربر به نصب CA نیاز دارد. Full برای TCP/UDP به CodeFull.gs و tunnel-node نیاز دارد.');

		var scripts = s.option(form.DynamicList, 'script_ids', _('Deployment IDهای گوگل'));
		scripts.rmempty = true;
		scripts.placeholder = _('شناسهٔ کامل را وارد کنید');
		scripts.description = _('شناسهٔ کامل را از Manage deployments در Google Apps Script کپی کنید. زیرخط (_) و خط تیره (-) مجازند. نشانی /exec را وارد نکنید؛ هر شناسه را با دکمهٔ + اضافه کنید.');
		scripts.validate = function(section_id, value) {
			return !value || /^[A-Za-z0-9_-]+$/.test(value) ? true : _('این مقدار شامل نویسهٔ نامعتبر است. فقط حروف انگلیسی، عدد، زیرخط (_) و خط تیره (-) مجازند.');
		};

		var key = s.option(form.Value, 'auth_key', _('کلید احراز هویت واسط'));
		key.password = true;
		key.rmempty = true;
		key.description = _('یک AUTH_KEY مشترک برای همهٔ Deploymentهاست و باید با AUTH_KEY در کد Apps Script یکسان باشد.');

		var host = s.option(form.ListValue, 'listen_host', _('نشانی شنود'));
		host.value('0.0.0.0', _('همه رابط‌های روتر (دستگاه‌های شبکه محلی)'));
		host.value('127.0.0.1', _('فقط خود روتر'));

		var http = s.option(form.Value, 'listen_port', _('پورت پراکسی HTTP'));
		http.datatype = 'port';
		http.placeholder = '8085';

		var socks = s.option(form.Value, 'socks5_port', _('پورت پراکسی SOCKS5'));
		socks.datatype = 'port';
		socks.placeholder = '8086';

		var verify = s.option(form.Flag, 'verify_ssl', _('بررسی گواهی‌های TLS'));
		verify.default = '1';
		verify.rmempty = false;

		var lanProxy = s.option(form.Flag, 'lan_proxy_enabled', _('هدایت خودکار ترافیک LAN با TPROXY'));
		lanProxy.default = '0';
		lanProxy.rmempty = false;
		lanProxy.description = _('در Apps Script فقط وب روی TCP/80 و TCP/443 هدایت می‌شود و UDP/443 برای بازگشت مرورگر از QUIC به HTTPS معمولی مسدود می‌شود. برای دامنه‌هایی که DNS شبکه رکورد A آن‌ها را حذف می‌کند (مانند یوتیوب) یک آدرس IPv4 ثابت روی dnsmasq تنظیم و پاسخ‌های AAAA فیلتر می‌شوند تا ترافیک وارد TPROXY شود؛ با خاموش‌کردن این گزینه همه به حالت قبل برمی‌گردد. HTTPS روی دستگاه کاربر به اعتماد به CA روتر نیاز دارد و همهٔ برنامه‌ها سازگار نیستند. در Full، TCP/UDP از تونل عبور می‌کند و DNSهای DHCP شبکهٔ انتخابی موقتاً تغییر می‌کنند.');

		var autostart = s.option(form.Flag, 'autostart', _('اجرای خودکار هنگام روشن‌شدن روتر'));
		autostart.default = '0';
		autostart.rmempty = false;
		autostart.description = _('با تیک‌زدن و ذخیرهٔ تنظیمات، سرویس پس از هر راه‌اندازی روتر خودکار اجرا می‌شود. بدون تیک، شروع سرویس فقط دستی است.');

		var lanDevices = s.option(form.DynamicList, 'lan_devices', _('رابط‌های LAN برای هدایت'));
		lanDevices.default = [ 'br-lan' ];
		lanDevices.placeholder = 'br-lan';
		lanDevices.description = _('نام bridge یا رابط لایهٔ ۳ شبکهٔ LAN را وارد کنید؛ معمولاً br-lan است. برای چند شبکه، هر رابط را جداگانه اضافه کنید. رابط WAN را اضافه نکنید.');
		lanDevices.validate = function(section_id, value) {
			return !value || /^[A-Za-z0-9_.:-]+$/.test(value) ? true : _('نام رابط معتبر نیست.');
		};

		var log = s.option(form.ListValue, 'log_level', _('سطح گزارش'));
		[ 'error', 'warn', 'info', 'debug', 'trace' ].forEach(function(level) {
			log.value(level, level);
		});
		log.default = 'info';

		this._service = service;

		var panel = E('div', { 'class': 'gvpn-dashboard' }, [
			E('style', {}, '.gvpn-dashboard{--gvpn-muted:#8191a8;max-width:1120px;margin:18px auto 24px}.gvpn-hero{position:relative;overflow:hidden;padding:20px 28px;border-radius:18px;background:linear-gradient(120deg,#102947,#155c9d 62%,#3186e5);color:#fff;box-shadow:0 14px 34px rgba(22,71,122,.22)}.gvpn-hero:after{content:"";position:absolute;width:210px;height:210px;border:1px solid rgba(255,255,255,.18);border-radius:50%;right:8%;top:-118px;box-shadow:0 0 0 28px rgba(255,255,255,.05),0 0 0 58px rgba(255,255,255,.035)}.gvpn-hero h2{position:relative;z-index:1;margin:0;color:#fff;font-size:26px}.gvpn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:16px 0}.gvpn-card{padding:18px 20px;border:1px solid rgba(91,119,158,.2);border-radius:14px;background:var(--background-color-high,#fff);box-shadow:0 5px 18px rgba(22,42,76,.08)}.gvpn-card h3{margin:0 0 12px;font-size:15px}.gvpn-stat{display:flex;align-items:center;gap:8px;margin:8px 0;color:var(--gvpn-muted)}.gvpn-card code{direction:ltr;display:inline-block;max-width:100%;overflow-wrap:anywhere}.gvpn-dashboard .label{padding:5px 11px;border-radius:9px;font-weight:700}.gvpn-state-on{background:#15803d!important;color:#fff!important;border:1px solid #15803d}.gvpn-state-off{background:#c62828!important;color:#fff!important;border:1px solid #c62828}.gvpn-note{margin:18px 0 12px;padding:12px 16px;border:1px solid #b8d6fa;border-radius:12px;background:#edf5ff;color:#24466d;line-height:1.9}.gvpn-feedback{margin-top:10px}.gvpn-button-row{display:flex;flex-wrap:wrap;gap:9px;margin:12px 0 20px}.gvpn-button-row .cbi-button{margin:0!important;padding:8px 18px;border:1px solid transparent;border-radius:10px;font-weight:700;transition:filter .15s,transform .15s}.gvpn-button-row .cbi-button:hover{filter:brightness(1.08);transform:translateY(-1px)}.gvpn-button-start{background:#16803c!important;color:white!important;border-color:#16803c!important}.gvpn-button-stop{background:#c62828!important;color:white!important;border-color:#c62828!important}.gvpn-button-restart{background:#1d70c9!important;color:white!important;border-color:#1d70c9!important}.gvpn-button-autostart{background:#52627a!important;color:white!important;border-color:#52627a!important}.gvpn-button-ca{display:inline-flex;align-items:center;gap:7px;background:linear-gradient(135deg,#b8460e,#e8791b)!important;color:#fff!important;border-color:#b8460e!important;text-decoration:none!important;box-shadow:0 3px 10px rgba(184,70,14,.34)}.gvpn-button-ca:before{content:"\\1F512";font-size:14px}.gvpn-button-ca:hover{color:#fff!important;text-decoration:none!important}.gvpn-page,.gvpn-page *{font-family:GVPN-Vazirmatn,Vazirmatn,sans-serif}.gvpn-page input,.gvpn-page code{direction:ltr;text-align:left}.gvpn-hero h2{display:flex;align-items:center;gap:12px;direction:ltr;justify-content:flex-end}.gvpn-version{padding:4px 9px;border:1px solid rgba(255,255,255,.35);border-radius:999px;background:rgba(255,255,255,.12);font-size:13px;font-weight:600}.gvpn-page .cbi-map-descr{line-height:1.8}@media(max-width:600px){.gvpn-hero{padding:17px 20px}.gvpn-hero h2{font-size:22px}.gvpn-card{padding:15px}.gvpn-button-row .cbi-button{flex:1 1 auto}}'),
			E('div', { 'class': 'gvpn-hero' }, [
				E('h2', {}, [ E('span', { 'class': 'gvpn-version', 'dir': 'rtl' }, versionLabel('__GVPN_VERSION__')), 'GVPN Manager' ])
			]),
			E('div', { 'class': 'gvpn-cards' }, [
				E('section', { 'class': 'gvpn-card' }, [ E('h3', {}, _('وضعیت سرویس')), E('div', { 'class': 'gvpn-stat' }, [ _('هسته GVPN: '), state ]), E('div', { 'class': 'gvpn-stat' }, [ _('هدایت LAN: '), transparentState = E('span', { 'class': status.transparent ? 'label gvpn-state gvpn-state-on' : 'label gvpn-state gvpn-state-off' }, status.transparent ? _('فعال') : _('غیرفعال')) ]), E('div', { 'class': 'gvpn-stat' }, [ _('اجرای خودکار: '), startup ]) ]),
				E('section', { 'class': 'gvpn-card' }, [ E('h3', {}, _('نشانی‌های پراکسی')), E('div', { 'class': 'gvpn-stat' }, [ _('HTTP: '), endpoint ]), E('div', { 'class': 'gvpn-stat' }, [ _('SOCKS5: '), socksEndpoint ]) ]),
				E('section', { 'class': 'gvpn-card' }, [ E('h3', {}, _('مدیریت AUTH_KEY')), keyToggle, E('p', {}, savedKey) ])
			]),
			E('div', { 'class': 'gvpn-note', 'style': 'display:none' }, _('حالت Full فقط با CodeFull.gs و tunnel-node فعال روی VPS یا Cloud Run کار می‌کند.')),
			E('p', { 'class': 'gvpn-ca-guide', 'style': 'display:none;direction:rtl;line-height:1.9;margin:8px 0 14px' }, [
				E('strong', {}, _('گواهی برای حالت Apps Script: ')),
				_('اگر هدایت LAN یا پراکسی HTTPS را فعال می‌کنید، گواهی عمومی CA روتر را روی هر دستگاهی که خودتان کنترل می‌کنید نصب و برای HTTPS مورد اعتماد کنید. بدون آن، مرورگر باید خطای گواهی نشان دهد. برخی برنامه‌ها حتی پس از نصب CA کار نمی‌کنند. اعتماد به CA به روتر امکان مشاهدهٔ محتوای HTTPS را می‌دهد. دکمهٔ دریافت گواهی در ردیف دکمه‌های زیر است.')
			]),
			E('div', { 'class': 'gvpn-button-row' }, [
				E('button', { 'class': 'cbi-button gvpn-button-start', 'click': ui.createHandlerFn(this, function() {
					return service('start', _('سرویس شروع شد.'));
				}) }, _('شروع')),
				' ',
				E('button', { 'class': 'cbi-button gvpn-button-stop', 'click': ui.createHandlerFn(this, function() {
					return service('stop', _('سرویس متوقف شد.'));
				}) }, _('توقف')),
				' ',
				E('button', { 'class': 'cbi-button gvpn-button-restart', 'click': ui.createHandlerFn(this, function() {
					return service('restart', _('سرویس دوباره راه‌اندازی شد.'));
				}) }, _('راه‌اندازی مجدد')),
				' ',
				E('a', { 'class': 'cbi-button gvpn-button-ca', 'href': 'http://' + window.location.hostname + '/cgi-bin/gvpn-ca.crt', 'target': '_blank', 'rel': 'noopener', 'download': 'gvpn-ca.crt' }, _('دریافت گواهی CA'))
			]),
			E('div', { 'class': 'gvpn-feedback' }, [ feedback ])
		]);

		var hostValue = uci.get('gvpn', 'main', 'listen_host') || '0.0.0.0';
		var proxyHost = hostValue === '127.0.0.1' ? '127.0.0.1' : window.location.hostname;
		endpoint.textContent = proxyHost + ':' + (uci.get('gvpn', 'main', 'listen_port') || '8085');
		socksEndpoint.textContent = proxyHost + ':' + (uci.get('gvpn', 'main', 'socks5_port') || '8086');
		poll.add(refresh, 5);

		return m.render().then(function(formNode) {
			var modeInput = formNode.querySelector('select[id$=".mode"]');
			var fullNote = panel.querySelector('.gvpn-note');
			var caNote = panel.querySelector('.gvpn-ca-guide');
			function updateFullNote() {
				fullNote.style.display = modeInput && modeInput.value === 'full' ? '' : 'none';
				caNote.style.display = modeInput && modeInput.value === 'apps_script' ? '' : 'none';
			}
			if (modeInput) {
				modeInput.addEventListener('change', updateFullNote);
				updateFullNote();
			}
			var scriptInput = formNode.querySelector('input[id$=".script_ids"]');
			if (scriptInput) {
				scriptInput.addEventListener('input', function() {
					var cleaned = this.value.replace(/\\_/g, '_').replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
					if (cleaned !== this.value)
						this.value = cleaned;
				});
			}
			return E('div', { 'class': 'cbi-map gvpn-page', 'dir': 'rtl', 'lang': 'fa' }, [ panel, formNode ]);
		});
	}
});
