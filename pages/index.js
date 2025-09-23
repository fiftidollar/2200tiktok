import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/router';

export default function Home() {
  const [user, setUser] = useState(null);
  const [accessToken, setAccessToken] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const router = useRouter();

  // Конфигурация
  const CLIENT_KEY = process.env.NEXT_PUBLIC_TIKTOK_CLIENT_KEY;
  const REDIRECT_URI = process.env.NEXT_PUBLIC_REDIRECT_URI || `${window?.location?.origin}/callback`;

  // Генерация случайной строки для state
  const generateState = () => Math.random().toString(36).substring(7);

  // Обработка callback после авторизации
  useEffect(() => {
    const { code, state } = router.query;
    
    if (code && state) {
      handleCallback(code, state);
    }
  }, [router.query]);

  // Шаг 1: Перенаправление на TikTok для авторизации
  const handleLogin = () => {
    const state = generateState();
    if (typeof window !== 'undefined') {
      localStorage.setItem('oauth_state', state);
    }
    
    const authUrl = new URL('https://www.tiktok.com/v2/auth/authorize/');
    authUrl.searchParams.set('client_key', CLIENT_KEY);
    authUrl.searchParams.set('redirect_uri', REDIRECT_URI);
    authUrl.searchParams.set('response_type', 'code');
    authUrl.searchParams.set('scope', 'user.info.basic');
    authUrl.searchParams.set('state', state);
    
    window.location.href = authUrl.toString();
  };

  // Шаг 2: Обработка callback с кодом авторизации
  const handleCallback = async (code, state) => {
    const savedState = typeof window !== 'undefined' ? localStorage.getItem('oauth_state') : null;
    
    if (state !== savedState) {
      setError('State mismatch - возможная CSRF атака');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      // Используем наш API route для обхода CORS
      const tokenResponse = await fetch('/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ code }),
      });

      const tokenData = await tokenResponse.json();

      if (tokenData.error) {
        setError(`Ошибка получения токена: ${tokenData.error_description}`);
        return;
      }

      setAccessToken(tokenData.access_token);
      
      // Получаем информацию о профиле
      await getUserInfo(tokenData.access_token);

      // Очищаем URL от параметров
      router.replace('/', undefined, { shallow: true });
      
    } catch (err) {
      setError('Ошибка при получении токена: ' + err.message);
    } finally {
      setLoading(false);
      if (typeof window !== 'undefined') {
        localStorage.removeItem('oauth_state');
      }
    }
  };

  // Получение информации о пользователе
  const getUserInfo = async (token) => {
    try {
      const userResponse = await fetch('/api/user', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
      });

      const userData = await userResponse.json();

      if (userData.error && userData.error.code !== 'ok') {
        setError(`Ошибка получения профиля: ${userData.error.message}`);
        return;
      }

      setUser(userData.data?.user);
    } catch (err) {
      setError('Ошибка при получении информации о пользователе: ' + err.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setAccessToken(null);
    setError(null);
  };

  return (
    <div style={{ 
      maxWidth: '600px', 
      margin: '0 auto', 
      padding: '20px',
      fontFamily: 'Arial, sans-serif' 
    }}>
      <h1>TikTok OAuth Demo</h1>
      
      {error && (
        <div style={{ 
          color: 'red', 
          backgroundColor: '#ffebee', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          {error}
        </div>
      )}

      {loading && (
        <div style={{ 
          color: '#1976d2', 
          backgroundColor: '#e3f2fd', 
          padding: '10px', 
          borderRadius: '4px',
          marginBottom: '20px'
        }}>
          Загружаем...
        </div>
      )}

      {!user && !loading && (
        <div>
          <p>Нажмите кнопку ниже для авторизации через TikTok:</p>
          <button 
            onClick={handleLogin}
            style={{
              backgroundColor: '#000',
              color: 'white',
              padding: '12px 24px',
              border: 'none',
              borderRadius: '6px',
              fontSize: '16px',
              cursor: 'pointer'
            }}
          >
            Войти через TikTok
          </button>
        </div>
      )}

      {user && (
        <div>
          <h2>Информация о пользователе:</h2>
          <div style={{ 
            backgroundColor: '#f5f5f5', 
            padding: '20px', 
            borderRadius: '6px',
            marginBottom: '20px'
          }}>
            {user.avatar_url && (
              <img 
                src={user.avatar_url} 
                alt="Avatar" 
                style={{ 
                  width: '80px', 
                  height: '80px', 
                  borderRadius: '50%',
                  marginBottom: '10px'
                }}
              />
            )}
            <p><strong>Имя:</strong> {user.display_name}</p>
            <p><strong>Username:</strong> @{user.username}</p>
            <p><strong>Подписчиков:</strong> {user.follower_count?.toLocaleString()}</p>
            <p><strong>Подписок:</strong> {user.following_count?.toLocaleString()}</p>
            <p><strong>Лайков:</strong> {user.likes_count?.toLocaleString()}</p>
            {user.bio_description && (
              <p><strong>Описание:</strong> {user.bio_description}</p>
            )}
          </div>

          <button 
            onClick={handleLogout}
            style={{
              backgroundColor: '#dc3545',
              color: 'white',
              padding: '10px 20px',
              border: 'none',
              borderRadius: '4px',
              cursor: 'pointer'
            }}
          >
            Выйти
          </button>
        </div>
      )}

      {accessToken && (
        <div style={{ 
          marginTop: '20px', 
          fontSize: '12px', 
          color: '#666',
          backgroundColor: '#f8f9fa',
          padding: '10px',
          borderRadius: '4px',
          wordBreak: 'break-all'
        }}>
          <strong>Access Token:</strong> {accessToken.substring(0, 50)}...
        </div>
      )}
    </div>
  );
}