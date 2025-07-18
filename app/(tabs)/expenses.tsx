import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import MonthYearPicker from '@/components/MonthYearPicker';
import SummaryCard from '@/components/SummaryCard';
import FinanceEntryItem from '@/components/FinanceEntryItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import EntryForm from '@/components/EntryForm';
import { filterEntriesByMonth } from '@/utils/finance';

export default function ExpensesScreen() {
  const [showForm, setShowForm] = useState(false);
  const { expenses, dateSelection, setDateSelection, removeExpense } = useFinanceStore();
  
  const filteredExpenses = useMemo(
    () => filterEntriesByMonth(expenses, dateSelection.year, dateSelection.month)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [expenses, dateSelection]
  );
  
  const totalExpense = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.amount, 0),
    [filteredExpenses]
  );
  
  const totalVat = useMemo(
    () => filteredExpenses.reduce((sum, expense) => sum + expense.vatAmount, 0),
    [filteredExpenses]
  );
  
  const handleDateChange = (year: number, month: number) => {
    setDateSelection({ year, month });
  };
  
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MonthYearPicker
          year={dateSelection.year}
          month={dateSelection.month}
          onSelect={handleDateChange}
        />
      </View>
      
      <View style={styles.summaryContainer}>
        <SummaryCard title="Totaal Uitgaven" amount={totalExpense} isPositive={false} />
        <SummaryCard title="BTW te Vorderen" amount={totalVat} isPositive={true} />
      </View>
      
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>Uitgaven Posten</Text>
        
        {filteredExpenses.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              Geen uitgaven posten voor deze maand
            </Text>
          </View>
        ) : (
          <FlatList
            data={filteredExpenses}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FinanceEntryItem entry={item} onDelete={removeExpense} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
      
      <FloatingActionButton type="expense" onPress={() => setShowForm(true)} />
      
      <EntryForm
        type="expense"
        visible={showForm}
        onClose={() => setShowForm(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 16,
    backgroundColor: Colors.secondary,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  summaryContainer: {
    marginTop: 16,
  },
  listContainer: {
    flex: 1,
    marginTop: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginHorizontal: 16,
    marginBottom: 8,
  },
  listContent: {
    paddingBottom: 80,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 50,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
  },
});