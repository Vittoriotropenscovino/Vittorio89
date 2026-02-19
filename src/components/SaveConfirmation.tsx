import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, Animated, Easing } from 'react-native';
import { Ionicons } from '@expo/vector-icons';

interface Props {
    visible: boolean;
    message: string;
    icon?: string;
    color?: string;
    onDone: () => void;
}

const SaveConfirmation: React.FC<Props> = ({ visible, message, icon = 'checkmark-circle', color = '#10B981', onDone }) => {
    const scale = useRef(new Animated.Value(0)).current;
    const opacity = useRef(new Animated.Value(0)).current;

    useEffect(() => {
        if (visible) {
            Animated.sequence([
                Animated.parallel([
                    Animated.spring(scale, { toValue: 1, tension: 100, friction: 6, useNativeDriver: true }),
                    Animated.timing(opacity, { toValue: 1, duration: 200, useNativeDriver: true }),
                ]),
                Animated.delay(1200),
                Animated.timing(opacity, { toValue: 0, duration: 300, useNativeDriver: true }),
            ]).start(() => {
                scale.setValue(0);
                onDone();
            });
        }
    }, [visible, scale, opacity, onDone]);

    if (!visible) return null;

    return (
        <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]} pointerEvents="none">
            <View style={[styles.badge, { borderColor: color + '40' }]}>
                <Ionicons name={icon as any} size={32} color={color} />
                <Text style={[styles.text, { color }]}>{message}</Text>
            </View>
        </Animated.View>
    );
};

const styles = StyleSheet.create({
    container: {
        ...StyleSheet.absoluteFillObject,
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 999,
        elevation: 999,
    },
    badge: {
        backgroundColor: 'rgba(5, 5, 20, 0.9)',
        borderRadius: 20,
        borderWidth: 1,
        paddingHorizontal: 28,
        paddingVertical: 20,
        alignItems: 'center',
        gap: 8,
    },
    text: {
        fontSize: 16,
        fontWeight: '700',
    },
});

export default SaveConfirmation;
