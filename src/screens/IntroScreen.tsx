// Animated intro — three beats, auto-advancing every 4200ms, every child at
// explicit absolute offsets inside the frame (per the handoff: normal flow will
// not reproduce it). SF depicts the iMessage bubbles; Archivo is the app voice.
import React, { useEffect, useRef, useState } from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import Svg, { Path } from 'react-native-svg';
import { ArrowRight } from 'lucide-react-native';
import { T, F } from '../theme';
import { KFFade, KFRise, KFBub, KFPop, KFScan, KFWipe, KFLink, bez } from '../ui/kf';
import type { Ctx } from '../App';

const SF = undefined; // system font = SF on iOS

export default function IntroScreen({ ctx }: { ctx: Ctx }) {
  const [beat, setBeat] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | undefined>(undefined);
  const H = Dimensions.get('window').height;

  useEffect(() => {
    timer.current = setInterval(() => setBeat(b => (b + 1) % 3), 4200);
    return () => clearInterval(timer.current);
  }, []);
  const pick = (i: number) => { clearInterval(timer.current); setBeat(i); };
  const start = () => { clearInterval(timer.current); ctx.go('ob1'); };
  const skip = () => {
    clearInterval(timer.current);
    ctx.update({ ...ctx.settings, introSeen: true, role: ctx.settings.role || 'elder' });
    ctx.go('home');
  };

  return (
    <View style={[st.root, { backgroundColor: ['#ec3013', '#ffffff', '#ffffff'][beat] }]}>
      {/* ---------------- Beat 0 — Is this message safe? ---------------- */}
      {beat === 0 && (
        <View style={StyleSheet.absoluteFill}>
          <KFFade duration={600} delay={550} playKey={beat} style={st.b0card}>
            <View style={{ padding: 13, paddingHorizontal: 14 }}>
              <Text style={st.smsSender} allowFontScaling>+1 (628) 555-0117</Text>
              <View style={st.smsBubbleTail}>
                <Text style={st.smsText} allowFontScaling>Grandma, I need help. Please don’t tell anyone.</Text>
              </View>
            </View>
            <KFScan playKey={beat} delay={900} style={st.scanBand} />
          </KFFade>
          <KFFade duration={600} delay={1100} playKey={beat} style={st.b0caption}>
            <View style={st.b0square} />
            <Text style={st.b0captionText} allowFontScaling>READING IT ON THIS PHONE</Text>
          </KFFade>
          <View style={st.b0shieldWrap}>
            <KFPop duration={700} playKey={beat} easing={bez(0.2, 1.3, 0.4, 1)}>
              <Svg width={66} height={66} viewBox="0 0 24 24" fill="none">
                <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
                <KFFade duration={500} delay={1100} playKey={beat}>
                  <Path d="M9 12l2.2 2.2L15.5 10" stroke="#fff" strokeWidth={1.5} strokeLinecap="round" />
                </KFFade>
              </Svg>
            </KFPop>
            <View style={{ marginTop: 180 }}>
              <View style={st.mask}><KFRise duration={700} delay={250} playKey={beat} easing={bez(0.2, 0.9, 0.2, 1)}>
                <Text style={st.b0display} allowFontScaling>Is this</Text>
              </KFRise></View>
              <View style={st.mask}><KFRise duration={700} delay={420} playKey={beat} easing={bez(0.2, 0.9, 0.2, 1)}>
                <Text style={[st.b0display, { lineHeight: 38.8 }]} allowFontScaling>message safe?</Text>
              </KFRise></View>
              <KFRise duration={700} delay={620} playKey={beat}>
                <Text style={st.b0sub} allowFontScaling>Ask us before you tap anything.</Text>
              </KFRise>
            </View>
          </View>
        </View>
      )}

      {/* ---------------- Beat 1 — One plain answer ---------------- */}
      {beat === 1 && (
        <View style={StyleSheet.absoluteFill}>
          <KFWipe duration={800} height={H - 378} playKey={beat} easing={bez(0.2, 0.9, 0.2, 1)}
            style={[st.wipeField, { top: 378 }]} />
          <View style={{ paddingTop: 40, paddingHorizontal: 26 }}>
            <KFFade duration={500} playKey={beat} style={{ alignItems: 'center' }}>
              <Text style={st.smsMetaBold} allowFontScaling>Text Message · SMS</Text>
              <Text style={st.smsMeta} allowFontScaling>Today 9:41</Text>
            </KFFade>
            <View style={{ marginTop: 18, alignItems: 'flex-start', gap: 3 }}>
              <Text style={[st.smsSender, { marginLeft: 8, marginBottom: 2 }]} allowFontScaling>+1 (415) 555-0198</Text>
              <KFBub duration={500} delay={150} playKey={beat} easing={bez(0.2, 1.2, 0.3, 1)} style={[st.smsBubble, { maxWidth: 250 }]}>
                <Text style={st.smsText} allowFontScaling>
                  USPS: your parcel is on hold. A $1.95 fee is due. Confirm here:{' '}
                  <Text style={st.smsLink}>usps-redeliver-fee.co/8Kd21</Text>
                </Text>
              </KFBub>
              <KFBub duration={500} delay={380} playKey={beat} easing={bez(0.2, 1.2, 0.3, 1)} style={[st.smsBubbleTail, { maxWidth: 236 }]}>
                <Text style={st.smsText} allowFontScaling>Send me the 6 digit code you just received.</Text>
              </KFBub>
              <KFBub duration={450} delay={800} playKey={beat} easing={bez(0.2, 1.1, 0.3, 1)} style={st.flagStrip}>
                <Svg width={17} height={17} viewBox="0 0 24 24" fill="none">
                  <Path d="M12 3l9 16H3z" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" />
                  <Path d="M12 9v4M12 16h.01" stroke="#fff" strokeWidth={2.3} strokeLinecap="round" />
                </Svg>
                <Text style={st.flagText} allowFontScaling>Flagged as a scam</Text>
              </KFBub>
            </View>
          </View>
          <View style={[st.abs, { top: 392, left: 26, right: 26 }]}>
            <View style={st.mask}><KFRise duration={650} delay={550} playKey={beat}>
              <Text style={st.wipeHeadline} allowFontScaling>One plain answer.{'\n'}One thing to do.</Text>
            </KFRise></View>
            <KFRise duration={650} delay={720} playKey={beat}>
              <Text style={st.wipeSub} allowFontScaling>We tell you what it is, and the one thing to do next.</Text>
            </KFRise>
          </View>
        </View>
      )}

      {/* ---------------- Beat 2 — One tap and someone knows ---------------- */}
      {beat === 2 && (
        <View style={StyleSheet.absoluteFill}>
          <KFWipe duration={800} height={H - 434} playKey={beat} easing={bez(0.2, 0.9, 0.2, 1)}
            style={[st.wipeField, { top: 434 }]} />
          <View style={{ paddingTop: 26, paddingHorizontal: 22 }}>
            <View style={st.pairRow}>
              <KFPop duration={550} delay={100} playKey={beat} easing={bez(0.2, 1.25, 0.3, 1)} style={st.personCol}>
                <View style={st.phoneCard}>
                  <View style={[st.pAvatar, { backgroundColor: T.greenTint }]}><Text style={[st.pAvatarText, { color: T.green }]}>R</Text></View>
                  <View style={[st.pLine, { width: '100%' }]} />
                  <View style={[st.pLine, { width: '74%', alignSelf: 'flex-start' }]} />
                  <View style={[st.pLine, { width: '58%', alignSelf: 'flex-end', backgroundColor: T.green, marginTop: 'auto' }]} />
                </View>
                <Text style={st.pName} allowFontScaling>Ruth, 78</Text>
                <Text style={st.pMeta} allowFontScaling>Uses Loop Me</Text>
              </KFPop>
              <View style={st.linkRow}>
                <KFLink duration={500} delay={500} width={22} playKey={beat} style={st.linkBar} />
                <KFPop duration={500} delay={750} playKey={beat} easing={bez(0.2, 1.3, 0.3, 1)} style={st.linkShield}>
                  <Svg width={14} height={14} viewBox="0 0 24 24" fill="none">
                    <Path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" stroke="#fff" strokeWidth={2.2} strokeLinecap="round" />
                  </Svg>
                </KFPop>
                <KFLink duration={500} delay={500} width={22} playKey={beat} style={st.linkBar} />
              </View>
              <KFPop duration={550} delay={950} playKey={beat} easing={bez(0.2, 1.25, 0.3, 1)} style={st.personCol}>
                <View style={st.phoneCard}>
                  <View style={[st.pAvatar, { backgroundColor: T.green }]}><Text style={[st.pAvatarText, { color: '#fff' }]}>M</Text></View>
                  <View style={[st.pLine, { width: '100%', backgroundColor: T.greenSoft2 }]} />
                  <View style={[st.pLine, { width: '66%', alignSelf: 'flex-start', backgroundColor: T.greenSoft2 }]} />
                  <View style={[st.pLine, { width: '52%', alignSelf: 'flex-end', marginTop: 'auto' }]} />
                </View>
                <Text style={st.pName} allowFontScaling>Maria, 46</Text>
                <Text style={st.pMeta} allowFontScaling>Her daughter</Text>
              </KFPop>
            </View>
            <View style={{ marginTop: 20, gap: 3 }}>
              <KFBub duration={500} delay={300} playKey={beat} easing={bez(0.2, 1.2, 0.3, 1)} style={st.outBubble}>
                <Text style={st.outText} allowFontScaling>Loop Me stopped a text about a parcel fee. I did not tap anything.</Text>
              </KFBub>
              <KFFade duration={400} delay={900} playKey={beat} style={{ alignSelf: 'flex-end' }}>
                <Text style={st.delivered} allowFontScaling>Delivered 9:42</Text>
              </KFFade>
              <KFBub duration={500} delay={1050} playKey={beat} easing={bez(0.2, 1.2, 0.3, 1)} style={[st.smsBubbleTail, { maxWidth: 246, marginTop: 9 }]}>
                <Text style={st.smsText} allowFontScaling>Good, that one is fake. I will call you in five minutes.</Text>
              </KFBub>
            </View>
          </View>
          <View style={[st.abs, { top: 456, left: 22, right: 22 }]}>
            <View style={st.mask}><KFRise duration={650} delay={1200} playKey={beat}>
              <Text style={st.wipeHeadline} allowFontScaling>One tap and{'\n'}someone knows.</Text>
            </KFRise></View>
            <KFRise duration={650} delay={1350} playKey={beat}>
              <Text style={st.wipeSub} allowFontScaling>They get an ordinary text message. Nothing to install, nothing to set up.</Text>
            </KFRise>
          </View>
        </View>
      )}

      {/* dots + CTA */}
      <View style={st.ctaWrap}>
        <View style={st.dots}>
          {[0, 1, 2].map(i => (
            <Pressable key={i} style={[st.dot, { backgroundColor: i === beat ? (beat === 0 ? '#fff' : T.green) : beat === 0 ? 'rgba(255,255,255,.42)' : 'rgba(13,107,87,.3)' }]} onPress={() => pick(i)} accessibilityRole="button" accessibilityLabel={'Beat ' + (i + 1)} />
          ))}
        </View>
        <Pressable style={[st.cta, { backgroundColor: beat === 0 ? '#fff' : T.green }]} onPress={start} accessibilityRole="button">
          <Text style={[st.ctaText, { color: beat === 0 ? '#ec3013' : '#fff' }]} allowFontScaling>Get started</Text>
          <ArrowRight size={20} color={beat === 0 ? '#ec3013' : '#fff'} strokeWidth={2.2} />
        </Pressable>
        <Pressable style={st.skip} onPress={skip} accessibilityRole="button">
          <Text style={[st.skipText, { color: beat === 0 ? 'rgba(255,255,255,.9)' : T.ink }]} allowFontScaling>I’ve used this before</Text>
        </Pressable>
      </View>
    </View>
  );
}

