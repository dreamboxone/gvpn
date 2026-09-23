'use strict';
'require view';
'require form';
'require fs';
'require ui';
'require poll';
'require uci';

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
			return JSON.parse(res.stdout);
		}).catch(function() {
			return { running: false, autostart: false, transparent: false };
		});
		});
	},

	handleSaveApply: function(ev, mode) {
		return this.handleSave(ev).then(function() {
			if (uci.get('gvpn', 'main', 'lan_proxy_enabled') === '1')
				return fs.exec('/etc/init.d/gvpn', [ 'enable' ]);
			return Promise.resolve();
		}).then(function() {
			return uci.apply();
		}).then(L.bind(function() {
			return this._service('restart', _('تنظیمات اعمال شد و سرویس دوباره راه‌اندازی شد.'));
		}, this));
	},

	render: function(status) {
		var state = E('span', { 'class': 'label' }, _('نامشخص'));
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
				state.className = current.running ? 'label label-success' : 'label label-warning';
				startup.textContent = current.autostart ? _('فعال') : _('غیرفعال');
				if (transparentState) {
					transparentState.textContent = current.transparent ? _('فعال') : _('غیرفعال');
					transparentState.className = current.transparent ? 'label label-success' : 'label label-warning';
				}
			}).catch(function() {
				state.textContent = _('وضعیت در دسترس نیست');
				state.className = 'label label-danger';
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

		var m = new form.Map('gvpn', _('GVPN'));
		var s = m.section(form.NamedSection, 'main', 'gvpn', _('تنظیمات پراکسی'));
		s.anonymous = true;

		var mode = s.option(form.ListValue, 'mode', _('حالت اتصال'));
		mode.value('full', _('Full — تونل کامل TCP/UDP و هدایت LAN'));
		mode.value('apps_script', _('Apps Script — فقط پراکسی وب'));
		mode.value('direct', _('اتصال مستقیم'));
		mode.default = 'full';
		mode.description = _('برای هدایت خودکار LAN باید Full را انتخاب کنید، CodeFull.gs را منتشر کرده باشید و tunnel-node را روی VPS یا Cloud Run اجرا کنید. Apps Script تنها، تونل عمومی TCP/UDP نیست.');

		var scripts = s.option(form.DynamicList, 'script_ids', _('Deployment IDهای گوگل'));
		scripts.rmempty = true;
		scripts.placeholder = 'AKfycb...';
		scripts.description = _('هر شناسه را جداگانه اضافه کنید؛ موارد ذخیره‌شده نمایش داده می‌شوند و با دکمهٔ حذف کنار هر مورد پاک می‌شوند. همه با AUTH_KEY مشترک کار می‌کنند.');
		scripts.validate = function(section_id, value) {
			return /^[A-Za-z0-9_-]+$/.test(value) ? true : _('شناسه فقط می‌تواند شامل حروف انگلیسی، عدد، خط تیره و زیرخط باشد.');
		};

		var key = s.option(form.Value, 'auth_key', _('کلید احراز هویت واسط'));
		key.password = true;
		key.rmempty = true;
		key.description = _('یک AUTH_KEY مشترک برای همهٔ Deploymentهاست و باید با AUTH_KEY در کد Apps Script یکسان باشد.');

		var host = s.option(form.ListValue, 'listen_host', _('نشانی شنود'));
		host.value('0.0.0.0', _('همه رابط‌های روتر (دستگاه‌های شبکه محلی)'));
		host.value('127.0.0.1', _('فقط خود روتر'));

		var http = s.option(form.Value, 'listen_port', _('درگاه پراکسی HTTP'));
		http.datatype = 'port';
		http.placeholder = '8085';

		var socks = s.option(form.Value, 'socks5_port', _('درگاه پراکسی SOCKS5'));
		socks.datatype = 'port';
		socks.placeholder = '8086';

		var verify = s.option(form.Flag, 'verify_ssl', _('بررسی گواهی‌های TLS'));
		verify.default = '1';

		var lanProxy = s.option(form.Flag, 'lan_proxy_enabled', _('هدایت خودکار ترافیک LAN با TPROXY'));
		lanProxy.default = '0';
		lanProxy.description = _('وقتی فعال باشد، OpenWrt ترافیک TCP و UDP عبوری LAN را بدون تنظیم دستگاه‌ها به GVPN Full می‌فرستد. برای جلوگیری از نشت DNS، DNSهای DHCPv4/v6 شبکه‌های انتخابی موقتاً به DNS عمومی گوگل تغییر می‌کنند و با خاموش‌کردن این گزینه مقدارهای قبلی برمی‌گردند؛ نام‌های محلی ممکن است در زمان فعال‌بودن resolve نشوند. ICMP و ترافیک خود روتر از این مسیر عبور نمی‌کنند. اجرای خودکار سرویس نیز فعال می‌شود.');

		var lanDevices = s.option(form.DynamicList, 'lan_devices', _('رابط‌های LAN برای هدایت'));
		lanDevices.default = [ 'br-lan' ];
		lanDevices.placeholder = 'br-lan';
		lanDevices.description = _('نام bridge یا رابط لایهٔ ۳ شبکهٔ LAN را وارد کنید؛ معمولاً br-lan است. برای چند شبکه، هر رابط را جداگانه اضافه کنید. رابط WAN را اضافه نکنید.');
		lanDevices.validate = function(section_id, value) {
			return /^[A-Za-z0-9_.:-]+$/.test(value) ? true : _('نام رابط معتبر نیست.');
		};

		var log = s.option(form.ListValue, 'log_level', _('سطح گزارش'));
		[ 'error', 'warn', 'info', 'debug', 'trace' ].forEach(function(level) {
			log.value(level, level);
		});
		log.default = 'info';

		this._service = service;

		var panel = E('div', { 'class': 'gvpn-dashboard' }, [
			E('style', {}, '.gvpn-dashboard{--gvpn-accent:#2474e5;--gvpn-ink:#17233b;--gvpn-muted:#62718a;max-width:1120px;margin:18px auto 24px;color:var(--gvpn-ink)}.gvpn-hero{position:relative;overflow:hidden;padding:28px 32px;border-radius:18px;background:linear-gradient(120deg,#102947,#155c9d 62%,#3186e5);color:#fff;box-shadow:0 14px 34px rgba(22,71,122,.22)}.gvpn-hero:after{content:"";position:absolute;width:210px;height:210px;border:1px solid rgba(255,255,255,.18);border-radius:50%;right:8%;top:-118px;box-shadow:0 0 0 28px rgba(255,255,255,.05),0 0 0 58px rgba(255,255,255,.035)}.gvpn-hero h2{margin:0 0 8px;color:#fff;font-size:26px}.gvpn-hero p{position:relative;z-index:1;margin:0;max-width:680px;color:#e2efff;line-height:1.9}.gvpn-cards{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:14px;margin:16px 0}.gvpn-card{padding:18px 20px;border:1px solid rgba(91,119,158,.16);border-radius:14px;background:var(--background-color-high,#fff);box-shadow:0 5px 18px rgba(22,42,76,.055)}.gvpn-card h3{margin:0 0 12px;font-size:15px}.gvpn-stat{display:flex;align-items:center;gap:8px;margin:8px 0;color:var(--gvpn-muted)}.gvpn-card code{direction:ltr;display:inline-block;max-width:100%;overflow-wrap:anywhere;color:#254f82}.gvpn-actions{display:flex;flex-wrap:wrap;gap:8px;margin:14px 0}.gvpn-actions .cbi-button{border-radius:9px;padding:7px 14px}.gvpn-note{padding:12px 15px;border-radius:10px;background:#eef5ff;color:#315780;line-height:1.8}.gvpn-dashboard .label{padding:5px 9px;border-radius:20px}.gvpn-dashboard+ .cbi-map-descr{line-height:1.8}@media(max-width:600px){.gvpn-hero{padding:22px}.gvpn-hero h2{font-size:22px}.gvpn-card{padding:15px}}'),
			E('div', { 'class': 'gvpn-hero' }, [
				E('h2', {}, _('GVPN برای OpenWrt')),
				E('p', {}, _('مدیریت یکپارچهٔ رلهٔ گوگل، کلیدها و هدایت شفاف شبکهٔ محلی. تنظیمات را یک‌بار انجام دهید؛ دستگاه‌های LAN به تنظیم پراکسی نیاز ندارند.'))
			]),
			E('div', { 'class': 'gvpn-cards' }, [
				E('section', { 'class': 'gvpn-card' }, [ E('h3', {}, _('وضعیت سرویس')), E('div', { 'class': 'gvpn-stat' }, [ _('هستهٔ GVPN: '), state ]), E('div', { 'class': 'gvpn-stat' }, [ _('هدایت LAN: '), transparentState = E('span', { 'class': 'label label-warning' }, status.transparent ? _('فعال') : _('غیرفعال')) ]), E('div', { 'class': 'gvpn-stat' }, [ _('اجرای خودکار روتر: '), startup ]) ]),
				E('section', { 'class': 'gvpn-card' }, [ E('h3', {}, _('نشانی‌های پراکسی')), E('div', { 'class': 'gvpn-stat' }, [ _('HTTP: '), endpoint ]), E('div', { 'class': 'gvpn-stat' }, [ _('SOCKS5: '), socksEndpoint ]) ]),
				E('section', { 'class': 'gvpn-card' }, [ E('h3', {}, _('مدیریت AUTH_KEY')), keyToggle, E('p', {}, savedKey) ])
			]),
			E('div', { 'class': 'gvpn-note' }, _('نکتهٔ راه‌اندازی Full: ابتدا CodeFull.gs و tunnel-node را مطابق راهنمای پروژه فعال کنید، سپس کلید مشترک و شناسه‌های Deployment را وارد کنید. برای جلوگیری از نشت DNS، هنگام فعال‌بودن TPROXY، DNSهای DHCP شبکهٔ انتخابی موقتاً با DNS عمومی گوگل جایگزین می‌شوند و با خاموش‌کردن به مقدار قبلی برمی‌گردند.')),
			E('div', { 'class': 'cbi-button-row' }, [
				E('button', { 'class': 'cbi-button cbi-button-action', 'click': ui.createHandlerFn(this, function() {
					return service('start', _('سرویس شروع شد.'));
				}) }, _('شروع')),
				' ',
				E('button', { 'class': 'cbi-button', 'click': ui.createHandlerFn(this, function() {
					return service('stop', _('سرویس متوقف شد.'));
				}) }, _('توقف')),
				' ',
				E('button', { 'class': 'cbi-button', 'click': ui.createHandlerFn(this, function() {
					return service('restart', _('سرویس دوباره راه‌اندازی شد.'));
				}) }, _('راه‌اندازی مجدد')),
				' ',
				E('button', { 'class': 'cbi-button', 'click': ui.createHandlerFn(this, function() {
					var action = status.autostart ? 'disable' : 'enable';
					return service(action, action === 'enable' ? _('اجرای خودکار فعال شد.') : _('اجرای خودکار غیرفعال شد.')).then(function() {
						status.autostart = !status.autostart;
					});
				}) }, _('تغییر اجرای خودکار'))
			]),
			feedback
		]);

		var hostValue = uci.get('gvpn', 'main', 'listen_host') || '0.0.0.0';
		var proxyHost = hostValue === '127.0.0.1' ? '127.0.0.1' : window.location.hostname;
		endpoint.textContent = proxyHost + ':' + (uci.get('gvpn', 'main', 'listen_port') || '8085');
		socksEndpoint.textContent = proxyHost + ':' + (uci.get('gvpn', 'main', 'socks5_port') || '8086');
		poll.add(refresh, 5);

		return m.render().then(function(formNode) {
			return E('div', { 'class': 'cbi-map' }, [ panel, formNode ]);
		});
	}
});
