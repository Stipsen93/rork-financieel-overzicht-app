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
import { Settings, DollarSign, Eye, Key, Globe } from 'lucide-react-native';
import { useFinanceStore } from '@/store/financeStore';
import Colors from '@/constants/colors';
import { getTranslation } from '@/constants/translations';


export default function PreferencesScreen() {
  const { 
    showStartingCapital, 
    setShowStartingCapital,
    useApi,
    setUseApi,
    incomeDisplayMode,
    setIncomeDisplayMode,
    language,
    setLanguage
  } = useFinanceStore();
  
  const t = (key: keyof typeof import('@/constants/translations').translations.nl) => getTranslation(language, key);
  

  
  const getDisplayModeText = (mode: 'both' | 'inclVat' | 'exVat') => {
    switch (mode) {
      case 'both': return t('bothColumns');
      case 'inclVat': return t('onlyInclVat');
      case 'exVat': return t('onlyExVat');
      default: return t('bothColumns');
    }
  };
  

  
  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: t('preferences'),
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
        <Text style={styles.title}>{t('appPreferences')}</Text>
        <Text style={styles.subtitle}>
          {t('preferencesSubtitle')}
        </Text>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('languageSettings')}</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <Globe size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>{t('appLanguage')}</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              {t('languageDescription')}
            </Text>
            <Text style={styles.currentSelection}>
              {t('currentLanguage')}: {language === 'nl' ? t('dutch') : t('english')}
            </Text>
          </View>
        </View>
        
        <View style={styles.displayModeButtons}>
          {[
            { key: 'nl' as const, label: t('dutch') },
            { key: 'en' as const, label: t('english') },
          ].map((option) => (
            <TouchableOpacity
              key={option.key}
              style={[
                styles.displayModeButton,
                language === option.key && styles.displayModeButtonActive,
              ]}
              onPress={() => setLanguage(option.key)}
            >
              <Text
                style={[
                  styles.displayModeButtonText,
                  language === option.key && styles.displayModeButtonTextActive,
                ]}
              >
                {option.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('apiSettings')}</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <Key size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>{t('useOpenAI')}</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              {t('openAIDescription')}
            </Text>
          </View>
          <Switch
            value={useApi}
            onValueChange={setUseApi}
            trackColor={{ false: Colors.border, true: Colors.primary }}
            thumbColor={useApi ? Colors.primaryDark : Colors.lightText}
          />
        </View>
      </View>
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{t('financialSettings')}</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <DollarSign size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>{t('showStartingCapital')}</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              {t('startingCapitalDescription')}
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
        <Text style={styles.sectionTitle}>{t('displaySettings')}</Text>
        
        <View style={styles.preferenceItem}>
          <View style={styles.preferenceContent}>
            <View style={styles.preferenceHeader}>
              <Eye size={24} color={Colors.text} />
              <Text style={styles.preferenceTitle}>{t('incomeColumns')}</Text>
            </View>
            <Text style={styles.preferenceDescription}>
              {t('incomeColumnsDescription')}
            </Text>
            <Text style={styles.currentSelection}>
              {t('currentSelection')}: {getDisplayModeText(incomeDisplayMode)}
            </Text>
          </View>
        </View>
        
        <View style={styles.displayModeButtons}>
          {[
            { key: 'both' as const, label: t('bothColumns'), description: t('bothColumnsDesc') },
            { key: 'inclVat' as const, label: t('onlyInclVat'), description: t('onlyInclVatDesc') },
            { key: 'exVat' as const, label: t('onlyExVat'), description: t('onlyExVatDesc') },
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
        <Text style={styles.infoTitle}>{t('aboutPreferences')}</Text>
        <Text style={styles.infoText}>
          {t('preferencesInfo')}
          {"\n\n"}
          <Text style={styles.infoNote}>
            {t('apiNote')}
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