const st = StyleSheet.create({
  root: { flex: 1 },
  abs: { position: 'absolute' },
  mask: { overflow: 'hidden' },

  b0card: { position: 'absolute', left: 26, right: 26, top: 148, height: 108, backgroundColor: '#fff', overflow: 'hidden' },
  smsSender: { fontFamily: SF, fontSize: 11, color: T.iosSecondary, marginBottom: 5, marginLeft: 6 },
  smsBubble: { backgroundColor: T.imsgBubble, borderRadius: 19, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 9 },
  smsBubbleTail: { backgroundColor: T.imsgBubble, borderRadius: 19, borderBottomLeftRadius: 6, paddingHorizontal: 13, paddingTop: 8, paddingBottom: 9, maxWidth: 236, alignSelf: 'flex-start' },
  smsText: { fontFamily: SF, fontSize: 15.5, lineHeight: 20.15, color: '#000' },
  smsLink: { color: T.imsgLink, textDecorationLine: 'underline' },
  smsMetaBold: { fontFamily: SF, fontSize: 11, fontWeight: '600', color: T.iosSecondary },
  smsMeta: { fontFamily: SF, fontSize: 11, color: T.iosSecondary, marginTop: 1 },
  scanBand: { position: 'absolute', left: 0, right: 0, top: 0, height: 44, backgroundColor: 'rgba(236,48,19,.10)', borderBottomWidth: 3, borderBottomColor: '#ec3013' },

  b0caption: { position: 'absolute', left: 26, top: 266, flexDirection: 'row', alignItems: 'center', gap: 8 },
  b0square: { width: 7, height: 7, backgroundColor: '#fff' },
  b0captionText: { fontSize: 11, fontFamily: F.bold, letterSpacing: 1.76, color: 'rgba(255,255,255,.85)' },
  b0shieldWrap: { paddingTop: 52, paddingHorizontal: 26 },
  b0display: { fontSize: 38, fontFamily: F.display, letterSpacing: -1.14, color: '#fff', lineHeight: 38 },
  b0sub: { fontSize: 17, fontFamily: F.semibold, color: 'rgba(255,255,255,.9)', lineHeight: 24.6, marginTop: 16 },

  wipeField: { position: 'absolute', left: 0, right: 0, bottom: 0, backgroundColor: T.green },
  wipeHeadline: { fontSize: 30, fontFamily: F.display, letterSpacing: -0.78, color: '#fff', lineHeight: 31.8 },
  wipeSub: { fontSize: 15.5, fontFamily: F.semibold, color: 'rgba(255,255,255,.88)', lineHeight: 23.25, marginTop: 14 },
  flagStrip: { alignSelf: 'stretch', marginTop: 14, backgroundColor: '#ec3013', paddingHorizontal: 14, paddingVertical: 11, flexDirection: 'row', alignItems: 'center', gap: 9 },
  flagText: { fontSize: 14, fontFamily: F.bold, color: '#fff' },

  pairRow: { flexDirection: 'row', alignItems: 'flex-start', justifyContent: 'center' },
  personCol: { alignItems: 'center', gap: 9 },
  phoneCard: {
    width: 86, height: 120, borderWidth: 1.5, borderColor: T.fieldBorder, borderRadius: 15, backgroundColor: '#fff',
    paddingVertical: 9, paddingHorizontal: 8, alignItems: 'center', gap: 7,
    shadowColor: '#171717', shadowOpacity: 0.07, shadowRadius: 3, shadowOffset: { width: 0, height: 1 },
  },
  pAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: 'center', justifyContent: 'center' },
  pAvatarText: { fontFamily: SF, fontSize: 11, fontWeight: '600' },
  pLine: { height: 8, borderRadius: 4, backgroundColor: T.imsgBubble },
  pName: { fontSize: 12, fontFamily: F.semibold, color: T.ink, textAlign: 'center' },
  pMeta: { fontSize: 11, fontFamily: F.body, color: T.sub, marginTop: -6, textAlign: 'center' },
  linkRow: { flexDirection: 'row', alignItems: 'center', marginTop: 48 },
  linkBar: { width: 22, height: 2, backgroundColor: T.green },
  linkShield: { width: 26, height: 26, borderRadius: 13, backgroundColor: T.green, alignItems: 'center', justifyContent: 'center' },

  outBubble: { alignSelf: 'flex-end', maxWidth: 252, backgroundColor: T.green, borderRadius: 19, borderBottomRightRadius: 6, paddingHorizontal: 14, paddingTop: 9, paddingBottom: 10 },
  outText: { fontFamily: SF, fontSize: 15.5, lineHeight: 20.5, color: '#fff' },
  delivered: { fontFamily: SF, fontSize: 10.5, color: T.iosSecondary, marginTop: 2, marginRight: 4 },

  ctaWrap: { position: 'absolute', left: 0, right: 0, bottom: 0, paddingHorizontal: 26, paddingBottom: 30, zIndex: 3 },
  dots: { flexDirection: 'row', gap: 6, marginBottom: 16 },
  dot: { height: 4, flex: 1 },
  cta: { height: 56, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 18 },
  ctaText: { fontSize: 16.5, fontFamily: F.bold },
  skip: { height: 44, alignItems: 'center', justifyContent: 'center' },
  skipText: { fontSize: 13.5, fontFamily: F.semibold },
});
