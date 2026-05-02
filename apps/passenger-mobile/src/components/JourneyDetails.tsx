import React from 'react';
import {
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '../theme';
import type { Journey } from '../types';
import { formatFare, journeyTypeLabel, trainSummary } from '../utils/journey';
import { titleCase } from '../utils/station';

interface JourneyDetailsProps {
  journey: Journey | null;
  visible: boolean;
  onClose: () => void;
}

export default function JourneyDetails({
  journey,
  visible,
  onClose,
}: JourneyDetailsProps) {
  if (!journey) return null;

  return (
    <Modal animationType="slide" onRequestClose={onClose} transparent visible={visible}>
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <View style={styles.sheetHeader}>
            <View>
              <Text style={styles.sheetTitle}>Détails du trajet</Text>
              <Text style={styles.sheetSubtitle}>{journeyTypeLabel(journey)}</Text>
            </View>
            <TouchableOpacity activeOpacity={0.88} onPress={onClose} style={styles.closeButton}>
              <Ionicons color={colors.primary} name="close" size={20} />
            </TouchableOpacity>
          </View>

          <ScrollView
            contentContainerStyle={styles.content}
            showsVerticalScrollIndicator={false}
          >
            <View style={styles.summaryCard}>
              <View style={styles.summaryTop}>
                <Text style={styles.summaryBadge}>Train {trainSummary(journey)}</Text>
                <Text style={styles.summaryFare}>{formatFare(journey)}</Text>
              </View>
              <Text style={styles.summaryTimes}>
                {journey.departureTime} → {journey.arrivalTime}
              </Text>
              <Text style={styles.summaryMeta}>{journey.durationMinutes} min</Text>
            </View>

            {journey.segments.map((segment, index) => (
              <View key={`${segment.lineCode}-${segment.trainNumber}-${index}`} style={styles.segmentWrap}>
                <View style={styles.segmentCard}>
                  <View style={styles.segmentHeader}>
                    <Text style={styles.segmentTrain}>Ligne {segment.lineCode} · Train {segment.trainNumber}</Text>
                    <Text style={styles.segmentRoute}>
                      {titleCase(segment.originStationId)} → {titleCase(segment.destinationStationId)}
                    </Text>
                  </View>

                  <View style={styles.stopsList}>
                    {segment.stops.map((stop) => (
                      <View key={`${segment.trainNumber}-${stop.stationId}-${stop.stopSequence}`} style={styles.stopRow}>
                        <Text style={styles.stopTime}>{stop.departureTime || stop.arrivalTime || '—'}</Text>
                        <View style={styles.stopRail} />
                        <View style={styles.stopCopy}>
                          <Text style={styles.stopTitle}>{titleCase(stop.stationName || stop.stationId)}</Text>
                          <Text style={styles.stopMeta}>Ligne {segment.lineCode}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>

                {index < journey.segments.length - 1 ? (
                  <View style={styles.transferCard}>
                    <Text style={styles.transferTitle}>
                      Correspondance à {titleCase(journey.transferStationId || segment.destinationStationId)}
                    </Text>
                    <Text style={styles.transferText}>
                      Correspondance: {journey.transferWaitMinutes || 0} min à{' '}
                      {titleCase(journey.transferStationId || segment.destinationStationId)}
                    </Text>
                  </View>
                ) : null}
              </View>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    backgroundColor: 'rgba(11, 60, 93, 0.24)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: colors.background,
    borderTopLeftRadius: radii.xl,
    borderTopRightRadius: radii.xl,
    maxHeight: '88%',
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.lg,
  },
  sheetHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  sheetTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  sheetSubtitle: {
    color: colors.muted,
    fontSize: 13,
    marginTop: 4,
  },
  closeButton: {
    alignItems: 'center',
    backgroundColor: '#EAF3FF',
    borderRadius: radii.pill,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  content: {
    gap: spacing.md,
    paddingBottom: 132,
  },
  summaryCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: 8,
    padding: spacing.lg,
    ...shadow.card,
  },
  summaryTop: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  summaryBadge: {
    backgroundColor: colors.success,
    borderRadius: radii.pill,
    color: colors.surface,
    fontSize: 12,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  summaryFare: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  summaryTimes: {
    color: colors.text,
    fontSize: 28,
    fontWeight: '800',
  },
  summaryMeta: {
    color: colors.muted,
    fontSize: 14,
  },
  segmentWrap: {
    gap: spacing.sm,
  },
  segmentCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.lg,
    ...shadow.card,
  },
  segmentHeader: {
    gap: 6,
    marginBottom: spacing.md,
  },
  segmentTrain: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  segmentRoute: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 18,
  },
  stopsList: {
    gap: spacing.md,
  },
  stopRow: {
    alignItems: 'flex-start',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stopTime: {
    color: colors.text,
    fontSize: 13,
    fontWeight: '800',
    minWidth: 48,
  },
  stopRail: {
    backgroundColor: colors.secondary,
    borderRadius: 999,
    minHeight: 44,
    width: 3,
  },
  stopCopy: {
    flex: 1,
    gap: 4,
  },
  stopTitle: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700',
  },
  stopMeta: {
    color: colors.muted,
    fontSize: 12,
  },
  transferCard: {
    backgroundColor: '#E8F8F4',
    borderRadius: radii.lg,
    gap: 4,
    padding: spacing.md,
  },
  transferTitle: {
    color: colors.accent,
    fontSize: 14,
    fontWeight: '800',
  },
  transferText: {
    color: colors.primary,
    fontSize: 13,
    lineHeight: 19,
  },
});
