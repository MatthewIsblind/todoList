import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();

  const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN;
  const cognitoClientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const configuredRedirectUris = useMemo<string[]>(() => {
    const raw = process.env.REACT_APP_COGNITO_REDIRECT_URI;
    if (!raw) {
      return [];
    }

    return raw
      .split(',')
      .map((uri) => uri.trim())
      .filter((uri) => uri.length > 0);
  }, []);

  const cognitoRedirectUri = useMemo(() => {
    if (configuredRedirectUris.length === 0) {
      return `${window.location.origin}/`;
    }

    const currentOrigin = window.location.origin;
    const matchingUri = configuredRedirectUris.find((uri) => {
      try {
        return new URL(uri).origin === currentOrigin;
      } catch (error) {
        console.warn('Ignoring invalid redirect URI from configuration:', uri, error);
        return false;
      }
    });

    return matchingUri ?? configuredRedirectUris[0];
  }, [configuredRedirectUris]);
  const responseType = process.env.REACT_APP_COGNITO_RESPONSE_TYPE ?? 'code';
  const scopes = process.env.REACT_APP_COGNITO_SCOPES ?? 'openid profile email';
  const apiBaseUrl = process.env.REACT_APP_API_BASE_URL?.replace(/\/$/, '') ?? '';

  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const exchangeInFlightRef = useRef(false);

  const exchangeEndpoint = `${apiBaseUrl}/auth/exchange`;

  type TokenBundle = {
    idToken?: string | null;
    accessToken?: string | null;
    refreshToken?: string | null;
  };

  const authorizeUrl = useMemo(() => {
    if (!cognitoDomain || !cognitoClientId) {
      return undefined;
    }

    const baseUrl = cognitoDomain.endsWith('/')
      ? cognitoDomain.slice(0, -1)
      : cognitoDomain;

    const params = new URLSearchParams({
      client_id: cognitoClientId,
      response_type: responseType,
      scope: scopes,
      redirect_uri: cognitoRedirectUri,
    });

    return `${baseUrl}/oauth2/authorize?${params.toString()}`;
  }, [
    cognitoClientId,
    cognitoDomain,
    cognitoRedirectUri,
    responseType,
    scopes,
  ]);

  const handleLogin = useCallback(() => {
    if (!authorizeUrl) {
      return;
    }

    window.location.assign(authorizeUrl);
  }, [authorizeUrl]);

  const persistTokens = useCallback((tokens: TokenBundle) => {
    if (tokens.idToken) {
      localStorage.setItem('cognitoIdToken', tokens.idToken);
    }

    if (tokens.accessToken) {
      localStorage.setItem('cognitoAccessToken', tokens.accessToken);
    }

    if (tokens.refreshToken) {
      localStorage.setItem('cognitoRefreshToken', tokens.refreshToken);
    }
  }, []);

  const clearAuthParams = useCallback(() => {
    const currentUrl = new URL(window.location.href);
    currentUrl.searchParams.delete('code');
    currentUrl.searchParams.delete('state');
    currentUrl.hash = '';
    window.history.replaceState(null, document.title, currentUrl.toString());
  }, []);

  const exchangeCode = useCallback(
    async (authorizationCode: string) => {
      exchangeInFlightRef.current = true;
      setIsProcessing(true);
      setError(null);

      try {
        const response = await fetch(exchangeEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({
            code: authorizationCode,
            redirectUri: cognitoRedirectUri,
          }),
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          const message = payload && typeof payload.error === 'string'
            ? payload.error
            : 'Unable to exchange authorization code. Please try again.';
          throw new Error(message);
        }

        if (!payload?.ok || !payload.tokens) {
          throw new Error('Cognito did not return a valid token response.');
        }

        const tokens: TokenBundle = payload.tokens;
        persistTokens(tokens);

        onLogin();
        navigate('/', { replace: true });
      } catch (err) {
        const message = err instanceof Error
          ? err.message
          : 'Unable to complete sign-in. Please try again.';
        setError(message);
      } finally {
        clearAuthParams();
        exchangeInFlightRef.current = false;
        setIsProcessing(false);
      }
    },
    [
      clearAuthParams,
      cognitoRedirectUri,
      exchangeEndpoint,
      navigate,
      onLogin,
      persistTokens,
    ],
  );

  useEffect(() => {
    const currentUrl = new URL(window.location.href);
    const params = currentUrl.searchParams;
    const code = params.get('code');

    const hashParams = new URLSearchParams(
      currentUrl.hash.startsWith('#')
        ? currentUrl.hash.substring(1)
        : currentUrl.hash,
    );

    const hasIdToken = hashParams.has('id_token');
    if (hasIdToken) {
      persistTokens({
        idToken: hashParams.get('id_token'),
        accessToken: hashParams.get('access_token'),
        refreshToken: hashParams.get('refresh_token'),
      });

      clearAuthParams();
      onLogin();
      navigate('/', { replace: true });
      return;
    }

    if (code && !exchangeInFlightRef.current) {
      void exchangeCode(code);
    }
  }, [clearAuthParams, exchangeCode, navigate, onLogin, persistTokens]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">Sign in</h1>
        {!authorizeUrl ? (
          <p className="text-sm text-red-600">
            Missing Cognito configuration. Ensure the environment variables for
            the domain and client ID are set.
          </p>
        ) : (
          <button
            type="button"
            onClick={handleLogin}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600 disabled:opacity-50"
            disabled={isProcessing}
          >
            Continue with Amazon Cognito
          </button>
        )}
        {isProcessing && (
          <p className="text-sm text-gray-600">Signing you in…</p>
        )}
        {error && (
          <p className="text-sm text-red-600">{error}</p>
        )}
      </div>
    </div>
  );
};

export default Login;