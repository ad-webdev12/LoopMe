// Where to report a scam depends on the country the phone is set to. Loop Me
// only names an office it is sure of; everywhere else it says so plainly
// instead of sending someone to the wrong country's form.
import { NativeModules, Platform } from 'react-native';

export type ReportRoute = {
  code: string;            // ISO country code the phone reports
  smsCode?: string;        // free short code that takes a forwarded scam text
  smsLabel?: string;
  site?: string;           // the official reporting page
  siteLabel?: string;      // what the button says
  siteName?: string;       // how the page is referred to in a sentence
};

const ROUTES: Record<string, Omit<ReportRoute, 'code'>> = {
  US: { smsCode: '7726', smsLabel: 'Forward it to 7726 (your carrier)', site: 'https://reportfraud.ftc.gov', siteLabel: 'Report it to the FTC', siteName: 'ReportFraud.ftc.gov' },
  CA: { smsCode: '7726', smsLabel: 'Forward it to 7726 (your carrier)', site: 'https://antifraudcentre-centreantifraude.ca/report-signalez-eng.htm', siteLabel: 'Report it to the Anti-Fraud Centre', siteName: 'the Canadian Anti-Fraud Centre' },
  GB: { smsCode: '7726', smsLabel: 'Forward it to 7726 (your network)', site: 'https://www.actionfraud.police.uk/reporting-fraud-and-cyber-crime', siteLabel: 'Report it to Action Fraud', siteName: 'Action Fraud' },
  IE: { site: 'https://www.garda.ie/en/crime/fraud/', siteLabel: 'Report it to the Gardaí', siteName: 'the Garda fraud page' },
  AU: { site: 'https://www.scamwatch.gov.au/report-a-scam', siteLabel: 'Report it to Scamwatch', siteName: 'Scamwatch' },
  NZ: { smsCode: '7726', smsLabel: 'Forward it to 7726 (free)', site: 'https://www.cert.govt.nz/report/', siteLabel: 'Report it to CERT NZ', siteName: 'CERT NZ' },
  IN: { site: 'https://sancharsaathi.gov.in/sfc/', siteLabel: 'Report it on Sanchar Saathi', siteName: 'Sanchar Saathi (Chakshu)' },
  SG: { site: 'https://www.scamshield.gov.sg/report', siteLabel: 'Report it to ScamShield', siteName: 'ScamShield' },
};

export function phoneRegion(): string {
  try {
    const s = Platform.OS === 'ios' ? NativeModules.SettingsManager?.settings : undefined;
    const loc: string = s?.AppleLocale || (Array.isArray(s?.AppleLanguages) ? s.AppleLanguages[0] : '') || Intl.DateTimeFormat().resolvedOptions().locale || '';
    const m = loc.replace('_', '-').match(/-([A-Za-z]{2})(?:-|$)/);
    if (m) return m[1].toUpperCase();
  } catch {}
  return '';
}

export function reportRoute(): ReportRoute {
  const code = phoneRegion();
  return { code, ...(ROUTES[code] || {}) };
}
