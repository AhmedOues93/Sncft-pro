import React, { useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { searchStations } from '../services/api';
import { colors, radii, shadow, spacing } from '../theme';
import type { StationFieldValue } from '../types';
import { titleCase } from '../utils/station';

interface StationAutocompleteProps {
  icon: keyof typeof MaterialCommunityIcons.glyphMap;
  label: string;
  placeholder: string;
  value: StationFieldValue;
  onChange: React.Dispatch<React.SetStateAction<StationFieldValue>>;
}

export default function StationAutocomplete({
  icon,
  label,
  placeholder,
  value,
  onChange,
}: StationAutocompleteProps) {
  const [focused, setFocused] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const requestRef = useRef(0);

  useEffect(() => {
    const query = value.query.trim();
    const matchesSelection =
      !!value.selected && titleCase(value.selected.name) === titleCase(query);

    if (!query || matchesSelection) {
      onChange((current) => ({
        ...current,
        loading: false,
        suggestions: matchesSelection ? [] : current.suggestions,
      }));
      return undefined;
    }

    if (debounceRef.current) clearTimeout(debounceRef.current);

    debounceRef.current = setTimeout(async () => {
      const requestToken = Date.now();
      requestRef.current = requestToken;

      onChange((current) => ({
        ...current,
        loading: true,
        error: '',
      }));

      try {
        const items = await searchStations(query);
        if (requestRef.current !== requestToken) return;

        onChange((current) => ({
          ...current,
          loading: false,
          suggestions: items,
        }));
      } catch {
        if (requestRef.current !== requestToken) return;

        onChange((current) => ({
          ...current,
          loading: false,
          suggestions: [],
        }));
      }
    }, 240);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [onChange, value.query, value.selected]);

  const suggestionsVisible =
    !!value.query.trim() &&
    !value.selected &&
    (focused || value.loading || value.suggestions.length > 0);

  return (
    <View style={styles.wrapper}>
      <Text style={styles.label}>{label}</Text>
      <View style={[styles.inputShell, !!value.error && styles.inputShellError]}>
        <MaterialCommunityIcons color={colors.primary} name={icon} size={18} />
        <TextInput
          onBlur={() => setTimeout(() => setFocused(false), 140)}
          onChangeText={(text) =>
            onChange((current) => ({
              ...current,
              query: text,
              selected: null,
              error: '',
            }))
          }
          onFocus={() => setFocused(true)}
          placeholder={placeholder}
          placeholderTextColor="#97A6B2"
          style={styles.input}
          value={value.query}
        />
        {value.loading ? (
          <ActivityIndicator color={colors.secondary} size="small" />
        ) : null}
      </View>

      {!!value.error && <Text style={styles.errorText}>{value.error}</Text>}

      {suggestionsVisible ? (
        <View style={styles.dropdown}>
          {value.suggestions.map((item) => (
            <TouchableOpacity
              activeOpacity={0.9}
              key={`${item.id}-${item.name}`}
              onPress={() =>
                onChange({
                  query: titleCase(item.name),
                  selected: {
                    id: item.id,
                    name: titleCase(item.name),
                  },
                  suggestions: [],
                  loading: false,
                  error: '',
                })
              }
              style={styles.suggestionRow}
            >
              <View style={styles.suggestionCopy}>
                <Text style={styles.suggestionName}>{titleCase(item.name)}</Text>
                <Text style={styles.suggestionId}>{item.id}</Text>
              </View>
              <MaterialCommunityIcons color={colors.accent} name="arrow-top-left" size={18} />
            </TouchableOpacity>
          ))}
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    gap: 8,
  },
  label: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  inputShell: {
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
  inputShellError: {
    borderColor: colors.error,
  },
  input: {
    color: colors.text,
    flex: 1,
    fontSize: 15,
    minHeight: 22,
  },
  errorText: {
    color: colors.error,
    fontSize: 12,
    fontWeight: '600',
  },
  dropdown: {
    backgroundColor: colors.surface,
    borderRadius: radii.lg,
    marginTop: 4,
    overflow: 'hidden',
    ...shadow.card,
  },
  suggestionRow: {
    alignItems: 'center',
    borderTopColor: '#EEF3F8',
    borderTopWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  suggestionCopy: {
    gap: 3,
  },
  suggestionName: {
    color: colors.text,
    fontSize: 14,
    fontWeight: '700',
  },
  suggestionId: {
    color: colors.muted,
    fontSize: 12,
  },
});
