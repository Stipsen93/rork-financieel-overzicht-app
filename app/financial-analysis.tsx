import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Stack } from 'expo-router';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import { calculateMonthlySummary, filterEntriesByYear, formatCurrency } from '@/utils/finance';
type TimeFrame = '3months' | '6months' | '1year';

export default function FinancialAnalysisScreen() {
  const { incomes, expenses, yearSelection, startingCapital } = useFinanceStore();
  const [selectedTimeFrame, setSelectedTimeFrame] = useState<TimeFrame>('6months');
  
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
  
  // Calculate expense percentage of income
  const expensePercentage = useMemo(() => {
    if (summary.totalIncome === 0) return 0;
    return Math.round((summary.totalExpense / summary.totalIncome) * 100);
  }, [summary.totalIncome, summary.totalExpense]);
  
  // Calculate savings scenarios
  const savingsScenarios = useMemo(() => {
    const monthlyIncome = summary.totalIncome / 12;
    const scenarios: { timeFrame: TimeFrame; label: string; months: number }[] = [
      { timeFrame: '3months', label: '3 maanden', months: 3 },
      { timeFrame: '6months', label: '6 maanden', months: 6 },
      { timeFrame: '1year', label: '1 jaar', months: 12 },
    ];
    
    return scenarios.map(scenario => ({
      ...scenario,
      savings: [10, 20, 30].map(rate => ({
        rate,
        amount: monthlyIncome * (rate / 100) * scenario.months,
      })),
    }));
  }, [summary.totalIncome]);
  
  const currentScenario = savingsScenarios.find(s => s.timeFrame === selectedTimeFrame);
  
  // Simple chart data (for display without complex charts)
  const chartData = [
    { label: 'Inkomen', value: summary.totalIncome, color: Colors.success },
    { label: 'Uitgaven', value: summary.totalExpense, color: Colors.danger },
    { label: 'Netto', value: summary.netAmount, color: Colors.primary },
  ];
  
  const maxValue = Math.max(summary.totalIncome, summary.totalExpense);
  
  return (
    <>
      <Stack.Screen 
        options={{ 
          title: 'Financiële Analyse',
          headerStyle: { backgroundColor: Colors.secondary },
          headerTitleStyle: { color: Colors.text },
        }} 
      />
      
      <ScrollView style={styles.container}>
        {/* Overview Cards */}
        <View style={styles.overviewSection}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>Totaal Inkomen</Text>
            <Text style={[styles.overviewAmount, { color: Colors.success }]}>
              {formatCurrency(summary.totalIncome)}
            </Text>
          </View>
          
          <View style={styles.overviewCard}>
            <Text style={styles.overviewTitle}>Totaal Uitgaven</Text>
            <Text style={[styles.overviewAmount, { color: Colors.danger }]}>
              {formatCurrency(summary.totalExpense)}
            </Text>
          </View>
        </View>
        
        {/* Expense Percentage */}
        <View style={styles.percentageSection}>
          <View style={styles.percentageCard}>
            <Text style={styles.percentageTitle}>Uitgaven als % van Inkomen</Text>
            <Text style={[styles.percentageValue, { 
              color: expensePercentage > 80 ? Colors.danger : 
                     expensePercentage > 60 ? '#FFA726' : Colors.success 
            }]}>
              {expensePercentage}%
            </Text>
            <Text style={styles.percentageSubtext}>
              {expensePercentage > 80 ? 'Hoog uitgavenpatroon' :
               expensePercentage > 60 ? 'Gemiddeld uitgavenpatroon' : 'Gezond uitgavenpatroon'}
            </Text>
          </View>
        </View>
        
        {/* Visual Chart */}
        <View style={styles.chartSection}>
          <Text style={styles.sectionTitle}>Financieel Overzicht</Text>
          <View style={styles.chartContainer}>
            {chartData.map((item, index) => {
              const percentage = maxValue > 0 ? (Math.abs(item.value) / maxValue) * 100 : 0;
              return (
                <View key={index} style={styles.chartItem}>
                  <View style={styles.chartLabelContainer}>
                    <View style={[styles.chartColorIndicator, { backgroundColor: item.color }]} />
                    <Text style={styles.chartLabel}>{item.label}</Text>
                  </View>
                  <View style={styles.chartBarContainer}>
                    <View 
                      style={[
                        styles.chartBar, 
                        { 
                          width: `${Math.max(percentage, 5)}%`, 
                          backgroundColor: item.color 
                        }
                      ]} 
                    />
                  </View>
                  <Text style={[styles.chartValue, { color: item.color }]}>
                    {formatCurrency(item.value)}
                  </Text>
                </View>
              );
            })}
          </View>
        </View>
        
        {/* Savings Scenarios */}
        <View style={styles.savingsSection}>
          <Text style={styles.sectionTitle}>Spaarscenario's</Text>
          <Text style={styles.savingsSubtitle}>
            Hoeveel zou je hebben gespaard als je de afgelopen periode een percentage had gespaard?
          </Text>
          
          {/* Time Frame Selector */}
          <View style={styles.timeFrameSelector}>
            {savingsScenarios.map((scenario) => (
              <TouchableOpacity
                key={scenario.timeFrame}
                style={[
                  styles.timeFrameButton,
                  selectedTimeFrame === scenario.timeFrame && styles.timeFrameButtonActive
                ]}
                onPress={() => setSelectedTimeFrame(scenario.timeFrame)}
              >
                <Text style={[
                  styles.timeFrameButtonText,
                  selectedTimeFrame === scenario.timeFrame && styles.timeFrameButtonTextActive
                ]}>
                  {scenario.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
          
          {/* Savings Table */}
          {currentScenario && (
            <View style={styles.savingsTable}>
              <View style={styles.tableHeader}>
                <Text style={styles.tableHeaderText}>Spaarpercentage</Text>
                <Text style={styles.tableHeaderText}>Gespaard Bedrag</Text>
                <Text style={styles.tableHeaderText}>Totaal Saldo*</Text>
              </View>
              
              {currentScenario.savings.map((saving) => (
                <View key={saving.rate} style={styles.tableRow}>
                  <Text style={styles.tableCell}>{saving.rate}%</Text>
                  <Text style={[styles.tableCell, { color: Colors.success }]}>
                    {formatCurrency(saving.amount)}
                  </Text>
                  <Text style={[styles.tableCell, { color: Colors.primary, fontWeight: 'bold' }]}>
                    {formatCurrency(startingCapital + saving.amount)}
                  </Text>
                </View>
              ))}
              
              <Text style={styles.tableFootnote}>
                * Inclusief startkapitaal van {formatCurrency(startingCapital)}
              </Text>
            </View>
          )}
        </View>
        
        {/* Insights */}
        <View style={styles.insightsSection}>
          <Text style={styles.sectionTitle}>Inzichten</Text>
          <View style={styles.insightCard}>
            <Text style={styles.insightText}>
              • Je geeft {expensePercentage}% van je inkomen uit
            </Text>
            <Text style={styles.insightText}>
              • Je netto saldo is {formatCurrency(summary.netAmount)}
            </Text>
            <Text style={styles.insightText}>
              • Gemiddeld maandelijks inkomen: {formatCurrency(summary.totalIncome / 12)}
            </Text>
            <Text style={styles.insightText}>
              • Gemiddelde maandelijkse uitgaven: {formatCurrency(summary.totalExpense / 12)}
            </Text>
          </View>
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  overviewSection: {
    flexDirection: 'row',
    marginHorizontal: 16,
    marginTop: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  overviewTitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 8,
    textAlign: 'center',
  },
  overviewAmount: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  percentageSection: {
    marginHorizontal: 16,
    marginTop: 16,
  },
  percentageCard: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  percentageTitle: {
    fontSize: 16,
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  percentageValue: {
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  percentageSubtext: {
    fontSize: 12,
    color: Colors.lightText,
    textAlign: 'center',
  },
  chartSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  chartContainer: {
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
  chartItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  chartLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    width: 80,
  },
  chartColorIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  chartLabel: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  chartBarContainer: {
    flex: 1,
    height: 20,
    backgroundColor: Colors.background,
    borderRadius: 10,
    marginHorizontal: 12,
    overflow: 'hidden',
  },
  chartBar: {
    height: '100%',
    borderRadius: 10,
  },
  chartValue: {
    fontSize: 12,
    fontWeight: 'bold',
    width: 80,
    textAlign: 'right',
  },
  savingsSection: {
    marginHorizontal: 16,
    marginTop: 24,
  },
  savingsSubtitle: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 20,
  },
  timeFrameSelector: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  timeFrameButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  timeFrameButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  timeFrameButtonText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  timeFrameButtonTextActive: {
    color: Colors.secondary,
    fontWeight: 'bold',
  },
  savingsTable: {
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
  tableHeader: {
    flexDirection: 'row',
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    marginBottom: 8,
  },
  tableHeaderText: {
    flex: 1,
    fontSize: 14,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
  },
  tableCell: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  tableFootnote: {
    fontSize: 12,
    color: Colors.lightText,
    marginTop: 12,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  insightsSection: {
    marginHorizontal: 16,
    marginTop: 24,
    marginBottom: 32,
  },
  insightCard: {
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
  insightText: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
    lineHeight: 20,
  },
});