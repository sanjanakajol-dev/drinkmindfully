import { type Session, type SupabaseClient } from '@supabase/supabase-js';
import * as AppleAuthentication from 'expo-apple-authentication';
import * as Crypto from 'expo-crypto';

/**
 * Everyone starts with an anonymous account so they can log within seconds. Linking Apple, Google
 * or an email address later keeps the same user id, so nothing they logged is lost.
 */
export async function ensureSession(client: SupabaseClient): Promise<Session> {
  const { data } = await client.auth.getSession();
  if (data.session) return data.session;

  const { data: created, error } = await client.auth.signInAnonymously();
  if (error || !created.session) throw error ?? new Error('Could not start a session');
  return created.session;
}

export type LinkResult =
  | { outcome: 'linked' }
  /** The identity already belongs to an account; the user was switched to that account. */
  | { outcome: 'switched_to_existing' }
  | { outcome: 'email_sent' }
  | { outcome: 'cancelled' };

/** Adds an email address; the user confirms it from the link we send. */
export async function linkEmail(client: SupabaseClient, email: string): Promise<LinkResult> {
  const { error } = await client.auth.updateUser({ email });
  if (error) throw error;
  return { outcome: 'email_sent' };
}

/**
 * Native Sign in with Apple (iOS). Apple receives a hashed nonce and Supabase the raw one, so the
 * token cannot be replayed.
 */
export async function linkApple(client: SupabaseClient): Promise<LinkResult> {
  const rawNonce = Crypto.randomUUID();
  const hashedNonce = await Crypto.digestStringAsync(Crypto.CryptoDigestAlgorithm.SHA256, rawNonce);

  let credential: AppleAuthentication.AppleAuthenticationCredential;
  try {
    credential = await AppleAuthentication.signInAsync({
      requestedScopes: [
        AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
        AppleAuthentication.AppleAuthenticationScope.EMAIL,
      ],
      nonce: hashedNonce,
    });
  } catch (e) {
    if ((e as { code?: string }).code === 'ERR_REQUEST_CANCELED') return { outcome: 'cancelled' };
    throw e;
  }
  if (!credential.identityToken) throw new Error('Apple did not return an identity token');

  return linkIdToken(client, 'apple', credential.identityToken, rawNonce);
}

/**
 * Links a native ID token. If that Apple/Google account already has a Drink Mindfully account
 * (for example after reinstalling), signs in to it instead.
 */
export async function linkIdToken(
  client: SupabaseClient,
  provider: 'apple' | 'google',
  token: string,
  nonce?: string,
): Promise<LinkResult> {
  const { error } = await client.auth.linkIdentity({ provider, token, nonce });
  if (!error) return { outcome: 'linked' };
  if (error.code !== 'identity_already_exists') throw error;

  const { error: signInError } = await client.auth.signInWithIdToken({ provider, token, nonce });
  if (signInError) throw signInError;
  return { outcome: 'switched_to_existing' };
}
