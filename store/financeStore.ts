import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceEntry, DateSelection, YearSelection } from '@/types/finance';
import { calculateVatAmount } from '@/utils/finance';

interface FinanceState {
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
  dateSelection: DateSelection;
  yearSelection: YearSelection;
  apiKey: string | null;
  
  // Actions
  addIncome: (income: Omit<FinanceEntry, 'id' | 'vatAmount'>) => void;
  addExpense: (expense: Omit<FinanceEntry, 'id' | 'vatAmount'>) => void;
  removeIncome: (id: string) => void;
  removeExpense: (id: string) => void;
  setDateSelection: (dateSelection: DateSelection) => void;
  setYearSelection: (yearSelection: YearSelection) => void;
  setApiKey: (apiKey: string) => void;
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
      apiKey: null,
      
      addIncome: (income) => {
        const vatAmount = calculateVatAmount(income.amount, income.vatRate);
        const newIncome: FinanceEntry = {
          ...income,
          id: Date.now().toString(),
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
          id: Date.now().toString(),
          vatAmount,
        };
        
        set((state) => ({
          expenses: [...state.expenses, newExpense],
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
      
      setApiKey: (apiKey) => {
        set({ apiKey });
      },
    }),
    {
      name: 'finance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);