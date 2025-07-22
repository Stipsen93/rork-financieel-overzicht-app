import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { useFinanceStore } from '@/store/financeStore';
import { FinanceEntry } from '@/types/finance';
import Colors from '@/constants/colors';
import MonthYearPicker from '@/components/MonthYearPicker';
import SummaryCard from '@/components/SummaryCard';
import FinanceEntryItem from '@/components/FinanceEntryItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import EntryForm from '@/components/EntryForm';
import SearchBar from '@/components/SearchBar';
import { filterEntriesByMonth } from '@/utils/finance';

export default function ExpensesScreen() {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editEntry, setEditEntry] = useState<FinanceEntry | undefined>(undefined);
  const { expenses, dateSelection, setDateSelection, removeExpense } = useFinanceStore();
  
  const filteredExpenses = useMemo(
    () => filterEntriesByMonth(expenses, dateSelection.year, dateSelection.month)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [expenses, dateSelection]
  );

  const searchedExpenses = useMemo(() => {
    if (!searchQuery.trim()) return filteredExpenses;
    
    const query = searchQuery.toLowerCase();
    return filteredExpenses.filter(expense => 
      expense.name.toLowerCase().includes(query) ||
      expense.amount.toString().includes(query) ||
      new Date(expense.date).toLocaleDateString('nl-NL').includes(query)
    );
  }, [filteredExpenses, searchQuery]);
  
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
  
  const handleEdit = (entry: FinanceEntry) => {
    setEditEntry(entry);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setEditEntry(undefined);
  };
  
  return (
    <View style={styles.container}>
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={[0]}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.header}>
            <MonthYearPicker
              year={dateSelection.year}
              month={dateSelection.month}
              onSelect={handleDateChange}
            />
          </View>
          
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Zoek op naam, bedrag of datum..."
          />
        </View>
        
        <View style={styles.summaryContainer}>
          <SummaryCard title="Totaal Uitgaven" amount={totalExpense} isPositive={false} />
          <SummaryCard title="BTW te Vorderen" amount={totalVat} isPositive={true} />
        </View>
        
        <View style={styles.listContainer}>
          <Text style={styles.listTitle}>
            Uitgaven Posten {searchQuery ? `(${searchedExpenses.length} van ${filteredExpenses.length})` : ''}
          </Text>
          
          {searchedExpenses.length === 0 ? (
            <View style={styles.emptyState}>
              <Text style={styles.emptyStateText}>
                {searchQuery 
                  ? `Geen uitgaven posten gevonden voor "${searchQuery}"`
                  : 'Geen uitgaven posten voor deze maand'
                }
              </Text>
            </View>
          ) : (
            <View style={styles.listWrapper}>
              {searchedExpenses.map((item) => (
                <FinanceEntryItem 
                  key={item.id} 
                  entry={item} 
                  onDelete={removeExpense}
                  onEdit={handleEdit}
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      <FloatingActionButton type="expense" onPress={() => setShowForm(true)} />
      
      <EntryForm
        type="expense"
        visible={showForm}
        onClose={handleCloseForm}
        editEntry={editEntry}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContainer: {
    flex: 1,
  },
  stickyHeader: {
    backgroundColor: Colors.background,
    zIndex: 1000,
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
    marginTop: 8,
    paddingBottom: 100,
  },
  listWrapper: {
    paddingHorizontal: 16,
  },
  listTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginHorizontal: 16,
    marginBottom: 8,
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
    paddingHorizontal: 20,
  },
});