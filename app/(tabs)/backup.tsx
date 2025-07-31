import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { Stack } from 'expo-router';
import { Save, Download, Clock, CheckCircle, Share, FolderOpen } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import { createBackup, restoreBackup, getLastBackupDate, shareBackup, importBackup } from '@/utils/backupService';
import * as DocumentPicker from 'expo-document-picker';

export default function BackupScreen() {
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isRestoringBackup, setIsRestoringBackup] = useState(false);
  const [isSharingBackup, setIsSharingBackup] = useState(false);
  const [isImportingBackup, setIsImportingBackup] = useState(false);
  const [lastBackupDate, setLastBackupDate] = useState<Date | null>(null);
  const { 
    incomes, 
    expenses, 
    backupFrequency, 
    setBackupFrequency,
    lastAutoBackup,
    setLastAutoBackup 
  } = useFinanceStore();
  
  const totalEntries = incomes.length + expenses.length;
  
  useEffect(() => {
    loadLastBackupDate();
  }, []);
  
  const loadLastBackupDate = async () => {
    try {
      const date = await getLastBackupDate();
      setLastBackupDate(date);
    } catch (error) {
      console.error('Error loading last backup date:', error);
    }
  };
  
  const handleCreateBackup = async () => {
    setIsCreatingBackup(true);
    
    try {
      await createBackup();
      const now = new Date();
      setLastAutoBackup(now.toISOString());
      await loadLastBackupDate();
      
      Alert.alert(
        'Back-up Gemaakt',
        'Je financiële gegevens zijn succesvol opgeslagen als back-up.',
        [{ text: 'OK' }]
      );
    } catch (error) {
      console.error('Error creating backup:', error);
      Alert.alert('Fout', 'Kon back-up niet maken. Probeer het opnieuw.');
    } finally {
      setIsCreatingBackup(false);
    }
  };
  
  const handleRestoreBackup = () => {
    Alert.alert(
      'Back-up Herstellen',
      'Weet je zeker dat je de back-up wilt herstellen? Dit vervangt alle huidige gegevens.',
      [
        {
          text: 'Annuleren',
          style: 'cancel',
        },
        {
          text: 'Herstellen',
          style: 'destructive',
          onPress: performRestore,
        },
      ]
    );
  };
  
  const performRestore = async () => {
    setIsRestoringBackup(true);
    
    try {
      const success = await restoreBackup();
      
      if (success) {
        Alert.alert(
          'Back-up Hersteld',
          'Je financiële gegevens zijn succesvol hersteld uit de back-up.',
          [
            {
              text: 'OK',
              onPress: () => {
                // Force a re-render by reloading the page/component
                // The restored data will be automatically loaded from AsyncStorage
              }
            }
          ]
        );
      } else {
        Alert.alert('Geen Back-up', 'Er is geen back-up gevonden om te herstellen.');
      }
    } catch (error) {
      console.error('Error restoring backup:', error);
      Alert.alert('Fout', 'Kon back-up niet herstellen. Probeer het opnieuw.');
    } finally {
      setIsRestoringBackup(false);
    }
  };
  
  const handleImportBackup = async () => {
    setIsImportingBackup(true);
    
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'application/json',
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        
        try {
          const success = await importBackup(asset.uri);
          
          if (success) {
            await loadLastBackupDate(); // Refresh the backup date
            Alert.alert(
              'Back-up Geïmporteerd',
              'Je back-up bestand is succesvol geïmporteerd. Je gegevens zijn hersteld.',
              [
                {
                  text: 'OK',
                  onPress: () => {
                    // Force a re-render by reloading the page/component
                    // The restored data will be automatically loaded from AsyncStorage
                  }
                }
              ]
            );
          } else {
            Alert.alert('Fout', 'Het geselecteerde bestand is geen geldig back-up bestand.');
          }
        } catch (error) {
          console.error('Error importing backup:', error);
          let errorMessage = 'Kon back-up bestand niet importeren.';
          
          if (error instanceof Error) {
            if (error.message.includes('JSON')) {
              errorMessage = 'Het bestand is geen geldig JSON formaat. Controleer of je het juiste back-up bestand hebt geselecteerd.';
            } else if (error.message.includes('ontbrekende')) {
              errorMessage = 'Het back-up bestand mist belangrijke gegevens. Het bestand is mogelijk beschadigd.';
            } else if (error.message.includes('Ongeldig')) {
              errorMessage = error.message;
            } else {
              errorMessage = `Fout bij importeren: ${error.message}`;
            }
          }
          
          Alert.alert('Import Fout', errorMessage);
        }
      }
    } catch (error) {
      console.error('Error picking backup file:', error);
      Alert.alert('Fout', 'Kon bestand niet selecteren.');
    } finally {
      setIsImportingBackup(false);
    }
  };
  
  const handleShareBackup = async () => {
    setIsSharingBackup(true);
    
    try {
      const success = await shareBackup();
      
      if (success) {
        Alert.alert(
          'Backup Gedeeld',
          'Je backup bestand is succesvol gedeeld. Je kunt dit bestand gebruiken om je gegevens op een ander apparaat te herstellen.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error sharing backup:', error);
      Alert.alert('Fout', 'Kon backup niet delen. Probeer het opnieuw.');
    } finally {
      setIsSharingBackup(false);
    }
  };
  
  const getFrequencyText = (frequency: number) => {
    switch (frequency) {
      case 1: return 'Dagelijks';
      case 2: return 'Om de 2 dagen';
      case 3: return 'Om de 3 dagen';
      default: return 'Dagelijks';
    }
  };
  
  const getNextBackupDate = () => {
    if (!lastAutoBackup) return null;
    
    const lastDate = new Date(lastAutoBackup);
    const nextDate = new Date(lastDate);
    nextDate.setDate(nextDate.getDate() + backupFrequency);
    
    return nextDate;
  };
  
  const nextBackupDate = getNextBackupDate();
  const isBackupDue = nextBackupDate ? new Date() >= nextBackupDate : true;
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Back-up',
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
        <Text style={styles.title}>Back-up Beheer</Text>
        <Text style={styles.subtitle}>
          Maak regelmatig back-ups van je financiële gegevens om dataverlies te voorkomen
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
      
      <View style={styles.frequencyContainer}>
        <Text style={styles.sectionTitle}>Automatische Back-up Frequentie</Text>
        
        <View style={styles.frequencyButtons}>
          {[1, 2, 3].map((frequency) => (
            <TouchableOpacity
              key={frequency}
              style={[
                styles.frequencyButton,
                backupFrequency === frequency && styles.frequencyButtonActive,
              ]}
              onPress={() => setBackupFrequency(frequency)}
            >
              <Text
                style={[
                  styles.frequencyButtonText,
                  backupFrequency === frequency && styles.frequencyButtonTextActive,
                ]}
              >
                {getFrequencyText(frequency)}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        
        {nextBackupDate && (
          <View style={styles.nextBackupContainer}>
            <Clock size={16} color={isBackupDue ? Colors.danger : Colors.lightText} />
            <Text style={[
              styles.nextBackupText,
              { color: isBackupDue ? Colors.danger : Colors.lightText }
            ]}>
              {isBackupDue 
                ? 'Back-up is verschuldigd' 
                : `Volgende back-up: ${nextBackupDate.toLocaleDateString('nl-NL')}`
              }
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.backupContainer}>
        <Text style={styles.sectionTitle}>Handmatige Back-up</Text>
        
        <TouchableOpacity
          style={[
            styles.backupButton,
            isCreatingBackup && styles.backupButtonDisabled
          ]}
          onPress={handleCreateBackup}
          disabled={isCreatingBackup}
        >
          {isCreatingBackup ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.backupButtonText}>Back-up Maken...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Save size={20} color={Colors.secondary} />
              <Text style={styles.backupButtonText}>Back-up Maken</Text>
            </View>
          )}
        </TouchableOpacity>
        
        {lastBackupDate && (
          <TouchableOpacity
            style={[
              styles.shareButton,
              isSharingBackup && styles.shareButtonDisabled
            ]}
            onPress={handleShareBackup}
            disabled={isSharingBackup}
          >
            {isSharingBackup ? (
              <View style={styles.buttonContent}>
                <ActivityIndicator size="small" color={Colors.secondary} />
                <Text style={styles.shareButtonText}>Delen...</Text>
              </View>
            ) : (
              <View style={styles.buttonContent}>
                <Share size={20} color={Colors.secondary} />
                <Text style={styles.shareButtonText}>Back-up Delen</Text>
              </View>
            )}
          </TouchableOpacity>
        )}
        
        {lastBackupDate && (
          <View style={styles.lastBackupContainer}>
            <CheckCircle size={16} color={Colors.success} />
            <Text style={styles.lastBackupText}>
              Laatste back-up: {lastBackupDate.toLocaleDateString('nl-NL')} om {lastBackupDate.toLocaleTimeString('nl-NL', { hour: '2-digit', minute: '2-digit' })}
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.restoreContainer}>
        <Text style={styles.sectionTitle}>Back-up Herstellen</Text>
        <Text style={styles.restoreDescription}>
          Herstel je gegevens uit een eerder gemaakte back-up. Dit vervangt alle huidige gegevens.
        </Text>
        
        <TouchableOpacity
          style={[
            styles.restoreButton,
            isRestoringBackup && styles.restoreButtonDisabled
          ]}
          onPress={handleRestoreBackup}
          disabled={isRestoringBackup || !lastBackupDate}
        >
          {isRestoringBackup ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.restoreButtonText}>Herstellen...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <Download size={20} color={Colors.secondary} />
              <Text style={styles.restoreButtonText}>
                {lastBackupDate ? 'Back-up Herstellen' : 'Geen Back-up Beschikbaar'}
              </Text>
            </View>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.importButton,
            isImportingBackup && styles.importButtonDisabled
          ]}
          onPress={handleImportBackup}
          disabled={isImportingBackup}
        >
          {isImportingBackup ? (
            <View style={styles.buttonContent}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.importButtonText}>Importeren...</Text>
            </View>
          ) : (
            <View style={styles.buttonContent}>
              <FolderOpen size={20} color={Colors.secondary} />
              <Text style={styles.importButtonText}>Bestand Zoeken</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.infoContainer}>
        <Text style={styles.infoTitle}>Wat wordt er opgeslagen?</Text>
        <Text style={styles.infoText}>
          • Alle inkomen en uitgaven posten{'\n'}
          • Bijbehorende foto&apos;s en notities{'\n'}
          • BTW berekeningen{'\n'}
          • Datum en tijd informatie{'\n'}
          {'\n'}
          <Text style={styles.infoNote}>
            Back-ups worden lokaal op je apparaat opgeslagen en bevatten geen API sleutels of andere gevoelige instellingen. 
            Je kunt back-ups delen om je administratie op meerdere apparaten bij te houden.
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
    color: Colors.primary,
  },
  frequencyContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    marginBottom: 16,
  },
  frequencyButtons: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  frequencyButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  frequencyButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  frequencyButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  frequencyButtonTextActive: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  nextBackupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  nextBackupText: {
    fontSize: 14,
    marginLeft: 8,
  },
  backupContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  backupButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginBottom: 16,
  },
  backupButtonDisabled: {
    opacity: 0.7,
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backupButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  lastBackupContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  lastBackupText: {
    fontSize: 14,
    color: Colors.success,
    marginLeft: 8,
  },
  restoreContainer: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  restoreDescription: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 20,
  },
  restoreButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  restoreButtonDisabled: {
    opacity: 0.7,
  },
  restoreButtonText: {
    color: Colors.secondary,
    fontSize: 16,
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
  infoNote: {
    fontStyle: 'italic',
    color: Colors.text,
    fontWeight: '500',
  },
  shareButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 12,
  },
  shareButtonDisabled: {
    opacity: 0.7,
  },
  shareButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  importButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
    marginTop: 12,
  },
  importButtonDisabled: {
    opacity: 0.7,
  },
  importButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});