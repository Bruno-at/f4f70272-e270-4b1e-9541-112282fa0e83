import { SchoolInfo } from '@/types/database';

/**
 * Formats the school's postal address as a single line for report card headers.
 *
 * - The `po_box` field may already contain the text "P.O. Box" (e.g. "P.O. Box 1234"),
 *   so any duplicate "P.O. Box" prefix is stripped before re-applying it.
 * - Location is normalised to title case (e.g. "BUKALANGU" → "Bukalangu").
 * - If only one of the fields is available, only that part is returned.
 */
export const formatSchoolAddress = (schoolInfo: Pick<SchoolInfo, 'po_box' | 'location'>): string => {
  const rawPoBox = (schoolInfo.po_box || '').trim();
  const rawLocation = (schoolInfo.location || '').trim();

  if (!rawPoBox && !rawLocation) return '';

  const cleanPoBox = rawPoBox.replace(/^P\.?\s?O\.?\s*Box\s*/i, '').trim();
  const poBox = cleanPoBox ? `P.O. Box ${cleanPoBox}` : '';

  const location = rawLocation
    ? rawLocation.toLowerCase().replace(/\b\w/g, (char) => char.toUpperCase())
    : '';

  if (poBox && location) return `${poBox}, ${location}`;
  return poBox || location;
};
