import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, FlatList } from 'react-native';
import { ChevronDown } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { getMonthName } from '@/utils/finance';

interface MonthYearPickerProps {
  year: number;
  month: number;
  onSelect: (year: number, month: number) => void;
}

export default function MonthYearPicker({ year, month, onSelect }: MonthYearPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedType, setSelectedType] = useState<'month' | 'year'>('month');
  
  const currentYear = new Date().getFullYear();
  const years = Array.from({ length: 5 }, (_, i) => currentYear - 2 + i);
  const months = Array.from({ length: 12 }, (_, i) => i + 1);
  
  const handleSelect = (value: number) => {
    if (selectedType === 'month') {
      onSelect(year, value);
    } else {
      onSelect(value, month);
    }
    setModalVisible(false);
  };
  
  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.selector}
        onPress={() => {
          setSelectedType('month');
          setModalVisible(true);
        }}
      >
        <Text style={styles.selectorText}>{getMonthName(month)}</Text>
        <ChevronDown size={16} color={Colors.text} />
      </TouchableOpacity>
      
      <TouchableOpacity
        style={styles.selector}
        onPress={() => {
          setSelectedType('year');
          setModalVisible(true);
        }}
      >
        <Text style={styles.selectorText}>{year}</Text>
        <ChevronDown size={16} color={Colors.text} />
      </TouchableOpacity>
      
      <Modal
        transparent
        visible={modalVisible}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setModalVisible(false)}
        >
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>
              {selectedType === 'month' ? 'Selecteer Maand' : 'Selecteer Jaar'}
            </Text>
            
            <FlatList
              data={selectedType === 'month' ? months : years}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.optionItem,
                    (selectedType === 'month' && item === month) ||
                    (selectedType === 'year' && item === year)
                      ? styles.selectedOption
                      : null,
                  ]}
                  onPress={() => handleSelect(item)}
                >
                  <Text style={styles.optionText}>
                    {selectedType === 'month' ? getMonthName(item) : item}
                  </Text>
                </TouchableOpacity>
              )}
            />
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: 10,
  },
  selector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.card,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  selectorText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginRight: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '80%',
    maxHeight: '60%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    textAlign: 'center',
    color: Colors.text,
  },
  optionItem: {
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 8,
  },
  selectedOption: {
    backgroundColor: Colors.primary,
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
});