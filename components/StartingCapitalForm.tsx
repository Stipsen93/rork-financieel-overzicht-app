import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { X, DollarSign } from 'lucide-react-native';
import Colors from '@/constants/colors';
import { useFinanceStore } from '@/store/financeStore';
import { formatCurrency } from '@/utils/finance';

interface StartingCapitalFormProps {
  visible: boolean;
  onClose: () => void;
}

export default function StartingCapitalForm({ visible, onClose }: StartingCapitalFormProps) {
  const { startingCapital, setStartingCapital } = useFinanceStore();
  const [amount, setAmount] = useState(startingCapital > 0 ? startingCapital.toString().replace('.', ',') : '');
  
  const handleSubmit = () => {
    if (!amount.trim()) {
      Alert.alert('Fout', 'Voer een bedrag in');
      return;
    }
    
    const numericAmount = parseFloat(amount.replace(',', '.'));
    
    if (isNaN(numericAmount) || numericAmount < 0) {
      Alert.alert('Fout', 'Voer een geldig bedrag in');
      return;
    }
    
    setStartingCapital(numericAmount);
    Alert.alert(
      'Succes', 
      `Startkapitaal ingesteld op ${formatCurrency(numericAmount)}`,
      [{ text: 'OK', onPress: onClose }]
    );
  };
  
  const handleReset = () => {
    Alert.alert(
      'Startkapitaal Resetten',
      'Weet je zeker dat je het startkapitaal wilt resetten naar €0,00?',
      [
        { text: 'Annuleren', style: 'cancel' },
        {
          text: 'Resetten',
          style: 'destructive',
          onPress: () => {
            setStartingCapital(0);
            setAmount('');
            Alert.alert('Gereset', 'Startkapitaal is gereset naar €0,00');
          }
        }
      ]
    );
  };
  
  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>Startkapitaal Instellen</Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.formContainer}>
              <View style={styles.iconContainer}>
                <DollarSign size={48} color={Colors.primary} />
              </View>
              
              <Text style={styles.description}>
                Voer het bedrag in dat al op je rekening staat om vanaf dit punt je financiën bij te houden.
              </Text>
              
              {startingCapital > 0 && (
                <View style={styles.currentCapitalContainer}>
                  <Text style={styles.currentCapitalLabel}>Huidig Startkapitaal:</Text>
                  <Text style={styles.currentCapitalAmount}>
                    {formatCurrency(startingCapital)}
                  </Text>
                </View>
              )}
              
              <Text style={styles.label}>Startkapitaal (€)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={Colors.lightText}
                keyboardType="decimal-pad"
                autoFocus
              />
              
              <TouchableOpacity
                style={styles.submitButton}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Startkapitaal Instellen</Text>
              </TouchableOpacity>
              
              {startingCapital > 0 && (
                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={handleReset}
                >
                  <Text style={styles.resetButtonText}>Startkapitaal Resetten</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: Colors.text,
  },
  closeButton: {
    padding: 5,
  },
  formContainer: {
    padding: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  description: {
    fontSize: 16,
    color: Colors.lightText,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  currentCapitalContainer: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.border,
  },
  currentCapitalLabel: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 4,
  },
  currentCapitalAmount: {
    fontSize: 24,
    fontWeight: 'bold',
    color: Colors.success,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 16,
    fontSize: 18,
    marginBottom: 20,
    color: Colors.text,
    textAlign: 'center',
  },
  submitButton: {
    backgroundColor: Colors.success,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 12,
  },
  submitButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  resetButton: {
    backgroundColor: Colors.danger,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  resetButtonText: {
    color: Colors.secondary,
    fontSize: 14,
    fontWeight: '500',
  },
});