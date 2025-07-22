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
  FlatList,
} from 'react-native';
import { Calendar, Camera, X, Send, Trash2 } from 'lucide-react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import * as ImagePicker from 'expo-image-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useFinanceStore } from '@/store/financeStore';
import { processReceiptImages } from '@/utils/ocrService';

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
  const [imageUris, setImageUris] = useState<string[]>([]);
  const [showCamera, setShowCamera] = useState(false);
  const [permission, requestPermission] = useCameraPermissions();
  const [isProcessing, setIsProcessing] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [filteredSuggestions, setFilteredSuggestions] = useState<string[]>([]);
  
  const cameraRef = useRef<CameraView>(null);
  const { addIncome, addExpense, apiKey, dateSelection, incomes, expenses } = useFinanceStore();
  
  useEffect(() => {
    if (visible) {
      // Initialize with selected month/year from store, but current day
      const selectedDate = new Date(dateSelection.year, dateSelection.month - 1, new Date().getDate());
      setDate(selectedDate);
    } else {
      resetForm();
    }
  }, [visible, dateSelection]);
  
  const resetForm = () => {
    setName('');
    setAmount('');
    setVatRate('21');
    const selectedDate = new Date(dateSelection.year, dateSelection.month - 1, new Date().getDate());
    setDate(selectedDate);
    setImageUris([]);
    setIsProcessing(false);
    setShowSuggestions(false);
    setFilteredSuggestions([]);
  };
  
  const getUniqueSuggestions = () => {
    const entries = type === 'income' ? incomes : expenses;
    const uniqueNames = [...new Set(entries.map(entry => entry.name))];
    return uniqueNames.sort();
  };
  
  const handleNameChange = (text: string) => {
    setName(text);
    
    if (text.length > 0) {
      const suggestions = getUniqueSuggestions();
      const filtered = suggestions.filter(suggestion => 
        suggestion.toLowerCase().includes(text.toLowerCase())
      );
      setFilteredSuggestions(filtered);
      setShowSuggestions(filtered.length > 0);
    } else {
      setShowSuggestions(false);
      setFilteredSuggestions([]);
    }
  };
  
  const selectSuggestion = (suggestion: string) => {
    setName(suggestion);
    setShowSuggestions(false);
    setFilteredSuggestions([]);
    
    // Auto-fill other fields based on the most recent entry with this name
    const entries = type === 'income' ? incomes : expenses;
    const recentEntry = entries
      .filter(entry => entry.name === suggestion)
      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
    
    if (recentEntry) {
      setVatRate(recentEntry.vatRate.toString());
    }
  };
  
  const handleDateChange = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android') {
      setShowDatePicker(false);
    }
    if (selectedDate) {
      setDate(selectedDate);
      if (Platform.OS === 'ios') {
        setShowDatePicker(false);
      }
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
      imageUri: imageUris.length > 0 ? imageUris[0] : undefined,
      imageUris: imageUris.length > 0 ? imageUris : undefined,
    };
    
    if (type === 'income') {
      addIncome(entry);
    } else {
      addExpense(entry);
    }
    
    onClose();
  };
  
  const openCamera = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Toestemming vereist', 'Camera toestemming is nodig om foto\'s te maken');
        return;
      }
    }
    setShowCamera(true);
  };
  
  const takePicture = async () => {
    if (!cameraRef.current) {
      Alert.alert('Fout', 'Camera niet beschikbaar');
      return;
    }
    
    try {
      console.log('Taking picture...');
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      
      console.log('Photo taken:', photo);
      
      if (photo && photo.uri) {
        setImageUris(prev => [...prev, photo.uri]);
        console.log('Photo added to list, total:', imageUris.length + 1);
      } else {
        Alert.alert('Fout', 'Foto kon niet worden opgeslagen');
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      Alert.alert('Camera Fout', `Kon geen foto maken: ${errorMessage}`);
    }
  };
  
  const pickImages = async () => {
    // Request permission for image library
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming vereist', 'Toegang tot fotobibliotheek is nodig om afbeeldingen te selecteren');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const newUris = result.assets.map(asset => asset.uri);
      setImageUris(prev => [...prev, ...newUris]);
    }
  };
  
  const removeImage = (indexToRemove: number) => {
    setImageUris(prev => prev.filter((_, index) => index !== indexToRemove));
  };
  
  const processReceipts = async () => {
    if (imageUris.length === 0) return;
    
    if (!apiKey) {
      Alert.alert('API Sleutel Ontbreekt', 'Stel je ChatGPT API sleutel in bij profiel instellingen');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const result = await processReceiptImages(imageUris, apiKey);
      
      if (result) {
        setName(result.name || '');
        setAmount(result.amount ? result.amount.toString().replace('.', ',') : '');
        if (result.vatRate) setVatRate(result.vatRate.toString());
        if (result.date) {
          setDate(new Date(result.date));
        }
        Alert.alert('Succes', `${imageUris.length} foto's succesvol verwerkt!`);
      } else {
        Alert.alert('Info', `Foto's zijn toegevoegd maar konden niet automatisch verwerkt worden. Vul de gegevens handmatig in.`);
      }
    } catch (error) {
      console.error('Error processing receipts:', error);
      Alert.alert('Info', `Foto's zijn toegevoegd maar konden niet automatisch verwerkt worden. Vul de gegevens handmatig in.`);
    } finally {
      setIsProcessing(false);
    }
  };
  
  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageItem}>
      <Image
        source={{ uri: item }}
        style={styles.imagePreview}
        contentFit="cover"
      />
      <TouchableOpacity
        style={styles.removeImageButton}
        onPress={() => removeImage(index)}
      >
        <X size={16} color={Colors.secondary} />
      </TouchableOpacity>
    </View>
  );
  
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
              <Text style={styles.title}>
                {type === 'income' ? 'Inkomen Toevoegen' : 'Uitgave Toevoegen'}
              </Text>
              <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.formContainer} 
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              <Text style={styles.label}>Naam</Text>
              <View style={styles.nameInputContainer}>
                <TextInput
                  style={styles.input}
                  value={name}
                  onChangeText={handleNameChange}
                  placeholder="Voer naam in"
                  placeholderTextColor={Colors.lightText}
                />
                {showSuggestions && filteredSuggestions.length > 0 && (
                  <View style={styles.suggestionsContainer}>
                    <ScrollView 
                      style={styles.suggestionsList}
                      keyboardShouldPersistTaps="handled"
                      nestedScrollEnabled
                    >
                      {filteredSuggestions.slice(0, 5).map((suggestion, index) => (
                        <TouchableOpacity
                          key={index}
                          style={styles.suggestionItem}
                          onPress={() => selectSuggestion(suggestion)}
                        >
                          <Text style={styles.suggestionText}>{suggestion}</Text>
                        </TouchableOpacity>
                      ))}
                    </ScrollView>
                  </View>
                )}
              </View>
              
              <Text style={styles.label}>Bedrag (€)</Text>
              <TextInput
                style={styles.input}
                value={amount}
                onChangeText={setAmount}
                placeholder="0,00"
                placeholderTextColor={Colors.lightText}
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
                  display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                  onChange={handleDateChange}
                  maximumDate={new Date()}
                />
              )}
              
              <Text style={styles.label}>Bonnen ({imageUris.length} foto's)</Text>
              <View style={styles.imageActions}>
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={openCamera}
                >
                  <Text style={styles.imageButtonText}>Foto's Maken</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.imageButton}
                  onPress={pickImages}
                >
                  <Text style={styles.imageButtonText}>Afbeeldingen Kiezen</Text>
                </TouchableOpacity>
              </View>
              
              {imageUris.length > 0 && (
                <View style={styles.imagesContainer}>
                  <FlatList
                    data={imageUris}
                    renderItem={renderImageItem}
                    keyExtractor={(item, index) => `${item}-${index}`}
                    numColumns={2}
                    scrollEnabled={false}
                    columnWrapperStyle={styles.imageRow}
                  />
                </View>
              )}
              
              {imageUris.length > 0 && apiKey && (
                <TouchableOpacity
                  style={[
                    styles.processButton,
                    isProcessing && styles.processButtonDisabled
                  ]}
                  onPress={processReceipts}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <View style={styles.processingContainer}>
                      <ActivityIndicator size="small" color={Colors.secondary} />
                      <Text style={styles.processButtonText}>Verwerken...</Text>
                    </View>
                  ) : (
                    <View style={styles.processingContainer}>
                      <Send size={16} color={Colors.secondary} />
                      <Text style={styles.processButtonText}>Verstuur Foto's ({imageUris.length})</Text>
                    </View>
                  )}
                </TouchableOpacity>
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
          {Platform.OS !== 'web' ? (
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
                
                <View style={styles.captureSection}>
                  <TouchableOpacity
                    style={styles.captureButton}
                    onPress={takePicture}
                  >
                    <View style={styles.captureButtonInner} />
                  </TouchableOpacity>
                  <Text style={styles.photoCount}>{imageUris.length} foto's</Text>
                </View>
                
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => setFacing(facing === 'back' ? 'front' : 'back')}
                >
                  <Camera size={24} color={Colors.secondary} />
                </TouchableOpacity>
              </View>
            </CameraView>
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
              <Text>Camera niet beschikbaar op web</Text>
              <TouchableOpacity
                style={styles.submitButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.submitButtonText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          )}
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
    color: Colors.text,
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
  imagesContainer: {
    marginBottom: 16,
  },
  imageRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  imageItem: {
    position: 'relative',
    width: '48%',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
  },
  processButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginBottom: 16,
  },
  processButtonDisabled: {
    opacity: 0.7,
  },
  processingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  processButtonText: {
    color: Colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
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
  captureSection: {
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
  photoCount: {
    color: Colors.secondary,
    fontSize: 12,
    marginTop: 4,
    fontWeight: 'bold',
  },
  nameInputContainer: {
    position: 'relative',
    zIndex: 1000,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: Colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    borderTopWidth: 0,
    borderTopLeftRadius: 0,
    borderTopRightRadius: 0,
    maxHeight: 150,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  suggestionText: {
    fontSize: 16,
    color: Colors.text,
  },
});