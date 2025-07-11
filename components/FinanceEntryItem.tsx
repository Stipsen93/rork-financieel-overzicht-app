import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { Trash2 } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { FinanceEntry } from '@/types/finance';
import { formatCurrency, formatDate } from '@/utils/finance';

interface FinanceEntryItemProps {
  entry: FinanceEntry;
  onDelete: (id: string) => void;
}

export default function FinanceEntryItem({ entry, onDelete }: FinanceEntryItemProps) {
  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <View style={styles.header}>
          <Text style={styles.name}>{entry.name}</Text>
          <Text style={styles.date}>{formatDate(entry.date)}</Text>
        </View>
        
        <View style={styles.amounts}>
          <Text style={styles.amount}>{formatCurrency(entry.amount)}</Text>
          <Text style={styles.vatAmount}>
            BTW: {formatCurrency(entry.vatAmount)}
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => onDelete(entry.id)}
      >
        <Trash2 size={18} color={Colors.danger} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  date: {
    fontSize: 14,
    color: Colors.lightText,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  vatAmount: {
    fontSize: 14,
    color: Colors.lightText,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingLeft: 16,
  },
});