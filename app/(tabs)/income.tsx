import React, { useState, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { DollarSign } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import { FinanceEntry } from '@/types/finance';
import Colors from '@/constants/colors';
import MonthYearPicker from '@/components/MonthYearPicker';
import SummaryCard from '@/components/SummaryCard';
import FinanceEntryItem from '@/components/FinanceEntryItem';
import FloatingActionButton from '@/components/FloatingActionButton';
import EntryForm from '@/components/EntryForm';
import SearchBar from '@/components/SearchBar';
import StartingCapitalForm from '@/components/StartingCapitalForm';
import MultiSelectActionBar from '@/components/MultiSelectActionBar';
import { filterEntriesByMonth, formatCurrency } from '@/utils/finance';
import { useMultiSelect } from '@/store/multiSelectStore';

export default function IncomeScreen() {
  const [showForm, setShowForm] = useState(false);
  const [showStartingCapitalForm, setShowStartingCapitalForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [editEntry, setEditEntry] = useState<FinanceEntry | undefined>(undefined);
  const { 
    incomes, 
    dateSelection, 
    setDateSelection, 
    removeIncome, 
    startingCapital, 
    showStartingCapital 
  } = useFinanceStore();
  
  const { isSelectionMode, clearSelection } = useMultiSelect();
  
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
  
  const handleEdit = (entry: FinanceEntry) => {
    if (isSelectionMode) {
      clearSelection();
      return;
    }
    setEditEntry(entry);
    setShowForm(true);
  };
  
  const handleCloseForm = () => {
    setShowForm(false);
    setEditEntry(undefined);
  };
  
  const handleAddNew = () => {
    if (isSelectionMode) {
      clearSelection();
      return;
    }
    setShowForm(true);
  };
  
  return (
    <View style={styles.container}>
      <MultiSelectActionBar entries={searchedIncomes} />
      
      <ScrollView 
        style={styles.scrollContainer}
        showsVerticalScrollIndicator={false}
        stickyHeaderIndices={isSelectionMode ? [1] : [0]}
      >
        <View style={styles.stickyHeader}>
          <View style={styles.header}>
            <MonthYearPicker
              year={dateSelection.year}
              month={dateSelection.month}
              onSelect={handleDateChange}
            />
            
            {showStartingCapital && (
              <TouchableOpacity
                style={styles.startingCapitalButton}
                onPress={() => setShowStartingCapitalForm(true)}
              >
                <DollarSign size={20} color={Colors.text} />
                <Text style={styles.startingCapitalButtonText}>Start Kapitaal</Text>
                {startingCapital > 0 && (
                  <Text style={styles.startingCapitalAmount}>
                    {formatCurrency(startingCapital)}
                  </Text>
                )}
              </TouchableOpacity>
            )}
          </View>
          
          <SearchBar
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder="Zoek op naam, bedrag of datum..."
          />
        </View>
        
        <View style={styles.summaryContainer}>
          <SummaryCard title="Totaal Inkomen" amount={totalIncome} isPositive={true} />
          <SummaryCard title="BTW te Betalen" amount={totalVat} isPositive={false} />
        </View>
        
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
            <View style={styles.listWrapper}>
              {searchedIncomes.map((item) => (
                <FinanceEntryItem 
                  key={item.id} 
                  entry={item} 
                  onDelete={removeIncome}
                  onEdit={handleEdit}
                  entryType="income"
                />
              ))}
            </View>
          )}
        </View>
      </ScrollView>
      
      <FloatingActionButton type="income" onPress={handleAddNew} />
      
      <EntryForm
        type="income"
        visible={showForm}
        onClose={handleCloseForm}
        editEntry={editEntry}
      />
      
      <StartingCapitalForm
        visible={showStartingCapitalForm}
        onClose={() => setShowStartingCapitalForm(false)}
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
  startingCapitalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
  },
  startingCapitalButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginLeft: 8,
  },
  startingCapitalAmount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.success,
    marginLeft: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
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