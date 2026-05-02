import React, { useState } from 'react';
import { Image, StyleSheet, Text, View } from 'react-native';
import { colors } from '../theme';

const logoSource = require('../../assets/images/logo-sncft.png');

export default function AppLogo() {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <View style={styles.fallback}>
        <Text style={styles.mark}>≋</Text>
        <Text style={styles.wordmark}>SNCFT</Text>
      </View>
    );
  }

  return <Image onError={() => setFailed(true)} source={logoSource} style={styles.logo} resizeMode="contain" />;
}

const styles = StyleSheet.create({
  logo: {
    height: 34,
    width: 142,
  },
  fallback: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  mark: {
    color: colors.surface,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 28,
  },
  wordmark: {
    color: colors.surface,
    fontSize: 18,
    fontWeight: '800',
    letterSpacing: 1.1,
  },
});
