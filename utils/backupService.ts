import AsyncStorage from '@react-native-async-storage/async-storage';
import { FinanceEntry } from '@/types/finance';
import { useFinanceStore } from '@/store/financeStore';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

interface BackupData {
  incomes: FinanceEntry[];
  expenses: FinanceEntry[];
  startingCapital: number;
  timestamp: string;
  version: string;
}

const BACKUP_KEY = 'finance-backup';
const BACKUP_DATE_KEY = 'finance-backup-date';

// Add web compatibility check
const isWebPlatform = Platform.OS === 'web';

export const createBackup = async (): Promise<void> => {
  try {
    const state = useFinanceStore.getState();
    
    const backupData: BackupData = {
      incomes: state.incomes,
      expenses: state.expenses,
      startingCapital: state.startingCapital,
      timestamp: new Date().toISOString(),
      version: '2.1',
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

export const shareBackup = async (): Promise<boolean> => {
  try {
    const backupString = await AsyncStorage.getItem(BACKUP_KEY);
    
    if (!backupString) {
      throw new Error('Geen backup gevonden om te delen');
    }
    
    const backupData: BackupData = JSON.parse(backupString);
    const fileName = `financiele-backup-${new Date().toISOString().split('T')[0]}.json`;
    
    if (Platform.OS === 'web') {
      // For web, create a download link
      const blob = new Blob([backupString], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      return true;
    } else {
      // For mobile, use file system and sharing
      const fileUri = `${FileSystem.documentDirectory}${fileName}`;
      await FileSystem.writeAsStringAsync(fileUri, backupString);
      
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(fileUri, {
          mimeType: 'application/json',
          dialogTitle: 'Deel Financiële Backup',
        });
        return true;
      } else {
        throw new Error('Delen niet beschikbaar op dit apparaat');
      }
    }
  } catch (error) {
    console.error('Error sharing backup:', error);
    throw error;
  }
};

export const importBackup = async (backupString: string): Promise<boolean> => {
  try {
    const backupData: BackupData = JSON.parse(backupString);
    
    // Validate backup data
    if (!backupData.incomes || !backupData.expenses) {
      throw new Error('Ongeldig backup bestand');
    }
    
    // Store the imported backup
    await AsyncStorage.setItem(BACKUP_KEY, backupString);
    await AsyncStorage.setItem(BACKUP_DATE_KEY, new Date().toISOString());
    
    // Restore data to the store
    const state = useFinanceStore.getState();
    state.restoreFromBackup({
      incomes: backupData.incomes,
      expenses: backupData.expenses,
      startingCapital: backupData.startingCapital || 0,
    });
    
    console.log('Backup imported and restored successfully');
    return true;
  } catch (error) {
    console.error('Error importing backup:', error);
    throw error;
  }
};