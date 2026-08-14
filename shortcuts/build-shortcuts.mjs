// Builds the two Apple Shortcuts that give Loop Me a "button inside Messages":
//
//  1. "Check with Loop Me"  — appears in the share sheet (and Siri). Receives
//     shared/selected text, URL-encodes it, opens the app's check deep link.
//  2. "Scam Alert"             — the automation helper. Fires a danger
//     notification, then opens the app's full-screen alert deep link. Wire it to
//     "When I get a message containing …" automations (see MESSAGES-BUTTON.md).
//
// Usage:  node shortcuts/build-shortcuts.mjs [deep-link-base]
// Default base targets Expo Go through the dev tunnel; for a native build pass
// "loopmein://".
import fs from 'node:fs';
import { execSync } from 'node:child_process';

const base = process.argv[2] || 'exp://jccots4-anonymous-8081.exp.direct/--/';
const OFC = '￼'; // object replacement char marks the variable position in text tokens

const uuid = () => execSync('uuidgen').toString().trim();

const encodeAction = (id) => `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.urlencode</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>UUID</key><string>${id}</string>
        <key>WFEncodeMode</key><string>Encode</string>
        <key>WFInput</key>
        <dict>
          <key>WFSerializationType</key><string>WFTextTokenAttachment</string>
          <key>Value</key><dict><key>Type</key><string>ExtensionInput</string></dict>
        </dict>
      </dict>
    </dict>`;

const openUrlAction = (prefix, encId) => `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.openurl</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFInput</key>
        <dict>
          <key>WFSerializationType</key><string>WFTextTokenString</string>
          <key>Value</key>
          <dict>
            <key>string</key><string>${prefix}${OFC}</string>
            <key>attachmentsByRange</key>
            <dict>
              <key>{${prefix.length}, 1}</key>
              <dict>
                <key>Type</key><string>ActionOutput</string>
                <key>OutputUUID</key><string>${encId}</string>
                <key>OutputName</key><string>URL Encoded Text</string>
              </dict>
            </dict>
          </dict>
        </dict>
      </dict>
    </dict>`;

const notifyAction = (title, body) => `
    <dict>
      <key>WFWorkflowActionIdentifier</key>
      <string>is.workflow.actions.notification</string>
      <key>WFWorkflowActionParameters</key>
      <dict>
        <key>WFNotificationActionTitle</key><string>${title}</string>
        <key>WFNotificationActionBody</key><string>${body}</string>
      </dict>
    </dict>`;

function workflow({ glyph, color, actions, shareSheet }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>WFWorkflowClientVersion</key><string>2607.1.3</string>
  <key>WFWorkflowMinimumClientVersion</key><integer>900</integer>
  <key>WFWorkflowMinimumClientVersionString</key><string>900</string>
  <key>WFWorkflowIcon</key>
  <dict>
    <key>WFWorkflowIconStartColor</key><integer>${color}</integer>
    <key>WFWorkflowIconGlyphNumber</key><integer>${glyph}</integer>
  </dict>
  <key>WFWorkflowImportQuestions</key><array/>
  <key>WFWorkflowTypes</key>
  <array>${shareSheet ? '\n    <string>ActionExtension</string>' : ''}</array>
  <key>WFWorkflowInputContentItemClasses</key>
  <array>
    <string>WFStringContentItem</string>
    <string>WFRichTextContentItem</string>
    <string>WFURLContentItem</string>
  </array>
  <key>WFWorkflowActions</key>
  <array>${actions}
  </array>
</dict>
</plist>
`;
}

function build(name, xml) {
  const tmp = `/tmp/${name}.xml.plist`;
  const out = `${process.cwd()}/shortcuts/${name}.shortcut`;
  fs.writeFileSync(tmp, xml, 'utf8');
  execSync(`plutil -lint ${JSON.stringify(tmp)}`, { stdio: 'inherit' });
  execSync(`plutil -convert binary1 ${JSON.stringify(tmp)} -o ${JSON.stringify(out)}`, { stdio: 'inherit' });
  try {
    execSync(`shortcuts sign --mode anyone -i ${JSON.stringify(out)} -o ${JSON.stringify(out + '.signed')}`, { stdio: 'pipe' });
    fs.renameSync(out + '.signed', out);
    console.log(`built + SIGNED: ${out}`);
  } catch {
    console.log(`built (unsigned): ${out}`);
  }
}

// 1) Share-sheet checker
{
  const enc = uuid();
  build('Check with Loop Me', workflow({
    glyph: 59855, color: 946986751, shareSheet: true,
    actions: encodeAction(enc) + openUrlAction(`${base}check?text=`, enc),
  }));
}

// 2) Automation helper: danger notification + full-screen alert
{
  const enc = uuid();
  build('Scam Alert', workflow({
    glyph: 59771, color: 4282601983, shareSheet: false,
    actions:
      notifyAction('Possible scam detected', 'Do not tap anything in that message. Loop Me is opening it safely.') +
      encodeAction(enc) +
      openUrlAction(`${base}alert?text=`, enc),
  }));
}
