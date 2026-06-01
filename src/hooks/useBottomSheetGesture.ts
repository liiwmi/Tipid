import { useRef } from 'react';
import { PanResponder, Animated } from 'react-native';

interface Options {
  onClose: () => void;
  threshold?: number;
  velocityThreshold?: number;
}

export function useBottomSheetGesture({
  onClose,
  threshold = 50,
  velocityThreshold = 0.3,
}: Options) {
  const translateY = useRef(new Animated.Value(0)).current;

  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gestureState) => gestureState.dy > 0,
      onPanResponderMove: (_, gestureState) => {
        if (gestureState.dy > 0) translateY.setValue(gestureState.dy);
      },
      onPanResponderRelease: (_, gestureState) => {
        const shouldClose =
          gestureState.dy > threshold ||
          gestureState.vy > velocityThreshold;

        if (shouldClose) {
          Animated.timing(translateY, {
            toValue: 600,
            duration: 150,
            useNativeDriver: true,
          }).start(() => {
            translateY.setValue(0);
            onClose();
          });
        } else {
          Animated.spring(translateY, {
            toValue: 0,
            useNativeDriver: true,
            bounciness: 4,
          }).start();
        }
      },
    })
  ).current;

  const reset = () => translateY.setValue(0);

  return { translateY, panResponder, reset };
}