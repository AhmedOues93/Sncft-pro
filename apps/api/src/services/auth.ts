import { createHash, randomUUID } from 'node:crypto';

import { createClient, type SupabaseClient } from '@supabase/supabase-js';

import { config } from '../config.js';

export type AdminRole = 'viewer' | 'editor' | 'publisher' | 'superadmin';
export type AdminStatus = 'pending' | 'active' | 'suspended';

interface AdminProfile {
  id: string;
  authUserId: string;
  employeeNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  passwordHash?: string;
  role: AdminRole;
  status: AdminStatus;
  createdAt: string;
  updatedAt: string;
}

interface PassengerProfile {
  id: string;
  authUserId: string;
  displayName: string;
  email: string;
  passwordHash?: string;
  provider: string;
  createdAt: string;
  updatedAt: string;
}

interface Favorite {
  id: string;
  passengerId: string;
  originStationId: string;
  destinationStationId: string;
  label?: string;
  createdAt: string;
}

interface SavedJourney {
  id: string;
  passengerId: string;
  originStationId: string;
  destinationStationId: string;
  departureTime: string;
  arrivalTime: string;
  trainNumbers: string[];
  journeyPayload: unknown;
  travelDate: string;
  createdAt: string;
}

interface Session {
  token: string;
  type: 'admin' | 'passenger';
  profileId: string;
  role?: AdminRole;
  status?: AdminStatus;
}

function hashPassword(password: string): string {
  return createHash('sha256').update(password).digest('hex');
}

function createToken(prefix: string): string {
  return `${prefix}_${randomUUID().replace(/-/g, '')}`;
}

function hasSupabaseAuth(): boolean {
  return Boolean(config.supabaseUrl && config.supabaseServiceRoleKey && config.supabaseAnonKey);
}

class AuthService {
  private adminProfiles = new Map<string, AdminProfile>();
  private passengerProfiles = new Map<string, PassengerProfile>();
  private favorites = new Map<string, Favorite>();
  private savedJourneys = new Map<string, SavedJourney>();
  private sessions = new Map<string, Session>();

  private supabaseAdmin: SupabaseClient | null = null;
  private supabaseAnon: SupabaseClient | null = null;

  constructor() {
    if (hasSupabaseAuth()) {
      this.supabaseAdmin = createClient(config.supabaseUrl, config.supabaseServiceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
      this.supabaseAnon = createClient(config.supabaseUrl, config.supabaseAnonKey, { auth: { persistSession: false, autoRefreshToken: false } });
    }
  }

  async registerAdmin(input: { employeeNumber: string; firstName: string; lastName: string; email: string; password: string }): Promise<AdminProfile> {
    const now = new Date().toISOString();
    if (this.supabaseAdmin) {
      const created = await this.supabaseAdmin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true, app_metadata: { role: 'viewer' } });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? 'Unable to create admin auth user');

      const profile = {
        auth_user_id: created.data.user.id,
        employee_number: input.employeeNumber,
        first_name: input.firstName,
        last_name: input.lastName,
        email: input.email,
        role: 'viewer',
        status: 'pending',
      };
      const inserted = await this.supabaseAdmin.from('admin_profiles').insert(profile).select('*').single();
      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Unable to create admin profile');

