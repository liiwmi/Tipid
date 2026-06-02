import React, { useRef } from 'react';
import { Modal, TouchableOpacity, StyleSheet, PanResponder } from 'react-native';

interface Props {
  visible: boolean;
  onPress?: () => void;
}

export default function Overlay({ visible, onPress }: Props): React.ReactElement {
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 10,
      onPanResponderRelease: (_, gestureState) => {
        if (gestureState.dy > 30 || gestureState.vy > 0.3) {
          onPress?.();
        }
      },
    })
  ).current;

  return (
    <Modal
      visible={visible}
      animationType="fade"
      transparent
      onRequestClose={onPress}
      statusBarTranslucent
    >
      <TouchableOpacity
        style={overlayStyles.backdrop}
        activeOpacity={1}
        onPress={onPress}
        {...panResponder.panHandlers}
      >
        <></>
      </TouchableOpacity>
    </Modal>
  );
}

const overlayStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
  },
});