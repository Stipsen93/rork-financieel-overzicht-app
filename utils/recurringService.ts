import { FinanceEntry } from '@/types/finance';

export const generateRecurringEntries = (
  baseEntry: Omit<FinanceEntry, 'id' | 'vatAmount'>,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  repeatCount: number
): Omit<FinanceEntry, 'id' | 'vatAmount'>[] => {
  const entries: Omit<FinanceEntry, 'id' | 'vatAmount'>[] = [];
  const startDate = new Date(baseEntry.date);
  
  let currentDate = new Date(startDate);
  
  for (let i = 0; i < repeatCount; i++) {
    entries.push({
      ...baseEntry,
      date: currentDate.toISOString(),
      isRecurring: true,
      recurringFrequency: frequency,
      recurringCount: repeatCount,
    });
    
    // Calculate next occurrence (skip for the last entry)
    if (i < repeatCount - 1) {
      switch (frequency) {
        case 'daily':
          currentDate.setDate(currentDate.getDate() + 1);
          break;
        case 'weekly':
          currentDate.setDate(currentDate.getDate() + 7);
          break;
        case 'monthly':
          currentDate.setMonth(currentDate.getMonth() + 1);
          break;
        case 'yearly':
          currentDate.setFullYear(currentDate.getFullYear() + 1);
          break;
      }
    }
  }
  
  return entries;
};

export const getFrequencyLabel = (frequency: 'daily' | 'weekly' | 'monthly' | 'yearly'): string => {
  switch (frequency) {
    case 'daily':
      return 'Dagelijks';
    case 'weekly':
      return 'Wekelijks';
    case 'monthly':
      return 'Maandelijks';
    case 'yearly':
      return 'Jaarlijks';
    default:
      return '';
  }
};