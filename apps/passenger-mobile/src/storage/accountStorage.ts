import type { Account } from '../types';
import { getStoredItem, removeStoredItem, setStoredItem } from './deviceStorage';

export const ACCOUNT_KEY = 'sncft_passenger_mobile_accounts';
export const SESSION_KEY = 'sncft_passenger_mobile_session';
export const MATRICULE_REGEX = /^(?=.*[A-Za-z])(?=.*\d)[A-Za-z0-9]+$/;

const demoAccount: Account = {
  matricule: 'VOY123',
  firstName: 'Ahmed',
  lastName: 'Voyageur',
  email: 'user@domain.tn',
  password: 'user123',
  createdAt: new Date('2026-01-01T08:00:00.000Z').toISOString(),
};

async function readAccounts(): Promise<Account[]> {
  try {
    const raw = await getStoredItem(ACCOUNT_KEY);
    return raw ? (JSON.parse(raw) as Account[]) : [];
  } catch {
    return [];
  }
}

async function writeAccounts(accounts: Account[]): Promise<void> {
  await setStoredItem(ACCOUNT_KEY, JSON.stringify(accounts));
}

export async function seedPassengerAccounts(): Promise<void> {
  const accounts = await readAccounts();
  if (accounts.some((account) => account.email.toLowerCase() === demoAccount.email.toLowerCase())) {
    return;
  }

  await writeAccounts([demoAccount, ...accounts]);
}

export async function getPassengerSession(): Promise<Account | null> {
  const email = await getStoredItem(SESSION_KEY);
  if (!email) return null;

  const accounts = await readAccounts();
  return (
    accounts.find((account) => account.email.toLowerCase() === email.toLowerCase()) || null
  );
}

export async function signInPassenger(email: string, password: string): Promise<Account> {
  const accounts = await readAccounts();
  const account = accounts.find(
    (entry) =>
      entry.email.toLowerCase() === email.trim().toLowerCase() &&
      entry.password === password.trim(),
  );

  if (!account) {
    throw new Error('Email ou mot de passe incorrect.');
  }

  await setStoredItem(SESSION_KEY, account.email);
  return account;
}

export async function registerPassengerAccount(payload: {
  matricule: string;
  firstName: string;
  lastName: string;
  email: string;
  password: string;
}): Promise<Account> {
  const matricule = payload.matricule.trim().toUpperCase();
  const firstName = payload.firstName.trim();
  const lastName = payload.lastName.trim();
  const email = payload.email.trim().toLowerCase();
  const password = payload.password.trim();

  if (!matricule || !firstName || !lastName || !email || !password) {
    throw new Error('Tous les champs sont obligatoires.');
  }

  if (!MATRICULE_REGEX.test(matricule)) {
    throw new Error('Le matricule doit contenir au moins une lettre et un chiffre.');
  }

  const accounts = await readAccounts();
  if (accounts.some((account) => account.email.toLowerCase() === email)) {
    throw new Error('Un compte existe déjà avec cet email.');
  }

  const account: Account = {
    matricule,
    firstName,
    lastName,
    email,
    password,
    createdAt: new Date().toISOString(),
  };

  await writeAccounts([account, ...accounts]);
  await setStoredItem(SESSION_KEY, account.email);
  return account;
}

export async function clearPassengerSession(): Promise<void> {
  await removeStoredItem(SESSION_KEY);
}
