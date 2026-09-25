/**
 * Educational texts for the perception simulation (rendered by the UI).
 * Factual, concise, no glamour, and never any usage, dosing or buying information.
 * Sources: Trimbos-instituut (trimbos.nl, drugsinfo.nl, alcoholinfo), Jellinek (jellinek.nl),
 * NIDA (nida.nih.gov, MDMA Research Report), Rijksoverheid (Dutch alcohol limits for drivers).
 */

export interface AlcoholTier {
  /** blood alcohol concentration in promille (g/kg) where this tier starts */
  bac: number;
  label: string;
  effects: string[];
}

export const ALCOHOL_TIERS: AlcoholTier[] = [
  {
    bac: 0.2,
    label: '0.2‰ — first effects',
    effects: [
      'Relaxed, slightly warm feeling',
      'Attention and judgement already slightly reduced',
      'Dutch limit for novice drivers (first 5 years)',
    ],
  },
  {
    bac: 0.5,
    label: '0.5‰ — Dutch legal driving limit',
    effects: [
      'Slower reactions, weaker concentration',
      'Harder to follow moving objects and judge distances',
      'Clearly higher crash risk',
    ],
  },
  {
    bac: 0.8,
    label: '0.8‰ — clearly impaired',
    effects: [
      'Poorer coordination and balance',
      'Blurred vision, less awareness of the periphery',
      'Overconfidence, louder, more risk-taking',
    ],
  },
  {
    bac: 1.2,
    label: '1.2‰ — drunk',
    effects: [
      'Unsteady walking, slurred speech',
      'Double vision may occur, sounds seem muffled',
      'Strongly slowed reactions; nausea possible',
    ],
  },
  {
    bac: 1.6,
    label: '1.6‰ — very drunk',
    effects: [
      'Major loss of balance and motor control',
      'Blurred and double vision, tunnel vision',
      'Vomiting and memory gaps possible',
    ],
  },
  {
    bac: 2.0,
    label: '2.0‰ and higher — danger',
    effects: [
      'Confusion and disorientation; needs help to stand or walk',
      'Blackouts (no memory of events)',
      'Risk of alcohol poisoning: from about 3‰ unconsciousness and breathing problems — call 112',
    ],
  },
];

export const XTC_INFO = {
  title: 'XTC (MDMA) — perception simulation',
  disclaimer:
    'An educational approximation of commonly reported effects on perception and the body. It is not realistic, ' +
    'not an endorsement and contains no usage information. XTC is illegal in the Netherlands. Effects and risks differ ' +
    'strongly between people and pills; not using is the only way to avoid the risks.',
  effects: [
    'Colours and lights feel more intense; dilated pupils make you sensitive to glare',
    'Trails and afterimages behind moving lights',
    'Blurred vision and involuntary eye movements (nystagmus)',
    'Jaw clenching, raised heart rate and blood pressure',
    'Energetic or emotionally open feelings — but also restlessness, anxiety or confusion',
  ],
  risks: [
    'Overheating (hyperthermia): MDMA disturbs temperature regulation — dancing for hours in heat like June 2026 multiplies the risk',
    'Dehydration from heavy sweating',
    'Drinking too much water is dangerous too: MDMA makes the body retain water, which can cause hyponatraemia (low blood sodium)',
    'Strain on the heart and blood vessels',
    'Pills vary in strength and content; high-dose pills cause more incidents',
    'Mixing with alcohol or other drugs increases the risks',
    'Comedown: fatigue, low mood and poor concentration for days afterwards',
  ],
  help: [
    'Feeling unwell, too hot or confused? Go to the first aid post or tell any staff member — they help without judgement.',
    'Overheating signs: headache, confusion, hot dry skin, fainting. This is an emergency: call 112.',
    'Look after friends: never leave someone alone who is unwell; cool them down and get help.',
    'Rest and cool down regularly, and sip water — about a glass per hour, no more than roughly 0.5 litre per hour while dancing.',
    'Questions? Drugs Infolijn (Trimbos): 0900-1995 · drugsinfo.nl · jellinek.nl',
  ],
  sources: [
    'Trimbos-instituut — drugsinfo.nl (XTC)',
    'Jellinek — jellinek.nl (XTC, alcohol)',
    'NIDA — MDMA (Ecstasy/Molly) Research Report, nida.nih.gov',
    'Trimbos-instituut — alcoholinfo (effects per promille)',
    'Rijksoverheid — alcohol limits for drivers',
  ],
};

export const COMPARE_INFO = {
  title: 'Sober vs. altered',
  text:
    'Left of the line you see the scene as a sober visitor; right of it, the simulated altered perception from exactly ' +
    'the same spot. Drag the line to compare. With nothing active, the right side previews about 1.0‰ alcohol.',
};

export const TIME_COMPRESSION_NOTE =
  'Time is compressed. Alcohol: 1 real minute = 10 simulated minutes — the body breaks down only about 0.15‰ per hour, ' +
  'so 1‰ still takes 6–7 simulated hours (about 40 real minutes) to disappear; only time sobers you up. ' +
  'The XTC simulation compresses several hours into about 5 minutes.';

/** Short risk messages shown live by the risk model (constant strings: no per-frame allocation). */
export const RISK_MESSAGES = {
  heat: 'Body temperature rising — take a break from dancing, find shade and cool down.',
  hyperthermia: 'Danger: overheating (hyperthermia). Stop dancing, cool down and go to the first aid post now — call 112 if confused or fainting.',
  dehydration: 'Dehydration: heavy sweating in the heat. Rest and sip water regularly.',
  hyponatraemia: 'Too much water: with MDMA the body retains water (hyponatraemia risk). Sip, do not gulp — about a glass per hour.',
  heart: 'Very high heart rate: rest in a cool, quiet place. Chest pain or palpitations? Get medical help.',
  overstimulation: 'Sensory overload: intense light and sound can overwhelm. Step away to a quieter spot.',
  anxiety: 'Onset can bring nausea, restlessness or anxiety. Stay with friends; staff and first aid can help.',
  comedown: 'Comedown: fatigue, low mood and poor concentration can last for days.',
  mixing: 'Alcohol + MDMA: more dehydration and overheating, more strain on the body.',
  drivingLimit: 'Above 0.5‰: over the Dutch legal driving limit.',
  alcoholDanger: 'Danger: risk of alcohol poisoning. Never leave a very drunk person alone; call 112 if they cannot be woken.',
  help: 'First aid posts and staff help without judgement.',
} as const;
