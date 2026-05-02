import { StatusBar } from 'expo-status-bar';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Platform,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AppLogo from './src/components/AppLogo';
import AuthScreen from './src/components/AuthScreen';
import BottomTabs, { type PassengerTabKey } from './src/components/BottomTabs';
import FavoritesScreen from './src/components/FavoritesScreen';
import HeroSlider, { type HeroSlide } from './src/components/HeroSlider';
import JourneyCard from './src/components/JourneyCard';
import JourneyDetails from './src/components/JourneyDetails';
import ProfileScreen from './src/components/ProfileScreen';
import SearchCard from './src/components/SearchCard';
import TripsScreen from './src/components/TripsScreen';
import { fetchJourneyBatch } from './src/services/api';
import {
  clearPassengerSession,
  getPassengerSession,
  registerPassengerAccount,
  seedPassengerAccounts,
  signInPassenger,
} from './src/storage/accountStorage';
import {
  getFavoritesForAccount,
  saveFavoritesForAccount,
} from './src/storage/favoritesStorage';
import { getTripsForAccount, saveTripsForAccount } from './src/storage/tripsStorage';
import { colors, layout, radii, shadow, spacing } from './src/theme';
import type {
  Account,
  FavoriteJourneySnapshot,
  Journey,
  JourneyResponse,
  SearchContext,
  StationFieldValue,
  StationItem,
  TripHistoryEntry,
} from './src/types';
import { combineDateTime, nextDayFallbackIso, toCurrentDateParts } from './src/utils/date';
import { locateNearestStation } from './src/utils/geo';
import {
  createFavoriteSnapshot,
  createTripHistoryEntry,
  formatFare,
  formatSearchMeta,
  journeyTypeLabel,
  trainSummary,
} from './src/utils/journey';
import { bestStationMatch, titleCase } from './src/utils/station';
import { searchStations } from './src/services/api';

const heroSlides: HeroSlide[] = [
  {
    source: require('./assets/images/train_1.png'),
    title: 'Planifiez votre trajet',
    subtitle: 'Horaires, correspondances et tarifs.',
  },
  {
    source: require('./assets/images/train_2.png'),
    title: 'Planifiez votre trajet',
    subtitle: 'Horaires, correspondances et tarifs.',
  },
  {
    source: require('./assets/images/train_3.png'),
    title: 'Planifiez votre trajet',
    subtitle: 'Horaires, correspondances et tarifs.',
  },
];

function createStationField(): StationFieldValue {
  return {
    query: '',
    selected: null,
    suggestions: [],
    loading: false,
    error: '',
  };
}

