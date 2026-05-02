import React, { useState } from 'react';
import {
  Alert,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { colors, radii, shadow, spacing } from '../theme';

interface AuthScreenProps {
  promptMessage: string;
  onLogin: (email: string, password: string) => Promise<void>;
  onRegister: (payload: {
    matricule: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) => Promise<void>;
}

export default function AuthScreen({
  promptMessage,
  onLogin,
  onRegister,
}: AuthScreenProps) {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [matricule, setMatricule] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      if (mode === 'login') {
        await onLogin(email, password);
      } else {
        await onRegister({
          matricule,
          firstName,
          lastName,
          email,
          password,
        });
      }
    } catch (error) {
      const message =
        error instanceof Error ? error.message : 'Impossible de continuer.';
      Alert.alert('SNCFT Navigator', message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.container} showsVerticalScrollIndicator={false}>
      <View style={styles.header}>
        <Text style={styles.title}>Profil voyageur</Text>
        <Text style={styles.subtitle}>
          Connectez-vous pour sauvegarder vos favoris et vos trajets récents.
        </Text>
      </View>

      {!!promptMessage && <Text style={styles.prompt}>{promptMessage}</Text>}

      <View style={styles.modeRow}>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setMode('login')}
          style={[styles.modeButton, mode === 'login' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeLabel, mode === 'login' && styles.modeLabelActive]}>
            Connexion
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          activeOpacity={0.88}
          onPress={() => setMode('register')}
          style={[styles.modeButton, mode === 'register' && styles.modeButtonActive]}
        >
          <Text style={[styles.modeLabel, mode === 'register' && styles.modeLabelActive]}>
            Créer un compte
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.card}>
        {mode === 'register' ? (
          <>
            <Field label="Matricule" onChangeText={setMatricule} value={matricule} />
            <Field label="Prénom" onChangeText={setFirstName} value={firstName} />
            <Field label="Nom" onChangeText={setLastName} value={lastName} />
          </>
        ) : null}
        <Field
          autoCapitalize="none"
          keyboardType="email-address"
          label="Email"
          onChangeText={setEmail}
          value={email}
        />
        <Field
          autoCapitalize="none"
          label="Mot de passe"
          onChangeText={setPassword}
          secureTextEntry
          value={password}
        />

        <TouchableOpacity
          activeOpacity={0.9}
          disabled={submitting}
          onPress={() => handleSubmit().catch(() => undefined)}
          style={[styles.ctaButton, submitting && styles.disabledButton]}
        >
          <Text style={styles.ctaButtonText}>
            {submitting
              ? 'Validation…'
              : mode === 'login'
                ? 'Se connecter'
                : 'Créer mon compte'}
          </Text>
        </TouchableOpacity>

        <Text style={styles.helper}>
          Compte démo: user@domain.tn · user123
        </Text>
      </View>
    </ScrollView>
  );
}

function Field(props: {
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secureTextEntry?: boolean;
  keyboardType?: 'default' | 'email-address';
  autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
}) {
  return (
    <View style={styles.field}>
      <Text style={styles.fieldLabel}>{props.label}</Text>
      <TextInput
        autoCapitalize={props.autoCapitalize}
        keyboardType={props.keyboardType}
        onChangeText={props.onChangeText}
        placeholder={props.label}
        placeholderTextColor="#97A6B2"
        secureTextEntry={props.secureTextEntry}
        style={styles.input}
        value={props.value}
      />
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
  header: {
    gap: 8,
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
  prompt: {
    backgroundColor: '#FFF1F2',
    borderRadius: radii.lg,
    color: colors.error,
    fontSize: 13,
    fontWeight: '700',
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  modeRow: {
    backgroundColor: '#EAF1F6',
    borderRadius: radii.pill,
    flexDirection: 'row',
    padding: 4,
  },
  modeButton: {
    alignItems: 'center',
    borderRadius: radii.pill,
    flex: 1,
    paddingVertical: 12,
  },
  modeButtonActive: {
    backgroundColor: colors.surface,
  },
  modeLabel: {
    color: colors.muted,
    fontSize: 13,
    fontWeight: '700',
  },
  modeLabelActive: {
    color: colors.primary,
  },
  card: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    gap: spacing.md,
    padding: spacing.lg,
    ...shadow.card,
  },
  field: {
    gap: 8,
  },
  fieldLabel: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  input: {
    backgroundColor: colors.background,
    borderColor: colors.border,
    borderRadius: radii.lg,
    borderWidth: 1,
    color: colors.text,
    fontSize: 15,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.md,
  },
  ctaButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    marginTop: spacing.sm,
    paddingVertical: 16,
  },
  ctaButtonText: {
    color: colors.surface,
    fontSize: 15,
    fontWeight: '800',
  },
  helper: {
    color: colors.muted,
    fontSize: 12,
    textAlign: 'center',
  },
  disabledButton: {
    opacity: 0.55,
  },
});
