import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Platform, Alert } from 'react-native';
import { useRouter } from 'expo-router';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import YearPicker from '@/components/YearPicker';
import QuarterPicker from '@/components/QuarterPicker';
import SummaryCard from '@/components/SummaryCard';
import { calculateMonthlySummary, filterEntriesByYear, filterEntriesByQuarter, formatCurrency } from '@/utils/finance';

export default function OverviewScreen() {
  const router = useRouter();
  const { 
    incomes, 
    expenses, 
    yearSelection, 
    quarterSelection, 
    setYearSelection, 
    setQuarterSelection, 
    startingCapital,
    incomeDisplayMode 
  } = useFinanceStore();
  
  const filteredIncomes = useMemo(
    () => filterEntriesByYear(incomes, yearSelection.year),
    [incomes, yearSelection]
  );
  
  const filteredExpenses = useMemo(
    () => filterEntriesByYear(expenses, yearSelection.year),
    [expenses, yearSelection]
  );
  
  const quarterIncomes = useMemo(
    () => filterEntriesByQuarter(incomes, quarterSelection.year, quarterSelection.quarter),
    [incomes, quarterSelection]
  );
  
  const quarterExpenses = useMemo(
    () => filterEntriesByQuarter(expenses, quarterSelection.year, quarterSelection.quarter),
    [expenses, quarterSelection]
  );
  
  const summary = useMemo(
    () => calculateMonthlySummary(filteredIncomes, filteredExpenses),
    [filteredIncomes, filteredExpenses]
  );
  
  const quarterSummary = useMemo(
    () => calculateMonthlySummary(quarterIncomes, quarterExpenses),
    [quarterIncomes, quarterExpenses]
  );
  
  const incomeExVat = useMemo(
    () => summary.totalIncome - summary.vatToPay,
    [summary.totalIncome, summary.vatToPay]
  );
  
  const netBalanceExVat = useMemo(
    () => incomeExVat - summary.totalExpense,
    [incomeExVat, summary.totalExpense]
  );
  
  // Calculate total balance including starting capital
  const totalBalance = useMemo(
    () => startingCapital + summary.netAmount,
    [startingCapital, summary.netAmount]
  );
  
  const handleYearChange = (year: number) => {
    setYearSelection({ year });
  };
  
  const handleQuarterChange = (year: number, quarter: number) => {
    setQuarterSelection({ year, quarter });
  };
  
  // Determine which columns to show based on preference
  const showInclVat = incomeDisplayMode === 'both' || incomeDisplayMode === 'inclVat';
  const showExVat = incomeDisplayMode === 'both' || incomeDisplayMode === 'exVat';
  
  // Add Android debug info
  const handleDebugPress = () => {
    Alert.alert(
      'Debug Info',
      `Platform: ${Platform.OS}\nVersion: ${Platform.Version}\nEntries: ${incomes.length + expenses.length}`,
      [{ text: 'OK' }]
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>Financieel Overzicht</Text>
        <YearPicker
          year={yearSelection.year}
          onSelect={handleYearChange}
        />
      </View>
      
      {startingCapital > 0 && (
        <View style={styles.startingCapitalSection}>
          <View style={styles.startingCapitalCard}>
            <Text style={styles.startingCapitalTitle}>Startkapitaal</Text>
            <Text style={[styles.startingCapitalAmount, { color: Colors.primary }]}>
              {formatCurrency(startingCapital)}
            </Text>
          </View>
          
          <View style={styles.startingCapitalCard}>
            <Text style={styles.startingCapitalTitle}>Totaal Saldo</Text>
            <Text
              style={[
                styles.startingCapitalAmount,
                { color: totalBalance >= 0 ? Colors.success : Colors.danger },
              ]}
            >
              {formatCurrency(totalBalance)}
            </Text>
          </View>
        </View>
      )}
      
      <View style={styles.mainContainer}>
        <View style={styles.columnsContainer}>
          {showInclVat && (
            <View style={[styles.column, !showExVat && styles.singleColumn]}>
              <View style={styles.columnCard}>
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle}>Totaal Inkomen incl BTW</Text>
                  <Text style={[styles.cardAmount, { color: Colors.success }]}>
                    {formatCurrency(summary.totalIncome)}
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle}>Totaal Uitgaven</Text>
                  <Text style={[styles.cardAmount, { color: Colors.danger }]}>
                    {formatCurrency(summary.totalExpense)}
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle}>Netto Saldo incl BTW</Text>
                  <Text
                    style={[
                      styles.cardAmount,
                      { color: summary.netAmount >= 0 ? Colors.success : Colors.danger },
                    ]}
                  >
                    {formatCurrency(summary.netAmount)}
                  </Text>
                </View>
              </View>
            </View>
          )}
          
          {showExVat && (
            <View style={[styles.column, !showInclVat && styles.singleColumn]}>
              <View style={styles.columnCard}>
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle}>Totaal Inkomen ex BTW</Text>
                  <Text style={[styles.cardAmount, { color: Colors.success }]}>
                    {formatCurrency(incomeExVat)}
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle}>Totaal Uitgaven</Text>
                  <Text style={[styles.cardAmount, { color: Colors.danger }]}>
                    {formatCurrency(summary.totalExpense)}
                  </Text>
                </View>
                <View style={styles.cardDivider} />
                <View style={styles.cardItem}>
                  <Text style={styles.cardTitle}>Netto Saldo ex BTW</Text>
                  <Text
                    style={[
                      styles.cardAmount,
                      { color: netBalanceExVat >= 0 ? Colors.success : Colors.danger },
                    ]}
                  >
                    {formatCurrency(netBalanceExVat)}
                  </Text>
                </View>
              </View>
            </View>
          )}
        </View>
        
        <View style={styles.vatSection}>
          <View style={styles.quarterPickerContainer}>
            <Text style={styles.vatSectionTitle}>BTW Overzicht</Text>
            <QuarterPicker
              year={quarterSelection.year}
              quarter={quarterSelection.quarter}
              onSelect={handleQuarterChange}
            />
          </View>
          
          <View style={styles.vatContainer}>
            <View style={styles.vatCard}>
              <Text style={styles.vatTitle}>BTW te Betalen</Text>
              <Text style={[styles.vatAmount, { color: Colors.danger }]}>
                {formatCurrency(quarterSummary.vatToPay)}
              </Text>
            </View>
            
            <View style={styles.vatCard}>
              <Text style={styles.vatTitle}>BTW te Vorderen</Text>
              <Text style={[styles.vatAmount, { color: Colors.success }]}>
                {formatCurrency(quarterSummary.vatToClaim)}
              </Text>
            </View>
            
            <View style={styles.vatCard}>
              <Text style={styles.vatTitle}>Netto BTW</Text>
              <Text
                style={[
                  styles.vatAmount,
                  {
                    color:
                      quarterSummary.vatToPay - quarterSummary.vatToClaim >= 0
                        ? Colors.danger
                        : Colors.success,
                  },
                ]}
              >
                {formatCurrency(quarterSummary.vatToPay - quarterSummary.vatToClaim)}
              </Text>
            </View>
          </View>
        </View>
      </View>
      
      <View style={styles.statsContainer}>
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/financial-analysis')}
        >
          <Text style={styles.statLabel}>Inkomen Posten</Text>
          <Text style={styles.statValue}>{filteredIncomes.length}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.statCard}
          onPress={() => router.push('/financial-analysis')}
        >
          <Text style={styles.statLabel}>Uitgaven Posten</Text>
          <Text style={styles.statValue}>{filteredExpenses.length}</Text>
        </TouchableOpacity>
      </View>
      
      <TouchableOpacity
        style={styles.annualReportButton}
        onPress={() => router.push('/annual-report')}
      >
        <Text style={styles.annualReportButtonText}>Jaarrekening</Text>
      </TouchableOpacity>
    </ScrollView>
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
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 10,
  },
  startingCapitalSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
  },
  startingCapitalCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  startingCapitalTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
    textAlign: 'center',
  },
  startingCapitalAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  mainContainer: {
    marginTop: 16,
  },
  columnsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  column: {
    flex: 1,
    marginHorizontal: 4,
  },
  singleColumn: {
    marginHorizontal: 16,
  },
  columnCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  cardItem: {
    alignItems: 'center',
    paddingVertical: 8,
  },
  cardDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  cardTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
    textAlign: 'center',
  },
  cardAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vatSection: {
    marginHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quarterPickerContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  vatSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 8,
  },
  vatContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  vatCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginHorizontal: 4,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vatTitle: {
    fontSize: 12,
    color: Colors.lightText,
    marginBottom: 4,
    textAlign: 'center',
  },
  vatAmount: {
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  statsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  statValue: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  annualReportButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    padding: 16,
    margin: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 32,
  },
  annualReportButtonText: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
  },
});