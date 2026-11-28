// The screens one level below Settings: trusted and blocked numbers, how to
// use Loop Me, advanced settings, privacy and data, and contact support.
import React from 'react';
import { ScrollView, Text, View } from 'react-native';
import { Ban, Check, ShieldCheck, Search, Unlink, Send, Lock, Smartphone, UserX } from 'lucide-react-native';
import { FilterScene, PrivacyScene } from '../ui/Scenes';
import { useProtection } from '../lib/protection';
import { T, font } from '../theme';
import { Screen, BackLink, ScreenTitle, Lead, Group, Row, IOSSwitch, Note, SectionHeader, Segmented } from '../ui/base';
import { Tutorial, DRAWER_STEPS, APP_STEPS } from '../ui/Tutorial';
import { loopPerson, firstName } from '../ui/pieces';
import type { Ctx } from '../App';

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

export function HowToScreen({ ctx, start, fromSettings = true }: { ctx: Ctx; start?: 'messages' | 'app'; fromSettings?: boolean }) {
  const { C } = ctx;
  const [tab, setTab] = React.useState<'messages' | 'app'>(start || 'messages');
  return (
    <Screen C={C} playKey="howto">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <BackLink label={fromSettings ? 'Settings' : 'Back'} onPress={() => fromSettings ? ctx.go('settings') : ctx.back()} />
        <ScreenTitle C={C}>How to use Loop Me</ScreenTitle>
        <View style={{ marginTop: 16, marginBottom: 22 }}>
          <Segmented C={C} options={['In Messages', 'In Loop Me']} value={tab === 'messages' ? 'In Messages' : 'In Loop Me'} onChange={v => setTab(v === 'In Messages' ? 'messages' : 'app')} />
        </View>
        <Tutorial key={tab} C={C} steps={tab === 'messages' ? DRAWER_STEPS : APP_STEPS} />
      </ScrollView>
    </Screen>
  );
}

export function AdvancedScreen({ ctx }: { ctx: Ctx }) {
  const { C, settings: s } = ctx;
  const set = (patch: Partial<typeof s>) => ctx.update({ ...s, ...patch });
  const who = firstName(loopPerson(s)?.name);
  const p = useProtection(ctx.tallies);
  return (
    <Screen C={C} playKey="advanced">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <FilterScene C={C} />
        <ScreenTitle C={C} top={4}>Scam text filter</ScreenTitle>
        <Lead C={C} top={6}>Texts from unknown numbers are checked. Scams go quietly to Junk in Messages, without a ping. iPhone doesn’t let filters send alerts.</Lead>
        <Group C={C} style={{ marginTop: 18 }}>
          <Row C={C} chip={Search} chipColor={T.green} title="Check unknown senders" pad={9} last right={<IOSSwitch C={C} on={s.autoCheck !== false} onChange={v => set({ autoCheck: v })} />} />
        </Group>
        {p.known && !p.done && s.autoCheck !== false && (
          <Group C={C} style={{ marginTop: 12 }}>
            <Row C={C} chip={ShieldCheck} chipColor={T.red} title="Allow it in iPhone Settings" pad={9} chevron last onPress={() => ctx.go('setup')} />
          </Group>
        )}

        <Group C={C} style={{ marginTop: 28 }}>
          <Row C={C} chip={Send} chipColor={T.amber} title="Setup checklist" pad={9} chevron last={!s.familyLinked && !s.watching?.name} onPress={() => ctx.go('caregiver')} />
          {s.familyLinked && (
            <Row C={C} chip={Unlink} chipColor={T.red} title={'Stop ' + (s.linkedNames.length > 1 ? 'everyone' : who || 'them') + ' hearing from this phone'} pad={9} danger last={!s.watching?.name} onPress={() => ctx.unlinkFamily('share')} />
          )}
          {!!s.watching?.name && (
            <Row C={C} chip={Unlink} chipColor={T.red} title={'Stop looking after ' + s.watching.name.split(' ')[0]} pad={9} danger last onPress={() => ctx.unlinkFamily('watch')} />
          )}
        </Group>
      </ScrollView>
    </Screen>
  );
}

export function PrivacyScreen({ ctx }: { ctx: Ctx }) {
  const { C } = ctx;
  const facts: [typeof Lock, string][] = [[Smartphone, 'Checked on this phone'], [UserX, 'No account, no sign-in'], [Send, 'Shared only when you ask'], [Lock, 'Nothing sent to us, ever']];
  return (
    <Screen C={C} playKey="privacy">
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 130 }}>
        <BackLink label="Settings" onPress={() => ctx.go('settings')} />
        <PrivacyScene C={C} />
        <ScreenTitle C={C} top={4}>Your texts stay yours</ScreenTitle>
        <View style={{ marginTop: 16, marginHorizontal: 16, gap: 10 }}>
          {facts.map(([I, t]) => (
            <View key={t} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: C.card, borderRadius: 14, padding: 14 }}>
              <View style={{ width: 32, height: 32, borderRadius: 9, backgroundColor: C.greenTint, alignItems: 'center', justifyContent: 'center' }}><I size={18} color={T.green} strokeWidth={2.2} /></View>
              <Text style={[font(17, '600'), { color: C.ink }]} allowFontScaling>{t}</Text>
            </View>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}