      return {
        id: inserted.data.id,
        authUserId: inserted.data.auth_user_id,
        employeeNumber: inserted.data.employee_number,
        firstName: inserted.data.first_name,
        lastName: inserted.data.last_name,
        email: inserted.data.email,
        role: inserted.data.role,
        status: inserted.data.status,
        createdAt: inserted.data.created_at,
        updatedAt: inserted.data.updated_at,
      };
    }

    const duplicate = Array.from(this.adminProfiles.values()).find((profile) => profile.email.toLowerCase() === input.email.toLowerCase() || profile.employeeNumber === input.employeeNumber);
    if (duplicate) throw new Error('Admin email or employee number already exists');

    const id = randomUUID();
    const profile: AdminProfile = {
      id,
      authUserId: id,
      employeeNumber: input.employeeNumber,
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      passwordHash: hashPassword(input.password),
      role: 'viewer',
      status: 'pending',
      createdAt: now,
      updatedAt: now,
    };
    this.adminProfiles.set(id, profile);
    return profile;
  }

  async loginAdmin(email: string, password: string): Promise<{ token: string; profile: AdminProfile }> {
    if (this.supabaseAnon && this.supabaseAdmin) {
      const signIn = await this.supabaseAnon.auth.signInWithPassword({ email, password });
      if (signIn.error || !signIn.data.user || !signIn.data.session) throw new Error(signIn.error?.message ?? 'Invalid credentials');

      const profileData = await this.supabaseAdmin.from('admin_profiles').select('*').eq('auth_user_id', signIn.data.user.id).single();
      if (profileData.error || !profileData.data) throw new Error('Admin profile not found');

      const profile: AdminProfile = {
        id: profileData.data.id,
        authUserId: profileData.data.auth_user_id,
        employeeNumber: profileData.data.employee_number,
        firstName: profileData.data.first_name,
        lastName: profileData.data.last_name,
        email: profileData.data.email,
        role: profileData.data.role,
        status: profileData.data.status,
        createdAt: profileData.data.created_at,
        updatedAt: profileData.data.updated_at,
      };
      return { token: signIn.data.session.access_token, profile };
    }

    const profile = Array.from(this.adminProfiles.values()).find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile || profile.passwordHash !== hashPassword(password)) throw new Error('Invalid credentials');

    const token = createToken('sncft_admin');
    this.sessions.set(token, { token, type: 'admin', profileId: profile.id, role: profile.role, status: profile.status });
    return { token, profile };
  }

  async getAdminByToken(token: string): Promise<AdminProfile | null> {
    if (!this.supabaseAdmin && config.nodeEnv !== 'production' && config.devAdminRole) {
      const role = token === 'dev-token' ? config.devAdminRole : (token.startsWith('dev-') ? token.replace('dev-', '') : null);
      if (role && ['viewer','editor','publisher','superadmin'].includes(role)) {
        return {
          id: 'dev-admin',
          authUserId: 'dev-admin',
          employeeNumber: 'DEV',
          firstName: 'Dev',
          lastName: 'Admin',
          email: 'dev-admin@local',
          role: role as AdminRole,
          status: 'active',
          createdAt: new Date(0).toISOString(),
          updatedAt: new Date(0).toISOString(),
        };
      }
    }

    if (this.supabaseAnon && this.supabaseAdmin && !token.startsWith('sncft_admin_')) {
      const user = await this.supabaseAnon.auth.getUser(token);
      if (user.error || !user.data.user) return null;
      const profileData = await this.supabaseAdmin.from('admin_profiles').select('*').eq('auth_user_id', user.data.user.id).single();
      if (profileData.error || !profileData.data) return null;
      return {
        id: profileData.data.id,
        authUserId: profileData.data.auth_user_id,
        employeeNumber: profileData.data.employee_number,
        firstName: profileData.data.first_name,
        lastName: profileData.data.last_name,
        email: profileData.data.email,
        role: profileData.data.role,
        status: profileData.data.status,
        createdAt: profileData.data.created_at,
        updatedAt: profileData.data.updated_at,
      };
    }

    const session = this.sessions.get(token);
    if (!session || session.type !== 'admin') return null;
    return this.adminProfiles.get(session.profileId) ?? null;
  }

  async listAdmins(): Promise<AdminProfile[]> {
    if (this.supabaseAdmin) {
      const data = await this.supabaseAdmin.from('admin_profiles').select('*').order('created_at', { ascending: false });
      if (data.error) throw new Error(data.error.message);
      return (data.data ?? []).map((row) => ({
        id: row.id,
        authUserId: row.auth_user_id,
        employeeNumber: row.employee_number,
        firstName: row.first_name,
        lastName: row.last_name,
        email: row.email,
        role: row.role,
        status: row.status,
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }));
    }

    return Array.from(this.adminProfiles.values()).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async updateAdminRole(profileId: string, role: AdminRole): Promise<AdminProfile> {
    if (this.supabaseAdmin) {
      const updated = await this.supabaseAdmin.from('admin_profiles').update({ role }).eq('id', profileId).select('*').single();
      if (updated.error || !updated.data) throw new Error(updated.error?.message ?? 'Unable to update role');
      return {
        id: updated.data.id,
        authUserId: updated.data.auth_user_id,
        employeeNumber: updated.data.employee_number,
        firstName: updated.data.first_name,
        lastName: updated.data.last_name,
        email: updated.data.email,
        role: updated.data.role,
        status: updated.data.status,
        createdAt: updated.data.created_at,
        updatedAt: updated.data.updated_at,
      };
    }

    const profile = this.adminProfiles.get(profileId);
    if (!profile) throw new Error('Admin not found');
    profile.role = role;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  async updateAdminStatus(profileId: string, status: AdminStatus): Promise<AdminProfile> {
    if (this.supabaseAdmin) {
      const updated = await this.supabaseAdmin.from('admin_profiles').update({ status }).eq('id', profileId).select('*').single();
      if (updated.error || !updated.data) throw new Error(updated.error?.message ?? 'Unable to update status');
      return {
        id: updated.data.id,
        authUserId: updated.data.auth_user_id,
        employeeNumber: updated.data.employee_number,
        firstName: updated.data.first_name,
        lastName: updated.data.last_name,
        email: updated.data.email,
        role: updated.data.role,
        status: updated.data.status,
        createdAt: updated.data.created_at,
        updatedAt: updated.data.updated_at,
      };
    }

    const profile = this.adminProfiles.get(profileId);
    if (!profile) throw new Error('Admin not found');
    profile.status = status;
    profile.updatedAt = new Date().toISOString();
    return profile;
  }

  async registerPassenger(input: { displayName: string; email: string; password: string }): Promise<PassengerProfile> {
    const now = new Date().toISOString();
    if (this.supabaseAdmin) {
      const created = await this.supabaseAdmin.auth.admin.createUser({ email: input.email, password: input.password, email_confirm: true });
      if (created.error || !created.data.user) throw new Error(created.error?.message ?? 'Unable to create passenger auth user');
      const inserted = await this.supabaseAdmin.from('passenger_profiles').insert({
        auth_user_id: created.data.user.id,
        display_name: input.displayName,
        email: input.email,
        provider: 'email',
      }).select('*').single();
      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Unable to create passenger profile');
      return {
        id: inserted.data.id,
        authUserId: inserted.data.auth_user_id,
        displayName: inserted.data.display_name,
        email: inserted.data.email,
        provider: inserted.data.provider,
        createdAt: inserted.data.created_at,
        updatedAt: inserted.data.updated_at,
      };
    }

    const duplicate = Array.from(this.passengerProfiles.values()).find((profile) => profile.email.toLowerCase() === input.email.toLowerCase());
    if (duplicate) throw new Error('Passenger email already exists');

    const id = randomUUID();
    const profile: PassengerProfile = {
      id,
      authUserId: id,
      displayName: input.displayName,
      email: input.email,
      passwordHash: hashPassword(input.password),
      provider: 'email',
      createdAt: now,
      updatedAt: now,
    };
    this.passengerProfiles.set(id, profile);
    return profile;
  }

  async loginPassenger(email: string, password: string): Promise<{ token: string; profile: PassengerProfile }> {
    if (this.supabaseAnon && this.supabaseAdmin) {
      const signIn = await this.supabaseAnon.auth.signInWithPassword({ email, password });
      if (signIn.error || !signIn.data.user || !signIn.data.session) throw new Error(signIn.error?.message ?? 'Invalid credentials');
      const profileData = await this.supabaseAdmin.from('passenger_profiles').select('*').eq('auth_user_id', signIn.data.user.id).single();
      if (profileData.error || !profileData.data) throw new Error('Passenger profile not found');
      const profile: PassengerProfile = {
        id: profileData.data.id,
        authUserId: profileData.data.auth_user_id,
        displayName: profileData.data.display_name,
        email: profileData.data.email,
        provider: profileData.data.provider,
        createdAt: profileData.data.created_at,
        updatedAt: profileData.data.updated_at,
      };
      return { token: signIn.data.session.access_token, profile };
    }

    const profile = Array.from(this.passengerProfiles.values()).find((p) => p.email.toLowerCase() === email.toLowerCase());
    if (!profile || profile.passwordHash !== hashPassword(password)) throw new Error('Invalid credentials');

    const token = createToken('sncft_passenger');
    this.sessions.set(token, { token, type: 'passenger', profileId: profile.id });
    return { token, profile };
  }

  async getPassengerByToken(token: string): Promise<PassengerProfile | null> {
    if (this.supabaseAnon && this.supabaseAdmin && !token.startsWith('sncft_passenger_')) {
      const user = await this.supabaseAnon.auth.getUser(token);
      if (user.error || !user.data.user) return null;
      const profileData = await this.supabaseAdmin.from('passenger_profiles').select('*').eq('auth_user_id', user.data.user.id).single();
      if (profileData.error || !profileData.data) return null;
      return {
        id: profileData.data.id,
        authUserId: profileData.data.auth_user_id,
        displayName: profileData.data.display_name,
        email: profileData.data.email,
        provider: profileData.data.provider,
        createdAt: profileData.data.created_at,
        updatedAt: profileData.data.updated_at,
      };
    }

    const session = this.sessions.get(token);
    if (!session || session.type !== 'passenger') return null;
    return this.passengerProfiles.get(session.profileId) ?? null;
  }

  async logout(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async listFavorites(passengerId: string): Promise<Favorite[]> {
    if (this.supabaseAdmin) {
      const data = await this.supabaseAdmin.from('passenger_favorites').select('*').eq('passenger_id', passengerId).order('created_at', { ascending: false });
      if (data.error) throw new Error(data.error.message);
      return (data.data ?? []).map((row) => ({ id: row.id, passengerId: row.passenger_id, originStationId: row.origin_station_id, destinationStationId: row.destination_station_id, label: row.label ?? undefined, createdAt: row.created_at }));
    }

    return Array.from(this.favorites.values()).filter((fav) => fav.passengerId === passengerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addFavorite(input: { passengerId: string; originStationId: string; destinationStationId: string; label?: string }): Promise<Favorite> {
    if (this.supabaseAdmin) {
      const inserted = await this.supabaseAdmin.from('passenger_favorites').insert({
        passenger_id: input.passengerId,
        origin_station_id: input.originStationId,
        destination_station_id: input.destinationStationId,
        label: input.label ?? null,
      }).select('*').single();
      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Unable to save favorite');
      return { id: inserted.data.id, passengerId: inserted.data.passenger_id, originStationId: inserted.data.origin_station_id, destinationStationId: inserted.data.destination_station_id, label: inserted.data.label ?? undefined, createdAt: inserted.data.created_at };
    }

    const favorite: Favorite = { id: randomUUID(), passengerId: input.passengerId, originStationId: input.originStationId, destinationStationId: input.destinationStationId, label: input.label, createdAt: new Date().toISOString() };
    this.favorites.set(favorite.id, favorite);
    return favorite;
  }

  async deleteFavorite(passengerId: string, favoriteId: string): Promise<void> {
    if (this.supabaseAdmin) {
      const deleted = await this.supabaseAdmin.from('passenger_favorites').delete().eq('id', favoriteId).eq('passenger_id', passengerId);
      if (deleted.error) throw new Error(deleted.error.message);
      return;
    }

    const existing = this.favorites.get(favoriteId);
    if (!existing || existing.passengerId !== passengerId) throw new Error('Favorite not found');
    this.favorites.delete(favoriteId);
  }

  async listSavedJourneys(passengerId: string): Promise<SavedJourney[]> {
    if (this.supabaseAdmin) {
      const data = await this.supabaseAdmin.from('saved_journeys').select('*').eq('passenger_id', passengerId).order('created_at', { ascending: false });
      if (data.error) throw new Error(data.error.message);
      return (data.data ?? []).map((row) => ({
        id: row.id,
        passengerId: row.passenger_id,
        originStationId: row.origin_station_id,
        destinationStationId: row.destination_station_id,
        departureTime: row.departure_time,
        arrivalTime: row.arrival_time,
        trainNumbers: row.train_numbers ?? [],
        journeyPayload: row.journey_payload,
        travelDate: row.travel_date,
        createdAt: row.created_at,
      }));
    }

    return Array.from(this.savedJourneys.values()).filter((item) => item.passengerId === passengerId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  async addSavedJourney(input: Omit<SavedJourney, 'id' | 'createdAt'>): Promise<SavedJourney> {
    if (this.supabaseAdmin) {
      const inserted = await this.supabaseAdmin.from('saved_journeys').insert({
        passenger_id: input.passengerId,
        origin_station_id: input.originStationId,
        destination_station_id: input.destinationStationId,
        departure_time: input.departureTime,
        arrival_time: input.arrivalTime,
        train_numbers: input.trainNumbers,
        journey_payload: input.journeyPayload,
        travel_date: input.travelDate,
      }).select('*').single();
      if (inserted.error || !inserted.data) throw new Error(inserted.error?.message ?? 'Unable to save journey');
      return {
        id: inserted.data.id,
        passengerId: inserted.data.passenger_id,
        originStationId: inserted.data.origin_station_id,
        destinationStationId: inserted.data.destination_station_id,
        departureTime: inserted.data.departure_time,
        arrivalTime: inserted.data.arrival_time,
        trainNumbers: inserted.data.train_numbers,
        journeyPayload: inserted.data.journey_payload,
        travelDate: inserted.data.travel_date,
        createdAt: inserted.data.created_at,
      };
    }

    const saved: SavedJourney = { ...input, id: randomUUID(), createdAt: new Date().toISOString() };
    this.savedJourneys.set(saved.id, saved);
    return saved;
  }

  async deleteSavedJourney(passengerId: string, savedJourneyId: string): Promise<void> {
    if (this.supabaseAdmin) {
      const deleted = await this.supabaseAdmin.from('saved_journeys').delete().eq('id', savedJourneyId).eq('passenger_id', passengerId);
      if (deleted.error) throw new Error(deleted.error.message);
      return;
    }

    const existing = this.savedJourneys.get(savedJourneyId);
    if (!existing || existing.passengerId !== passengerId) throw new Error('Saved journey not found');
    this.savedJourneys.delete(savedJourneyId);
  }

  resetForTests() {
    this.adminProfiles.clear();
    this.passengerProfiles.clear();
    this.sessions.clear();
    this.favorites.clear();
    this.savedJourneys.clear();
  }
}

export const authService = new AuthService();
