import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme';
import type { TripHistoryEntry } from '../types';
import { formatLongDate } from '../utils/date';
import { titleCase } from '../utils/station';

interface TripsScreenProps {
  isLoggedIn: boolean;
  trips: TripHistoryEntry[];
  onDeleteTrip: (id: string) => void;
  onOpenAuth: () => void;
  onOpenSearch: (trip: TripHistoryEntry) => void;
}

export default function TripsScreen({
  isLoggedIn,
  trips,
  onDeleteTrip,
  onOpenAuth,
  onOpenSearch,
}: TripsScreenProps) {
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Mes trajets</Text>
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Connectez-vous pour conserver votre historique.</Text>
          <TouchableOpacity activeOpacity={0.88} onPress={onOpenAuth} style={styles.primaryButton}>
            <Text style={styles.primaryButtonText}>Ouvrir le profil</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Mes trajets</Text>
      <Text style={styles.subtitle}>Historique des recherches réussies enregistrées sur votre compte.</Text>

      {trips.length ? (
        <View style={styles.stack}>
          {trips.map((trip) => (
            <View key={trip.id} style={styles.card}>
              <Text style={styles.route}>
                {titleCase(trip.originName)} → {titleCase(trip.destinationName)}
              </Text>
              <Text style={styles.meta}>{formatLongDate(trip.originalDatetime)}</Text>
              <Text style={styles.meta}>
                {trip.passengers} passager{trip.passengers > 1 ? 's' : ''} · {trip.resultCount} résultat{trip.resultCount > 1 ? 's' : ''}
              </Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => onOpenSearch(trip)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Relancer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => onDeleteTrip(trip.id)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Supprimer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucun trajet récent</Text>
          <Text style={styles.emptyText}>Lancez une recherche pour enregistrer votre historique ici.</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
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
  stack: {
    gap: spacing.md,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: spacing.sm,
    padding: spacing.lg,
    ...shadow.card,
  },
  route: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.sm,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    flex: 1,
    paddingVertical: 14,
  },
  primaryButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '800',
  },
  secondaryButton: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.xl,
    ...shadow.card,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
