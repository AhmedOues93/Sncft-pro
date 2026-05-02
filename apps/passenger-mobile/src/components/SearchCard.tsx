import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '../theme';
import type { StationFieldValue } from '../types';
import StationAutocomplete from './StationAutocomplete';

interface SearchCardProps {
  currentDate: string;
  currentTime: string;
  destinationField: StationFieldValue;
  locationLoading: boolean;
  locationMessage: string;
  originField: StationFieldValue;
  passengers: number;
  searchError: string;
  searching: boolean;
  onChangeDate: (value: string) => void;
  onChangeDestination: React.Dispatch<React.SetStateAction<StationFieldValue>>;
  onChangeOrigin: React.Dispatch<React.SetStateAction<StationFieldValue>>;
  onChangePassengers: React.Dispatch<React.SetStateAction<number>>;
  onChangeTime: (value: string) => void;
  onPressNow: () => void;
  onSearchPress: () => void;
  onSwapPress: () => void;
  onUseLocationPress: () => void;
}

export default function SearchCard({
  currentDate,
  currentTime,
  destinationField,
  locationLoading,
  locationMessage,
  originField,
  passengers,
  searchError,
  searching,
  onChangeDate,
  onChangeDestination,
  onChangeOrigin,
  onChangePassengers,
  onChangeTime,
  onPressNow,
  onSearchPress,
  onSwapPress,
  onUseLocationPress,
}: SearchCardProps) {
  return (
    <View style={styles.card}>
      <Text style={styles.title}>Recherche d’itinéraire</Text>
      <Text style={styles.subtitle}>Sélectionnez vos gares, puis lancez la recherche.</Text>

      <View style={styles.stationRow}>
        <View style={styles.stationColumn}>
          <StationAutocomplete
            icon="train-car-passenger"
            label="Départ"
            onChange={onChangeOrigin}
            placeholder="Choisir une gare de départ"
            value={originField}
          />
          <StationAutocomplete
            icon="map-marker-path"
            label="Destination"
            onChange={onChangeDestination}
            placeholder="Choisir une destination"
            value={destinationField}
          />
        </View>

        <TouchableOpacity activeOpacity={0.88} onPress={onSwapPress} style={styles.swapButton}>
          <MaterialCommunityIcons color={colors.primary} name="swap-vertical" size={22} />
        </TouchableOpacity>
      </View>

      <View style={styles.inlineRow}>
        <View style={styles.inlineField}>
          <Text style={styles.fieldLabel}>Date</Text>
          <View style={styles.iconField}>
            <Ionicons color={colors.primary} name="calendar-outline" size={18} />
            <TextInput
              onChangeText={onChangeDate}
              placeholder="AAAA-MM-JJ"
              placeholderTextColor="#97A6B2"
              style={styles.fieldInput}
              value={currentDate}
            />
          </View>
        </View>

        <View style={styles.inlineField}>
          <Text style={styles.fieldLabel}>Heure</Text>
          <View style={styles.iconField}>
            <Ionicons color={colors.primary} name="time-outline" size={18} />
            <TextInput
              onChangeText={onChangeTime}
              placeholder="HH:MM"
              placeholderTextColor="#97A6B2"
              style={styles.fieldInput}
              value={currentTime}
            />
          </View>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onPressNow} style={styles.nowButton}>
        <Ionicons color={colors.accent} name="flash-outline" size={16} />
        <Text style={styles.nowButtonText}>Maintenant</Text>
      </TouchableOpacity>

      <View style={styles.passengerRow}>
        <Text style={styles.fieldLabel}>Passagers</Text>
        <View style={styles.stepper}>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onChangePassengers((value) => Math.max(1, value - 1))}
            style={styles.stepperButton}
          >
            <Ionicons color={colors.primary} name="remove" size={16} />
          </TouchableOpacity>
          <Text style={styles.stepperValue}>{passengers}</Text>
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => onChangePassengers((value) => Math.min(9, value + 1))}
            style={styles.stepperButton}
          >
            <Ionicons color={colors.primary} name="add" size={16} />
          </TouchableOpacity>
        </View>
      </View>

      <TouchableOpacity activeOpacity={0.88} onPress={onUseLocationPress} style={styles.locationCard}>
        <View style={styles.locationIconWrap}>
          <Ionicons color={colors.secondary} name="locate-outline" size={18} />
        </View>
        <View style={styles.locationCopy}>
          <Text style={styles.locationTitle}>
            {locationLoading ? 'Localisation en cours…' : 'Utiliser ma position'}
          </Text>
          <Text style={styles.locationText}>
            {locationMessage || 'Retrouver la gare la plus proche et estimer le temps à pied.'}
          </Text>
        </View>
      </TouchableOpacity>

      {!!searchError && <Text style={styles.searchError}>{searchError}</Text>}

      <TouchableOpacity
        activeOpacity={0.9}
        disabled={searching}
        onPress={onSearchPress}
        style={[styles.ctaButton, searching && styles.disabledButton]}
      >
        <Ionicons color={colors.surface} name="search-outline" size={18} />
        <Text style={styles.ctaButtonText}>
          {searching ? 'Recherche en cours…' : 'Rechercher un train'}
        </Text>
      </TouchableOpacity>
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
  title: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '800',
  },
  subtitle: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
  stationRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
  },
  stationColumn: {
    flex: 1,
    gap: spacing.md,
  },
  swapButton: {
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: '#E9F1F7',
    borderRadius: radii.pill,
    height: 48,
    justifyContent: 'center',
    width: 48,
  },
  inlineRow: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  inlineField: {
    flex: 1,
    gap: 8,
  },
  fieldLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  iconField: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  fieldInput: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 22,
  },
  nowButton: {
    alignItems: 'center',
    alignSelf: 'flex-start',
    backgroundColor: '#E8F8F4',
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  nowButtonText: {
    color: colors.accent,
    fontSize: 13,
    fontWeight: '700',
  },
  passengerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  stepper: {
    alignItems: 'center',
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: spacing.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  stepperButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 32,
    justifyContent: 'center',
    width: 32,
  },
  stepperValue: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
    minWidth: 22,
    textAlign: 'center',
  },
  locationCard: {
    alignItems: 'flex-start',
    backgroundColor: '#EEF5FF',
    borderRadius: radii.lg,
    flexDirection: 'row',
    gap: spacing.md,
    padding: spacing.md,
  },
  locationIconWrap: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  locationCopy: {
    flex: 1,
    gap: 4,
  },
  locationTitle: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '800',
  },
  locationText: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  searchError: {
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'center',
    paddingVertical: 16,
  },
  ctaButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
