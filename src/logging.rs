use time::OffsetDateTime;
use tracing_subscriber::fmt::{format::Writer, time::FormatTime};

pub struct CompactUtcTime;

impl FormatTime for CompactUtcTime {
    fn format_time(&self, w: &mut Writer<'_>) -> std::fmt::Result {
        let now = OffsetDateTime::now_utc();
        if w.has_ansi_escapes() {
            write!(
                w,
                "{g}[{bo}{year:04}{odo}-{bo}{mo:02}{odo}-{bo}{day:02}{g}]{sg}-{g}[{sb}{h:02}{db}:{sb}{min:02}{db}:{sb}{s:02}{db}.{sb}{t}{g}]{r}",
                g   = "\x1b[38;5;250m",  // light gray    — brackets
                bo  = "\x1b[38;5;215m",  // light orange  — date digits
                odo = "\x1b[38;5;166m",  // dark orange   — dashes inside date
                sg  = "\x1b[38;5;120m",  // light green   — separator dash
                sb  = "\x1b[38;5;159m",  // light blue    — time digits
                db  = "\x1b[38;5;74m",   // dark blue     — colons + dot inside time
                r   = "\x1b[0m",
                year = now.year(),
                mo   = now.month() as u8,
                day  = now.day(),
                h    = now.hour(),
                min  = now.minute(),
                s    = now.second(),
                t    = now.millisecond() / 100,
            )
        } else {
            write!(
                w,
                "[{:04}-{:02}-{:02}]-[{:02}:{:02}:{:02}.{}]",
                now.year(), now.month() as u8, now.day(),
                now.hour(), now.minute(), now.second(),
                now.millisecond() / 100,
            )
        }
    }
}
