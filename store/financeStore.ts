import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceEntry, DateSelection, YearSelection, QuarterSelection } from '@/types/finance';
import { calculateVatAmount } from '@/utils/finance';

interface FinanceState {
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
  dateSelection: DateSelection;
  yearSelection: YearSelection;
  quarterSelection: QuarterSelection;
  apiKey: string | null;
  apiProvider: 'chatgpt' | 'gemini';
  
  // Actions
  addIncome: (income: Omit<FinanceEntry, 'id' | 'vatAmount'>) => void;
  addExpense: (expense: Omit<FinanceEntry, 'id' | 'vatAmount'>) => void;
  addMultipleIncomes: (incomes: Omit<FinanceEntry, 'id' | 'vatAmount'>[]) => void;
  addMultipleExpenses: (expenses: Omit<FinanceEntry, 'id' | 'vatAmount'>[]) => void;
  removeIncome: (id: string) => void;
  removeExpense: (id: string) => void;
  setDateSelection: (dateSelection: DateSelection) => void;
  setYearSelection: (yearSelection: YearSelection) => void;
  setQuarterSelection: (quarterSelection: QuarterSelection) => void;
  setApiKey: (apiKey: string) => void;
  setApiProvider: (provider: 'chatgpt' | 'gemini') => void;
  resetAllData: () => void;
}

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set) => ({
      incomes: [],
      expenses: [],
      dateSelection: {
        year: new Date().getFullYear(),
        month: new Date().getMonth() + 1,
      },
      yearSelection: {
        year: new Date().getFullYear(),
      },
      quarterSelection: {
        year: new Date().getFullYear(),
        quarter: 5, // Default to "Heel jaar" (whole year)
      },
      apiKey: null,
      apiProvider: 'chatgpt',
      
      addIncome: (income) => {
        const vatAmount = calculateVatAmount(income.amount, income.vatRate);
        const newIncome: FinanceEntry = {
          ...income,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          vatAmount,
        };
        
        set((state) => ({
          incomes: [...state.incomes, newIncome],
        }));
      },
      
      addExpense: (expense) => {
        const vatAmount = calculateVatAmount(expense.amount, expense.vatRate);
        const newExpense: FinanceEntry = {
          ...expense,
          id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
          vatAmount,
        };
        
        set((state) => ({
          expenses: [...state.expenses, newExpense],
        }));
      },
      
      addMultipleIncomes: (incomes) => {
        const newIncomes: FinanceEntry[] = incomes.map((income, index) => {
          const vatAmount = calculateVatAmount(income.amount, income.vatRate);
          return {
            ...income,
            id: (Date.now() + index).toString() + Math.random().toString(36).substr(2, 9),
            vatAmount,
          };
        });
        
        set((state) => ({
          incomes: [...state.incomes, ...newIncomes],
        }));
      },
      
      addMultipleExpenses: (expenses) => {
        const newExpenses: FinanceEntry[] = expenses.map((expense, index) => {
          const vatAmount = calculateVatAmount(expense.amount, expense.vatRate);
          return {
            ...expense,
            id: (Date.now() + index).toString() + Math.random().toString(36).substr(2, 9),
            vatAmount,
          };
        });
        
        set((state) => ({
          expenses: [...state.expenses, ...newExpenses],
        }));
      },
      
      removeIncome: (id) => {
        set((state) => ({
          incomes: state.incomes.filter((income) => income.id !== id),
        }));
      },
      
      removeExpense: (id) => {
        set((state) => ({
          expenses: state.expenses.filter((expense) => expense.id !== id),
        }));
      },
      
      setDateSelection: (dateSelection) => {
        set({ dateSelection });
      },
      
      setYearSelection: (yearSelection) => {
        set({ yearSelection });
      },
      
      setQuarterSelection: (quarterSelection) => {
        set({ quarterSelection });
      },
      
      setApiKey: (apiKey) => {
        set({ apiKey });
      },
      
      setApiProvider: (provider) => {
        set({ apiProvider: provider });
      },
      
      resetAllData: () => {
        set({
          incomes: [],
          expenses: [],
        });
      },
    }),
    {
      name: 'finance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);