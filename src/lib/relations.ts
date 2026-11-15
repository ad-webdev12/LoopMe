// Who a trusted person is to the phone's owner. Chosen by hand when they are
// added; never guessed from a name.
export const RELATIONS = ['Daughter', 'Son', 'Mother', 'Father', 'Partner', 'Sister', 'Brother', 'Friend', 'Caregiver', 'Other'];

const SHE = new Set(['Daughter', 'Mother', 'Sister']);
const HE = new Set(['Son', 'Father', 'Brother']);

/** her / him / them */
export function objectOf(relation?: string | null): string {
  return relation && SHE.has(relation) ? 'her' : relation && HE.has(relation) ? 'him' : 'them';
}
/** her / his / their */
export function possessiveOf(relation?: string | null): string {
  return relation && SHE.has(relation) ? 'her' : relation && HE.has(relation) ? 'his' : 'their';
}
/** She’ll / He’ll / They’ll */
export function willOf(relation?: string | null): string {
  return relation && SHE.has(relation) ? 'She’ll' : relation && HE.has(relation) ? 'He’ll' : 'They’ll';
}
