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
import { Settings, DollarSign } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';

export default function PreferencesScreen() {
  const { showStartingCapital, setShowStartingCapital } = useFinanceStore();
  
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
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Over Voorkeuren</Text>
        <Text style={styles.infoText}>
          Hier kun je verschillende app instellingen aanpassen om de app naar jouw wensen te configureren. 
          Deze instellingen worden automatisch opgeslagen en blijven behouden tussen app sessies.
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
});