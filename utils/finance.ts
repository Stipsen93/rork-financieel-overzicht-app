import { FinanceEntry, MonthSummary } from '@/types/finance';

export const calculateVatAmount = (amount: number, vatRate: number): number => {
  // Calculate VAT as if the amount is exclusive of VAT
  return (amount * vatRate) / 100;
};

export const formatCurrency = (amount: number): string => {
  return new Intl.NumberFormat('nl-NL', {
    style: 'currency',
    currency: 'EUR',
  }).format(amount);
};

export const formatDate = (dateString: string): string => {
  const date = new Date(dateString);
  return date.toLocaleDateString('nl-NL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });
};

export const getMonthName = (month: number): string => {
  const date = new Date();
  date.setMonth(month - 1);
  return date.toLocaleString('nl-NL', { month: 'long' });
};

export const getQuarterName = (quarter: number): string => {
  const quarterNames = {
    1: '1e kwartaal',
    2: '2e kwartaal', 
    3: '3e kwartaal',
    4: '4e kwartaal',
    5: 'Heel jaar'
  };
  return quarterNames[quarter as keyof typeof quarterNames] || '1e kwartaal';
};

export const calculateMonthlySummary = (
  incomes: FinanceEntry[],
  expenses: FinanceEntry[]
): MonthSummary => {
  const totalIncome = incomes.reduce((sum, entry) => sum + entry.amount, 0);
  const totalExpense = expenses.reduce((sum, entry) => sum + entry.amount, 0);
  
  const vatToPay = incomes.reduce((sum, entry) => sum + entry.vatAmount, 0);
  const vatToClaim = expenses.reduce((sum, entry) => sum + entry.vatAmount, 0);
  
  return {
    totalIncome,
    totalExpense,
    vatToPay,
    vatToClaim,
    netAmount: totalIncome - totalExpense,
  };
};

export const filterEntriesByMonth = (
  entries: FinanceEntry[],
  year: number,
  month: number
): FinanceEntry[] => {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return (
      entryDate.getFullYear() === year && entryDate.getMonth() === month - 1
    );
  });
};

export const filterEntriesByYear = (
  entries: FinanceEntry[],
  year: number
): FinanceEntry[] => {
  return entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    return entryDate.getFullYear() === year;
  });
};

export const filterEntriesByQuarter = (
  entries: FinanceEntry[],
  year: number,
  quarter: number
): FinanceEntry[] => {
  // If quarter is 5, return all entries for the year (whole year)
  if (quarter === 5) {
    return filterEntriesByYear(entries, year);
  }
  
  return entries.filter((entry) => {
    const entryDate = new Date(entry.date);
    const entryYear = entryDate.getFullYear();
    const entryMonth = entryDate.getMonth() + 1; // getMonth() returns 0-11
    
    if (entryYear !== year) return false;
    
    switch (quarter) {
      case 1: return entryMonth >= 1 && entryMonth <= 3;
      case 2: return entryMonth >= 4 && entryMonth <= 6;
      case 3: return entryMonth >= 7 && entryMonth <= 9;
      case 4: return entryMonth >= 10 && entryMonth <= 12;
      default: return false;
    }
  });
};