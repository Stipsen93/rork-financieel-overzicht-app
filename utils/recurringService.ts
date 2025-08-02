import { FinanceEntry } from '@/types/finance';

export const generateRecurringEntries = (
  baseEntry: Omit<FinanceEntry, 'id' | 'vatAmount'>,
  frequency: 'daily' | 'weekly' | 'monthly' | 'yearly',
  endDate: string
): Omit<FinanceEntry, 'id' | 'vatAmount'>[] => {
  const entries: Omit<FinanceEntry, 'id' | 'vatAmount'>[] = [];
  const startDate = new Date(baseEntry.date);
  const end = new Date(endDate);
  
  let currentDate = new Date(startDate);
  
  while (currentDate <= end) {
    entries.push({
      ...baseEntry,
      date: currentDate.toISOString(),
      isRecurring: true,
      recurringFrequency: frequency,
      recurringEndDate: endDate,
    });
    
    // Calculate next occurrence
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