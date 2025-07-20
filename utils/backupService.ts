import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceEntry } from '@/types/finance';
import { useFinanceStore } from '@/store/financeStore';

interface BackupData {
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
  startingCapital: number;
  timestamp: string;
  version: string;
}

const BACKUP_KEY = 'finance-backup';
const BACKUP_DATE_KEY = 'finance-backup-date';

export const createBackup = async (): Promise<void> => {
  try {
    const state = useFinanceStore.getState();
    
    const backupData: BackupData = {
      incomes: state.incomes,
      expenses: state.expenses,
      startingCapital: state.startingCapital,
      timestamp: new Date().toISOString(),
      version: '1.10',
    };
    
    await AsyncStorage.setItem(BACKUP_KEY, JSON.stringify(backupData));
    await AsyncStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString());
    
    console.log('Backup created successfully');
  } catch (error) {
    console.error('Error creating backup:', error);
    throw error;
  }
};

export const restoreBackup = async (): Promise<boolean> => {
  try {
    const backupString = await AsyncStorage.getItem(BACKUP_KEY);
    
    if (!backupString) {
      return false;
    }
    
    const backupData: BackupData = JSON.parse(backupString);
    
    // Validate backup data
    if (!backupData.incomes || !backupData.expenses) {
      throw new Error('Invalid backup data');
    }
    
    // Restore data to the store
    const state = useFinanceStore.getState();
    state.restoreFromBackup({
      incomes: backupData.incomes,
      expenses: backupData.expenses,
      startingCapital: backupData.startingCapital || 0,
    });
    
    console.log('Backup restored successfully');
    return true;
  } catch (error) {
    console.error('Error restoring backup:', error);
    throw error;
  }
};

export const getLastBackupDate = async (): Promise<Date | null> => {
  try {
    const dateString = await AsyncStorage.getItem(BACKUP_DATE_KEY);
    return dateString ? new Date(dateString) : null;
  } catch (error) {
    console.error('Error getting last backup date:', error);
    return null;
  }
};

export const shouldCreateAutoBackup = async (): Promise<boolean> => {
  try {
    const state = useFinanceStore.getState();
    const { backupFrequency, lastAutoBackup } = state;
    
    if (!lastAutoBackup) {
      return true; // No backup has been made yet
    }
    
    const lastBackupDate = new Date(lastAutoBackup);
    const now = new Date();
    const daysSinceLastBackup = Math.floor((now.getTime() - lastBackupDate.getTime()) / (1000 * 60 * 60 * 24));
    
    return daysSinceLastBackup >= backupFrequency;
  } catch (error) {
    console.error('Error checking if auto backup should be created:', error);
    return false;
  }
};

export const performAutoBackup = async (): Promise<void> => {
  try {
    const shouldBackup = await shouldCreateAutoBackup();
    
    if (shouldBackup) {
      await createBackup();
      const state = useFinanceStore.getState();
      state.setLastAutoBackup(new Date().toISOString());
      console.log('Auto backup performed');
    }
  } catch (error) {
    console.error('Error performing auto backup:', error);
  }
};

export const deleteBackup = async (): Promise<void> => {
  try {
    await AsyncStorage.removeItem(BACKUP_KEY);
    await AsyncStorage.removeItem(BACKUP_DATE_KEY);
    console.log('Backup deleted successfully');
  } catch (error) {
    console.error('Error deleting backup:', error);
    throw error;
  }
};