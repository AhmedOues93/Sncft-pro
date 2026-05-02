import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '../theme';
import type { Account } from '../types';

interface ProfileScreenProps {
  account: Account;
  onLogout: () => void;
}

export default function ProfileScreen({ account, onLogout }: ProfileScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profil</Text>
      <Text style={styles.subtitle}>Retrouvez vos informations voyageur et votre session.</Text>

      <View style={styles.card}>
        <View style={styles.avatar}>
          <Ionicons color={colors.primary} name="person-outline" size={32} />
        </View>

        <Text style={styles.greeting}>Salut {account.firstName}</Text>
        <Text style={styles.meta}>{account.firstName} {account.lastName}</Text>
        <Text style={styles.meta}>Matricule · {account.matricule}</Text>
        <Text style={styles.meta}>{account.email}</Text>

        <TouchableOpacity activeOpacity={0.9} onPress={onLogout} style={styles.logoutButton}>
          <Text style={styles.logoutButtonText}>Déconnexion</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    gap: spacing.lg,
    paddingBottom: 132,
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  title: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  card: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: spacing.sm,
    padding: spacing.xl,
    ...shadow.card,
  },
  avatar: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: 40,
    height: 80,
    justifyContent: 'center',
    marginBottom: spacing.sm,
    width: 80,
  },
  greeting: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 14,
  },
  logoutButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    marginTop: spacing.lg,
    paddingHorizontal: spacing.xl,
    paddingVertical: 16,
    width: '100%',
  },
  logoutButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
});
