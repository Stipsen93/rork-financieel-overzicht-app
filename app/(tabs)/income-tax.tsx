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
import { Calculator, Info, Copy, TrendingUp, TrendingDown } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import * as Clipboard from 'expo-clipboard';

interface IncomeTaxCalculation {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  box1Income: number;
  box3Assets: number;
  deductibleExpenses: {
    businessExpenses: number;
    officeExpenses: number;
    travelExpenses: number;
    equipmentExpenses: number;
    otherExpenses: number;
  };
  taxableIncome: number;
}

export default function IncomeTaxScreen() {
  const { incomes, expenses, yearSelection, startingCapital } = useFinanceStore();
  
  const incomeTaxCalculation = useMemo((): IncomeTaxCalculation => {
    const currentYear = yearSelection.year;
    
    // Filter entries for the selected year
    const yearIncomes = incomes.filter(income => 
      new Date(income.date).getFullYear() === currentYear
    );
    const yearExpenses = expenses.filter(expense => 
      new Date(expense.date).getFullYear() === currentYear
    );
    
    // Calculate totals (excluding VAT for income tax purposes)
    const totalIncome = yearIncomes.reduce((sum, income) => sum + (income.amount - (income.vatAmount || 0)), 0);
    const totalExpenses = yearExpenses.reduce((sum, expense) => sum + (expense.amount - (expense.vatAmount || 0)), 0);
    const netProfit = totalIncome - totalExpenses;
    
    // Categorize expenses for deduction purposes based on name
    const businessExpenses = yearExpenses
      .filter(expense => expense.name.toLowerCase().includes('zakelijk') ||
                        expense.name.toLowerCase().includes('business') ||
                        expense.name.toLowerCase().includes('bedrijf'))
      .reduce((sum, expense) => sum + (expense.amount - (expense.vatAmount || 0)), 0);
    
    const officeExpenses = yearExpenses
      .filter(expense => expense.name.toLowerCase().includes('kantoor') ||
                        expense.name.toLowerCase().includes('office') ||
                        expense.name.toLowerCase().includes('bureau'))
      .reduce((sum, expense) => sum + (expense.amount - (expense.vatAmount || 0)), 0);
    
    const travelExpenses = yearExpenses
      .filter(expense => expense.name.toLowerCase().includes('reis') ||
                        expense.name.toLowerCase().includes('travel') ||
                        expense.name.toLowerCase().includes('transport') ||
                        expense.name.toLowerCase().includes('benzine') ||
                        expense.name.toLowerCase().includes('trein'))
      .reduce((sum, expense) => sum + (expense.amount - (expense.vatAmount || 0)), 0);
    
    const equipmentExpenses = yearExpenses
      .filter(expense => expense.name.toLowerCase().includes('apparatuur') ||
                        expense.name.toLowerCase().includes('equipment') ||
                        expense.name.toLowerCase().includes('computer') ||
                        expense.name.toLowerCase().includes('laptop') ||
                        expense.name.toLowerCase().includes('software'))
      .reduce((sum, expense) => sum + (expense.amount - (expense.vatAmount || 0)), 0);
    
    const otherExpenses = totalExpenses - businessExpenses - officeExpenses - travelExpenses - equipmentExpenses;
    
    // Box 1: Income from work and home (profit from business)
    const box1Income = Math.max(0, netProfit);
    
    // Box 3: Assets (starting capital + accumulated profit)
    const box3Assets = startingCapital + netProfit;
    
    return {
      totalIncome,
      totalExpenses,
      netProfit,
      box1Income,
      box3Assets: Math.max(0, box3Assets),
      deductibleExpenses: {
        businessExpenses,
        officeExpenses,
        travelExpenses,
        equipmentExpenses,
        otherExpenses,
      },
      taxableIncome: box1Income,
    };
  }, [incomes, expenses, yearSelection.year, startingCapital]);
  
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
          title: 'Inkomsten Belasting',
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
        <Calculator size={48} color={Colors.primary} />
        <Text style={styles.title}>Inkomsten Belasting {yearSelection.year}</Text>
        <Text style={styles.subtitle}>
          Overzicht van je belastinggegevens voor de aangifte inkomstenbelasting
        </Text>
      </View>
      
      {/* Business Summary */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Bedrijfsresultaat {yearSelection.year}</Text>
        
        <View style={styles.summaryCard}>
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelContainer}>
              <TrendingUp size={20} color={Colors.success} />
              <Text style={styles.summaryLabel}>Totale omzet (ex BTW)</Text>
            </View>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.totalIncome.toFixed(2), 'Totale omzet')}
            >
              <Text style={styles.summaryValue}>{formatCurrency(incomeTaxCalculation.totalIncome)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.summaryRow}>
            <View style={styles.summaryLabelContainer}>
              <TrendingDown size={20} color={Colors.danger} />
              <Text style={styles.summaryLabel}>Totale uitgaven (ex BTW)</Text>
            </View>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.totalExpenses.toFixed(2), 'Totale uitgaven')}
            >
              <Text style={styles.summaryValue}>{formatCurrency(incomeTaxCalculation.totalExpenses)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.summaryRow}>
            <Text style={[styles.summaryLabel, styles.totalLabel]}>
              {incomeTaxCalculation.netProfit >= 0 ? 'Winst' : 'Verlies'}
            </Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(Math.abs(incomeTaxCalculation.netProfit).toFixed(2), 'Bedrijfsresultaat')}
            >
              <Text style={[
                styles.summaryValue, 
                styles.totalValue,
                { color: incomeTaxCalculation.netProfit >= 0 ? Colors.success : Colors.danger }
              ]}>
                {formatCurrency(Math.abs(incomeTaxCalculation.netProfit))}
              </Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Tax Boxes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Belastingboxen</Text>
        
        <View style={styles.boxCard}>
          <Text style={styles.boxTitle}>Box 1 - Inkomen uit werk en woning</Text>
          <Text style={styles.boxDescription}>
            Winst uit onderneming (alleen positieve winst)
          </Text>
          <View style={styles.boxValueRow}>
            <Text style={styles.boxLabel}>Te rapporteren bedrag:</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.box1Income.toFixed(2), 'Box 1 inkomen')}
            >
              <Text style={styles.boxValue}>{formatCurrency(incomeTaxCalculation.box1Income)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
        
        <View style={styles.boxCard}>
          <Text style={styles.boxTitle}>Box 3 - Inkomen uit sparen en beleggen</Text>
          <Text style={styles.boxDescription}>
            Vermogen (startkapitaal + geaccumuleerde winst)
          </Text>
          <View style={styles.boxValueRow}>
            <Text style={styles.boxLabel}>Te rapporteren bedrag:</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.box3Assets.toFixed(2), 'Box 3 vermogen')}
            >
              <Text style={styles.boxValue}>{formatCurrency(incomeTaxCalculation.box3Assets)}</Text>
              <Copy size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Deductible Expenses */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Aftrekbare Kosten</Text>
        
        <View style={styles.expenseCard}>
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Zakelijke uitgaven</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.deductibleExpenses.businessExpenses.toFixed(2), 'Zakelijke uitgaven')}
            >
              <Text style={styles.expenseValue}>{formatCurrency(incomeTaxCalculation.deductibleExpenses.businessExpenses)}</Text>
              <Copy size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Kantoorkosten</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.deductibleExpenses.officeExpenses.toFixed(2), 'Kantoorkosten')}
            >
              <Text style={styles.expenseValue}>{formatCurrency(incomeTaxCalculation.deductibleExpenses.officeExpenses)}</Text>
              <Copy size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Reiskosten</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.deductibleExpenses.travelExpenses.toFixed(2), 'Reiskosten')}
            >
              <Text style={styles.expenseValue}>{formatCurrency(incomeTaxCalculation.deductibleExpenses.travelExpenses)}</Text>
              <Copy size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Apparatuur & computers</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.deductibleExpenses.equipmentExpenses.toFixed(2), 'Apparatuurkosten')}
            >
              <Text style={styles.expenseValue}>{formatCurrency(incomeTaxCalculation.deductibleExpenses.equipmentExpenses)}</Text>
              <Copy size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.expenseRow}>
            <Text style={styles.expenseLabel}>Overige kosten</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.deductibleExpenses.otherExpenses.toFixed(2), 'Overige kosten')}
            >
              <Text style={styles.expenseValue}>{formatCurrency(incomeTaxCalculation.deductibleExpenses.otherExpenses)}</Text>
              <Copy size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.divider} />
          
          <View style={styles.expenseRow}>
            <Text style={[styles.expenseLabel, styles.totalLabel]}>Totaal aftrekbaar</Text>
            <TouchableOpacity 
              style={styles.copyButton}
              onPress={() => copyToClipboard(incomeTaxCalculation.totalExpenses.toFixed(2), 'Totaal aftrekbare kosten')}
            >
              <Text style={[styles.expenseValue, styles.totalValue]}>{formatCurrency(incomeTaxCalculation.totalExpenses)}</Text>
              <Copy size={14} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
      
      {/* Instructions */}
      <View style={styles.infoSection}>
        <View style={styles.infoHeader}>
          <Info size={24} color={Colors.primary} />
          <Text style={styles.infoTitle}>Belangrijke informatie</Text>
        </View>
        <Text style={styles.infoText}>
          Deze berekening is gebaseerd op je ingevoerde gegevens en geeft een indicatie voor je belastingaangifte.
          {"\n\n"}
          <Text style={styles.infoNote}>
            • Box 1: Alleen positieve winst wordt belast{"\n"}
            • Box 3: Vermogen boven €57.000 (2024) wordt belast{"\n"}
            • Verlies kan worden verrekend met vorige/volgende jaren{"\n"}
            • Tik op bedragen om te kopiëren{"\n"}
            • Raadpleeg altijd een belastingadviseur voor complexe situaties
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
  summaryLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
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
  boxCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  boxTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 4,
  },
  boxDescription: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 12,
  },
  boxValueRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  boxLabel: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  boxValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.primary,
    marginRight: 8,
  },
  expenseCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  expenseRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  expenseLabel: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  expenseValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginRight: 8,
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