// How to check a text in Messages: the same animated tutorial as Settings,
// opened straight on the Messages part.
import React from 'react';
import { HowToScreen } from './SettingsSubScreens';
import type { Ctx } from '../App';

export default function DrawerInfoScreen({ ctx }: { ctx: Ctx }) {
  return <HowToScreen ctx={ctx} start="messages" />;
}
