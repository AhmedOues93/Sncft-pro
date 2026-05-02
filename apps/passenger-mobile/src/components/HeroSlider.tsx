import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Animated,
  ImageBackground,
  ImageSourcePropType,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors, radii, spacing } from '../theme';

export interface HeroSlide {
  source: ImageSourcePropType;
  title: string;
  subtitle: string;
}

interface HeroSliderProps {
  slides: HeroSlide[];
}

export default function HeroSlider({ slides }: HeroSliderProps) {
  const [index, setIndex] = useState(0);
  const fade = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (slides.length <= 1) return undefined;

    const interval = setInterval(() => {
      Animated.sequence([
        Animated.timing(fade, {
          duration: 240,
          toValue: 0,
          useNativeDriver: true,
        }),
        Animated.timing(fade, {
          duration: 420,
          toValue: 1,
          useNativeDriver: true,
        }),
      ]).start();

      setIndex((current) => (current + 1) % slides.length);
    }, 4600);

    return () => clearInterval(interval);
  }, [fade, slides.length]);

  const activeSlide = useMemo(() => slides[index] || slides[0], [index, slides]);

  return (
    <Animated.View style={[styles.card, { opacity: fade }]}>
      <ImageBackground source={activeSlide.source} style={styles.image} imageStyle={styles.imageStyle}>
        <LinearGradient
          colors={['rgba(7, 21, 34, 0.12)', colors.overlay]}
          start={{ x: 0.1, y: 0 }}
          end={{ x: 0.9, y: 1 }}
          style={styles.overlay}
        >
          <View style={styles.copy}>
            <Text style={styles.title}>{activeSlide.title}</Text>
            <Text style={styles.subtitle}>{activeSlide.subtitle}</Text>
          </View>

          <View style={styles.dotsRow}>
            {slides.map((slide, slideIndex) => (
              <View
                key={`${slide.title}-${slideIndex}`}
                style={[styles.dot, slideIndex === index && styles.dotActive]}
              />
            ))}
          </View>
        </LinearGradient>
      </ImageBackground>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  card: {
    flex: 1,
  },
  image: {
    flex: 1,
  },
  imageStyle: {
    borderBottomLeftRadius: radii.xl,
    borderBottomRightRadius: radii.xl,
  },
  overlay: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    paddingBottom: 118,
    paddingTop: 108,
  },
  copy: {
    gap: 8,
    maxWidth: 250,
  },
  title: {
    color: colors.surface,
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 34,
  },
  subtitle: {
    color: 'rgba(255,255,255,0.9)',
    fontSize: 15,
    lineHeight: 22,
  },
  dotsRow: {
    flexDirection: 'row',
    gap: 8,
  },
  dot: {
    backgroundColor: 'rgba(255,255,255,0.36)',
    borderRadius: 999,
    height: 8,
    width: 8,
  },
  dotActive: {
    backgroundColor: colors.surface,
    width: 22,
  },
});
