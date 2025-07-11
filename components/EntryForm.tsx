import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { Calendar, Camera, X } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType } from 'expo-camera';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useFinanceStore } from '@/store/financeStore';
import { processReceiptImage } from '@/utils/ocrService';

interface EntryFormProps {
  type: 'income' | 'expense';
  visible: boolean;
  onClose: () => void;
}

export default function EntryForm({ type, visible, onClose }: EntryFormProps) {
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [vatRate, setVatRate] = useState('21');
  const [date, setDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [showCamera, setShowCamera] = useState(false);
  const [cameraPermission, requestCameraPermission] = ImagePicker.useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  
  const cameraRef = useRef<CameraView>(null);
  const { addIncome, addExpense, apiKey } = useFinanceStore();
  
  useEffect(() => {
    if (visible) {
      // Initialize with current date
      setDate(new Date());
    } else {
      resetForm();
    }
  }, [visible]);
  
  const resetForm = () => {
    setName('');
    setAmount('');
    setVatRate('21');
    setDate(new Date());
    setImageUri(null);
    setIsProcessing(false);
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setDate(selectedDate);
    }
  };
  
  const handleSubmit = () => {
    if (!name || !amount) {
      Alert.alert('Fout', 'Vul alle verplichte velden in');
      return;
    }
    
    const entry = {
      name,
      amount: parseFloat(amount.replace(',', '.')),
      vatRate: parseFloat(vatRate),
      date: date.toISOString(),
      imageUri: imageUri || undefined,
    };
    
    if (type === 'income') {
      addIncome(entry);
    } else {
      addExpense(entry);
    }
    
    onClose();
  };
  
  const openCamera = async () => {
    if (!cameraPermission?.granted) {
      const permission = await requestCameraPermission();
      if (!permission.granted) {
        Alert.alert('Toestemming vereist', 'Camera toestemming is nodig om foto\'s te maken');
        return;
      }
    }
    setShowCamera(true);
  };
  
  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync();
      if (photo) {
        setImageUri(photo.uri);
        setShowCamera(false);
        
        if (apiKey) {
          processReceipt(photo.uri);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Fout', 'Kon geen foto maken');
    }
  };
  
  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setImageUri(result.assets[0].uri);
      
      if (apiKey) {
        processReceipt(result.assets[0].uri);
      }
    }
  };
  
  const processReceipt = async (uri: string) => {
    if (!apiKey) {
      Alert.alert('API Sleutel Ontbreekt', 'Stel je ChatGPT API sleutel in bij instellingen');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await processReceiptImage(uri, apiKey);
      
      if (result) {
        setName(result.name || '');
        setAmount(result.amount ? result.amount.toString() : '');
        if (result.vatRate) setVatRate(result.vatRate.toString());
        if (result.date) {
          setDate(new Date(result.date));
        }
      }
    } catch (error) {
      console.error('Error processing receipt:', error);
      Alert.alert('Fout', 'Kon bon niet verwerken');
    } finally {
      setIsProcessing(false);
    }
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
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.header}>
              <Text style={styles.title}>
                {type === 'income' ? 'Inkomen Toevoegen' : 'Uitgave Toevoegen'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {isProcessing && (
              <View style={styles.processingOverlay}>
                <ActivityIndicator size="large" color={Colors.primary} />
                <Text style={styles.processingText}>Bon verwerken...</Text>
              </View>
            )}
            
            <ScrollView style={styles.formContainer}>
              <Text style={styles.label}>Naam</Text>
              <TextInput
                style={styles.input}
                value={name}
                onChangeText={setName}
                placeholder="Voer naam in"
              />
              
              <Text style={styles.label}>Bedrag (€)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                keyboardType="decimal-pad"
              />
              
              <Text style={styles.label}>BTW Tarief (%)</Text>
              <View style={styles.vatRateContainer}>
                {[21, 9, 0].map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.vatRateButton,
                      parseInt(vatRate) === rate && styles.vatRateButtonActive,
                    ]}
                    onPress={() => setVatRate(rate.toString())}
                  >
                    <Text
                      style={[
                        styles.vatRateText,
                        parseInt(vatRate) === rate && styles.vatRateTextActive,
                      ]}
                    >
                      {rate}%
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              
              <Text style={styles.label}>Datum</Text>
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(true)}
              >
                <Text style={styles.dateText}>
                  {date.toLocaleDateString('nl-NL')}
                </Text>
                <Calendar size={20} color={Colors.text} />
              </TouchableOpacity>
              
              {showDatePicker && (
                <DateTimePicker
                  value={date}
                  mode="date"
                  display="default"
                  onChange={handleDateChange}
                />
              )}
              
              <Text style={styles.label}>Bon</Text>
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={openCamera}
                >
                  <Text style={styles.imageButtonText}>Foto Maken</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImage}
                >
                  <Text style={styles.imageButtonText}>Afbeelding Kiezen</Text>
                </TouchableOpacity>
              </View>
              
              {imageUri && (
                <View style={styles.imagePreviewContainer}>
                  <Image
                    source={{ uri: imageUri }}
                    style={styles.imagePreview}
                    contentFit="cover"
                  />
                  <TouchableOpacity
                    style={styles.removeImageButton}
                    onPress={() => setImageUri(null)}
                  >
                    <X size={20} color={Colors.secondary} />
                  </TouchableOpacity>
                </View>
              )}
              
              <TouchableOpacity
                style={[
                  styles.submitButton,
                  { backgroundColor: type === 'income' ? Colors.success : Colors.danger },
                ]}
                onPress={handleSubmit}
              >
                <Text style={styles.submitButtonText}>Opslaan</Text>
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      </KeyboardAvoidingView>
      
      <Modal visible={showCamera} animationType="slide">
        <View style={{ flex: 1 }}>
          <CameraView
            ref={cameraRef}
            style={{ flex: 1 }}
            facing={facing}
          >
            <View style={styles.cameraControls}>
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setShowCamera(false)}
              >
                <X size={24} color={Colors.secondary} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.captureButton}
                onPress={takePicture}
              >
                <View style={styles.captureButtonInner} />
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.cameraButton}
                onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
              >
                <Camera size={24} color={Colors.secondary} />
              </TouchableOpacity>
            </View>
          </CameraView>
        </View>
      </Modal>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingTop: 20,
    paddingBottom: Platform.OS === 'ios' ? 40 : 20,
    maxHeight: '90%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    marginBottom: 20,
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
    paddingHorizontal: 20,
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
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  vatRateContainer: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  vatRateButton: {
    flex: 1,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginRight: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  vatRateButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primaryDark,
  },
  vatRateText: {
    fontSize: 16,
    color: Colors.text,
  },
  vatRateTextActive: {
    color: Colors.text,
    fontWeight: 'bold',
  },
  datePickerButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    padding: 12,
    marginBottom: 16,
  },
  dateText: {
    fontSize: 16,
    color: Colors.text,
  },
  imageActions: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  imageButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginRight: 8,
  },
  imageButtonText: {
    color: Colors.text,
    fontWeight: '500',
  },
  imagePreviewContainer: {
    position: 'relative',
    marginBottom: 16,
    borderRadius: 8,
    overflow: 'hidden',
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 15,
    width: 30,
    height: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginTop: 16,
    marginBottom: 32,
  },
  submitButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cameraControls: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  captureButtonInner: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.secondary,
  },
  processingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
  },
  processingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.text,
  },
});