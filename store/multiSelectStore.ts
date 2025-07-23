import createContextHook from '@nkzw/create-context-hook';
import { useState, useCallback } from 'react';
import { Alert, Platform } from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { FinanceEntry } from '@/types/finance';
import { useFinanceStore } from './financeStore';

interface MultiSelectState {
  selectedIds: Set<string>;
  isSelectionMode: boolean;
  entryType: 'income' | 'expense' | null;
}

export const [MultiSelectProvider, useMultiSelect] = createContextHook(() => {
  const [state, setState] = useState<MultiSelectState>({
    selectedIds: new Set(),
    isSelectionMode: false,
    entryType: null,
  });
  
  const { removeIncome, removeExpense, removeMultipleIncomes, removeMultipleExpenses, incomes, expenses } = useFinanceStore();
  
  const startSelection = useCallback((entryId: string, type: 'income' | 'expense') => {
    setState({
      selectedIds: new Set([entryId]),
      isSelectionMode: true,
      entryType: type,
    });
  }, []);
  
  const toggleSelection = useCallback((entryId: string) => {
    setState(prev => {
      const newSelectedIds = new Set(prev.selectedIds);
      if (newSelectedIds.has(entryId)) {
        newSelectedIds.delete(entryId);
      } else {
        newSelectedIds.add(entryId);
      }
      
      return {
        ...prev,
        selectedIds: newSelectedIds,
        isSelectionMode: newSelectedIds.size > 0,
      };
    });
  }, []);
  
  const clearSelection = useCallback(() => {
    setState({
      selectedIds: new Set(),
      isSelectionMode: false,
      entryType: null,
    });
  }, []);
  
  const selectAll = useCallback((entries: FinanceEntry[]) => {
    setState(prev => ({
      ...prev,
      selectedIds: new Set(entries.map(entry => entry.id)),
    }));
  }, []);
  
  const getSelectedEntries = useCallback(() => {
    if (!state.entryType) return [];
    
    const entries = state.entryType === 'income' ? incomes : expenses;
    return entries.filter(entry => state.selectedIds.has(entry.id));
  }, [state.selectedIds, state.entryType, incomes, expenses]);
  
  const deleteSelected = useCallback(() => {
    const selectedEntries = getSelectedEntries();
    if (selectedEntries.length === 0) return;
    
    Alert.alert(
      'Posten Verwijderen',
      `Weet je zeker dat je ${selectedEntries.length} post${selectedEntries.length > 1 ? 'en' : ''} wilt verwijderen?`,
      [
        {
          text: 'Annuleren',
          style: 'cancel',
        },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: () => {
            const selectedIds = selectedEntries.map(entry => entry.id);
            if (state.entryType === 'income') {
              removeMultipleIncomes(selectedIds);
            } else {
              removeMultipleExpenses(selectedIds);
            }
            clearSelection();
            Alert.alert('Succes', `${selectedEntries.length} post${selectedEntries.length > 1 ? 'en' : ''} verwijderd`);
          },
        },
      ]
    );
  }, [getSelectedEntries, state.entryType, removeMultipleIncomes, removeMultipleExpenses, clearSelection]);
  
  const downloadSelectedImages = useCallback(async () => {
    const selectedEntries = getSelectedEntries().filter(entry => entry.imageUri);
    if (selectedEntries.length === 0) {
      Alert.alert('Geen Afbeeldingen', 'Geen van de geselecteerde posten heeft een afbeelding');
      return;
    }
    
    try {
      if (Platform.OS === 'web') {
        // For web, download each image
        selectedEntries.forEach((entry, index) => {
          setTimeout(() => {
            const link = document.createElement('a');
            link.href = entry.imageUri!;
            link.download = `${entry.name}_${entry.date}.jpg`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
          }, index * 100); // Small delay between downloads
        });
        Alert.alert('Succes', `${selectedEntries.length} afbeelding${selectedEntries.length > 1 ? 'en' : ''} gedownload!`);
      } else {
        // For mobile, save to device
        let successCount = 0;
        for (const entry of selectedEntries) {
          try {
            const fileName = `${entry.name}_${entry.date}.jpg`;
            const fileUri = `${FileSystem.documentDirectory}${fileName}`;
            
            await FileSystem.copyAsync({
              from: entry.imageUri!,
              to: fileUri,
            });
            successCount++;
          } catch (error) {
            console.error(`Error downloading image for ${entry.name}:`, error);
          }
        }
        
        Alert.alert(
          'Download Voltooid',
          `${successCount} van ${selectedEntries.length} afbeelding${selectedEntries.length > 1 ? 'en' : ''} opgeslagen`
        );
      }
      clearSelection();
    } catch (error) {
      console.error('Error downloading images:', error);
      Alert.alert('Fout', 'Kon afbeeldingen niet downloaden');
    }
  }, [getSelectedEntries, clearSelection]);
  
  const shareSelectedImages = useCallback(async () => {
    if (Platform.OS === 'web') {
      Alert.alert('Niet Beschikbaar', 'Delen is niet beschikbaar op web');
      return;
    }
    
    const selectedEntries = getSelectedEntries().filter(entry => entry.imageUri);
    if (selectedEntries.length === 0) {
      Alert.alert('Geen Afbeeldingen', 'Geen van de geselecteerde posten heeft een afbeelding');
      return;
    }
    
    try {
      if (await Sharing.isAvailableAsync()) {
        if (selectedEntries.length === 1) {
          await Sharing.shareAsync(selectedEntries[0].imageUri!, {
            mimeType: 'image/jpeg',
            dialogTitle: 'Afbeelding delen',
          });
        } else {
          // For multiple images, we'll share them one by one
          // This is a limitation of the sharing API
          for (const entry of selectedEntries) {
            await Sharing.shareAsync(entry.imageUri!, {
              mimeType: 'image/jpeg',
              dialogTitle: `${entry.name} delen`,
            });
          }
        }
        clearSelection();
      } else {
        Alert.alert('Niet Beschikbaar', 'Delen is niet beschikbaar op dit apparaat');
      }
    } catch (error) {
      console.error('Error sharing images:', error);
      Alert.alert('Fout', 'Kon afbeeldingen niet delen');
    }
  }, [getSelectedEntries, clearSelection]);
  
  return {
    ...state,
    startSelection,
    toggleSelection,
    clearSelection,
    selectAll,
    getSelectedEntries,
    deleteSelected,
    downloadSelectedImages,
    shareSelectedImages,
  };
});