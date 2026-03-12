export interface PresentationType {
  id: string;
  name: string;
  description: string;
  icon: string;
  numSlides: number;
  sections: string[];
  textAmount: 'brief' | 'medium' | 'detailed';
}

export const PRESENTATION_TYPES: PresentationType[] = [
  {
    id: 'grand-rounds',
    name: 'Grand Rounds',
    description: 'Full case with teaching points',
    icon: '\u{1F393}',
    numSlides: 15,
    sections: ['title', 'presentation', 'pmh', 'vitals', 'labs', 'imaging', 'differential', 'specialists', 'alerts', 'scores', 'plan', 'teaching', 'references'],
    textAmount: 'medium',
  },
  {
    id: 'case-conference',
    name: 'Case Conference',
    description: 'Multidisciplinary discussion focus',
    icon: '\u{1F465}',
    numSlides: 12,
    sections: ['title', 'presentation', 'pmh', 'labs', 'imaging', 'differential', 'specialists', 'alerts', 'plan', 'teaching'],
    textAmount: 'medium',
  },
  {
    id: 'teaching',
    name: 'Teaching Case',
    description: 'For students & residents',
    icon: '\u{1F4DA}',
    numSlides: 18,
    sections: ['title', 'presentation', 'pmh', 'vitals', 'labs', 'imaging', 'differential', 'specialists', 'scores', 'plan', 'teaching', 'references'],
    textAmount: 'brief',
  },
  {
    id: 'quick',
    name: 'Quick Summary',
    description: '6-8 slides overview',
    icon: '\u26A1',
    numSlides: 7,
    sections: ['title', 'presentation', 'labs', 'differential', 'plan'],
    textAmount: 'brief',
  },
];
