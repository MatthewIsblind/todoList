import React, { useCallback, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';

interface LoginProps {
  onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
  const navigate = useNavigate();

  const cognitoDomain = process.env.REACT_APP_COGNITO_DOMAIN;
  const cognitoClientId = process.env.REACT_APP_COGNITO_CLIENT_ID;
  const cognitoRedirectUri =
    process.env.REACT_APP_COGNITO_REDIRECT_URI ?? `${window.location.origin}/`;
  const responseType = process.env.REACT_APP_COGNITO_RESPONSE_TYPE ?? 'code';
  const scopes = process.env.REACT_APP_COGNITO_SCOPES ?? 'openid profile email';

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

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const hasCode = params.has('code');

    if (hasCode) {
      onLogin();
      navigate('/', { replace: true });
    }
  }, [navigate, onLogin]);

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
            className="w-full px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
          >
            Continue with Amazon Cognito
          </button>
        )}
      </div>
    </div>
  );
};

export default Login;