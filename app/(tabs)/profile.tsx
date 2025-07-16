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

export default function ProfileScreen() {
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
          title: 'Profiel',
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
          Hiermee kan de app automatisch informatie uit je bonnen en facturen halen.
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
        
        {apiKey && (
          <View style={styles.statusContainer}>
            <Text style={styles.statusText}>✓ API sleutel is ingesteld</Text>
            <Text style={styles.statusDescription}>
              Je kunt nu foto's van bonnen en facturen scannen om automatisch gegevens in te vullen.
            </Text>
          </View>
        )}
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Hoe werkt het?</Text>
        <Text style={styles.description}>
          1. Voeg je ChatGPT API sleutel toe bovenaan{'\n'}
          2. Ga naar Inkomen of Uitgaven{'\n'}
          3. Druk op de + of - knop om een nieuwe post toe te voegen{'\n'}
          4. Druk op "Foto Maken" of "Afbeelding Kiezen"{'\n'}
          5. De app leest automatisch de bon uit en vult de gegevens in
        </Text>
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
  statusContainer: {
    marginTop: 16,
    padding: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.success,
    marginBottom: 4,
  },
  statusDescription: {
    fontSize: 14,
    color: Colors.lightText,
    lineHeight: 18,
  },
});