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
      'Harder to follow moving objects: they smear and lag behind',
      'Clearly higher crash risk',
      'Alcohol + heat: you lose extra fluid, so dehydration, headache and dizziness come sooner',
    ],
  },
  {
    bac: 0.8,
    label: '0.8‰ — clearly impaired',
    effects: [
      'Poorer coordination and balance',
      'Glare from strobes and pyro lingers; less awareness of the periphery',
      'Overconfidence, louder, more risk-taking',
    ],
  },
  {
    bac: 1.2,
    label: '1.2‰ — drunk',
    effects: [
      'Unsteady walking, stumbling, slurred speech',
      'Eyes need time to refocus after turning your head; double vision comes and goes',
      'Sounds seem muffled; strongly slowed reactions; nausea possible',
    ],
  },
  {
    bac: 1.6,
    label: '1.6‰ — very drunk',
    effects: [
      'Major loss of balance and motor control',
      'Double vision and tunnel vision',
      'Memory gaps: seconds go missing; vomiting possible',
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
    'Dilated pupils: strobes and lasers dazzle and wash out the picture; glare and halos around lights',
    'Trails and afterimages behind moving lights',
    'Blurred vision and fine involuntary eye movements (nystagmus)',
    'Nausea and restlessness during the onset; jaw clenching, dry mouth, raised heart rate and blood pressure',
    'Energetic or emotionally open feelings — but also restlessness, anxiety or confusion',
  ],
  risks: [
    'Overheating (hyperthermia): MDMA disturbs temperature regulation and blunts the warning signs — dancing for hours in a hot, humid crowd like June 2026 multiplies the risk',
    'Dehydration from heavy sweating',
    'Drinking too much water is dangerous too: MDMA makes the body retain water, which can cause hyponatraemia (low blood sodium)',
    'Strain on the heart and blood vessels',
    'Pills vary in strength and content; high-dose pills cause more incidents',
    'Mixing with alcohol or other drugs increases the risks',
    'Comedown: fatigue, low mood and poor concentration for days afterwards',
  ],
  help: [
    'Feeling unwell, too hot or confused? Go to the first aid post or tell any staff member — they help without judgement. Q-dance has a zero-tolerance drug policy; the First Aid team is there to help, not to judge.',
    'In the simulation: walk out of the crowd and stand still to rest, press E at a water point for free water, or visit the first-aid heat post behind the right-hand bar.',
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
  heat: 'Heat danger: body temperature above 38.5 °C. Stop dancing, walk out of the crowd, cool down at a water point and sip water.',
  hyperthermia: 'Danger: overheating (hyperthermia). Stop dancing, cool down and go to the first aid post now — call 112 if confused or fainting.',
  dehydration: 'Dehydration: heavy sweating in the humid heat. Rest and sip water regularly — free at every water point.',
  hyponatraemia: 'Too much water: with MDMA the body retains water (hyponatraemia risk). Sip, do not gulp — about a glass per hour.',
  hyponatraemiaDanger: 'Headache, nausea, confusion after drinking a lot of water: possible hyponatraemia. Stop drinking and go to first aid now.',
  heart: 'Very high heart rate: rest in a cool, quiet place. Chest pain or palpitations? Get medical help.',
  overstimulation: 'Sensory overload: intense light and sound can overwhelm. Step away to a quieter spot.',
  anxiety: 'Onset can bring nausea, restlessness or anxiety. Stay with friends; staff and first aid can help.',
  thirst: 'Dry mouth and thirst are common. Sip water — neither too little nor too much.',
  comedown: 'Comedown: fatigue, low mood and poor concentration can last for days.',
  mixing: 'Alcohol + MDMA: more dehydration and overheating, more strain on the body.',
  drivingLimit: 'Above 0.5‰: over the Dutch legal driving limit.',
  alcoholDanger: 'Danger: risk of alcohol poisoning. Never leave a very drunk person alone; call 112 if they cannot be woken.',
  alcoholHeat: 'Alcohol + heat dehydrates: headache and dizziness come sooner. Alternate with free water.',
  codeRed: 'Code red heat (36.8 °C): everyone risks dehydration and heat stroke — the reason Defqon.1 2026 was cancelled.',
  resting: 'Resting out of the crowd: your temperature and heart rate are coming down.',
  cooling: 'Cooling down at the water point: temperature is coming down.',
  treated: 'First aid heat post: the team is cooling you down. They help without judgement.',
  help: 'First aid posts and staff help without judgement.',
} as const;

/** One-off notices (toasts) when an outcome happens for the first time. */
export const OUTCOME_NOTES = {
  stumble: 'You stumbled: balance and coordination fail at this level of alcohol.',
  memoryGap: 'Memory gap: at around 1.6‰ the brain stops storing moments — seconds go missing without you noticing.',
  heatDanger: 'Heat danger (38.5 °C): stop dancing, walk out of the crowd and stand still to rest, sip free water at a water point (E).',
  hyponatraemia: 'Headache and nausea after a lot of water: with MDMA this can be hyponatraemia. Stop drinking and get help at first aid.',
  nausea: 'Onset: nausea and restlessness come in waves.',
  water: 'Free water · 250 ml. Heat protocol 2026: free at every water point and toilet block.',
  waterSip: 'Free water · 250 ml. Sip, don’t gulp: with MDMA too much water is dangerous too.',
  firstAid: 'First aid heat post: you sit down in the air-conditioned tent; the team checks you and cools you down — no judgement.',
  firstAidLeave: 'You left the first-aid post.',
  aircon: 'Cooling down in the heat post.',
} as const;

export interface OutcomeCardText {
  kicker: string;
  title: string;
  body: string[];
  help: string[];
  actions: { id: 'firstaid' | 'sober' | 'close'; label: string; primary?: boolean }[];
}

/** Outcome cards (bible §12.1: always show consequences and where help is). `{T}` / `{W}` are filled in. */
export const OUTCOME_CARDS: Record<'sitdown' | 'collapse' | 'epilogue', OutcomeCardText> = {
  sitdown: {
    kicker: 'Alcohol · 2‰ and higher',
    title: 'You had to sit down',
    body: [
      'Your legs gave way. From about 2‰ balance, judgement and memory fail: you can no longer stand or walk safely, and vomiting while drowsy, falls and alcohol poisoning become real risks.',
      'A friend helps you up and walks you to the first-aid post (EHBO) behind the right-hand bar.',
    ],
    help: [
      'First aid helps without judgement and without consequences.',
      'Never leave a very drunk friend alone. Turn them on their side if they are drowsy; call 112 if they cannot be woken or breathe irregularly.',
      'Only time lowers blood alcohol — coffee, water or a cold shower do not.',
    ],
    actions: [
      { id: 'firstaid', label: 'Go to first aid with your friend', primary: true },
      { id: 'sober', label: 'End the simulation' },
    ],
  },
  collapse: {
    kicker: 'Overheating · 40 °C',
    title: 'You collapsed',
    body: [
      'Your core temperature passed 40 °C: heat stroke. MDMA disturbs temperature regulation and blunts the warning signs, so people keep dancing while they overheat. Confusion, hot dry skin and fainting are the signs.',
      'People around you wave for help. Security and the first-aid team carry you to the air-conditioned heat post and cool you down.',
    ],
    help: [
      'Heat stroke is an emergency: call 112 and cool the person down (shade, wet cloths, fanning).',
      'The First Aid team is your friend: no judgement, no consequences. Q-dance has a zero-tolerance drug policy.',
      'Drugs Infolijn (Trimbos): 0900-1995 · drugsinfo.nl · jellinek.nl',
    ],
    actions: [
      { id: 'firstaid', label: 'Continue at the first-aid post', primary: true },
      { id: 'sober', label: 'End the simulation' },
    ],
  },
  epilogue: {
    kicker: 'After the night',
    title: 'The days after: the “dinsdagdip”',
    body: [
      'The simulation ends here, but the body does not reset. After MDMA the brain’s serotonin is depleted: fatigue, low mood, irritability and poor concentration can last up to three days — the “Tuesday dip”.',
      'Tonight in the simulation: highest core temperature {T} °C, lowest body water {W} %.',
    ],
    help: [
      'Unity (unity.nl) and Celebrate Safe give peer information at festivals.',
      'Worried about yourself or a friend? Drugs Infolijn 0900-1995 · drugsinfo.nl · jellinek.nl',
      'Not using is the only way to avoid these risks.',
    ],
    actions: [{ id: 'close', label: 'Close', primary: true }],
  },
};
