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
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={MessageCircle} chipColor={T.amber} title="How to check a text message" pad={9} chevron onPress={() => ctx.go('drawerInfo')} />
          <Row C={C} chip={Home} chipColor={T.green} title="Check a text in Loop Me" pad={9} chevron onPress={() => ctx.go('home')} />
          <Row C={C} chip={ShieldCheck} chipColor={T.green} title="Turn on scam protection" pad={9} chevron last onPress={() => ctx.go('setup')} />
        </Group>
        <Note C={C} top={14}>Red: scam. Amber: be careful. Green: looks okay.</Note>
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
        <ScreenTitle C={C}>More settings</ScreenTitle>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={Bell} chipColor={T.red} title="Show large scam warnings" pad={9} right={<IOSSwitch C={C} on={s.alerts !== false} onChange={v => { set({ alerts: v }); if (v) void ensureNotificationPermission(); }} />} />
          <Row C={C} chip={Search} chipColor={T.green} title="Automatically check suspicious texts" pad={9} last right={<IOSSwitch C={C} on={s.autoCheck !== false} onChange={v => set({ autoCheck: v })} />} />
        </Group>
        <Note C={C} top={10}>Both need protection turned on.</Note>

        <SectionHeader C={C}>Setting up</SectionHeader>
        <Group C={C}>
          <Row C={C} chip={Send} chipColor={T.amber} title="Setup checklist" pad={9} chevron last={!s.familyLinked} onPress={() => ctx.go('caregiver')} />
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
        <ScreenTitle C={C}>Privacy</ScreenTitle>
        <Lead C={C}>Texts are checked on this phone. Nothing is sent.</Lead>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={ShieldCheck} chipColor={T.amber} title="Help improve Loop Me" pad={9} last right={<IOSSwitch C={C} on={!!s.improve} onChange={v => ctx.update({ ...s, improve: v })} />} />
        </Group>
        <Note C={C} top={10}>Off by default. If on, a text you correct is sent with names and numbers removed.</Note>

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
        <ScreenTitle C={C}>Get help</ScreenTitle>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={Send} chipColor={T.green} title={who ? 'Ask ' + who : 'Ask your family'} pad={9} chevron onPress={() => ctx.go(person ? 'ask' : 'family')} />
          <Row C={C} chip={LifeBuoy} chipColor={T.red} title="I think I’ve been scammed" pad={9} chevron last={!SUPPORT_URL} onPress={() => ctx.go('scammed')} />
          {!!SUPPORT_URL && (
            <Row C={C} chip={Mail} chipColor={T.iosGrey} title="Email Loop Me" pad={9} chevron last onPress={() => Linking.openURL(SUPPORT_URL).catch(() => ctx.flash('Mail could not be opened.'))} />
          )}
        </Group>
      </ScrollView>
    </Screen>
  );
}
