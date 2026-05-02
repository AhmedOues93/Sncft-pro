import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, shadow, spacing } from '../theme';
import type { PassengerTabKey } from '../types';

export type { PassengerTabKey } from '../types';

const tabs: Array<{
  key: PassengerTabKey;
  label: string;
  icon: keyof typeof Ionicons.glyphMap;
}> = [
  { key: 'search', label: 'Recherche', icon: 'search-outline' },
  { key: 'favorites', label: 'Favoris', icon: 'heart-outline' },
  { key: 'trips', label: 'Mes trajets', icon: 'trail-sign-outline' },
  { key: 'profile', label: 'Profil', icon: 'person-outline' },
];

interface BottomTabsProps {
  activeTab: PassengerTabKey;
  onChange: (tab: PassengerTabKey) => void;
}

export default function BottomTabs({ activeTab, onChange }: BottomTabsProps) {
  return (
    <View style={styles.shell}>
      {tabs.map((tab) => {
        const active = tab.key === activeTab;
        return (
          <TouchableOpacity
            activeOpacity={0.88}
            key={tab.key}
            onPress={() => onChange(tab.key)}
            style={styles.tabButton}
          >
            <View style={[styles.iconWrap, active && styles.iconWrapActive]}>
              <Ionicons
                color={active ? colors.surface : colors.muted}
                name={tab.icon}
                size={20}
              />
            </View>
            <Text style={[styles.label, active && styles.labelActive]}>{tab.label}</Text>
          </TouchableOpacity>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  shell: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    bottom: spacing.lg,
    flexDirection: 'row',
    justifyContent: 'space-between',
    left: spacing.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    position: 'absolute',
    right: spacing.lg,
    ...shadow.card,
  },
  tabButton: {
    alignItems: 'center',
    flex: 1,
    gap: 6,
    paddingVertical: 4,
  },
  iconWrap: {
    alignItems: 'center',
    borderRadius: radii.pill,
    height: 36,
    justifyContent: 'center',
    width: 36,
  },
  iconWrapActive: {
    backgroundColor: colors.primary,
  },
  label: {
    color: colors.muted,
    fontSize: 11,
    fontWeight: '700',
  },
  labelActive: {
    color: colors.primary,
  },
});
