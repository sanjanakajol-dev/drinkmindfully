import { type Currency } from './money';
import { type CityAlcoholRules } from './visibility';

export type City = CityAlcoholRules & {
  id: string;
  name: string;
  countryCode: 'IN' | 'AE' | 'ES' | 'FR' | 'PT';
  currency: Currency;
  timeZone: string;
  emergencyNumber: string;
};

/**
 * Launch cities. The database (seeded from `supabase/seed.sql`, later the master Google Sheet) is
 * the source of truth; this copy lets onboarding work offline. A test keeps the two in sync.
 *
 * These are local legal ages. Alcoholic content also requires the 23+ brand minimum (see
 * `alcoholContentAge` in visibility.ts). Mumbai uses 25, the spirits age in Maharashtra.
 */
export const CITIES: readonly City[] = [
  {
    id: 'bangalore',
    name: 'Bangalore',
    countryCode: 'IN',
    currency: 'INR',
    timeZone: 'Asia/Kolkata',
    legalDrinkingAge: 21,
    alcoholRecommendationsEnabled: true,
    emergencyNumber: '112',
  },
  {
    id: 'mysore',
    name: 'Mysore',
    countryCode: 'IN',
    currency: 'INR',
    timeZone: 'Asia/Kolkata',
    legalDrinkingAge: 21,
    alcoholRecommendationsEnabled: true,
    emergencyNumber: '112',
  },
  {
    id: 'mumbai',
    name: 'Mumbai',
    countryCode: 'IN',
    currency: 'INR',
    timeZone: 'Asia/Kolkata',
    legalDrinkingAge: 25,
    alcoholRecommendationsEnabled: false,
    emergencyNumber: '112',
  },
  {
    id: 'delhi',
    name: 'Delhi',
    countryCode: 'IN',
    currency: 'INR',
    timeZone: 'Asia/Kolkata',
    legalDrinkingAge: 25,
    alcoholRecommendationsEnabled: false,
    emergencyNumber: '112',
  },
  {
    id: 'dubai',
    name: 'Dubai',
    countryCode: 'AE',
    currency: 'AED',
    timeZone: 'Asia/Dubai',
    legalDrinkingAge: 21,
    alcoholRecommendationsEnabled: false,
    emergencyNumber: '999',
  },
  {
    id: 'marbella',
    name: 'Marbella',
    countryCode: 'ES',
    currency: 'EUR',
    timeZone: 'Europe/Madrid',
    legalDrinkingAge: 18,
    alcoholRecommendationsEnabled: true,
    emergencyNumber: '112',
  },
  {
    id: 'paris',
    name: 'Paris',
    countryCode: 'FR',
    currency: 'EUR',
    timeZone: 'Europe/Paris',
    legalDrinkingAge: 18,
    alcoholRecommendationsEnabled: false,
    emergencyNumber: '112',
  },
  {
    id: 'lisbon',
    name: 'Lisbon',
    countryCode: 'PT',
    currency: 'EUR',
    timeZone: 'Europe/Lisbon',
    legalDrinkingAge: 18,
    alcoholRecommendationsEnabled: true,
    emergencyNumber: '112',
  },
];

export function cityById(id: string): City | undefined {
  return CITIES.find((c) => c.id === id);
}
