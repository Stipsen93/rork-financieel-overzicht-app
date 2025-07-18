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

export default function BankStatementScreen() {
  const [selectedFiles, setSelectedFiles] = useState<string[]>([]);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showCamera, setShowCamera] = useState(false);
  const [facing, setFacing] = useState<CameraType>('back');
  const [permission, requestPermission] = useCameraPermissions();
  
  const { apiKey, addIncome, addExpense } = useFinanceStore();
  const cameraRef = React.useRef<CameraView>(null);

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
    if (!cameraRef.current) return;
    
    try {
      const photo = await cameraRef.current.takePictureAsync({
        quality: 0.8,
        base64: false,
      });
      if (photo) {
        setSelectedFiles(prev => [...prev, photo.uri]);
        // Don't close camera automatically to allow multiple photos
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
      const newUris = result.assets.map(asset => asset.uri);
      setSelectedFiles(prev => [...prev, ...newUris]);
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
        const pdfFiles = result.assets.filter(asset => asset.mimeType?.includes('pdf'));
        
        if (pdfFiles.length > 0) {
          Alert.alert(
            'PDF Niet Ondersteund',
            'PDF bankafschriften worden momenteel niet ondersteund. Maak foto\'s van je bankafschriften of gebruik afbeeldingen.',
            [{ text: 'OK' }]
          );
          return;
        }
        
        const imageFiles = result.assets.filter(asset => !asset.mimeType?.includes('pdf'));
        const newUris = imageFiles.map(asset => asset.uri);
        setSelectedFiles(prev => [...prev, ...newUris]);
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Fout', 'Kon documenten niet selecteren');
    }
  };

  const removeFile = (indexToRemove: number) => {
    setSelectedFiles(prev => prev.filter((_, index) => index !== indexToRemove));
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
          `${transactions.length} transacties succesvol verwerkt en toegevoegd uit ${selectedFiles.length} afbeelding(en)!`,
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

  const renderImageItem = ({ item, index }: { item: string; index: number }) => (
    <View style={styles.imageItem}>
      <Image
        source={{ uri: item }}
        style={styles.imagePreview}
        contentFit="cover"
      />
      <TouchableOpacity
        style={styles.removeImageButton}
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
          title: 'Bankafschrift',
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
          Maak foto's van je bankafschriften of selecteer meerdere afbeeldingen om automatisch alle transacties toe te voegen
        </Text>
      </View>
      
      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Selecteer Afbeeldingen ({selectedFiles.length} geselecteerd)</Text>
        
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={openCamera}
          >
            <Camera size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>Foto's Maken</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImages}
          >
            <Upload size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>Afbeeldingen Kiezen</Text>
          </TouchableOpacity>
        </View>
        
        <View style={styles.warningContainer}>
          <Text style={styles.warningText}>
            ⚠️ Momenteel worden alleen afbeeldingen ondersteund. PDF bestanden kunnen niet verwerkt worden.
          </Text>
        </View>
      </View>
      
      {selectedFiles.length > 0 && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Geselecteerde Afbeeldingen ({selectedFiles.length})</Text>
          
          <FlatList
            data={selectedFiles}
            renderItem={renderImageItem}
            keyExtractor={(item, index) => `${item}-${index}`}
            numColumns={2}
            scrollEnabled={false}
            columnWrapperStyle={styles.imageRow}
          />
          
          <TouchableOpacity
            style={styles.clearAllButton}
            onPress={() => setSelectedFiles([])}
          >
            <Text style={styles.clearAllButtonText}>Alle Afbeeldingen Verwijderen</Text>
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
              Bankafschriften Verwerken ({selectedFiles.length} afbeelding{selectedFiles.length !== 1 ? 'en' : ''})
            </Text>
          )}
        </TouchableOpacity>
      )}
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Hoe werkt het?</Text>
        <Text style={styles.infoText}>
          1. Zorg dat je ChatGPT API sleutel is ingesteld{'\n'}
          2. Maak duidelijke foto's van je bankafschriften of selecteer meerdere afbeeldingen{'\n'}
          3. Druk op "Bankafschriften Verwerken"{'\n'}
          4. De app leest automatisch alle transacties uit alle afbeeldingen{'\n'}
          5. Inkomsten en uitgaven worden automatisch toegevoegd{'\n'}
          {'\n'}
          <Text style={styles.infoNote}>
            Let op: Controleer altijd de toegevoegde transacties en pas indien nodig aan.
          </Text>
        </Text>
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
                  <Text style={styles.photoCount}>{selectedFiles.length} foto's</Text>
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
    marginHorizontal: 4,
  },
  uploadButtonText: {
    color: Colors.text,
    fontWeight: '500',
    marginTop: 8,
    fontSize: 12,
    textAlign: 'center',
  },
  warningContainer: {
    backgroundColor: '#FFF3CD',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#FFEAA7',
  },
  warningText: {
    fontSize: 14,
    color: '#856404',
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
});