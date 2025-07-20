import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Modal, Platform, Alert } from 'react-native';
import { Trash2, Paperclip, X, Download, Share } from 'lucide-react-native';
import { Image } from 'expo-image';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import Colors from '@/constants/colors';
import { FinanceEntry } from '@/types/finance';
import { formatCurrency, formatDate } from '@/utils/finance';

interface FinanceEntryItemProps {
  entry: FinanceEntry;
  onDelete: (id: string) => void;
}

export default function FinanceEntryItem({ entry, onDelete }: FinanceEntryItemProps) {
  const [showImageModal, setShowImageModal] = useState(false);

  const handleDownloadImage = async () => {
    if (!entry.imageUri) return;

    try {
      if (Platform.OS === 'web') {
        // For web, create a download link
        const link = document.createElement('a');
        link.href = entry.imageUri;
        link.download = `${entry.name}_${entry.date}.jpg`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        Alert.alert('Succes', 'Afbeelding gedownload!');
      } else {
        // For mobile, save to device
        const fileName = `${entry.name}_${entry.date}.jpg`;
        const fileUri = `${FileSystem.documentDirectory}${fileName}`;
        
        await FileSystem.copyAsync({
          from: entry.imageUri,
          to: fileUri,
        });
        
        Alert.alert('Succes', `Afbeelding opgeslagen als: ${fileName}`);
      }
    } catch (error) {
      console.error('Error downloading image:', error);
      Alert.alert('Fout', 'Kon afbeelding niet downloaden');
    }
  };

  const handleShareImage = async () => {
    if (!entry.imageUri) return;

    try {
      if (Platform.OS !== 'web' && await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(entry.imageUri, {
          mimeType: 'image/jpeg',
          dialogTitle: 'Afbeelding delen',
        });
      } else {
        Alert.alert('Niet beschikbaar', 'Delen is niet beschikbaar op dit platform');
      }
    } catch (error) {
      console.error('Error sharing image:', error);
      Alert.alert('Fout', 'Kon afbeelding niet delen');
    }
  };

  return (
    <>
      <View style={styles.container}>
        <View style={styles.content}>
          <View style={styles.header}>
            <View style={styles.nameContainer}>
              <Text style={styles.name}>{entry.name}</Text>
            </View>
            <Text style={styles.date}>{formatDate(entry.date)}</Text>
          </View>
          
          <View style={styles.amounts}>
            <View style={styles.amountContainer}>
              <Text style={styles.amount}>{formatCurrency(entry.amount)}</Text>
              {entry.imageUri && (
                <TouchableOpacity
                  style={styles.attachmentIcon}
                  onPress={() => setShowImageModal(true)}
                >
                  <Paperclip size={16} color={Colors.primary} />
                </TouchableOpacity>
              )}
            </View>
            <Text style={styles.vatAmount}>
              BTW: {formatCurrency(entry.vatAmount)}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => onDelete(entry.id)}
        >
          <Trash2 size={18} color={Colors.danger} />
        </TouchableOpacity>
      </View>

      {/* Image Modal */}
      <Modal
        visible={showImageModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{entry.name}</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowImageModal(false)}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            {entry.imageUri && (
              <Image
                source={{ uri: entry.imageUri }}
                style={styles.fullImage}
                contentFit="contain"
              />
            )}
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleDownloadImage}
              >
                <Download size={20} color={Colors.text} />
                <Text style={styles.actionButtonText}>Downloaden</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.actionButton}
                onPress={handleShareImage}
              >
                <Share size={20} color={Colors.text} />
                <Text style={styles.actionButtonText}>Delen</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
    marginVertical: 6,
    marginHorizontal: 16,
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  content: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    alignItems: 'flex-start',
  },
  nameContainer: {
    flex: 1,
    marginRight: 8,
  },
  name: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  date: {
    fontSize: 14,
    color: Colors.lightText,
  },
  amounts: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  amount: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
  },
  attachmentIcon: {
    marginLeft: 8,
    padding: 4,
  },
  vatAmount: {
    fontSize: 14,
    color: Colors.lightText,
  },
  deleteButton: {
    justifyContent: 'center',
    paddingLeft: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: '90%',
    maxHeight: '90%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: Colors.text,
    flex: 1,
  },
  closeButton: {
    padding: 4,
  },
  fullImage: {
    width: '100%',
    height: 400,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  actionButtonText: {
    color: Colors.text,
    fontWeight: '500',
    marginLeft: 8,
  },
});