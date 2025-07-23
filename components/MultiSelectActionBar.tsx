import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Platform } from 'react-native';
import { X, Trash2, Download, Share, CheckSquare } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useMultiSelect } from '@/store/multiSelectStore';
import { FinanceEntry } from '@/types/finance';

interface MultiSelectActionBarProps {
  entries: FinanceEntry[];
}

export default function MultiSelectActionBar({ entries }: MultiSelectActionBarProps) {
  const {
    selectedIds,
    isSelectionMode,
    clearSelection,
    selectAll,
    deleteSelected,
    downloadSelectedImages,
    shareSelectedImages,
    getSelectedEntries,
  } = useMultiSelect();

  if (!isSelectionMode) return null;

  const selectedCount = selectedIds.size;
  const allSelected = selectedCount === entries.length;
  const selectedEntries = getSelectedEntries();
  const hasImages = selectedEntries.some(entry => entry.imageUri);

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(entries);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.leftSection}>
        <TouchableOpacity
          style={styles.closeButton}
          onPress={clearSelection}
          testID="close-selection"
        >
          <X size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.countText}>
          {selectedCount} geselecteerd
        </Text>
      </View>

      <View style={styles.rightSection}>
        <TouchableOpacity
          style={styles.actionButton}
          onPress={handleSelectAll}
          testID="select-all"
        >
          <CheckSquare 
            size={20} 
            color={allSelected ? Colors.primary : Colors.lightText} 
          />
          <Text style={[
            styles.actionButtonText,
            { color: allSelected ? Colors.primary : Colors.lightText }
          ]}>
            {allSelected ? 'Deselecteer' : 'Alles'}
          </Text>
        </TouchableOpacity>

        {hasImages && (
          <>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={downloadSelectedImages}
              testID="download-images"
            >
              <Download size={20} color={Colors.text} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            {Platform.OS !== 'web' && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={shareSelectedImages}
                testID="share-images"
              >
                <Share size={20} color={Colors.text} />
                <Text style={styles.actionButtonText}>Delen</Text>
              </TouchableOpacity>
            )}
          </>
        )}

        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={deleteSelected}
          testID="delete-selected"
        >
          <Trash2 size={20} color={Colors.danger} />
          <Text style={[styles.actionButtonText, { color: Colors.danger }]}>
            Verwijder
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    elevation: 4,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
    marginRight: 12,
  },
  countText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: Colors.background,
  },
  deleteButton: {
    backgroundColor: Colors.background,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 4,
  },
});