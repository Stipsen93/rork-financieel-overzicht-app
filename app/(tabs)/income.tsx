import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, FlatList } from 'react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import MonthYearPicker from '@/components/MonthYearPicker';
import SummaryCard from '@/components/SummaryCard';
import FinanceEntryItem from '@/components/FinanceEntryItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import EntryForm from '@/components/EntryForm';
import SearchBar from '@/components/SearchBar';
import { filterEntriesByMonth } from '@/utils/finance';

export default function IncomeScreen() {
  const [showForm, setShowForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { incomes, dateSelection, setDateSelection, removeIncome } = useFinanceStore();
  
  const filteredIncomes = useMemo(
    () => filterEntriesByMonth(incomes, dateSelection.year, dateSelection.month)
      .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()),
    [incomes, dateSelection]
  );

  const searchedIncomes = useMemo(() => {
    if (!searchQuery.trim()) return filteredIncomes;
    
    const query = searchQuery.toLowerCase();
    return filteredIncomes.filter(income => 
      income.name.toLowerCase().includes(query) ||
      income.amount.toString().includes(query) ||
      new Date(income.date).toLocaleDateString('nl-NL').includes(query)
    );
  }, [filteredIncomes, searchQuery]);
  
  const totalIncome = useMemo(
    () => filteredIncomes.reduce((sum, income) => sum + income.amount, 0),
    [filteredIncomes]
  );
  
  const totalVat = useMemo(
    () => filteredIncomes.reduce((sum, income) => sum + income.vatAmount, 0),
    [filteredIncomes]
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
        <SummaryCard title="Totaal Inkomen" amount={totalIncome} isPositive={true} />
        <SummaryCard title="BTW te Betalen" amount={totalVat} isPositive={false} />
      </View>
      
      <SearchBar
        value={searchQuery}
        onChangeText={setSearchQuery}
        placeholder="Zoek op naam, bedrag of datum..."
      />
      
      <View style={styles.listContainer}>
        <Text style={styles.listTitle}>
          Inkomen Posten {searchQuery ? `(${searchedIncomes.length} van ${filteredIncomes.length})` : ''}
        </Text>
        
        {searchedIncomes.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyStateText}>
              {searchQuery 
                ? `Geen inkomen posten gevonden voor "${searchQuery}"`
                : 'Geen inkomen posten voor deze maand'
              }
            </Text>
          </View>
        ) : (
          <FlatList
            data={searchedIncomes}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) => (
              <FinanceEntryItem entry={item} onDelete={removeIncome} />
            )}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContent}
          />
        )}
      </View>
      
      <FloatingActionButton type="income" onPress={() => setShowForm(true)} />
      
      <EntryForm
        type="income"
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
    marginTop: 8,
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
    paddingHorizontal: 20,
  },
});