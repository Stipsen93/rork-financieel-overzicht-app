import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import YearPicker from '@/components/YearPicker';
import { filterEntriesByYear } from '@/utils/finance';

export default function AnnualReportScreen() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const { incomes, expenses, customCategories } = useFinanceStore();
  
  const calculateProfitLoss = () => {
    const yearIncomes = filterEntriesByYear(incomes, selectedYear);
    const yearExpenses = filterEntriesByYear(expenses, selectedYear);
    
    const totalIncome = yearIncomes.reduce((sum, income) => sum + income.amount, 0);
    const totalExpenses = yearExpenses.reduce((sum, expense) => sum + expense.amount, 0);
    
    // Group expenses by category
    const expensesByCategory: { [key: string]: number } = {};
    
    // Initialize with default categories
    expensesByCategory['zakelijke-uitgaven'] = 0;
    expensesByCategory['kantoorkosten'] = 0;
    expensesByCategory['reiskosten'] = 0;
    expensesByCategory['apparatuur-computers'] = 0;
    expensesByCategory['bedrijfsuitje'] = 0;
    expensesByCategory['autokosten'] = 0;
    expensesByCategory['overige-kosten'] = 0;
    
    // Initialize custom categories
    customCategories.forEach(category => {
      expensesByCategory[category] = 0;
    });
    
    yearExpenses.forEach(expense => {
      const category = expense.category || 'overige-kosten';
      expensesByCategory[category] = (expensesByCategory[category] || 0) + expense.amount;
    });
    
    return {
      totalIncome,
      totalExpenses,
      expensesByCategory,
      netProfit: totalIncome - totalExpenses
    };
  };
  
  const getCategoryDisplayName = (category: string) => {
    const categoryNames: { [key: string]: string } = {
      'zakelijke-uitgaven': 'Zakelijke uitgaven',
      'kantoorkosten': 'Kantoorkosten',
      'reiskosten': 'Reiskosten',
      'apparatuur-computers': 'Apparatuur & computers',
      'bedrijfsuitje': 'Bedrijfsuitje',
      'autokosten': 'Autokosten',
      'overige-kosten': 'Overige kosten'
    };
    
    return categoryNames[category] || category;
  };
  
  const profitLoss = calculateProfitLoss();
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Jaarrekening',
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
        <Text style={styles.title}>Winst en Verlies Overzicht</Text>
        <Text style={styles.subtitle}>
          Bekijk je winst en verlies overzicht per jaar
        </Text>
      </View>
      
      <View style={styles.yearPickerContainer}>
        <Text style={styles.label}>Selecteer Jaar</Text>
        <YearPicker
          year={selectedYear}
          onSelect={setSelectedYear}
        />
      </View>
      
      <View style={styles.profitLossContainer}>
        <Text style={styles.profitLossTitle}>Winst en Verlies {selectedYear}</Text>
        
        <View style={styles.incomeSection}>
          <Text style={styles.sectionTitle}>Inkomsten</Text>
          <View style={styles.amountRow}>
            <Text style={styles.amountLabel}>Totale Inkomsten</Text>
            <Text style={styles.amountValue}>€ {profitLoss.totalIncome.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.expenseSection}>
          <Text style={styles.sectionTitle}>Uitgaven</Text>
          {Object.entries(profitLoss.expensesByCategory)
            .filter(([_, amount]) => amount > 0)
            .map(([category, amount]) => (
              <View key={category} style={styles.amountRow}>
                <Text style={styles.amountLabel}>{getCategoryDisplayName(category)}</Text>
                <Text style={styles.amountValue}>€ {amount.toFixed(2)}</Text>
              </View>
            ))
          }
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.totalLabel}>Totale Uitgaven</Text>
            <Text style={styles.totalValue}>€ {profitLoss.totalExpenses.toFixed(2)}</Text>
          </View>
        </View>
        
        <View style={styles.netProfitSection}>
          <View style={styles.divider} />
          <View style={styles.amountRow}>
            <Text style={styles.netProfitLabel}>Netto Resultaat</Text>
            <Text style={[
              styles.netProfitValue,
              { color: profitLoss.netProfit >= 0 ? Colors.success : Colors.danger }
            ]}>
              € {profitLoss.netProfit.toFixed(2)}
            </Text>
          </View>
        </View>
      </View>
      

      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Overzicht Informatie</Text>
        <Text style={styles.infoText}>
          Dit overzicht toont je winst en verlies voor het geselecteerde jaar:{'\n'}
          {'\n'}
          • Totale inkomsten voor het jaar{'\n'}
          • Uitgaven per categorie{'\n'}
          • Netto resultaat (winst of verlies){'\n'}
          {'\n'}
          Alle bedragen zijn exclusief BTW. Voor een complete BTW-berekening, ga naar de BTW-aangifte pagina.
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
    padding: 20,
    backgroundColor: Colors.card,
    margin: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    lineHeight: 22,
  },
  yearPickerContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
  },
  label: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  profitLossContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  profitLossTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 20,
    textAlign: 'center',
  },
  incomeSection: {
    marginBottom: 20,
  },
  expenseSection: {
    marginBottom: 20,
  },
  netProfitSection: {
    marginTop: 10,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  amountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingVertical: 4,
  },
  amountLabel: {
    fontSize: 16,
    color: Colors.lightText,
  },
  amountValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: Colors.text,
  },
  netProfitLabel: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  netProfitValue: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 8,
  },

  infoContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  infoTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 12,
  },
  infoText: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 20,
  },
});