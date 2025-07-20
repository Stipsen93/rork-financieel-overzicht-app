import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceEntry, DateSelection, YearSelection, QuarterSelection } from '@/types/finance';
import { calculateVatAmount } from '@/utils/finance';
import { Alert } from 'react-native';

interface FinanceState {
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
  startingCapital: number;
  dateSelection: DateSelection;
  yearSelection: YearSelection;
  quarterSelection: QuarterSelection;
  apiKey: string | null;
  backupFrequency: number;
  lastAutoBackup: string | null;
  
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
  setBackupFrequency: (frequency: number) => void;
  setLastAutoBackup: (date: string) => void;
  setStartingCapital: (amount: number) => void;
  resetAllData: () => void;
  restoreFromBackup: (data: { incomes: FinanceEntry[]; expenses: FinanceEntry[]; startingCapital?: number }) => void;
}

const isSameDay = (date1: string, date2: string): boolean => {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return d1.getFullYear() === d2.getFullYear() &&
         d1.getMonth() === d2.getMonth() &&
         d1.getDate() === d2.getDate();
};

const findDuplicates = (
  entries: FinanceEntry[],
  newEntry: Omit<FinanceEntry, 'id' | 'vatAmount'>
): FinanceEntry[] => {
  return entries.filter(entry => 
    entry.name.toLowerCase() === newEntry.name.toLowerCase() &&
    entry.amount === newEntry.amount &&
    isSameDay(entry.date, newEntry.date)
  );
};

const showDuplicateAlert = (
  duplicates: FinanceEntry[],
  newEntryName: string,
  onKeepBoth: () => void,
  onRemoveDuplicate: (duplicateId: string) => void
) => {
  Alert.alert(
    'Dubbele Post Gevonden',
    `Er ${duplicates.length > 1 ? 'zijn' : 'is'} al ${duplicates.length} post${duplicates.length > 1 ? 'en' : ''} met dezelfde naam, bedrag en datum als "${newEntryName}". Wat wil je doen?`,
    [
      {
        text: 'Beide Behouden',
        onPress: onKeepBoth,
      },
      {
        text: 'Oude Verwijderen',
        style: 'destructive',
        onPress: () => {
          // If multiple duplicates, remove the first one
          onRemoveDuplicate(duplicates[0].id);
        },
      },
      {
        text: 'Annuleren',
        style: 'cancel',
      },
    ]
  );
};

