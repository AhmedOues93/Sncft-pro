import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { colors, radii, shadow, spacing } from '../theme';
import type { FavoriteJourneySnapshot } from '../types';
import { titleCase } from '../utils/station';

interface FavoritesScreenProps {
  favorites: FavoriteJourneySnapshot[];
  isLoggedIn: boolean;
  onOpenAuth: () => void;
  onOpenSearch: (item: FavoriteJourneySnapshot) => void;
  onRemoveFavorite: (key: string) => void;
}

export default function FavoritesScreen({
  favorites,
  isLoggedIn,
  onOpenAuth,
  onOpenSearch,
  onRemoveFavorite,
}: FavoritesScreenProps) {
  if (!isLoggedIn) {
    return (
      <View style={styles.container}>
        <ProtectedPrompt
          description="Connectez-vous pour retrouver vos favoris."
          onPress={onOpenAuth}
          title="Favoris"
        />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Favoris</Text>
      <Text style={styles.subtitle}>Vos trajets favoris sont enregistrés par compte.</Text>

      {favorites.length ? (
        <View style={styles.stack}>
          {favorites.map((item) => (
            <View key={item.key} style={styles.card}>
              <Text style={styles.route}>
                {titleCase(item.originName)} → {titleCase(item.destinationName)}
              </Text>
              <Text style={styles.meta}>
                {item.departureTime} → {item.arrivalTime} · {item.durationMinutes} min · {item.fareLabel}
              </Text>
              <Text style={styles.meta}>{item.typeLabel} · {item.trainLabel}</Text>
              <View style={styles.actions}>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => onOpenSearch(item)}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryButtonText}>Relancer</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  activeOpacity={0.88}
                  onPress={() => onRemoveFavorite(item.key)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryButtonText}>Retirer</Text>
                </TouchableOpacity>
              </View>
            </View>
          ))}
        </View>
      ) : (
        <View style={styles.emptyCard}>
          <Text style={styles.emptyTitle}>Aucun favori pour le moment</Text>
          <Text style={styles.emptyText}>Enregistrez un trajet depuis les résultats pour le retrouver ici.</Text>
        </View>
      )}
    </View>
  );
}

function ProtectedPrompt(props: {
  title: string;
  description: string;
  onPress: () => void;
}) {
  return (
    <>
      <Text style={styles.title}>{props.title}</Text>
      <View style={styles.emptyCard}>
        <Text style={styles.emptyTitle}>{props.description}</Text>
        <TouchableOpacity activeOpacity={0.88} onPress={props.onPress} style={styles.primaryButton}>
          <Text style={styles.primaryButtonText}>Ouvrir le profil</Text>
        </TouchableOpacity>
      </View>
    </>
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
