import React from 'react';
import { TouchableOpacity, StyleSheet } from 'react-native';
import { Plus, Minus } from 'lucide-react-native';
import Colors from '@/constants/colors';

interface FloatingActionButtonProps {
  type: 'income' | 'expense';
  onPress: () => void;
}

export default function FloatingActionButton({ type, onPress }: FloatingActionButtonProps) {
  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor: type === 'income' ? Colors.success : Colors.danger },
      ]}
      onPress={onPress}
    >
      {type === 'income' ? (
        <Plus size={24} color={Colors.secondary} />
      ) : (
        <Minus size={24} color={Colors.secondary} />
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 3,
    elevation: 5,
  },
});