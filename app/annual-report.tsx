import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  ScrollView,
  Platform,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import YearPicker from '@/components/YearPicker';
import { filterEntriesByYear } from '@/utils/finance';
import { generateAnnualReport } from '@/utils/annualReportService';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';

export default function AnnualReportScreen() {
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [isGenerating, setIsGenerating] = useState(false);
  const { incomes, expenses, apiKey } = useFinanceStore();
  
  const handleGenerateReport = async () => {
    if (!apiKey) {
      Alert.alert('API Sleutel Ontbreekt', 'Stel je ChatGPT API sleutel in bij profiel instellingen');
      return;
    }
    
    const yearIncomes = filterEntriesByYear(incomes, selectedYear);
    const yearExpenses = filterEntriesByYear(expenses, selectedYear);
    
    if (yearIncomes.length === 0 && yearExpenses.length === 0) {
      Alert.alert('Geen Gegevens', 'Er zijn geen inkomsten of uitgaven voor dit jaar');
      return;
    }
    
    setIsGenerating(true);
    
    try {
      const reportText = await generateAnnualReport(yearIncomes, yearExpenses, selectedYear, apiKey);
      
      if (Platform.OS === 'web') {
        // For web, create a download link for text file
        const blob = new Blob([reportText], { type: 'text/plain' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `Jaarrekening_${selectedYear}.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
        Alert.alert('Succes', 'Jaarrekening gedownload!');
      } else {
        // For mobile, save to device and share
        const fileName = `Jaarrekening_${selectedYear}.txt`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.writeAsStringAsync(fileUri, reportText, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(fileUri, {
            mimeType: 'text/plain',
            dialogTitle: 'Jaarrekening delen',
          });
        } else {
          Alert.alert('Succes', `Jaarrekening opgeslagen in: ${fileName}`);
        }
      }
    } catch (error) {
      console.error('Error generating annual report:', error);
      Alert.alert('Fout', 'Kon jaarrekening niet genereren. Controleer je internetverbinding en API sleutel.');
    } finally {
      setIsGenerating(false);
    }
  };
  
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
        <Text style={styles.title}>Jaarrekening Genereren</Text>
        <Text style={styles.subtitle}>
          Selecteer een jaar om een complete jaarrekening te genereren
        </Text>
      </View>
      
      <View style={styles.yearPickerContainer}>
        <Text style={styles.label}>Selecteer Jaar</Text>
        <YearPicker
          year={selectedYear}
          onSelect={setSelectedYear}
        />
      </View>
      
      <View style={styles.summaryContainer}>
        <Text style={styles.summaryTitle}>Overzicht {selectedYear}</Text>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Inkomsten:</Text>
          <Text style={styles.summaryValue}>
            {filterEntriesByYear(incomes, selectedYear).length} posten
          </Text>
        </View>
        
        <View style={styles.summaryRow}>
          <Text style={styles.summaryLabel}>Uitgaven:</Text>
          <Text style={styles.summaryValue}>
            {filterEntriesByYear(expenses, selectedYear).length} posten
          </Text>
        </View>
      </View>
      
      <TouchableOpacity
        style={[
          styles.generateButton,
          isGenerating && styles.generateButtonDisabled
        ]}
        onPress={handleGenerateReport}
        disabled={isGenerating}
      >
        {isGenerating ? (
          <View style={styles.generatingContainer}>
            <ActivityIndicator size="small" color={Colors.secondary} />
            <Text style={styles.generateButtonText}>Genereren...</Text>
          </View>
        ) : (
          <Text style={styles.generateButtonText}>Genereer Jaarrekening</Text>
        )}
      </TouchableOpacity>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Wat wordt er gegenereerd?</Text>
        <Text style={styles.infoText}>
          • Alle inkomsten onder "Brutowinst"{'\n'}
          • Uitgaven gecategoriseerd in:{'\n'}
          &nbsp;&nbsp;- Tanken{'\n'}
          &nbsp;&nbsp;- Bankkosten{'\n'}
          &nbsp;&nbsp;- Autogarage kosten{'\n'}
          &nbsp;&nbsp;- Verzekeringen{'\n'}
          &nbsp;&nbsp;- Telefoonkosten{'\n'}
          &nbsp;&nbsp;- Overige kosten{'\n'}
          • BTW overzicht{'\n'}
          • Netto resultaat{'\n'}
          {'\n'}
          Het rapport wordt gegenereerd als tekstbestand dat je kunt delen of opslaan.
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
  summaryContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.lightText,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  generateButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    padding: 18,
    margin: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  generateButtonText: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
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