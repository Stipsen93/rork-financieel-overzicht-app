import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { Stack } from 'expo-router';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';

export default function SettingsScreen() {
  const { apiKey, setApiKey } = useFinanceStore();
  const [inputApiKey, setInputApiKey] = useState(apiKey || '');
  
  const handleSaveApiKey = () => {
    setApiKey(inputApiKey.trim());
    Alert.alert('Succes', 'API sleutel succesvol opgeslagen');
  };
  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Instellingen',
          headerStyle: {
            backgroundColor: Colors.secondary,
          },
          headerTitleStyle: {
            color: Colors.text,
            fontWeight: 'bold',
          },
        }}
      />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>ChatGPT API Instellingen</Text>
        <Text style={styles.description}>
          Voer je ChatGPT API sleutel in om de bon scan functionaliteit in te schakelen.
          Hiermee kan de app automatisch informatie uit je bonnen halen.
        </Text>
        
        <Text style={styles.label}>API Sleutel</Text>
        <TextInput
          style={styles.input}
          value={inputApiKey}
          onChangeText={setInputApiKey}
          placeholder="Voer je ChatGPT API sleutel in"
          secureTextEntry
          autoCapitalize="none"
        />
        
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSaveApiKey}
        >
          <Text style={styles.saveButtonText}>API Sleutel Opslaan</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Over</Text>
        <Text style={styles.description}>
          Deze app helpt ondernemers hun inkomsten en uitgaven bij te houden, inclusief
          BTW berekeningen. Gebruik de camera functie om bonnen te scannen en
          automatisch informatie te extraheren.
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Privacy</Text>
        <Text style={styles.description}>
          Je financiële gegevens worden lokaal op je apparaat opgeslagen. Bon afbeeldingen
          worden verwerkt via de ChatGPT API en worden niet permanent opgeslagen op
          externe servers.
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
  section: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
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
    marginBottom: 12,
  },
  description: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  saveButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 14,
    alignItems: 'center',
  },
  saveButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: 'bold',
  },
});