import type { BusinessType, ContentGoal, MarketingService, TargetAudience } from './types';

/** Predefined Business_Type options (Req 1.1). */
export const BUSINESS_TYPES: BusinessType[] = [
  { id: 'bt-salon', label: 'Beauty Salon', isCustom: false },
  { id: 'bt-restaurant', label: 'Restaurant', isCustom: false },
  { id: 'bt-fitness', label: 'Fitness Studio', isCustom: false },
  { id: 'bt-cafe', label: 'Coffee Shop', isCustom: false },
  { id: 'bt-retail', label: 'Retail Boutique', isCustom: false },
  { id: 'bt-photography', label: 'Photography', isCustom: false },
  { id: 'bt-bakery', label: 'Bakery', isCustom: false },
  { id: 'bt-consulting', label: 'Consulting', isCustom: false },
  { id: 'bt-realestate', label: 'Real Estate', isCustom: false },
  { id: 'bt-wellness', label: 'Wellness & Spa', isCustom: false },
];

/** Predefined Target_Audience options (Req 2.1). */
export const TARGET_AUDIENCES: TargetAudience[] = [
  { id: 'ta-women-25-45', label: 'Women aged 25 to 45', isCustom: false },
  { id: 'ta-young-pros', label: 'Young professionals', isCustom: false },
  { id: 'ta-parents', label: 'Busy parents', isCustom: false },
  { id: 'ta-students', label: 'College students', isCustom: false },
  { id: 'ta-locals', label: 'Local community', isCustom: false },
  { id: 'ta-seniors', label: 'Active seniors', isCustom: false },
  { id: 'ta-newlyweds', label: 'Newlyweds', isCustom: false },
];

/** Available Content_Goal options (Req 3.1). */
export const CONTENT_GOALS: ContentGoal[] = [
  { id: 'cg-customers', label: 'Get more customers' },
  { id: 'cg-engagement', label: 'Increase engagement' },
  { id: 'cg-awareness', label: 'Build brand awareness' },
  { id: 'cg-loyalty', label: 'Grow customer loyalty' },
  { id: 'cg-launch', label: 'Promote a launch' },
];

/** Pixel & Growth marketing services catalog (Req 14). */
export const MARKETING_SERVICES: MarketingService[] = [
  {
    id: 'svc-strategy',
    name: 'Social Media Strategy',
    description:
      'A tailored plan covering channels, cadence, and messaging designed around your goals and audience.',
    howToEngage: 'Book a free 30-minute discovery call through the Pixel & Growth website.',
  },
  {
    id: 'svc-content',
    name: 'Content Production',
    description:
      'Done-for-you photography, short-form video, and graphics produced on a monthly schedule.',
    howToEngage: 'Request a sample kit and quote by emailing hello@pixelandgrowth.example.',
  },
  {
    id: 'svc-ads',
    name: 'Paid Advertising',
    description:
      'Campaign setup, targeting, and optimization across major social platforms with transparent reporting.',
    howToEngage: 'Start with an ad account audit via the Pixel & Growth contact form.',
  },
  {
    id: 'svc-coaching',
    name: 'Founder Coaching',
    description:
      'One-on-one coaching to help you confidently run your own content and growth efforts.',
    howToEngage: 'Reserve a coaching block from the Pixel & Growth booking page.',
  },
];
