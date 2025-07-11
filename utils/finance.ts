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