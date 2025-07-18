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
} from 'react-native';
import { Stack } from 'expo-router';
import { Camera, Upload, FileText } from 'lucide-react-native';
import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { Image } from 'expo-image';
import Colors from '@/constants/colors';
import { useFinanceStore } from '@/store/financeStore';
import { processBankStatement } from '@/utils/bankStatementService';

export default function BankStatementScreen() {
  const [selectedFile, setSelectedFile] = useState<string | null>(null);
  const [fileType, setFileType] = useState<'image' | 'pdf' | null>(null);
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
        setSelectedFile(photo.uri);
        setFileType('image');
        setShowCamera(false);
      }
    } catch (error) {
      console.error('Error taking picture:', error);
      Alert.alert('Fout', 'Kon geen foto maken');
    }
  };

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Toestemming vereist', 'Toegang tot fotobibliotheek is nodig om afbeeldingen te selecteren');
      return;
    }
    
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    
    if (!result.canceled && result.assets && result.assets.length > 0) {
      setSelectedFile(result.assets[0].uri);
      setFileType('image');
    }
  };

  const pickDocument = async () => {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: ['application/pdf', 'image/*'],
        copyToCacheDirectory: true,
      });
      
      if (!result.canceled && result.assets && result.assets.length > 0) {
        const asset = result.assets[0];
        setSelectedFile(asset.uri);
        setFileType(asset.mimeType?.includes('pdf') ? 'pdf' : 'image');
      }
    } catch (error) {
      console.error('Error picking document:', error);
      Alert.alert('Fout', 'Kon document niet selecteren');
    }
  };

  const processStatement = async () => {
    if (!selectedFile) return;
    
    if (!apiKey) {
      Alert.alert('API Sleutel Ontbreekt', 'Stel je ChatGPT API sleutel in via het menu');
      return;
    }
    
    setIsProcessing(true);
    
    try {
      const transactions = await processBankStatement(selectedFile, fileType!, apiKey);
      
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
          `${transactions.length} transacties succesvol verwerkt en toegevoegd!`,
          [
            {
              text: 'OK',
              onPress: () => {
                setSelectedFile(null);
                setFileType(null);
              }
            }
          ]
        );
      } else {
        Alert.alert('Geen Transacties', 'Er konden geen transacties worden gevonden in het bankafschrift');
      }
    } catch (error) {
      console.error('Error processing bank statement:', error);
      Alert.alert('Fout', 'Kon bankafschrift niet verwerken. Controleer je internetverbinding en API sleutel.');
    } finally {
      setIsProcessing(false);
    }
  };

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
        <Text style={styles.title}>Bankafschrift Verwerken</Text>
        <Text style={styles.subtitle}>
          Upload een foto of PDF van je bankafschrift om automatisch alle transacties toe te voegen
        </Text>
      </View>
      
      <View style={styles.uploadSection}>
        <Text style={styles.sectionTitle}>Selecteer Bestand</Text>
        
        <View style={styles.uploadButtons}>
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={openCamera}
          >
            <Camera size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>Foto Maken</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickImage}
          >
            <Upload size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>Afbeelding Kiezen</Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.uploadButton}
            onPress={pickDocument}
          >
            <FileText size={24} color={Colors.text} />
            <Text style={styles.uploadButtonText}>PDF Kiezen</Text>
          </TouchableOpacity>
        </View>
      </View>
      
      {selectedFile && (
        <View style={styles.previewSection}>
          <Text style={styles.sectionTitle}>Geselecteerd Bestand</Text>
          
          {fileType === 'image' ? (
            <Image
              source={{ uri: selectedFile }}
              style={styles.imagePreview}
              contentFit="cover"
            />
          ) : (
            <View style={styles.pdfPreview}>
              <FileText size={48} color={Colors.text} />
              <Text style={styles.pdfText}>PDF Geselecteerd</Text>
            </View>
          )}
          
          <TouchableOpacity
            style={styles.removeButton}
            onPress={() => {
              setSelectedFile(null);
              setFileType(null);
            }}
          >
            <Text style={styles.removeButtonText}>Verwijderen</Text>
          </TouchableOpacity>
        </View>
      )}
      
      {selectedFile && apiKey && (
        <TouchableOpacity
          style={[
            styles.processButton,
            isProcessing && styles.processButtonDisabled
          ]}
          onPress={processStatement}
          disabled={isProcessing}
        >
          {isProcessing ? (
            <View style={styles.processingContainer}>
              <ActivityIndicator size="small" color={Colors.secondary} />
              <Text style={styles.processButtonText}>Verwerken...</Text>
            </View>
          ) : (
            <Text style={styles.processButtonText}>Bankafschrift Verwerken</Text>
          )}
        </TouchableOpacity>
      )}
      
      <View style={styles.infoSection}>
        <Text style={styles.infoTitle}>Hoe werkt het?</Text>
        <Text style={styles.infoText}>
          1. Zorg dat je ChatGPT API sleutel is ingesteld{'\n'}
          2. Maak een foto of selecteer een PDF van je bankafschrift{'\n'}
          3. Druk op "Bankafschrift Verwerken"{'\n'}
          4. De app leest automatisch alle transacties uit{'\n'}
          5. Inkomsten en uitgaven worden automatisch toegevoegd{'\n'}
          {'\n'}
          <Text style={styles.infoNote}>
            Let op: Controleer altijd de toegevoegde transacties en pas indien nodig aan.
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
  previewSection: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 20,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  imagePreview: {
    width: '100%',
    height: 200,
    borderRadius: 8,
    marginBottom: 16,
  },
  pdfPreview: {
    alignItems: 'center',
    padding: 40,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 16,
  },
  pdfText: {
    fontSize: 16,
    color: Colors.text,
    marginTop: 8,
  },
  removeButton: {
    backgroundColor: Colors.danger,
    borderRadius: 8,
    padding: 12,
    alignItems: 'center',
  },
  removeButtonText: {
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
});