// The history as a real PDF for the bank or the police.
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import type { CheckRecord } from './history';

const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function exportHistoryPdf(hist: CheckRecord[], who: string): Promise<'shared' | 'saved' | 'failed'> {
  const checked = hist.length;
  const stopped = hist.filter(h => h.level === 'red').length;
  const ref = 'LM-' + Date.now().toString(36).toUpperCase();
  const rows = hist.map(h => {
    const mark = h.level === 'red' ? '<span class="mark red">Scam</span>' : h.level === 'amber' ? '<span class="mark amber">Be careful</span>' : '<span class="mark green">Fine</span>';
    return `<tr><td class="dim">${esc(new Date(h.at).toLocaleString())}</td><td>${esc(h.sender || (h.source === 'filter' ? 'Unknown number' : 'Pasted into Loop Me'))}</td><td>${mark}</td><td>${esc(h.excerpt)}<div class="why">${esc(h.reason || '')}</div></td></tr>`;
  }).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8">
    <style>
      body { font-family: -apple-system, Helvetica, Arial, sans-serif; color: #000; margin: 36px; font-size: 12px; }
      h1 { font-size: 22px; margin: 0 0 4px; } .sub { color: #6c6c70; margin: 0 0 18px; }
      table { width: 100%; border-collapse: collapse; } th { text-align: left; font-size: 11px; color: #6c6c70; border-bottom: 1px solid #c6c6c8; padding: 6px; }
      td { vertical-align: top; padding: 9px 6px; border-bottom: 1px solid #e5e5ea; }
      .dim { color: #6c6c70; font-size: 11px; } .why { color: #3c3c43; margin-top: 4px; font-size: 11px; }
      .mark { font-weight: 700; padding: 2px 6px; border-radius: 4px; font-size: 11px; }
      .red { background: #fdeeea; color: #8c1f0c; } .amber { background: #fbf0dd; color: #7a4e0d; } .green { background: #d7e8e0; color: #0d4a3b; }
      .foot { margin-top: 20px; color: #6c6c70; font-size: 11px; }
    </style></head><body>
    <h1>Loop Me history${who ? ' for ' + esc(who) : ''}</h1>
    <p class="sub">Reference ${ref} · made ${esc(new Date().toLocaleString())} · ${checked} checks, ${stopped} scams</p>
    <table><tr><th>When</th><th>From</th><th>Result</th><th>Message and why</th></tr>${rows || '<tr><td colspan="4">No checks yet.</td></tr>'}</table>
    <p class="foot">Checked on this phone. Numbers and emails are blanked before saving.</p></body></html>`;
  try {
    const { uri } = await Print.printToFileAsync({ html });
    if (await Sharing.isAvailableAsync()) { await Sharing.shareAsync(uri, { UTI: 'com.adobe.pdf', mimeType: 'application/pdf', dialogTitle: 'Loop Me history' }); return 'shared'; }
    return 'saved';
  } catch { return 'failed'; }
}
