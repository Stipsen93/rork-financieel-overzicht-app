export interface FinanceEntry {
  id: string;
  name: string;
  amount: number;
  vatRate: number;
  vatAmount: number;
  date: string;
  imageUri?: string;
  imageUris?: string[];
  notes?: string;
}

export interface MonthSummary {
  totalIncome: number;
  totalExpense: number;
  vatToPay: number;
  vatToClaim: number;
  netAmount: number;
}

export interface DateSelection {
  year: number;
  month: number;
}

export interface YearSelection {
  year: number;
}

export interface QuarterSelection {
  year: number;
  quarter: number;
}