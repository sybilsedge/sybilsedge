export type WritingEntry = {
  title: string;
  description: string;
  genres: string[];
  tags: string[];
  status: 'Draft' | 'Published';
};

export const writing: WritingEntry[] = [
  {
    title: 'The Shadow Docket',
    description: `Spanning St. Petersburg to the Swiss Alps, the story follows ICPO analyst Yasutake Masanori, XAoC CEO Katerina Orlova, and whistleblower Larisa Sokolova as they unravel a plot of hacks, chases, and moral compromises amid neural implants and shadow operations. Key characters navigate corporate intrigue, family betrayals, and high-stakes assaults to prevent mass detonation, exploring themes of power, ethical ambiguity, and truth manipulation in a near-future world.`,
    genres: ['Cyberpunk Techno-Thriller', 'Corporate Conspiracy Thriller', 'Espionage'],
    tags: [
      'cybernetic prosthetics',
      'weaponized implants',
      'family sabotage',
      'hacking forensics',
      'international bombings',
      'neural tech',
      'moral compromise',
      'shadow ops',
      'ICPO investigation',
      'corporate espionage',
    ],
    status: 'Draft',
  },
];
