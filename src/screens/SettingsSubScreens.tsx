// The screens one level below Settings: trusted and blocked numbers, how to
// use Loop Me, advanced settings, privacy and data, and contact support.
import React from 'react';
import { Linking, ScrollView, Text, View } from 'react-native';
import { Ban, Check, MessageCircle, ShieldCheck, Bell, Search, Unlink, Send, LifeBuoy, Mail, Home } from 'lucide-react-native';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Group, Row, IOSSwitch, Note, SectionHeader } from '../ui/base';
import { ensureNotificationPermission } from '../lib/notify';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

// TODO(support): no support email or help page exists in the app yet. Put the
// real address here (for example 'mailto:...') and the Email row appears on
// the Contact support screen. Until then that screen offers family and the
// scam recovery steps only.
export const SUPPORT_URL = '';

export function NumbersScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  return (
    <Screen C={C} playKey="numbers">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Trusted and blocked numbers</ScreenTitle>
        <Lead C={C}>Texts from trusted numbers are never flagged. Blocked numbers can’t call or text you.</Lead>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={Check} chipColor={T.green} title="Trusted numbers" pad={9} chevron onPress={() => ctx.go('safe')} right={<Text style={[font(17, '400'), { color: C.meta }]} allowFontScaling>{s.allowlist.length}</Text>} />
          <Row C={C} chip={Ban} chipColor={T.red} title="Blocked numbers" pad={9} chevron last onPress={() => ctx.go('blocked')} right={<Text style={[font(17, '400'), { color: C.meta }]} allowFontScaling>{s.blocked.length}</Text>} />
        </Group>
      </ScrollView>
    </Screen>
  );
}

export function HowToScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  return (
    <Screen C={C} playKey="howto">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>How to use Loop Me</ScreenTitle>
        <Lead C={C}>Loop Me checks texts from strangers for you. If a text worries you, you can also check it yourself.</Lead>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={MessageCircle} chipColor={T.amber} title="How to check a text message" sub="Right from inside Messages" pad={9} chevron onPress={() => ctx.go('drawerInfo')} />
          <Row C={C} chip={Home} chipColor={T.green} title="Check a text in Loop Me" sub="Copy it, then open Loop Me" pad={9} chevron onPress={() => ctx.go('home')} />
          <Row C={C} chip={ShieldCheck} chipColor={T.green} title="Turn on scam protection" sub="Two switches in iPhone Settings" pad={9} chevron last onPress={() => ctx.go('setup')} />
        </Group>
        <Note C={C} top={14}>Red means it’s a scam. Amber means be careful. Green means it looks safe. If you’re ever unsure, ask someone in your family before you reply.</Note>
      </ScrollView>
    </Screen>
  );
}

export function AdvancedScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const set = (patch: Partial<typeof s>) => ctx.update({ ...s, ...patch });
  const who = firstName(loopPerson(s)?.name);
  return (
    <Screen C={C} playKey="advanced">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Advanced settings</ScreenTitle>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={Bell} chipColor={T.red} title="Show large scam warnings" pad={9} right={<IOSSwitch C={C} on={s.alerts !== false} onChange={v => { set({ alerts: v }); if (v) void ensureNotificationPermission(); }} />} />
          <Row C={C} chip={Search} chipColor={T.green} title="Automatically check suspicious texts" pad={9} last right={<IOSSwitch C={C} on={s.autoCheck !== false} onChange={v => set({ autoCheck: v })} />} />
        </Group>
        <Note C={C} top={10}>Large warnings fill the screen when a scam arrives. Automatic checks look at texts from numbers you don’t know, and scam texts go straight to Junk. We suggest leaving both on.</Note>
        <Note C={C} top={10}>These only work once scam protection is turned on in iPhone Settings.</Note>

        <SectionHeader C={C}>Setting up</SectionHeader>
        <Group C={C}>
          <Row C={C} chip={Send} chipColor={T.amber} title="Setup checklist" sub="Trusted person, family link, protection, secret word" pad={9} chevron last={!s.familyLinked} onPress={() => ctx.go('caregiver')} />
          {s.familyLinked && (
            <Row C={C} chip={Unlink} chipColor={T.red} title={s.familyRole === 'owner' ? 'Stop ' + (who || 'them') + ' hearing from this phone' : 'Stop looking after this phone'} pad={9} danger last onPress={ctx.unlinkFamily} />
          )}
        </Group>
      </ScrollView>
    </Screen>
  );
}

export function PrivacyScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  return (
    <Screen C={C} playKey="privacy">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Privacy & data</ScreenTitle>
        <Lead C={C}>Every text is checked on this phone. You don’t need an account, and your messages are not sent anywhere to be checked.</Lead>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={ShieldCheck} chipColor={T.amber} title="Help improve Loop Me" pad={9} last right={<IOSSwitch C={C} on={!!s.improve} onChange={v => ctx.update({ ...s, improve: v })} />} />
        </Group>
        <Note C={C} top={10}>Off unless you turn it on. When it’s on, and you tell Loop Me it got a text wrong, Loop Me sends that one text with phone numbers and names blanked out, whether you said it was a scam or safe, and your country. Nothing else is sent. It is used to make the next version better at spotting scams.</Note>

        <SectionHeader C={C}>What stays on this phone</SectionHeader>
        <View style={{ paddingHorizontal: 20, gap: 8 }}>
          {[
            'Your texts and the answers Loop Me gives',
            'Your trusted and blocked numbers',
            'Your family’s secret word, behind Face ID',
          ].map(t => <Text key={t} style={[font(16, '400', 1.4), { color: C.ink }]} allowFontScaling>• {t}</Text>)}
        </View>
        <Note C={C} top={14}>If you link with family, news of a scam reaches them through your iCloud account.</Note>
      </ScrollView>
    </Screen>
  );
}

export function SupportScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const person = loopPerson(s);
  const who = firstName(person?.name);
  return (
    <Screen C={C} playKey="support">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 112 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <ScreenTitle C={C}>Contact support</ScreenTitle>
        <Lead C={C}>Need a hand? Here’s who can help.</Lead>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={Send} chipColor={T.green} title={who ? 'Ask ' + who : 'Ask your family'} sub="Send them a text to look at" pad={9} chevron onPress={() => ctx.go(person ? 'ask' : 'family')} />
          <Row C={C} chip={LifeBuoy} chipColor={T.red} title="I think I’ve been scammed" sub="What to do, step by step" pad={9} chevron last={!SUPPORT_URL} onPress={() => ctx.go('scammed')} />
          {!!SUPPORT_URL && (
            <Row C={C} chip={Mail} chipColor={T.iosGrey} title="Email Loop Me" sub="For problems with the app" pad={9} chevron last onPress={() => Linking.openURL(SUPPORT_URL).catch(() => ctx.flash('Mail could not be opened.'))} />
          )}
        </Group>
      </ScrollView>
    </Screen>
  );
}
