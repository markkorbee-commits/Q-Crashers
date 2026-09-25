/**
 * PLACEHOLDER — created by the UI module so the interface compiles on its own.
 * The perception/postfx engineer owns this file: at merge, TAKE THEIR VERSION and drop this one.
 * Only the exported names/shapes below are relied upon by src/ui (and they are read defensively).
 *
 * Educational content only. Never add usage or dosing instructions.
 */

export interface AlcoholTier {
  /** blood alcohol concentration threshold in promille (g/kg) */
  bac: number;
  label: string;
  effects: string[];
}

export const ALCOHOL_TIERS: AlcoholTier[] = [
  { bac: 0, label: 'Sober', effects: ['Normal perception, balance and reaction time.'] },
  { bac: 0.2, label: 'Relaxed', effects: ['Slightly lighter mood', 'Concentration begins to drop', 'Legal driving limit for novice drivers in NL (0.2 ‰)'] },
  { bac: 0.5, label: 'Tipsy', effects: ['Slower reactions', 'Risks are underestimated', 'Legal driving limit in NL (0.5 ‰)'] },
  { bac: 0.8, label: 'Drunk', effects: ['Balance and coordination impaired', 'Blurred vision, narrowing field of view', 'Louder, less inhibited behaviour'] },
  { bac: 1.5, label: 'Very drunk', effects: ['Double vision', 'Slurred speech, staggering', 'Strongly delayed reactions'] },
  { bac: 2.5, label: 'Dangerous', effects: ['Nausea and vomiting', 'Confusion, memory gaps', 'Seek help from the first-aid post'] },
  { bac: 3.5, label: 'Alcohol poisoning risk', effects: ['Risk of losing consciousness', 'Breathing can become depressed', 'Emergency: call 112 / alert staff'] },
];

export const XTC_INFO = {
  title: 'XTC (MDMA) — perception simulation',
  disclaimer:
    'This is an educational simulation of how MDMA can alter perception at a festival. It does not encourage drug use and gives no usage advice. Real effects differ strongly per person and per pill, and the risks are real — especially in heat.',
  effects: [
    'Colours and lights feel more intense; stronger glare from bright sources',
    'Visual trails and afterimages when looking at moving lights',
    'Jaw clenching, restlessness, feeling warm',
    'Strong urge to keep moving, time seems to pass quickly',
  ],
  risks: [
    'Overheating (hyperthermia) — dancing in heat is the biggest danger',
    'Dehydration, but also drinking far too much water (hyponatraemia)',
    'High heart rate and blood pressure',
    'Unknown content and strength of pills; mixing with alcohol increases risks',
  ],
  help: [
    'Feeling unwell? Go to the first-aid post or alert any staff member — they help, not judge',
    'Take breaks in the shade / chill-out areas and cool down',
    'Look after your friends; never leave someone alone who feels bad',
    'Emergency: call 112',
  ],
  sources: [
    { label: 'Trimbos Institute — Drugs information', url: 'https://www.drugsinfo.nl' },
    { label: 'Jellinek — prevention and care', url: 'https://www.jellinek.nl' },
    { label: 'Unity — peer education at Dutch festivals', url: 'https://unity.nl' },
  ],
};

export const COMPARE_INFO = {
  title: 'Compare: sober vs. altered',
  text: 'Left of the divider you see the grounds as a sober visitor; right of it the simulated altered perception from exactly the same position. Drag the divider to compare.',
};

export const TIME_COMPRESSION_NOTE =
  'Time is compressed: in this simulation effects build up and wear off within minutes. In reality the body breaks down only about 0.1–0.2 ‰ per hour — roughly one drink per hour or slower — and nothing (coffee, water, a cold shower) speeds that up.';