export default function App() {
  const [activeTab, setActiveTab] = useState<PassengerTabKey>('search');
  const [originField, setOriginField] = useState<StationFieldValue>(createStationField);
  const [destinationField, setDestinationField] = useState<StationFieldValue>(createStationField);
  const [currentDate, setCurrentDate] = useState(() => toCurrentDateParts().date);
  const [currentTime, setCurrentTime] = useState(() => toCurrentDateParts().time);
  const [passengers, setPassengers] = useState(1);
  const [sessionAccount, setSessionAccount] = useState<Account | null>(null);
  const [favorites, setFavorites] = useState<FavoriteJourneySnapshot[]>([]);
  const [recentTrips, setRecentTrips] = useState<TripHistoryEntry[]>([]);
  const [searchError, setSearchError] = useState('');
  const [resultsNotice, setResultsNotice] = useState('');
  const [journeys, setJourneys] = useState<Journey[]>([]);
  const [resultsMeta, setResultsMeta] = useState<JourneyResponse | null>(null);
  const [lastSearch, setLastSearch] = useState<SearchContext | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searching, setSearching] = useState(false);
  const [selectedJourney, setSelectedJourney] = useState<Journey | null>(null);
  const [authPrompt, setAuthPrompt] = useState('');
  const [locationMessage, setLocationMessage] = useState('');
  const [locating, setLocating] = useState(false);

  const favoriteKeys = useMemo(() => new Set(favorites.map((item) => item.key)), [favorites]);

  const hydrateSession = useCallback(async () => {
    await seedPassengerAccounts();
    const account = await getPassengerSession();
    setSessionAccount(account);

    if (account?.email) {
      const [favoriteList, tripList] = await Promise.all([
        getFavoritesForAccount(account.email),
        getTripsForAccount(account.email),
      ]);
      setFavorites(favoriteList);
      setRecentTrips(tripList);
      return;
    }

    setFavorites([]);
    setRecentTrips([]);
  }, []);

  useEffect(() => {
    hydrateSession().catch(() => {
      setSessionAccount(null);
    });
  }, [hydrateSession]);

  const resolveStationField = useCallback(
    async (
      field: StationFieldValue,
      setField: React.Dispatch<React.SetStateAction<StationFieldValue>>,
    ): Promise<StationItem | null> => {
      const query = field.query.trim();

      if (!query) {
        setField((current) => ({
          ...current,
          error: 'Choisissez une gare depuis les suggestions.',
        }));
        return null;
      }

      if (field.selected) {
        return {
          id: field.selected.id,
          name: titleCase(field.selected.name),
        };
      }

      try {
        const candidates = field.suggestions.length ? field.suggestions : await searchStations(query);
        const match = bestStationMatch(query, candidates);

        if (!match) {
          setField((current) => ({
            ...current,
            error: 'Choisissez une gare depuis les suggestions.',
          }));
          return null;
        }

        const resolved = {
          id: match.id,
          name: titleCase(match.name),
        };

        setField((current) => ({
          ...current,
          query: resolved.name,
          selected: resolved,
          suggestions: [],
          loading: false,
          error: '',
        }));

        return resolved;
      } catch {
        setField((current) => ({
          ...current,
          error: 'Recherche de gare indisponible.',
        }));
        return null;
      }
    },
    [],
  );

  const requireAuthenticatedAction = useCallback((message: string) => {
    setAuthPrompt(message);
    setActiveTab('profile');
  }, []);

  const persistFavorites = useCallback(
    async (nextFavorites: FavoriteJourneySnapshot[]) => {
      if (!sessionAccount?.email) return;
      await saveFavoritesForAccount(sessionAccount.email, nextFavorites);
      setFavorites(nextFavorites);
    },
    [sessionAccount],
  );

  const persistTrips = useCallback(
    async (nextTrips: TripHistoryEntry[]) => {
      if (!sessionAccount?.email) return;
      await saveTripsForAccount(sessionAccount.email, nextTrips);
      setRecentTrips(nextTrips);
    },
    [sessionAccount],
  );

  const runSearch = useCallback(
    async (
      offset = 0,
      overrides?: {
        origin?: StationItem;
        destination?: StationItem;
        date?: string;
        time?: string;
        passengers?: number;
      },
    ) => {
      setSearchError('');
      setResultsNotice('');

      const origin =
        overrides?.origin || (await resolveStationField(originField, setOriginField));
      if (!origin) return;

      const destination =
        overrides?.destination || (await resolveStationField(destinationField, setDestinationField));
      if (!destination) return;

      if (origin.id === destination.id) {
        setSearchError('Choisissez deux gares différentes.');
        return;
      }

      const nextPassengers = Math.max(1, Math.min(9, overrides?.passengers ?? passengers));
      const dateValue = overrides?.date ?? currentDate;
      const timeValue = overrides?.time ?? currentTime;
      const originalDatetime = combineDateTime(dateValue, timeValue);

      setSearching(true);

      try {
        let effectiveDatetime = originalDatetime;
        let response = await fetchJourneyBatch(
          origin.id,
          destination.id,
          originalDatetime,
          nextPassengers,
          Math.max(0, offset),
        );

        if (!response.count && !response.total && offset === 0) {
          const fallbackDatetime = nextDayFallbackIso(originalDatetime);
          if (fallbackDatetime) {
            const fallback = await fetchJourneyBatch(
              origin.id,
              destination.id,
              fallbackDatetime,
              nextPassengers,
              0,
            );

            if (fallback.count || fallback.total) {
              response = fallback;
              effectiveDatetime = fallbackDatetime;
              setResultsNotice(
                "Aucun train plus tard aujourd'hui. Prochains départs disponibles.",
              );
            }
          }
        }

        const searchContext: SearchContext = {
          origin,
          destination,
          passengers: nextPassengers,
          originalDatetime,
          effectiveDatetime,
          offset: Math.max(0, offset),
        };

        setJourneys(response.items || []);
        setResultsMeta(response);
        setLastSearch(searchContext);
        setHasSearched(true);
        setActiveTab('search');

        if (sessionAccount?.email && response.count) {
          const historyEntry = createTripHistoryEntry(searchContext, response);
          const deduped = recentTrips.filter((item) => item.id !== historyEntry.id);
          await persistTrips([historyEntry, ...deduped].slice(0, 12));
        }
      } catch (error) {
        const message =
          error instanceof Error ? error.message : 'Recherche impossible pour le moment.';
        setSearchError(message);
      } finally {
        setSearching(false);
      }
    },
    [
      currentDate,
      currentTime,
      destinationField,
      originField,
      passengers,
      persistTrips,
      recentTrips,
      resolveStationField,
      sessionAccount,
    ],
  );

  const handleNow = useCallback(() => {
    const next = toCurrentDateParts();
    setCurrentDate(next.date);
    setCurrentTime(next.time);

    if (hasSearched) {
      runSearch(0, { date: next.date, time: next.time }).catch(() => undefined);
    }
  }, [hasSearched, runSearch]);

  const handleSwapStations = useCallback(() => {
    setOriginField((currentOrigin) => {
      const nextDestination = destinationField;
      setDestinationField({
        ...currentOrigin,
        error: '',
      });
      return {
        ...nextDestination,
        error: '',
      };
    });
    setSearchError('');
  }, [destinationField]);

  const handleToggleFavorite = useCallback(
    async (journey: Journey) => {
      if (!sessionAccount?.email) {
        requireAuthenticatedAction('Connectez-vous pour enregistrer un favori.');
        return;
      }

      if (!lastSearch) return;

      const snapshot = createFavoriteSnapshot(journey, lastSearch);
      const exists = favoriteKeys.has(snapshot.key);
      const nextFavorites = exists
        ? favorites.filter((item) => item.key !== snapshot.key)
        : [snapshot, ...favorites];

      await persistFavorites(nextFavorites.slice(0, 24));
    },
    [favoriteKeys, favorites, lastSearch, persistFavorites, requireAuthenticatedAction, sessionAccount],
  );

  const handleUseLocation = useCallback(async () => {
    setLocating(true);
    setLocationMessage('');

    try {
      const result = await locateNearestStation();
      if (!result) {
        setLocationMessage('Impossible de récupérer votre position pour le moment.');
        return;
      }

      const suggestions = await searchStations(result.station.name);
      const resolved =
        bestStationMatch(result.station.name, suggestions) || {
          id: result.station.name.toLowerCase(),
          name: result.station.name,
        };

      setOriginField({
        query: titleCase(resolved.name),
        selected: {
          id: resolved.id,
          name: titleCase(resolved.name),
        },
        suggestions: [],
        loading: false,
        error: '',
      });

      setLocationMessage(
        `Gare proche: ${titleCase(result.station.name)} · environ ${result.walkingMinutes} min à pied.`,
      );
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : 'Autorisation de localisation refusée.';
      setLocationMessage(message);
    } finally {
      setLocating(false);
    }
  }, []);

  const handleLogin = useCallback(
    async (email: string, password: string) => {
      const account = await signInPassenger(email, password);
      setSessionAccount(account);
      setAuthPrompt('');
      const [favoriteList, tripList] = await Promise.all([
        getFavoritesForAccount(account.email),
        getTripsForAccount(account.email),
      ]);
      setFavorites(favoriteList);
      setRecentTrips(tripList);
    },
    [],
  );

  const handleRegister = useCallback(
    async (payload: {
      matricule: string;
      firstName: string;
      lastName: string;
      email: string;
      password: string;
    }) => {
      const account = await registerPassengerAccount(payload);
      setSessionAccount(account);
      setAuthPrompt('');
      setFavorites([]);
      setRecentTrips([]);
    },
    [],
  );

  const handleLogout = useCallback(async () => {
    await clearPassengerSession();
    setSessionAccount(null);
    setFavorites([]);
    setRecentTrips([]);
    setAuthPrompt('');
    setActiveTab('search');
  }, []);

  const relaunchSavedSearch = useCallback(
    async (searchSource: {
      originId: string;
      originName: string;
      destinationId: string;
      destinationName: string;
      datetime: string;
      passengers: number;
    }) => {
      const date = searchSource.datetime.slice(0, 10);
      const time = searchSource.datetime.slice(11, 16);

      const origin = {
        id: searchSource.originId,
        name: titleCase(searchSource.originName),
      };
      const destination = {
        id: searchSource.destinationId,
        name: titleCase(searchSource.destinationName),
      };

      setOriginField({
        query: origin.name,
        selected: origin,
        suggestions: [],
        loading: false,
        error: '',
      });
      setDestinationField({
        query: destination.name,
        selected: destination,
        suggestions: [],
        loading: false,
        error: '',
      });
      setCurrentDate(date);
      setCurrentTime(time);
      setPassengers(searchSource.passengers);
      setActiveTab('search');

      await runSearch(0, {
        origin,
        destination,
        date,
        time,
        passengers: searchSource.passengers,
      });
    },
    [runSearch],
  );

  const handleDeleteTrip = useCallback(
    async (tripId: string) => {
      const nextTrips = recentTrips.filter((item) => item.id !== tripId);
      await persistTrips(nextTrips);
    },
    [persistTrips, recentTrips],
  );

  const renderSearchResults = () => {
    if (!hasSearched || !lastSearch || !resultsMeta) return null;

    return (
      <View style={styles.resultsSection}>
        <View style={styles.resultsHeader}>
          <Text style={styles.resultsTitle}>Prochains départs</Text>
          <Text style={styles.resultsMeta}>{formatSearchMeta(lastSearch)}</Text>
          <Text style={styles.resultsCount}>
            {resultsMeta.count} résultat{resultsMeta.count > 1 ? 's' : ''}
          </Text>
        </View>

        {!!resultsNotice && <Text style={styles.noticeText}>{resultsNotice}</Text>}

        <View style={styles.paginationRow}>
          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!resultsMeta.hasPrevious || searching}
            onPress={() => runSearch(Math.max(0, lastSearch.offset - 5)).catch(() => undefined)}
            style={[
              styles.ghostButton,
              (!resultsMeta.hasPrevious || searching) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.ghostButtonText}>Plus tôt</Text>
          </TouchableOpacity>

          <TouchableOpacity
            activeOpacity={0.88}
            disabled={!resultsMeta.hasNext || searching}
            onPress={() => runSearch(lastSearch.offset + 5).catch(() => undefined)}
            style={[
              styles.primaryCompactButton,
              (!resultsMeta.hasNext || searching) && styles.buttonDisabled,
            ]}
          >
            <Text style={styles.primaryCompactButtonText}>Plus tard</Text>
          </TouchableOpacity>
        </View>

        {journeys.length ? (
          <View style={styles.cardsStack}>
            {journeys.map((journey) => (
              <JourneyCard
                journey={journey}
                key={`${trainSummary(journey)}-${journey.departureTime}-${journey.arrivalTime}`}
                isFavorite={favoriteKeys.has(createFavoriteSnapshot(journey, lastSearch).key)}
                onFavoritePress={() => handleToggleFavorite(journey).catch(() => undefined)}
                onOpenPress={() => setSelectedJourney(journey)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.emptyCard}>
            <Text style={styles.emptyTitle}>Aucun train trouvé</Text>
            <Text style={styles.emptyText}>
              Essayez un autre horaire ou vérifiez les gares sélectionnées.
            </Text>
          </View>
        )}
      </View>
    );
  };

  const renderSearchTab = () => (
    <ScrollView
      contentContainerStyle={styles.scrollContent}
      showsVerticalScrollIndicator={false}
      keyboardShouldPersistTaps="handled"
    >
      <View style={styles.heroShell}>
        <HeroSlider slides={heroSlides} />
        <View style={styles.topBar}>
          <AppLogo />
          <TouchableOpacity
            activeOpacity={0.88}
            onPress={() => setActiveTab('profile')}
            style={styles.accountButton}
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.surface} />
            <Text style={styles.accountButtonText}>
              {sessionAccount ? sessionAccount.firstName : 'Compte'}
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.searchCardWrap}>
        <SearchCard
          currentDate={currentDate}
          currentTime={currentTime}
          destinationField={destinationField}
          locationLoading={locating}
          locationMessage={locationMessage}
          originField={originField}
          passengers={passengers}
          searchError={searchError}
          searching={searching}
          onChangeDate={setCurrentDate}
          onChangeDestination={setDestinationField}
          onChangeOrigin={setOriginField}
          onChangePassengers={setPassengers}
          onChangeTime={setCurrentTime}
          onPressNow={handleNow}
          onSearchPress={() => runSearch(0).catch(() => undefined)}
          onSwapPress={handleSwapStations}
          onUseLocationPress={() => handleUseLocation().catch(() => undefined)}
        />
      </View>

      {renderSearchResults()}
    </ScrollView>
  );

  const renderProtectedTab = () => {
    if (activeTab === 'favorites') {
      return (
        <FavoritesScreen
          favorites={favorites}
          isLoggedIn={!!sessionAccount}
          onOpenAuth={() => requireAuthenticatedAction('Connectez-vous pour retrouver vos favoris.')}
          onOpenSearch={(item) =>
            relaunchSavedSearch({
              originId: item.originId,
              originName: item.originName,
              destinationId: item.destinationId,
              destinationName: item.destinationName,
              datetime: item.datetime,
              passengers: item.passengers,
            }).catch(() => undefined)
          }
          onRemoveFavorite={(key) =>
            persistFavorites(favorites.filter((item) => item.key !== key)).catch(() => undefined)
          }
        />
      );
    }

    return (
      <TripsScreen
        isLoggedIn={!!sessionAccount}
        trips={recentTrips}
        onDeleteTrip={(tripId) => handleDeleteTrip(tripId).catch(() => undefined)}
        onOpenAuth={() => requireAuthenticatedAction('Connectez-vous pour conserver votre historique.')}
        onOpenSearch={(trip) =>
          relaunchSavedSearch({
            originId: trip.originId,
            originName: trip.originName,
            destinationId: trip.destinationId,
            destinationName: trip.destinationName,
            datetime: trip.originalDatetime,
            passengers: trip.passengers,
          }).catch(() => undefined)
        }
      />
    );
  };

  const renderProfile = () => {
    if (sessionAccount) {
      return <ProfileScreen account={sessionAccount} onLogout={() => handleLogout().catch(() => undefined)} />;
    }

    return (
      <AuthScreen
        promptMessage={authPrompt}
        onLogin={handleLogin}
        onRegister={handleRegister}
      />
    );
  };

  const renderActiveTab = () => {
    if (activeTab === 'search') return renderSearchTab();
    if (activeTab === 'profile') return renderProfile();
    return renderProtectedTab();
  };

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.container}
      >
        {renderActiveTab()}

        <BottomTabs activeTab={activeTab} onChange={setActiveTab} />

        <JourneyDetails
          journey={selectedJourney}
          visible={!!selectedJourney}
          onClose={() => setSelectedJourney(null)}
        />
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.background,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollContent: {
    paddingBottom: 132,
  },
  heroShell: {
    height: 336,
    position: 'relative',
  },
  topBar: {
    left: spacing.lg,
    position: 'absolute',
    right: spacing.lg,
    top: spacing.lg,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  accountButton: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.14)',
    borderColor: 'rgba(255,255,255,0.2)',
    borderRadius: radii.pill,
    borderWidth: 1,
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  accountButtonText: {
    color: colors.surface,
    fontSize: 13,
    fontWeight: '700',
  },
  searchCardWrap: {
    marginTop: -92,
    paddingHorizontal: spacing.lg,
    zIndex: 4,
  },
  resultsSection: {
    paddingHorizontal: spacing.lg,
    paddingTop: spacing.xl,
  },
  resultsHeader: {
    gap: 6,
    marginBottom: spacing.lg,
  },
  resultsTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '800',
  },
  resultsMeta: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 20,
  },
  resultsCount: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700',
  },
  noticeText: {
    backgroundColor: '#E8F8F4',
    borderRadius: radii.lg,
    color: colors.accent,
    fontSize: 13,
    fontWeight: '600',
    marginBottom: spacing.md,
    overflow: 'hidden',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  paginationRow: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.lg,
  },
  ghostButton: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    borderWidth: 1,
    flex: 1,
    paddingVertical: 14,
  },
  ghostButtonText: {
    color: colors.primary,
    fontSize: 14,
    fontWeight: '700',
  },
  primaryCompactButton: {
    alignItems: 'center',
    backgroundColor: colors.primary,
    borderRadius: radii.pill,
    flex: 1,
    paddingVertical: 14,
  },
  primaryCompactButtonText: {
    color: colors.surface,
    fontSize: 14,
    fontWeight: '700',
  },
  buttonDisabled: {
    opacity: 0.45,
  },
  cardsStack: {
    gap: spacing.md,
  },
  emptyCard: {
    backgroundColor: colors.surface,
    borderRadius: radii.xl,
    padding: spacing.xl,
    ...shadow.card,
  },
  emptyTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '800',
    marginBottom: 6,
  },
  emptyText: {
    color: colors.muted,
    fontSize: 14,
    lineHeight: 21,
  },
});
