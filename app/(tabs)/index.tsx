import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { useRouter } from 'expo-router';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import YearPicker from '@/components/YearPicker';
import SummaryCard from '@/components/SummaryCard';
import { calculateMonthlySummary, filterEntriesByYear, formatCurrency } from '@/utils/finance';

export default function OverviewScreen() {
  const router = useRouter();
  const { incomes, expenses, yearSelection, setYearSelection } = useFinanceStore();
  
  const filteredIncomes = useMemo(
    () => filterEntriesByYear(incomes, yearSelection.year),
    [incomes, yearSelection]
  );
  
  const filteredExpenses = useMemo(
    () => filterEntriesByYear(expenses, yearSelection.year),
    [expenses, yearSelection]
  );
  
  const summary = useMemo(
    () => calculateMonthlySummary(filteredIncomes, filteredExpenses),
    [filteredIncomes, filteredExpenses]
  );
  
  const incomeExVat = useMemo(
    () => summary.totalIncome - summary.vatToPay,
    [summary.totalIncome, summary.vatToPay]
  );
  
  const netBalanceExVat = useMemo(
    () => incomeExVat - summary.totalExpense,
    [incomeExVat, summary.totalExpense]
  );
  
  const handleYearChange = (year: number) => {
    setYearSelection({ year });
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
      
      <View style={styles.summaryContainer}>
        <View style={styles.rowContainer}>
          <View style={styles.cardContainer}>
            <SummaryCard
              title="Totaal Inkomen incl BTW"
              amount={summary.totalIncome}
              isPositive={true}
            />
          </View>
          <View style={styles.cardContainer}>
            <SummaryCard
              title="Totaal Inkomen ex BTW"
              amount={incomeExVat}
              isPositive={true}
            />
          </View>
        </View>
        
        <SummaryCard
          title="Totaal Uitgaven"
          amount={summary.totalExpense}
          isPositive={false}
        />
      </View>
      
      <View style={styles.balanceContainer}>
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Netto Saldo incl BTW</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: summary.netAmount >= 0 ? Colors.success : Colors.danger },
            ]}
          >
            {formatCurrency(summary.netAmount)}
          </Text>
        </View>
        
        <View style={styles.balanceCard}>
          <Text style={styles.balanceTitle}>Netto Saldo ex BTW</Text>
          <Text
            style={[
              styles.balanceAmount,
              { color: netBalanceExVat >= 0 ? Colors.success : Colors.danger },
            ]}
          >
            {formatCurrency(netBalanceExVat)}
          </Text>
        </View>
      </View>
      
      <View style={styles.vatContainer}>
        <View style={styles.vatCard}>
          <Text style={styles.vatTitle}>BTW te Betalen</Text>
          <Text style={[styles.vatAmount, { color: Colors.danger }]}>
            {formatCurrency(summary.vatToPay)}
          </Text>
        </View>
        
        <View style={styles.vatCard}>
          <Text style={styles.vatTitle}>BTW te Vorderen</Text>
          <Text style={[styles.vatAmount, { color: Colors.success }]}>
            {formatCurrency(summary.vatToClaim)}
          </Text>
        </View>
      </View>
      
      <View style={styles.netVatCard}>
        <Text style={styles.netVatTitle}>Netto BTW</Text>
        <Text
          style={[
            styles.netVatAmount,
            {
              color:
                summary.vatToPay - summary.vatToClaim >= 0
                  ? Colors.danger
                  : Colors.success,
            },
          ]}
        >
          {formatCurrency(summary.vatToPay - summary.vatToClaim)}
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Inkomen Posten</Text>
          <Text style={styles.statValue}>{filteredIncomes.length}</Text>
        </View>
        
        <View style={styles.statCard}>
          <Text style={styles.statLabel}>Uitgaven Posten</Text>
          <Text style={styles.statValue}>{filteredExpenses.length}</Text>
        </View>
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
  summaryContainer: {
    marginTop: 16,
  },
  rowContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
  },
  cardContainer: {
    flex: 1,
    marginRight: 8,
  },
  balanceContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
  },
  balanceCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    marginRight: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  balanceTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
    textAlign: 'center',
  },
  balanceAmount: {
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  vatContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
  },
  vatCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginRight: 8,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  vatTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  vatAmount: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  netVatCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  netVatTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  netVatAmount: {
    fontSize: 24,
    fontWeight: 'bold',
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