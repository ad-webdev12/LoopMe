// One place that turns a time into text.
//
// Every screen used to build this by hand as getHours() + ':' + minutes, which
// is 24-hour always. On a phone set to 12-hour time the app then said
// "Checked at 23:05" while the status bar directly above it said 11:05. This
// follows whatever the phone is set to instead.
export function timeLabel(d: Date): string {
  try {
    return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' });
  } catch {
    return d.getHours() + ':' + String(d.getMinutes()).padStart(2, '0');
  }
}
