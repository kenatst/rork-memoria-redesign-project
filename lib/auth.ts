import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';
import * as SecureStore from 'expo-secure-store';
import { Platform } from 'react-native';

// Configuration Auth0 avec les clés fournies
const AUTH0_DOMAIN = 'dev-4zxgqysfy64l2tc7.us.auth0.com';
const AUTH0_CLIENT_ID = '689a0da1d84288186ef798d1'; // Extrait de l'URL fournie

// Complete the auth session on web
WebBrowser.maybeCompleteAuthSession();

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  picture?: string;
  nickname?: string;
  emailVerified: boolean;
  provider: string;
  accessToken: string;
  refreshToken?: string;
  expiresAt: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  idToken?: string;
  expiresAt: number;
}

/**
 * Configuration de la découverte Auth0
 */
const discovery = {
  authorizationEndpoint: `https://${AUTH0_DOMAIN}/authorize`,
  tokenEndpoint: `https://${AUTH0_DOMAIN}/oauth/token`,
  revocationEndpoint: `https://${AUTH0_DOMAIN}/oauth/revoke`,
  userInfoEndpoint: `https://${AUTH0_DOMAIN}/userinfo`,
};

/**
 * Génère l'URL de redirection pour l'authentification
 */
function getRedirectUrl(): string {
  if (Platform.OS === 'web') {
    return window.location.origin + '/auth';
  }
  return AuthSession.makeRedirectUri({
    scheme: 'memoria',
    path: 'auth',
  });
}

/**
 * Stocke les tokens de manière sécurisée
 * @param tokens - Tokens à stocker
 */
export async function storeTokens(tokens: AuthTokens): Promise<void> {
  try {
    console.log('🔐 [Auth] Storing tokens securely...');

    if (Platform.OS === 'web') {
      // Web: Use localStorage (moins sécurisé mais fonctionnel)
      localStorage.setItem('memoria_tokens', JSON.stringify(tokens));
    } else {
      // Mobile: Use SecureStore
      await SecureStore.setItemAsync('memoria_tokens', JSON.stringify(tokens));
    }

    console.log('✅ [Auth] Tokens stored successfully');
  } catch (error) {
    console.error('❌ [Auth] Error storing tokens:', error);
    throw error;
  }
}

/**
 * Récupère les tokens stockés
 * @returns Promise<AuthTokens | null>
 */
export async function getStoredTokens(): Promise<AuthTokens | null> {
  try {
    console.log('🔍 [Auth] Retrieving stored tokens...');

    let tokensString: string | null = null;

    if (Platform.OS === 'web') {
      tokensString = localStorage.getItem('memoria_tokens');
    } else {
      tokensString = await SecureStore.getItemAsync('memoria_tokens');
    }

    if (!tokensString) {
      console.log('ℹ️ [Auth] No stored tokens found');
      return null;
    }

    const tokens: AuthTokens = JSON.parse(tokensString);

    // Vérifier si les tokens ont expiré
    if (tokens.expiresAt && Date.now() > tokens.expiresAt) {
      console.log('⚠️ [Auth] Stored tokens have expired');
      await clearStoredTokens();
      return null;
    }

    console.log('✅ [Auth] Valid tokens retrieved');
    return tokens;
  } catch (error) {
    console.error('❌ [Auth] Error retrieving tokens:', error);
    return null;
  }
}

/**
 * Supprime les tokens stockés
 */
export async function clearStoredTokens(): Promise<void> {
  try {
    console.log('🗑️ [Auth] Clearing stored tokens...');

    if (Platform.OS === 'web') {
      localStorage.removeItem('memoria_tokens');
    } else {
      await SecureStore.deleteItemAsync('memoria_tokens');
    }

    console.log('✅ [Auth] Tokens cleared successfully');
  } catch (error) {
    console.error('❌ [Auth] Error clearing tokens:', error);
  }
}

