import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack, useRouter } from 'expo-router';
import { RotateCcw, AlertTriangle } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';

export default function ResetScreen() {
  const router = useRouter();
  const { incomes, expenses, resetAllData } = useFinanceStore();
  const [isResetting, setIsResetting] = useState(false);
  
  const totalEntries = incomes.length + expenses.length;
  
  const handleReset = () => {
    Alert.alert(
      'Alle Gegevens Verwijderen',
      `Weet je zeker dat je alle ${totalEntries} posten wilt verwijderen? Deze actie kan niet ongedaan worden gemaakt.`,
      [
        {
          text: 'Annuleren',
          style: 'cancel',
        },
        {
          text: 'Verwijderen',
          style: 'destructive',
          onPress: () => {
            setIsResetting(true);
            
            // Add a small delay to show the loading state
            setTimeout(() => {
              resetAllData();
              setIsResetting(false);
              
              Alert.alert(
                'Gegevens Verwijderd',
                'Alle inkomsten en uitgaven zijn succesvol verwijderd.',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back(),
                  }
                ]
              );
            }, 500);
          },
        },
      ]
    );
  };
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Reset',
          headerStyle: {
            backgroundColor: Colors.secondary,
          },
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: 'bold',
          },
        }}
      />
      
      <View style={styles.warningContainer}>
        <AlertTriangle size={48} color={Colors.danger} />
        <Text style={styles.warningTitle}>Waarschuwing</Text>
        <Text style={styles.warningText}>
          Deze actie verwijdert alle financiële gegevens permanent. Dit kan niet ongedaan worden gemaakt.
        </Text>
      </View>
      
      <View style={styles.statsContainer}>
        <Text style={styles.statsTitle}>Huidige Gegevens</Text>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Inkomen Posten:</Text>
          <Text style={styles.statValue}>{incomes.length}</Text>
        </View>
        
        <View style={styles.statRow}>
          <Text style={styles.statLabel}>Uitgaven Posten:</Text>
          <Text style={styles.statValue}>{expenses.length}</Text>
        </View>
        
        <View style={styles.statDivider} />
        
        <View style={styles.statRow}>
          <Text style={styles.statLabelTotal}>Totaal Posten:</Text>
          <Text style={styles.statValueTotal}>{totalEntries}</Text>
        </View>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Wat wordt er verwijderd?</Text>
        <Text style={styles.infoText}>
          • Alle inkomen posten{'\n'}
          • Alle uitgaven posten{'\n'}
          • Alle bijbehorende foto's en notities{'\n'}
          • Alle BTW berekeningen{'\n'}
          {'\n'}
          <Text style={styles.infoNote}>
            Je API sleutel en andere instellingen blijven behouden.
          </Text>
        </Text>
      </View>
      
      {totalEntries > 0 ? (
        <TouchableOpacity
          style={[
            styles.resetButton,
            isResetting && styles.resetButtonDisabled
          ]}
          onPress={handleReset}
          disabled={isResetting}
        >
          <RotateCcw size={20} color={Colors.secondary} />
          <Text style={styles.resetButtonText}>
            {isResetting ? 'Verwijderen...' : `Alle ${totalEntries} Posten Verwijderen`}
          </Text>
        </TouchableOpacity>
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            Er zijn geen gegevens om te verwijderen.
          </Text>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
          >
            <Text style={styles.backButtonText}>Terug</Text>
          </TouchableOpacity>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  warningContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.danger,
  },
  warningTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.danger,
    marginTop: 12,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 22,
  },
  statsContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  statRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    fontSize: 16,
    color: Colors.lightText,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  statDivider: {
    height: 1,
    backgroundColor: Colors.border,
    marginVertical: 12,
  },
  statLabelTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  statValueTotal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.danger,
  },
  infoContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
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
  infoNote: {
    fontStyle: 'italic',
    color: Colors.text,
    fontWeight: '500',
  },
  resetButton: {
    backgroundColor: Colors.danger,
    borderRadius: 12,
    padding: 18,
    margin: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 32,
  },
  resetButtonDisabled: {
    opacity: 0.7,
  },
  resetButtonText: {
    color: Colors.secondary,
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  emptyContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 24,
    margin: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  emptyText: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 16,
  },
  backButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 24,
    paddingVertical: 12,
  },
  backButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
});