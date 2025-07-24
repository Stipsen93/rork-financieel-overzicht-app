import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { Stack } from 'expo-router';
import { Receipt, Info, Copy } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

interface VATCalculation {
  totalIncome: number;
  totalExpenses: number;
  totalVATIncome: number;
  totalVATExpenses: number;
  vatToPayOrRefund: number;
  quarterlyData: {
    quarter: string;
    income: number;
    expenses: number;
    vatIncome: number;
    vatExpenses: number;
  }[];
}

export default function VATDeclarationScreen() {
  const { incomes, expenses, yearSelection } = useFinanceStore();
  
  const vatCalculation = useMemo((): VATCalculation => {
    const currentYear = yearSelection.year;
    
    // Filter entries for the selected year
    const yearIncomes = incomes.filter(income => 
      new Date(income.date).getFullYear() === currentYear
    );
    const yearExpenses = expenses.filter(expense => 
      new Date(expense.date).getFullYear() === currentYear
    );
    
    // Calculate totals
    const totalIncome = yearIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    const totalVATIncome = yearIncomes.reduce((sum, income) => sum + (income.vatAmount || 0), 0);
    const totalVATExpenses = yearExpenses.reduce((sum, expense) => sum + (expense.vatAmount || 0), 0);
    
    // Calculate quarterly data
    const quarterlyData = [];
    for (let quarter = 1; quarter <= 4; quarter++) {
      const quarterIncomes = yearIncomes.filter(income => {
        const month = new Date(income.date).getMonth() + 1;
        return month >= (quarter - 1) * 3 + 1 && month <= quarter * 3;
      });
      const quarterExpenses = yearExpenses.filter(expense => {
        const month = new Date(expense.date).getMonth() + 1;
        return month >= (quarter - 1) * 3 + 1 && month <= quarter * 3;
      });
      
      quarterlyData.push({
        quarter: `Q${quarter}`,
        income: quarterIncomes.reduce((sum, income) => sum + income.amount, 0),
        expenses: quarterExpenses.reduce((sum, expense) => sum + expense.amount, 0),
        vatIncome: quarterIncomes.reduce((sum, income) => sum + (income.vatAmount || 0), 0),
        vatExpenses: quarterExpenses.reduce((sum, expense) => sum + (expense.vatAmount || 0), 0),
      });
    }
    
    return {
      totalIncome,
      totalExpenses,
      totalVATIncome,
      totalVATExpenses,
      vatToPayOrRefund: totalVATIncome - totalVATExpenses,
      quarterlyData,
    };
  }, [incomes, expenses, yearSelection.year]);
  
  const copyToClipboard = async (text: string, label: string) => {
    await Clipboard.setStringAsync(text);
    Alert.alert('Gekopieerd', `${label} is gekopieerd naar het klembord`);
  };
  
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('nl-NL', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'BTW Aangifte',
          headerStyle: {
            backgroundColor: Colors.secondary,
          },
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: 'bold',
          },
        }}
      />
      
      <View style={styles.header}>
        <Receipt size={48} color={Colors.primary} />
        <Text style={styles.title}>BTW Aangifte {yearSelection.year}</Text>
        <Text style={styles.subtitle}>
          Overzicht van je BTW gegevens voor de belastingaangifte
        </Text>
      </View>
      
      {/* Annual Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Jaaroverzicht {yearSelection.year}</Text>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Totale omzet (incl. BTW)</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(vatCalculation.totalIncome.toFixed(2), 'Totale omzet')}
            >
              <Text style={styles.summaryValue}>{formatCurrency(vatCalculation.totalIncome)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Totale uitgaven (incl. BTW)</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(vatCalculation.totalExpenses.toFixed(2), 'Totale uitgaven')}
            >
              <Text style={styles.summaryValue}>{formatCurrency(vatCalculation.totalExpenses)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>BTW op omzet</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(vatCalculation.totalVATIncome.toFixed(2), 'BTW op omzet')}
            >
              <Text style={styles.summaryValue}>{formatCurrency(vatCalculation.totalVATIncome)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>BTW op uitgaven</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(vatCalculation.totalVATExpenses.toFixed(2), 'BTW op uitgaven')}
            >
              <Text style={styles.summaryValue}>{formatCurrency(vatCalculation.totalVATExpenses)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.totalLabel]}>
              {vatCalculation.vatToPayOrRefund >= 0 ? 'BTW te betalen' : 'BTW terug te ontvangen'}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(Math.abs(vatCalculation.vatToPayOrRefund).toFixed(2), 'BTW saldo')}
            >
              <Text style={[
                styles.summaryValue, 
                styles.totalValue,
                { color: vatCalculation.vatToPayOrRefund >= 0 ? Colors.danger : Colors.success }
              ]}>
                {formatCurrency(Math.abs(vatCalculation.vatToPayOrRefund))}
              </Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Quarterly Breakdown */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Kwartaaloverzicht</Text>
        
        {vatCalculation.quarterlyData.map((quarter, index) => (
          <View key={index} style={styles.quarterCard}>
            <Text style={styles.quarterTitle}>{quarter.quarter} - {yearSelection.year}</Text>
            
            <View style={styles.quarterRow}>
              <Text style={styles.quarterLabel}>Omzet</Text>
              <Text style={styles.quarterValue}>{formatCurrency(quarter.income)}</Text>
            </View>
            
            <View style={styles.quarterRow}>
              <Text style={styles.quarterLabel}>Uitgaven</Text>
              <Text style={styles.quarterValue}>{formatCurrency(quarter.expenses)}</Text>
            </View>
            
            <View style={styles.quarterRow}>
              <Text style={styles.quarterLabel}>BTW omzet</Text>
              <Text style={styles.quarterValue}>{formatCurrency(quarter.vatIncome)}</Text>
            </View>
            
            <View style={styles.quarterRow}>
              <Text style={styles.quarterLabel}>BTW uitgaven</Text>
              <Text style={styles.quarterValue}>{formatCurrency(quarter.vatExpenses)}</Text>
            </View>
            
            <View style={styles.divider} />
            
            <View style={styles.quarterRow}>
              <Text style={[styles.quarterLabel, styles.quarterTotal]}>BTW saldo</Text>
              <Text style={[
                styles.quarterValue, 
                styles.quarterTotal,
                { color: (quarter.vatIncome - quarter.vatExpenses) >= 0 ? Colors.danger : Colors.success }
              ]}>
                {formatCurrency(Math.abs(quarter.vatIncome - quarter.vatExpenses))}
              </Text>
            </View>
          </View>
        ))}
      </View>
      
      {/* Instructions */}
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Info size={24} color={Colors.primary} />
          <Text style={styles.infoTitle}>Hoe te gebruiken</Text>
        </View>
        <Text style={styles.infoText}>
          Deze gegevens zijn gebaseerd op je ingevoerde inkomsten en uitgaven. 
          Gebruik deze bedragen voor je BTW-aangifte bij de Belastingdienst.
          {"\n\n"}
          <Text style={styles.infoNote}>
            • Tik op een bedrag om het te kopiëren naar het klembord{"\n"}
            • Controleer altijd je gegevens voordat je de aangifte indient{"\n"}
            • Bewaar bonnetjes en facturen als bewijs{"\n"}
            • Raadpleeg een belastingadviseur bij twijfel
          </Text>
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    padding: 24,
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginTop: 12,
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 22,
  },
  section: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  totalLabel: {
    fontWeight: 'bold',
    fontSize: 17,
  },
  totalValue: {
    fontWeight: 'bold',
    fontSize: 17,
  },
  copyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },
  quarterCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  quarterTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  quarterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  quarterLabel: {
    fontSize: 14,
    color: Colors.lightText,
  },
  quarterValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  quarterTotal: {
    fontWeight: 'bold',
    fontSize: 15,
  },
  infoSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  infoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginLeft: 8,
  },
  infoText: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
  infoNote: {
    fontStyle: 'italic',
    color: Colors.text,
    fontWeight: '500',
  },
});