/**
 * Authentification avec Auth0 (Google, Apple, Facebook, etc.)
 * @param connection - Type de connexion ('google-oauth2', 'apple', 'facebook', etc.)
 * @returns Promise<AuthUser>
 */
export async function authenticateWithAuth0(connection?: string): Promise<AuthUser> {
  try {
    console.log('🚀 [Auth] Starting Auth0 authentication...', { connection });

    const redirectUri = getRedirectUrl();
    console.log('🔗 [Auth] Redirect URI:', redirectUri);

    // Configuration de la requête d'authentification
    const request = new AuthSession.AuthRequest({
      clientId: AUTH0_CLIENT_ID,
      scopes: ['openid', 'profile', 'email'],
      extraParams: {
        audience: `https://${AUTH0_DOMAIN}/api/v2/`,
        ...(connection && { connection })
      },
      responseType: AuthSession.ResponseType.Code,
      redirectUri,
    });

    // Lancer l'authentification
    const result = await request.promptAsync(discovery);

    if (result.type !== 'success') {
      throw new Error(`Authentication failed: ${result.type}`);
    }

    console.log('✅ [Auth] Authentication successful, exchanging code for tokens...');

    // Échanger le code d'autorisation contre des tokens
    const tokenResult = await AuthSession.exchangeCodeAsync(
      {
        clientId: AUTH0_CLIENT_ID,
        code: result.params.code,
        redirectUri,
        extraParams: {
          code_verifier: request.codeVerifier!,
        },
      },
      discovery
    );

    if (!tokenResult.accessToken) {
      throw new Error('No access token received');
    }

    console.log('🎫 [Auth] Tokens received, fetching user info...');

    // Récupérer les informations utilisateur
    const userInfoResponse = await fetch(discovery.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${tokenResult.accessToken}`,
      },
    });

    if (!userInfoResponse.ok) {
      throw new Error('Failed to fetch user info');
    }

    const userInfo = await userInfoResponse.json();

    // Calculer l'expiration des tokens
    const expiresAt = tokenResult.expiresIn 
      ? Date.now() + (tokenResult.expiresIn * 1000)
      : Date.now() + (3600 * 1000); // 1 heure par défaut

    // Créer l'objet utilisateur
    const user: AuthUser = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.nickname || userInfo.email,
      picture: userInfo.picture,
      nickname: userInfo.nickname,
      emailVerified: userInfo.email_verified || false,
      provider: connection || 'auth0',
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      expiresAt,
    };

    // Stocker les tokens
    const tokens: AuthTokens = {
      accessToken: tokenResult.accessToken,
      refreshToken: tokenResult.refreshToken,
      idToken: tokenResult.idToken,
      expiresAt,
    };

    await storeTokens(tokens);

    console.log('✅ [Auth] User authenticated successfully:', {
      id: user.id,
      email: user.email,
      name: user.name,
      provider: user.provider
    });

    return user;
  } catch (error) {
    console.error('❌ [Auth] Authentication error:', error);
    throw new Error(`Authentication failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Authentification avec Google
 * @returns Promise<AuthUser>
 */
export async function authenticateWithGoogle(): Promise<AuthUser> {
  return authenticateWithAuth0('google-oauth2');
}

/**
 * Authentification avec Apple
 * @returns Promise<AuthUser>
 */
export async function authenticateWithApple(): Promise<AuthUser> {
  return authenticateWithAuth0('apple');
}

/**
 * Authentification avec Facebook
 * @returns Promise<AuthUser>
 */
export async function authenticateWithFacebook(): Promise<AuthUser> {
  return authenticateWithAuth0('facebook');
}

/**
 * Rafraîchit les tokens d'accès
 * @param refreshToken - Token de rafraîchissement
 * @returns Promise<AuthTokens>
 */
export async function refreshTokens(refreshToken: string): Promise<AuthTokens> {
  try {
    console.log('🔄 [Auth] Refreshing tokens...');

    const response = await fetch(discovery.tokenEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        client_id: AUTH0_CLIENT_ID,
        refresh_token: refreshToken,
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`Token refresh failed: ${response.status}`);
    }

    const tokenData = await response.json();

    const expiresAt = tokenData.expires_in 
      ? Date.now() + (tokenData.expires_in * 1000)
      : Date.now() + (3600 * 1000);

    const newTokens: AuthTokens = {
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || refreshToken,
      idToken: tokenData.id_token,
      expiresAt,
    };

    await storeTokens(newTokens);

    console.log('✅ [Auth] Tokens refreshed successfully');
    return newTokens;
  } catch (error) {
    console.error('❌ [Auth] Token refresh error:', error);
    throw error;
  }
}

/**
 * Récupère les informations utilisateur avec un token d'accès
 * @param accessToken - Token d'accès
 * @returns Promise<AuthUser>
 */
export async function getUserInfo(accessToken: string): Promise<Partial<AuthUser>> {
  try {
    console.log('👤 [Auth] Fetching user info...');

    const response = await fetch(discovery.userInfoEndpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.status}`);
    }

    const userInfo = await response.json();

    const user: Partial<AuthUser> = {
      id: userInfo.sub,
      email: userInfo.email,
      name: userInfo.name || userInfo.nickname || userInfo.email,
      picture: userInfo.picture,
      nickname: userInfo.nickname,
      emailVerified: userInfo.email_verified || false,
    };

    console.log('✅ [Auth] User info retrieved:', {
      id: user.id,
      email: user.email,
      name: user.name
    });

    return user;
  } catch (error) {
    console.error('❌ [Auth] Error fetching user info:', error);
    throw error;
  }
}

/**
 * Déconnecte l'utilisateur
 * @param accessToken - Token d'accès (optionnel)
 */
export async function logout(accessToken?: string): Promise<void> {
  try {
    console.log('👋 [Auth] Logging out...');

    // Révoquer le token si fourni
    if (accessToken) {
      try {
        await fetch(discovery.revocationEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          body: new URLSearchParams({
            client_id: AUTH0_CLIENT_ID,
            token: accessToken,
          }).toString(),
        });
      } catch (error) {
        console.warn('⚠️ [Auth] Failed to revoke token:', error);
      }
    }

    // Supprimer les tokens stockés
    await clearStoredTokens();

    console.log('✅ [Auth] Logout successful');
  } catch (error) {
    console.error('❌ [Auth] Logout error:', error);
    throw error;
  }
}

/**
 * Vérifie si l'utilisateur est authentifié
 * @returns Promise<boolean>
 */
export async function isAuthenticated(): Promise<boolean> {
  try {
    const tokens = await getStoredTokens();
    return tokens !== null;
  } catch (error) {
    console.error('❌ [Auth] Error checking authentication:', error);
    return false;
  }
}

/**
 * Récupère l'utilisateur actuel s'il est authentifié
 * @returns Promise<AuthUser | null>
 */
export async function getCurrentUser(): Promise<AuthUser | null> {
  try {
    const tokens = await getStoredTokens();
    if (!tokens) {
      return null;
    }

    const userInfo = await getUserInfo(tokens.accessToken);

    return {
      ...userInfo,
      accessToken: tokens.accessToken,
      refreshToken: tokens.refreshToken,
      expiresAt: tokens.expiresAt,
      provider: 'auth0',
    } as AuthUser;
  } catch (error) {
    console.error('❌ [Auth] Error getting current user:', error);
    // Si erreur, probablement token expiré, nettoyer
    await clearStoredTokens();
    return null;
  }
}

export default {
  authenticateWithAuth0,
  authenticateWithGoogle,
  authenticateWithApple,
  authenticateWithFacebook,
  refreshTokens,
  getUserInfo,
  logout,
  isAuthenticated,
  getCurrentUser,
  storeTokens,
  getStoredTokens,
  clearStoredTokens,
};
