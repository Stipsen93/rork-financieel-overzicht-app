import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Switch,
} from 'react-native';
import { Stack } from 'expo-router';
import { Settings, DollarSign, Eye, Key, Github } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';

export default function PreferencesScreen() {
  const { 
    showStartingCapital, 
    setShowStartingCapital,
    useApi,
    setUseApi,
    useGithubApi,
    setUseGithubApi,
    incomeDisplayMode,
    setIncomeDisplayMode 
  } = useFinanceStore();
  
  const getDisplayModeText = (mode: 'both' | 'inclVat' | 'exVat') => {
    switch (mode) {
      case 'both': return 'Beide kolommen';
      case 'inclVat': return 'Alleen incl BTW';
      case 'exVat': return 'Alleen ex BTW';
      default: return 'Beide kolommen';
    }
  };
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Voorkeuren',
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
        <Settings size={48} color={Colors.primary} />
        <Text style={styles.title}>App Voorkeuren</Text>
        <Text style={styles.subtitle}>
          Pas de app instellingen aan naar jouw voorkeur
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>API Instellingen</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <Key size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>OpenAI API Gebruiken</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              Schakel het gebruik van OpenAI ChatGPT API in voor het verwerken van bonnetjes en facturen
            </Text>
          </View>
          <Switch
            value={useApi}
            onValueChange={setUseApi}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={useApi ? Colors.primaryDark : Colors.lightText}
          />
        </View>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <Github size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>GitHub API Gebruiken</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              Schakel het gebruik van GitHub ChatGPT API in voor het verwerken van bonnetjes en facturen
            </Text>
          </View>
          <Switch
            value={useGithubApi}
            onValueChange={setUseGithubApi}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={useGithubApi ? Colors.primaryDark : Colors.lightText}
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Financiële Instellingen</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <DollarSign size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>Startkapitaal Weergeven</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              Toon de startkapitaal knop op de inkomen pagina om je beginbalans in te stellen
            </Text>
          </View>
          <Switch
            value={showStartingCapital}
            onValueChange={setShowStartingCapital}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={showStartingCapital ? Colors.primaryDark : Colors.lightText}
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Overzicht Weergave</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <Eye size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>Inkomen Kolommen</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              Kies welke inkomen kolommen je wilt zien op de overzicht pagina
            </Text>
            <Text style={styles.currentSelection}>
              Huidige selectie: {getDisplayModeText(incomeDisplayMode)}
            </Text>
          </View>
        </View>
        
        <View style={styles.displayModeButtons}>
          {[
            { key: 'both' as const, label: 'Beide kolommen', description: 'Toon zowel incl als ex BTW' },
            { key: 'inclVat' as const, label: 'Alleen incl BTW', description: 'Toon alleen inkomen inclusief BTW' },
            { key: 'exVat' as const, label: 'Alleen ex BTW', description: 'Toon alleen inkomen exclusief BTW' },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.displayModeButton,
                incomeDisplayMode === option.key && styles.displayModeButtonActive,
              ]}
              onPress={() => setIncomeDisplayMode(option.key)}
            >
              <Text
                style={[
                  styles.displayModeButtonText,
                  incomeDisplayMode === option.key && styles.displayModeButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
              <Text
                style={[
                  styles.displayModeButtonDescription,
                  incomeDisplayMode === option.key && styles.displayModeButtonDescriptionActive,
                ]}
              >
                {option.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Over Voorkeuren</Text>
        <Text style={styles.infoText}>
          Hier kun je verschillende app instellingen aanpassen om de app naar jouw wensen te configureren. 
          Deze instellingen worden automatisch opgeslagen en blijven behouden tussen app sessies.
          {"\n\n"}
          <Text style={styles.infoNote}>
            Let op: OpenAI API gebruik vereist een geldige ChatGPT API sleutel en GitHub API gebruik vereist een geldige GitHub token. Deze kun je instellen in het profiel.
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
  preferenceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 8,
    marginBottom: 16,
  },
  preferenceContent: {
    flex: 1,
    marginRight: 16,
  },
  preferenceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  preferenceTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  preferenceDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 18,
    marginLeft: 32,
  },
  currentSelection: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 32,
    marginTop: 4,
  },
  displayModeButtons: {
    marginTop: 8,
  },
  displayModeButton: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    padding: 16,
    marginBottom: 8,
  },
  displayModeButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  displayModeButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  displayModeButtonTextActive: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  displayModeButtonDescription: {
    fontSize: 14,
    color: Colors.lightText,
  },
  displayModeButtonDescriptionActive: {
    color: Colors.text,
    opacity: 0.8,
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
});