import { staticHouseholds, type Household } from './households-data';

// Households created via the AI onboarding flow are kept in-memory for the life
// of this server process — no disk writes, so this stays deployable on
// serverless platforms. Known limitation: a custom household will not survive
// a cold start on a different instance; the two static demo households always
// will, since they're compiled into the bundle.
const dynamicHouseholds = new Map<string, Household>();

export function getFullHousehold(familyId: string): Household | null {
  if (!familyId) return null;
  return staticHouseholds[familyId] || dynamicHouseholds.get(familyId) || null;
}

export function registerHousehold(household: Household) {
  dynamicHouseholds.set(household.id, household);
}
