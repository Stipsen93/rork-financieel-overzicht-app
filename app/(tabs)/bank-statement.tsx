import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  ActivityIndicator,
  Platform,
  FlatList,
} from 'react-native';
import { Stack } from 'expo-router';
import { Camera, Upload, FileText, X } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useFinanceStore } from '@/store/financeStore';
import { processBankStatements } from '@/utils/bankStatementService';
import { localAI, testOCRWithSampleText, testOCREngineInitialization, testOCRWithReceiptImage } from '@/utils/localAIService';

interface SelectedFile {
  uri: string;
  type: 'image' | 'pdf';
  name?: string;
}

export default function BankStatementScreen() {
  const [selectedFiles, setSelectedFiles] = useState<SelectedFile[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  const [isTestingOCR, setIsTestingOCR] = useState(false);
  const [ocrTestResult, setOcrTestResult] = useState<string>('');
  const [showOCRTest, setShowOCRTest] = useState(false);
  
  const { apiKey, addIncome, addExpense } = useFinanceStore();
  const cameraRef = React.useRef<CameraView>(null);

  const openCamera = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Toestemming vereist', 'Camera toestemming is nodig om foto&apos;s te maken');
        return;
      }
    }
    setShowCamera(true);
  };

  const takePicture = async () => {
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo) {
        if (showOCRTest) {
          // If in OCR test mode, run OCR test immediately
          setShowCamera(false);
          setShowOCRTest(false);
          await runOCRTest([photo.uri]);
        } else {
          // Normal mode: add to selected files
          setSelectedFiles(prev => [...prev, { uri: photo.uri, type: 'image' }]);
        }
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Fout', 'Kon geen foto maken');
    }
  };

  const pickImages = async () => {
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
      const newFiles = result.assets.map(asset => ({ uri: asset.uri, type: 'image' as const }));
      setSelectedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
        multiple: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const newFiles = result.assets.map(asset => ({
          uri: asset.uri,
          type: asset.mimeType?.includes('pdf') ? 'pdf' as const : 'image' as const,
          name: asset.name,
        }));
        setSelectedFiles(prev => [...prev, ...newFiles]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Fout', 'Kon documenten niet selecteren');
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
  };

  const testOCRWithCamera = async () => {
    if (!permission?.granted) {
      const permissionResult = await requestPermission();
      if (!permissionResult.granted) {
        Alert.alert('Toestemming vereist', 'Camera toestemming is nodig om foto&apos;s te maken');
        return;
      }
    }
    setShowCamera(true);
    setShowOCRTest(true);
  };

  const testOCRWithPhoto = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming vereist', 'Toegang tot fotobibliotheek is nodig om afbeeldingen te selecteren');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      allowsMultipleSelection: false,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      await runOCRTest([imageUri]);
    }
  };

  const runOCRTest = async (imageUris?: string[]) => {
    setIsTestingOCR(true);
    setOcrTestResult('');
    
    try {
      let result;
      
      if (imageUris && imageUris.length > 0) {
        console.log('Testing OCR with provided images:', imageUris);
        result = await localAI.processReceiptImages(imageUris);
      } else {
        console.log('Testing OCR with sample text...');
        result = await testOCRWithSampleText();
      }
      
      if (result.success && result.data) {
        const data = result.data;
        setOcrTestResult(
          `✅ OCR Test Succesvol!\n\n` +
          `Bedrijf: ${data.name || 'Niet gevonden'}\n` +
          `Bedrag: €${data.amount?.toFixed(2) || '0.00'}\n` +
          `BTW: ${data.vatRate || 21}%\n` +
          `Datum: ${data.date || 'Niet gevonden'}\n\n` +
          `De lokale OCR werkt correct en kan bonnetjes lezen!`
        );
        
        Alert.alert(
          'OCR Test Succesvol!',
          `Bedrijf: ${data.name}\nBedrag: €${data.amount?.toFixed(2)}\nBTW: ${data.vatRate}%`,
          [
            {
              text: 'Toevoegen als Uitgave',
              onPress: () => {
                if (data.amount && data.amount > 0) {
                  addExpense({
                    name: data.name || 'OCR Test Uitgave',
                    amount: data.amount,
                    vatRate: data.vatRate || 21,
                    date: data.date || new Date().toISOString().split('T')[0],
                  });
                  Alert.alert('Toegevoegd', 'Uitgave is toegevoegd aan je administratie!');
                }
              }
            },
            { text: 'OK', style: 'default' }
          ]
        );
      } else {
        setOcrTestResult(
          `❌ OCR Test Mislukt\n\n` +
          `Fout: ${result.error || 'Onbekende fout'}\n\n` +
          `Probeer een andere foto of controleer de OCR instellingen.`
        );
        
        Alert.alert('OCR Test Mislukt', result.error || 'Onbekende fout bij OCR test');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      setOcrTestResult(
        `❌ OCR Test Fout\n\n` +
        `Fout: ${errorMessage}\n\n` +
        `Controleer de console voor meer details.`
      );
      
      console.error('OCR test error:', error);
      Alert.alert('OCR Test Fout', errorMessage);
    } finally {
      setIsTestingOCR(false);
    }
  };

  const testOCREngineInit = async () => {
    setIsTestingOCR(true);
    setOcrTestResult('');
    
    try {
      console.log('Testing OCR engine initialization...');
      const result = await testOCREngineInitialization();
      
      if (result.success) {
        setOcrTestResult(
          `✅ OCR Engine Test Succesvol!\n\n` +
          `De OCR engine kan succesvol worden geïnitialiseerd en is klaar voor gebruik.\n\n` +
          `Test nu met een echte foto om de volledige functionaliteit te controleren.`
        );
        Alert.alert('OCR Engine OK', 'OCR engine werkt correct!');
      } else {
        setOcrTestResult(
          `❌ OCR Engine Test Mislukt\n\n` +
          `Fout: ${result.error || 'Onbekende fout'}\n\n` +
          `De OCR engine kan niet worden geïnitialiseerd.`
        );
        Alert.alert('OCR Engine Fout', result.error || 'OCR engine initialisatie mislukt');
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Onbekende fout';
      setOcrTestResult(
        `❌ OCR Engine Fout\n\n` +
        `Fout: ${errorMessage}\n\n` +
        `Controleer de console voor meer details.`
      );
      
      console.error('OCR engine test error:', error);
      Alert.alert('OCR Engine Fout', errorMessage);
    } finally {
      setIsTestingOCR(false);
    }
  };

  const processStatements = async () => {
    if (selectedFiles.length === 0) return;
    
    if (!apiKey) {
      Alert.alert('API Sleutel Ontbreekt', 'Stel je ChatGPT API sleutel in via het menu');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const transactions = await processBankStatements(selectedFiles, apiKey);
      
      if (transactions && transactions.length > 0) {
        // Add transactions to the store
        transactions.forEach(transaction => {
          if (transaction.amount > 0) {
            addIncome({
              name: transaction.description,
              amount: transaction.amount,
              vatRate: transaction.vatRate || 21,
              date: transaction.date,
            });
          } else {
            addExpense({
              name: transaction.description,
              amount: Math.abs(transaction.amount),
              vatRate: transaction.vatRate || 21,
              date: transaction.date,
            });
          }
        });
        
        Alert.alert(
          'Succes', 
          `${transactions.length} transacties succesvol verwerkt en toegevoegd uit ${selectedFiles.length} bestand(en)!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedFiles([]);
              }
            }
          ]
        );
      } else {
        Alert.alert('Geen Transacties', 'Er konden geen transacties worden gevonden in de bankafschriften');
      }
    } catch (error: any) {
      console.error('Error processing bank statements:', error);
      Alert.alert('Fout', error.message || 'Kon bankafschriften niet verwerken. Controleer je internetverbinding en API sleutel.');
    } finally {
      setIsProcessing(false);
    }
  };

  const renderFileItem = ({ item, index }: { item: SelectedFile; index: number }) => (
    <View style={styles.fileItem}>
      {item.type === 'image' ? (
        <Image
          source={{ uri: item.uri }}
          style={styles.imagePreview}
          contentFit="cover"
        />
      ) : (
        <View style={styles.pdfPreview}>
          <FileText size={40} color={Colors.text} />
          <Text style={styles.pdfName} numberOfLines={2}>
            {item.name || 'PDF Bestand'}
          </Text>
        </View>
      )}
      <TouchableOpacity
        style={styles.removeFileButton}
        onPress={() => removeFile(index)}
      >
        <X size={16} color={Colors.secondary} />
      </TouchableOpacity>
    </View>
  );

  return (
    <ScrollView style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Versie 2.9',
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
        <Text style={styles.title}>Bankafschriften Verwerken</Text>
        <Text style={styles.subtitle}>
          Maak foto&apos;s van je bankafschriften, selecteer afbeeldingen of upload PDF bestanden om automatisch alle transacties toe te voegen met ChatGPT AI
        </Text>
      </View>
      
      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Selecteer Bestanden ({selectedFiles.length} geselecteerd)</Text>
        
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={openCamera}
          >
            <Camera size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>Foto&apos;s Maken</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImages}
          >
            <Upload size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>Afbeeldingen Kiezen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocument}
          >
            <FileText size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>PDF Bestanden</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {selectedFiles.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Geselecteerde Bestanden ({selectedFiles.length})</Text>
          
          <FlatList
            data={selectedFiles}
            renderItem={renderFileItem}
            keyExtractor={(item, index) => `${item.uri}-${index}`}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.fileRow}
          />
          
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={() => setSelectedFiles([])}
          >
            <Text style={styles.clearAllButtonText}>Alle Bestanden Verwijderen</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {selectedFiles.length > 0 && apiKey && (
        <TouchableOpacity
          style={[
            styles.processButton,
            isProcessing && styles.processButtonDisabled
          ]}
          onPress={processStatements}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.processButtonText}>Verwerken...</Text>
            </View>
          ) : (
            <Text style={styles.processButtonText}>
              Bankafschriften Verwerken ({selectedFiles.length} bestand{selectedFiles.length !== 1 ? 'en' : ''})
            </Text>
          )}
        </TouchableOpacity>
      )}
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Hoe werkt het?</Text>
        <Text style={styles.infoText}>
          1. Zorg dat je ChatGPT API sleutel is ingesteld{'\n'}
          2. Maak duidelijke foto&apos;s van je bankafschriften, selecteer afbeeldingen of upload PDF bestanden{'\n'}
          3. Druk op &quot;Bankafschriften Verwerken&quot;{'\n'}
          4. De app leest automatisch alle transacties uit alle bestanden{'\n'}
          5. Inkomsten en uitgaven worden automatisch toegevoegd{'\n'}
          {'\n'}
          <Text style={styles.infoNote}>
            Let op: Controleer altijd de toegevoegde transacties en pas indien nodig aan.
          </Text>
        </Text>
      </View>
      
      {/* OCR Test Section */}
      <View style={styles.ocrTestSection}>
        <Text style={styles.sectionTitle}>🔬 Lokale OCR Testen</Text>
        <Text style={styles.ocrTestDescription}>
          Test de lokale OCR functionaliteit om te controleren of bonnetjes correct kunnen worden gelezen zonder internet.
        </Text>
        
        <View style={styles.ocrTestButtons}>
          <TouchableOpacity
            style={[styles.ocrTestButton, styles.ocrTestButtonPrimary]}
            onPress={testOCREngineInit}
            disabled={isTestingOCR}
          >
            <Text style={styles.ocrTestButtonText}>Engine Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.ocrTestButton, styles.ocrTestButtonSecondary]}
            onPress={() => runOCRTest()}
            disabled={isTestingOCR}
          >
            <Text style={styles.ocrTestButtonText}>Sample Test</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.ocrTestButtons}>
          <TouchableOpacity
            style={[styles.ocrTestButton, styles.ocrTestButtonCamera]}
            onPress={testOCRWithCamera}
            disabled={isTestingOCR}
          >
            <Camera size={16} color={Colors.text} />
            <Text style={styles.ocrTestButtonText}>Camera Test</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.ocrTestButton, styles.ocrTestButtonUpload]}
            onPress={testOCRWithPhoto}
            disabled={isTestingOCR}
          >
            <Upload size={16} color={Colors.text} />
            <Text style={styles.ocrTestButtonText}>Foto Test</Text>
          </TouchableOpacity>
        </View>
        
        {isTestingOCR && (
          <View style={styles.ocrTestLoading}>
            <ActivityIndicator size="small" color={Colors.primary} />
            <Text style={styles.ocrTestLoadingText}>OCR wordt getest...</Text>
          </View>
        )}
        
        {ocrTestResult !== '' && (
          <View style={styles.ocrTestResult}>
            <Text style={styles.ocrTestResultText}>{ocrTestResult}</Text>
          </View>
        )}
      </View>

      {/* Camera Modal */}
      {showCamera && (
        <View style={StyleSheet.absoluteFill}>
          {Platform.OS !== 'web' ? (
            <CameraView
              ref={cameraRef}
              style={{ flex: 1 }}
              facing={facing}
            >
              <View style={styles.cameraControls}>
                <TouchableOpacity
                  style={styles.cameraButton}
                  onPress={() => {
                    setShowCamera(false);
                    setShowOCRTest(false);
                  }}
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
                  <Text style={styles.photoCount}>
                    {showOCRTest ? 'OCR Test' : `${selectedFiles.filter(f => f.type === 'image').length} foto&apos;s`}
                  </Text>
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
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: Colors.background }}>
              <Text>Camera niet beschikbaar op web</Text>
              <TouchableOpacity
                style={styles.processButton}
                onPress={() => setShowCamera(false)}
              >
                <Text style={styles.processButtonText}>Sluiten</Text>
              </TouchableOpacity>
            </View>
          )}
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
  uploadSection: {
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
  uploadButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  uploadButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 8,
    padding: 16,
    alignItems: 'center',
    marginHorizontal: 2,
  },
  uploadButtonText: {
    color: Colors.text,
    fontWeight: '500',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  previewSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  fileRow: {
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  fileItem: {
    position: 'relative',
    width: '48%',
    marginBottom: 8,
  },
  imagePreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  pdfPreview: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.border,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 8,
  },
  pdfName: {
    fontSize: 12,
    color: Colors.text,
    textAlign: 'center',
    marginTop: 4,
  },
  removeFileButton: {
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
  clearAllButton: {
    backgroundColor: Colors.danger,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginTop: 16,
  },
  clearAllButtonText: {
    color: Colors.secondary,
    fontWeight: '500',
  },
  processButton: {
    backgroundColor: Colors.primaryDark,
    borderRadius: 12,
    padding: 18,
    margin: 16,
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
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
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
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
  ocrTestSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
    marginBottom: 32,
  },
  ocrTestDescription: {
    fontSize: 14,
    color: Colors.lightText,
    marginBottom: 16,
    lineHeight: 20,
  },
  ocrTestButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  ocrTestButton: {
    flex: 1,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 4,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  ocrTestButtonPrimary: {
    backgroundColor: Colors.primary,
  },
  ocrTestButtonSecondary: {
    backgroundColor: Colors.primaryDark,
  },
  ocrTestButtonCamera: {
    backgroundColor: '#4CAF50',
  },
  ocrTestButtonUpload: {
    backgroundColor: '#2196F3',
  },
  ocrTestButtonText: {
    color: Colors.text,
    fontWeight: '500',
    fontSize: 12,
    marginLeft: 4,
  },
  ocrTestLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginTop: 8,
  },
  ocrTestLoadingText: {
    color: Colors.text,
    marginLeft: 8,
    fontSize: 14,
  },
  ocrTestResult: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  ocrTestResultText: {
    color: Colors.text,
    fontSize: 13,
    lineHeight: 18,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
});