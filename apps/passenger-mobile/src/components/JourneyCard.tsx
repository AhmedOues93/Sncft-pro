import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '../theme';
import type { Journey } from '../types';
import { formatFare, journeyTypeLabel, trainSummary } from '../utils/journey';
import { titleCase } from '../utils/station';

interface JourneyCardProps {
  journey: Journey;
  isFavorite: boolean;
  onFavoritePress: () => void;
  onOpenPress: () => void;
}

export default function JourneyCard({
  journey,
  isFavorite,
  onFavoritePress,
  onOpenPress,
}: JourneyCardProps) {
  const firstSegment = journey.segments[0];
  const lastSegment = journey.segments[journey.segments.length - 1];
  const departureStation =
    firstSegment?.stops?.[0]?.stationName || firstSegment?.originStationId || '';
  const arrivalStation =
    lastSegment?.stops?.[lastSegment.stops.length - 1]?.stationName ||
    lastSegment?.destinationStationId ||
    '';

  return (
    <View style={styles.card}>
      <View style={styles.topRow}>
        <Text style={styles.badge}>{journeyTypeLabel(journey)}</Text>
        <Text style={styles.trainBadge}>Train {trainSummary(journey)}</Text>
      </View>

      <View style={styles.timelineRow}>
        <View style={styles.stationBlock}>
          <Text style={styles.timeText}>{journey.departureTime}</Text>
          <Text style={styles.stationText}>{titleCase(departureStation)}</Text>
        </View>

        <View style={styles.middleBlock}>
          <Text style={styles.durationText}>{journey.durationMinutes} min</Text>
          <View style={styles.routeLine} />
          <Text style={styles.middleHint}>
            {journey.segments.length > 1 ? 'Avec correspondance' : 'Trajet direct'}
          </Text>
        </View>

        <View style={[styles.stationBlock, styles.arrivalBlock]}>
          <Text style={styles.timeText}>{journey.arrivalTime}</Text>
          <Text style={[styles.stationText, styles.rightText]}>{titleCase(arrivalStation)}</Text>
        </View>
      </View>

      <View style={styles.metaRow}>
        <Text style={styles.priceBadge}>{formatFare(journey)}</Text>
        <View style={styles.lineBadges}>
          {journey.segments.map((segment) => (
            <Text key={`${segment.lineCode}-${segment.trainNumber}`} style={styles.lineBadge}>
              Ligne {segment.lineCode}
            </Text>
          ))}
        </View>
      </View>

      <View style={styles.actionsRow}>
        <TouchableOpacity activeOpacity={0.88} onPress={onOpenPress} style={styles.viewButton}>
          <Text style={styles.viewButtonText}>Voir le train</Text>
        </TouchableOpacity>

        <TouchableOpacity
          activeOpacity={0.88}
          onPress={onFavoritePress}
          style={[styles.favoriteButton, isFavorite && styles.favoriteButtonActive]}
        >
          <Ionicons
            color={isFavorite ? colors.surface : colors.success}
            name={isFavorite ? 'heart' : 'heart-outline'}
            size={16}
          />
          <Text style={[styles.favoriteButtonText, isFavorite && styles.favoriteButtonTextActive]}>
            Favori
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  topRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  badge: {
    backgroundColor: '#EAF3FF',
    borderRadius: radii.pill,
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  trainBadge: {
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  timelineRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
  },
  stationBlock: {
    flex: 1,
    gap: 4,
  },
  arrivalBlock: {
    alignItems: 'flex-end',
  },
  timeText: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
    lineHeight: 30,
  },
  stationText: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '700',
    lineHeight: 18,
  },
  rightText: {
    textAlign: 'right',
  },
  middleBlock: {
    alignItems: 'center',
    gap: 6,
    minWidth: 102,
  },
  durationText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '800',
  },
  routeLine: {
    backgroundColor: '#CFD9E3',
    height: 2,
    width: 78,
  },
  middleHint: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  metaRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'space-between',
  },
  priceBadge: {
    backgroundColor: '#EAF8EC',
    borderRadius: radii.pill,
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  lineBadges: {
    alignItems: 'flex-end',
    flex: 1,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    justifyContent: 'flex-end',
  },
  lineBadge: {
    backgroundColor: '#F1F5F9',
    borderRadius: radii.pill,
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  actionsRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  viewButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    flex: 1,
    justifyContent: 'center',
    paddingVertical: 14,
  },
  viewButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '800',
  },
  favoriteButton: {
    alignItems: 'center',
    backgroundColor: '#F2FBF6',
    borderColor: '#B6E7C4',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 6,
    justifyContent: 'center',
    minWidth: 120,
    paddingHorizontal: 12,
    paddingVertical: 14,
  },
  favoriteButtonActive: {
    backgroundColor: colors.success,
    borderColor: colors.success,
  },
  favoriteButtonText: {
    color: colors.success,
    fontSize: 13,
    fontWeight: '800',
  },
  favoriteButtonTextActive: {
    color: colors.surface,
  },
});