export const useFinanceStore = create<FinanceState>()(
  persist(
    (set, get) => ({
      incomes: [],
      expenses: [],
      startingCapital: 0,
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
      backupFrequency: 1, // Default to daily backups
      lastAutoBackup: null,
      
      addIncome: (income) => {
        const state = get();
        const duplicates = findDuplicates(state.incomes, income);
        
        const addNewIncome = () => {
          const vatAmount = calculateVatAmount(income.amount, income.vatRate);
          const newIncome: FinanceEntry = {
            ...income,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            vatAmount,
          };
          
          set((state) => ({
            incomes: [...state.incomes, newIncome],
          }));
        };

        if (duplicates.length > 0) {
          showDuplicateAlert(
            duplicates,
            income.name,
            addNewIncome,
            (duplicateId) => {
              // Remove the duplicate first, then add the new one
              set((state) => ({
                incomes: state.incomes.filter(inc => inc.id !== duplicateId),
              }));
              addNewIncome();
            }
          );
        } else {
          addNewIncome();
        }
      },
      
      addExpense: (expense) => {
        const state = get();
        const duplicates = findDuplicates(state.expenses, expense);
        
        const addNewExpense = () => {
          const vatAmount = calculateVatAmount(expense.amount, expense.vatRate);
          const newExpense: FinanceEntry = {
            ...expense,
            id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
            vatAmount,
          };
          
          set((state) => ({
            expenses: [...state.expenses, newExpense],
          }));
        };

        if (duplicates.length > 0) {
          showDuplicateAlert(
            duplicates,
            expense.name,
            addNewExpense,
            (duplicateId) => {
              // Remove the duplicate first, then add the new one
              set((state) => ({
                expenses: state.expenses.filter(exp => exp.id !== duplicateId),
              }));
              addNewExpense();
            }
          );
        } else {
          addNewExpense();
        }
      },
      
      addMultipleIncomes: (incomes) => {
        const state = get();
        const newIncomes: FinanceEntry[] = [];
        const duplicateChecks: Array<{
          newEntry: FinanceEntry;
          duplicates: FinanceEntry[];
        }> = [];

        incomes.forEach((income, index) => {
          const vatAmount = calculateVatAmount(income.amount, income.vatRate);
          const newIncome: FinanceEntry = {
            ...income,
            id: (Date.now() + index).toString() + Math.random().toString(36).substr(2, 9),
            vatAmount,
          };

          const duplicates = findDuplicates(state.incomes, income);
          if (duplicates.length > 0) {
            duplicateChecks.push({ newEntry: newIncome, duplicates });
          } else {
            newIncomes.push(newIncome);
          }
        });

        // Add non-duplicate entries immediately
        if (newIncomes.length > 0) {
          set((state) => ({
            incomes: [...state.incomes, ...newIncomes],
          }));
        }

        // Handle duplicates one by one
        duplicateChecks.forEach(({ newEntry, duplicates }) => {
          showDuplicateAlert(
            duplicates,
            newEntry.name,
            () => {
              set((state) => ({
                incomes: [...state.incomes, newEntry],
              }));
            },
            (duplicateId) => {
              set((state) => ({
                incomes: [...state.incomes.filter(inc => inc.id !== duplicateId), newEntry],
              }));
            }
          );
        });
      },
      
      addMultipleExpenses: (expenses) => {
        const state = get();
        const newExpenses: FinanceEntry[] = [];
        const duplicateChecks: Array<{
          newEntry: FinanceEntry;
          duplicates: FinanceEntry[];
        }> = [];

        expenses.forEach((expense, index) => {
          const vatAmount = calculateVatAmount(expense.amount, expense.vatRate);
          const newExpense: FinanceEntry = {
            ...expense,
            id: (Date.now() + index).toString() + Math.random().toString(36).substr(2, 9),
            vatAmount,
          };

          const duplicates = findDuplicates(state.expenses, expense);
          if (duplicates.length > 0) {
            duplicateChecks.push({ newEntry: newExpense, duplicates });
          } else {
            newExpenses.push(newExpense);
          }
        });

        // Add non-duplicate entries immediately
        if (newExpenses.length > 0) {
          set((state) => ({
            expenses: [...state.expenses, ...newExpenses],
          }));
        }

        // Handle duplicates one by one
        duplicateChecks.forEach(({ newEntry, duplicates }) => {
          showDuplicateAlert(
            duplicates,
            newEntry.name,
            () => {
              set((state) => ({
                expenses: [...state.expenses, newEntry],
              }));
            },
            (duplicateId) => {
              set((state) => ({
                expenses: [...state.expenses.filter(exp => exp.id !== duplicateId), newEntry],
              }));
            }
          );
        });
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
      
      setBackupFrequency: (frequency) => {
        set({ backupFrequency: frequency });
      },
      
      setLastAutoBackup: (date) => {
        set({ lastAutoBackup: date });
      },
      
      setStartingCapital: (amount) => {
        set({ startingCapital: amount });
      },
      
      resetAllData: () => {
        set({
          incomes: [],
          expenses: [],
          startingCapital: 0,
        });
      },
      
      restoreFromBackup: (data) => {
        set({
          incomes: data.incomes,
          expenses: data.expenses,
          startingCapital: data.startingCapital || 0,
        });
      },
    }),
    {
      name: 'finance-storage',
      storage: createJSONStorage(() => AsyncStorage),
    }
  )
);