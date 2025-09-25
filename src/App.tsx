import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc } from 'firebase/firestore';

// Firebase Config - используем переменные окружения
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY || "your-firebase-api-key",
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN || "rocket-a799b.firebaseapp.com",
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID || "rocket-a799b",
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET || "rocket-a799b.firebasestorage.app",
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID || "678735595601",
  appId: process.env.REACT_APP_FIREBASE_APP_ID || "1:678735595601:web:cd917684a68a0bffdcd070",
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID || "G-GZTHX189LL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// Rank images mapping with type safety
interface RankImages {
  [key: string]: string;
}

const rankImages: RankImages = {
  'Unranked': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-0.png',
  'Bronze I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-1.png',
  'Bronze II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-2.png',
  'Bronze III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-3.png',
  'Silver I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-4.png',
  'Silver II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-5.png',
  'Silver III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-6.png',
  'Gold I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-7.png',
  'Gold II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-8.png',
  'Gold III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-9.png',
  'Platinum I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-10.png',
  'Platinum II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-11.png',
  'Platinum III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-12.png',
  'Diamond I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-13.png',
  'Diamond II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-14.png',
  'Diamond III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-15.png',
  'Champion I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-16.png',
  'Champion II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-17.png',
  'Champion III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-18.png',
  'Grand Champion I': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-19.png',
  'Grand Champion II': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-20.png',
  'Grand Champion III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-21.png',
  'Supersonic Legend': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-22.png'
};

// Safe rank image getter
const getRankImage = (rank: string): string => {
  return rankImages[rank] || rankImages['Unranked'];
};

// Список организаторов (можно вынести в Firebase)
const ORGANIZERS = [
  'admin@tournament.com',
  'organizer@tournament.com',
  'your-email@domain.com' // Добавьте сюда email организатора
];

const App: React.FC = () => {
  const [players, setPlayers] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [nickname, setNickname] = useState('');
  const [platform, setPlatform] = useState('steam');
  const [trackerLink, setTrackerLink] = useState('');
  const [status, setStatus] = useState('Ищу команду');
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);
  const [isOrganizer, setIsOrganizer] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('add-player');
  const [playerData, setPlayerData] = useState<any>(null);
  const [showRules, setShowRules] = useState(false);
  const [tournamentRules, setTournamentRules] = useState('Tournament Rules:\n\n1. Team Composition: 3 players per team\n2. Format: Double elimination bracket\n3. Match Rules: Best of 3 for early rounds, Best of 5 for finals\n4. Server Selection: EU servers preferred\n5. Schedule: Matches must be completed within designated timeframes\n\nPlease ensure fair play and good sportsmanship throughout the tournament.');
  const [editingRules, setEditingRules] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Проверяем авторизацию пользователя (заглушка - в реальном приложении используйте Firebase Auth)
    const checkAuth = () => {
      // В реальном приложении здесь будет проверка через Firebase Auth
      const savedEmail = localStorage.getItem('tournament_user_email');
      if (savedEmail) {
        setUserEmail(savedEmail);
        setIsAuthenticated(true);
        // Автоматически определяем организатора по email
        setIsOrganizer(ORGANIZERS.includes(savedEmail));
      }
    };

    checkAuth();

    const unsubscribePlayers = onSnapshot(collection(db, 'players'), (snapshot) => {
      const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setPlayers(playersData);
    });

    const unsubscribeTeams = onSnapshot(collection(db, 'teams'), (snapshot) => {
      const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setTeams(teamsData);
    });

    loadTournamentRules();

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

  const handleLogin = (email: string) => {
    setUserEmail(email);
    setIsAuthenticated(true);
    setIsOrganizer(ORGANIZERS.includes(email));
    localStorage.setItem('tournament_user_email', email);
  };

  const handleLogout = () => {
    setUserEmail('');
    setIsAuthenticated(false);
    setIsOrganizer(false);
    localStorage.removeItem('tournament_user_email');
  };

  const loadTournamentRules = async () => {
    try {
      const rulesDoc = await getDoc(doc(db, 'settings', 'tournamentRules'));
      if (rulesDoc.exists()) {
        setTournamentRules(rulesDoc.data().rules);
      }
    } catch (error) {
      console.error('Error loading tournament rules:', error);
    }
  };

  const saveTournamentRules = async () => {
    try {
      await setDoc(doc(db, 'settings', 'tournamentRules'), {
        rules: tournamentRules,
        lastUpdated: new Date()
      });
      setEditingRules(false);
      setSuccessMessage('Правила турнира успешно обновлены!');
    } catch (error) {
      setError('Ошибка сохранения правил турнира');
    }
  };

  const parseTrackerData = async (url: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      const mockRanks = ['Bronze I', 'Bronze II', 'Bronze III', 'Silver I', 'Silver II', 'Silver III', 
                        'Gold I', 'Gold II', 'Gold III', 'Platinum I', 'Platinum II', 'Platinum III',
                        'Diamond I', 'Diamond II', 'Diamond III', 'Champion I', 'Champion II', 'Champion III',
                        'Grand Champion I', 'Grand Champion II', 'Grand Champion III', 'Supersonic Legend'];
      
      const randomRank = mockRanks[Math.floor(Math.random() * mockRanks.length)];
      const randomMMR = Math.floor(Math.random() * 2000) + 500;
      
      return { 
        mmr: randomMMR.toString(), 
        rank: randomRank,
        rankImage: getRankImage(randomRank)
      };
    } catch (error) {
      console.error('Error parsing tracker data:', error);
      return { 
        mmr: 'N/A', 
        rank: 'Unranked',
        rankImage: getRankImage('Unranked')
      };
    }
  };

  const fetchPlayerData = async () => {
    if (!nickname || !trackerLink) {
      setError('Заполните никнейм и ссылку на tracker.gg');
      return;
    }
    
    setLoading(true);
    setError('');
    try {
      const data = await parseTrackerData(trackerLink);
      setPlayerData({
        nickname,
        platform,
        mmr: data.mmr,
        rank: data.rank,
        rankImage: data.rankImage
      });
    } catch (error) {
      setError('Ошибка получения данных с tracker.gg');
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerData) {
      setError('Сначала получите данные игрока');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await addDoc(collection(db, 'players'), {
        nickname: playerData.nickname,
        platform: playerData.platform,
        trackerLink: trackerLink.trim(),
        mmr: playerData.mmr,
        rank: playerData.rank,
        rankImage: playerData.rankImage,
        status: status,
        createdAt: new Date(),
        userEmail: userEmail // Сохраняем email пользователя
      });
      
      setNickname('');
      setTrackerLink('');
      setPlayerData(null);
      setSuccessMessage('Игрок успешно добавлен!');
    } catch (error) {
      setError('Ошибка добавления игрока');
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (playerId: string) => {
    if (!isOrganizer) {
      setError('Только организаторы могут удалять игроков!');
      return;
    }

    try {
      await deleteDoc(doc(db, 'players', playerId));
      setSuccessMessage('Игрок успешно удален!');
    } catch (error) {
      setError('Ошибка удаления игрока');
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!isOrganizer) {
      setError('Только организаторы могут удалять команды!');
      return;
    }

    try {
      await deleteDoc(doc(db, 'teams', teamId));
      setSuccessMessage('Команда успешно удалена!');
    } catch (error) {
      setError('Ошибка удаления команды');
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (teamPlayers.length === 0) {
      setError('Выберите хотя бы одного игрока');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const playerIds = teamPlayers.map((p) => p.id);
      const mmrs = teamPlayers.map((p) => parseInt(p.mmr) || 0);
      const averageMMR = mmrs.length ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : 0;
      
      await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        logo: teamLogo,
        players: playerIds,
        averageMMR,
        createdAt: new Date(),
        createdBy: userEmail
      });
      
      setTeamName('');
      setTeamLogo('');
      setTeamPlayers([]);
      setSuccessMessage('Команда успешно создана!');
    } catch (error) {
      setError('Ошибка создания команды');
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'add-player', label: 'Добавление аккаунта' },
    { id: 'players-list', label: 'Список игроков' },
    { id: 'create-team', label: 'Создание команды' },
    { id: 'teams-list', label: 'Список команд' },
    { id: 'bracket', label: 'Турнирная сетка', disabled: true }
  ];

  // Компонент авторизации
  const LoginForm = () => (
    <div style={styles.loginContainer}>
      <div style={styles.loginForm}>
        <h2 style={styles.loginTitle}>Вход в систему</h2>
        <p style={styles.loginSubtitle}>Введите ваш email для продолжения</p>
        
        <div style={styles.formGroup}>
          <input
            type="email"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com"
            style={styles.input}
          />
        </div>
        
        <button
          onClick={() => handleLogin(userEmail)}
          disabled={!userEmail}
          style={{
            ...styles.submitButton,
            ...(!userEmail && styles.buttonDisabled)
          }}
        >
          Войти
        </button>

        <div style={styles.organizerHint}>
          <p>Для доступа к функциям организатора используйте email:</p>
          <ul style={styles.organizerList}>
            {ORGANIZERS.map((email, index) => (
              <li key={index} style={styles.organizerEmail}>{email}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div style={styles.container}>
      {/* Rules Modal */}
      {showRules && (
        <div style={styles.modalOverlay} onClick={() => setShowRules(false)}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Tournament Rules</h2>
              <button 
                style={styles.closeButton}
                onClick={() => setShowRules(false)}
              >
                ×
              </button>
            </div>
            
            {isOrganizer && editingRules ? (
              <div>
                <textarea
                  value={tournamentRules}
                  onChange={(e) => setTournamentRules(e.target.value)}
                  style={styles.rulesTextarea}
                  rows={15}
                />
                <div style={styles.modalActions}>
                  <button 
                    style={styles.saveButton}
                    onClick={saveTournamentRules}
                  >
                    Сохранить правила
                  </button>
                  <button 
                    style={styles.cancelButton}
                    onClick={() => setEditingRules(false)}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <pre style={styles.rulesText}>{tournamentRules}</pre>
                {isOrganizer && (
                  <button 
                    style={styles.editButton}
                    onClick={() => setEditingRules(true)}
                  >
                    Редактировать правила
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <div>
            <h1 style={styles.title}>Rocket League Tournament</h1>
            <p style={styles.subtitle}>
              {isOrganizer ? 'Панель управления турниром' : 'Панель участника турнира'}
            </p>
          </div>
          
          <div style={styles.headerRight}>
            <button 
              style={styles.rulesButton}
              onClick={() => setShowRules(true)}
            >
              Tournament Rules
            </button>
            
            <div style={styles.userInfo}>
              <span style={styles.userEmail}>{userEmail}</span>
              {isOrganizer && (
                <span style={styles.organizerBadge}>Организатор</span>
              )}
              <button 
                style={styles.logoutButton}
                onClick={handleLogout}
              >
                Выйти
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => !tab.disabled && setActiveTab(tab.id)}
              style={{
                ...styles.navButton,
                ...(activeTab === tab.id ? styles.navButtonActive : {}),
                ...(tab.disabled ? styles.navButtonDisabled : {})
              }}
              title={tab.disabled ? 'В разработке' : ''}
            >
              {tab.label}
              {tab.disabled && <span style={styles.lockIcon}> 🔒</span>}
            </button>
          ))}
        </div>
      </nav>

      {/* Main Content */}
      <main style={styles.main}>
        {/* Messages */}
        {error && (
          <div style={styles.errorMessage}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={styles.successMessage}>
            <span>✅</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div style={styles.tabContent}>
          
          {/* Add Player Tab */}
          {activeTab === 'add-player' && (
            <div style={styles.formContainer}>
              <h2 style={styles.tabTitle}>Добавление аккаунта</h2>
              <p style={styles.tabSubtitle}>Зарегистрируйте свой аккаунт для участия в турнире</p>
              
              <form onSubmit={addPlayer} style={styles.form}>
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Никнейм *</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Введите ваш никнейм в игре"
                      style={styles.input}
                      required
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Платформа *</label>
                    <div style={styles.selectContainer}>
                      <select
                        value={platform}
                        onChange={(e) => setPlatform(e.target.value)}
                        style={styles.select}
                      >
                        <option value="steam">Steam</option>
                        <option value="epic">Epic Games</option>
                      </select>
                      <span style={styles.selectArrow}>▼</span>
                    </div>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Ссылка на tracker.gg *</label>
                  <input
                    type="url"
                    value={trackerLink}
                    onChange={(e) => setTrackerLink(e.target.value)}
                    placeholder="Вставьте ссылку на ваш профиль tracker.gg"
                    style={styles.input}
                    required
                  />
                  <p style={styles.helperText}>
                    Скопируйте URL вашего профиля с сайта tracker.gg
                  </p>
                </div>

                <button
                  type="button"
                  onClick={fetchPlayerData}
                  disabled={!nickname || !trackerLink || loading}
                  style={{
                    ...styles.secondaryButton,
                    ...((!nickname || !trackerLink || loading) && styles.buttonDisabled)
                  }}
                >
                  {loading ? 'Получение данных...' : 'Получить данные игрока'}
                </button>

                {/* Player Data Preview */}
                {playerData && (
                  <div style={styles.playerPreview}>
                    <h3 style={styles.previewTitle}>Данные игрока:</h3>
                    <div style={styles.previewContent}>
                      <div style={styles.rankInfo}>
                        <img 
                          src={playerData.rankImage} 
                          alt={playerData.rank}
                          style={styles.rankImage}
                          onError={(e) => {
                            e.currentTarget.src = getRankImage('Unranked');
                          }}
                        />
                        <div>
                          <div style={styles.rankName}>{playerData.rank}</div>
                          <div style={styles.mmr}>MMR: {playerData.mmr}</div>
                        </div>
                      </div>
                      <div style={styles.playerInfo}>
                        <div>Никнейм: <strong>{playerData.nickname}</strong></div>
                        <div>Платформа: <strong>{playerData.platform}</strong></div>
                      </div>
                    </div>
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>Статус в команде *</label>
                  <div style={styles.selectContainer}>
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value)}
                      style={styles.select}
                    >
                      <option value="Ищу команду">Ищу команду</option>
                      <option value="Капитан">Капитан</option>
                    </select>
                    <span style={styles.selectArrow}>▼</span>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading || !playerData}
                  style={{
                    ...styles.submitButton,
                    ...((loading || !playerData) && styles.buttonDisabled)
                  }}
                >
                  {loading ? 'Добавление...' : 'Добавить аккаунт'}
                </button>
              </form>
            </div>
          )}

          {/* Players List Tab */}
          {activeTab === 'players-list' && (
            <div>
              <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Список игроков</h2>
                <span style={styles.counter}>Всего: {players.length}</span>
              </div>
              
              {players.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>👤</div>
                  <p style={styles.emptyText}>Пока нет зарегистрированных игроков</p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {players.map(player => (
                    <div key={player.id} style={styles.card}>
                      <div style={styles.cardHeader}>
                        <div style={styles.playerMainInfo}>
                          <h3 style={styles.playerName}>{player.nickname}</h3>
                          <span style={styles.platform}>{player.platform}</span>
                        </div>
                        {player.rankImage && (
                          <img 
                            src={player.rankImage} 
                            alt={player.rank}
                            style={styles.cardRankImage}
                            onError={(e) => {
                              e.currentTarget.src = getRankImage('Unranked');
                            }}
                          />
                        )}
                      </div>
                      
                      <div style={styles.playerStats}>
                        <div style={styles.stat}>
                          <span style={styles.statLabel}>Ранг:</span>
                          <span style={styles.statValue}>{player.rank}</span>
                        </div>
                        <div style={styles.stat}>
                          <span style={styles.statLabel}>MMR:</span>
                          <span style={styles.statValue}>{player.mmr}</span>
                        </div>
                        <div style={styles.stat}>
                          <span style={styles.statLabel}>Статус:</span>
                          <span style={styles.statValue}>{player.status}</span>
                        </div>
                      </div>
                      
                      <div style={styles.cardActions}>
                        {player.trackerLink && (
                          <a 
                            href={player.trackerLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            style={styles.profileLink}
                          >
                            Открыть профиль
                          </a>
                        )}
                        {isOrganizer && (
                          <button
                            onClick={() => deletePlayer(player.id)}
                            style={styles.deleteBtn}
                          >
                            Удалить
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Create Team Tab */}
          {activeTab === 'create-team' && (
            <div style={styles.formContainer}>
              <h2 style={styles.tabTitle}>Создание команды</h2>
              <p style={styles.tabSubtitle}>Соберите команду для участия в турнире</p>
              
              <form onSubmit={createTeam} style={styles.form}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>Название команды *</label>
                  <input
                    type="text"
                    value={teamName}
                    onChange={(e) => setTeamName(e.target.value)}
                    placeholder="Введите название команды"
                    style={styles.input}
                    required
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Выберите игроков для команды *
                    {teamPlayers.length > 0 && <span style={styles.selectedCount}> ({teamPlayers.length} выбрано)</span>}
                  </label>
                  <select
                    multiple
                    value={teamPlayers.map((p) => p.id)}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
                      setTeamPlayers(selectedPlayers);
                    }}
                    style={{...styles.select, height: '150px'}}
                    required
                  >
                    {players.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.nickname} ({player.platform}) - {player.rank} ({player.mmr} MMR)
                      </option>
                    ))}
                  </select>
                  <p style={styles.helperText}>Для выбора нескольких игроков удерживайте Ctrl (Cmd на Mac)</p>
                </div>

                {teamPlayers.length > 0 && (
                  <div style={styles.selectedPlayers}>
                    <h4 style={styles.selectedTitle}>Выбранные игроки:</h4>
                    {teamPlayers.map(player => (
                      <div key={player.id} style={styles.selectedPlayer}>
                        <span>{player.nickname}</span>
                        <span>{player.rank} ({player.mmr} MMR)</span>
                      </div>
                    ))}
                    <div style={styles.averageStats}>
                      Средний MMR: {Math.round(teamPlayers.reduce((sum, p) => sum + (parseInt(p.mmr) || 0), 0) / teamPlayers.length)}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || teamPlayers.length === 0}
                  style={{
                    ...styles.submitButton,
                    ...((loading || teamPlayers.length === 0) && styles.buttonDisabled)
                  }}
                >
                  {loading ? 'Создание...' : 'Создать команду'}
                </button>
              </form>
            </div>
          )}

          {/* Teams List Tab */}
          {activeTab === 'teams-list' && (
            <div>
              <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Список команд</h2>
                <span style={styles.counter}>Всего: {teams.length}</span>
              </div>
              
              {teams.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🏆</div>
                  <p style={styles.emptyText}>Пока нет созданных команд</p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {teams.map(team => (
                    <div key={team.id} style={styles.teamCard}>
                      <div style={styles.teamHeader}>
                        <h3 style={styles.teamName}>{team.name}</h3>
                        <div style={styles.teamInfo}>
                          <span>{team.players.length} игроков</span>
                          <span>Avg MMR: {team.averageMMR}</span>
                        </div>
                      </div>
                      
                      <div style={styles.teamPlayers}>
                        <h4 style={styles.playersTitle}>Состав команды:</h4>
                        {team.players.map((id: string) => {
                          const player = players.find(p => p.id === id);
                          return player ? (
                            <div key={id} style={styles.teamPlayer}>
                              <div style={styles.teamPlayerInfo}>
                                <span style={styles.teamPlayerName}>{player.nickname}</span>
                                <span style={styles.teamPlayerPlatform}>{player.platform}</span>
                              </div>
                              <div style={styles.teamPlayerRank}>
                                <img 
                                  src={player.rankImage} 
                                  alt={player.rank} 
                                  style={styles.smallRankImage}
                                  onError={(e) => {
                                    e.currentTarget.src = getRankImage('Unranked');
                                  }}
                                />
                                <span>{player.rank} ({player.mmr})</span>
                              </div>
                            </div>
                          ) : null;
                        })}
                      </div>
                      
                      {isOrganizer && (
                        <button
                          onClick={() => deleteTeam(team.id)}
                          style={styles.deleteBtn}
                        >
                          Удалить команду
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Tournament Bracket Tab */}
          {activeTab === 'bracket' && (
            <div style={styles.comingSoonContainer}>
              <div style={styles.comingSoonContent}>
                <div style={styles.comingSoonIcon}>🏆</div>
                <h2 style={styles.comingSoonTitle}>Турнирная сетка</h2>
                <p style={styles.comingSoonText}>
                  Раздел находится в разработке. Скоро здесь появится турнирная сетка с матчами и результатами.
                </p>
                {isOrganizer && (
                  <p style={styles.organizerNote}>
                    Как организатор, вы сможете управлять турнирной сеткой после запуска функционала.
                  </p>
                )}
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Modern CSS-in-JS styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
  },
  
  // Login Styles
  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)'
  },
  
  loginForm: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '3rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    maxWidth: '400px'
  },
  
  loginTitle: {
    color: 'white',
    textAlign: 'center',
    marginBottom: '0.5rem'
  },
  
  loginSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: '2rem'
  },
  
  organizerHint: {
    marginTop: '2rem',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  
  organizerList: {
    margin: '0.5rem 0',
    paddingLeft: '1.5rem'
  },
  
  organizerEmail: {
    fontSize: '0.8rem',
    marginBottom: '0.25rem'
  },
  
  header: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '1rem 0'
  },
  
  headerContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  headerRight: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  
  userInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem',
    color: 'white'
  },
  
  userEmail: {
    fontSize: '0.9rem',
    opacity: '0.8'
  },
  
  organizerBadge: {
    background: '#10b981',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '600'
  },
  
  logoutButton: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  
  title: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: 0
  },
  
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    fontSize: '1.1rem'
  },
  
  rulesButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '1rem',
    fontWeight: '500',
    transition: 'all 0.3s'
  },
  
  nav: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  navContent: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '0 1rem',
    display: 'flex',
    gap: '0'
  },
  
  navButton: {
    padding: '1rem 2rem',
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s',
    borderBottom: '3px solid transparent',
    position: 'relative'
  },
  
  navButtonActive: {
    color: 'white',
    borderBottomColor: '#10b981',
    background: 'rgba(255, 255, 255, 0.1)'
  },
  
  navButtonDisabled: {
    opacity: '0.5',
    cursor: 'not-allowed'
  },
  
  lockIcon: {
    fontSize: '0.8rem',
    marginLeft: '0.5rem'
  },
  
  main: {
    maxWidth: '1200px',
    margin: '0 auto',
    padding: '2rem 1rem'
  },
  
  errorMessage: {
    background: 'rgba(239, 68, 68, 0.1)',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    color: '#fecaca',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  
  successMessage: {
    background: 'rgba(16, 185, 129, 0.1)',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    color: '#a7f3d0',
    padding: '1rem',
    borderRadius: '8px',
    marginBottom: '2rem',
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem'
  },
  
  tabContent: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    padding: '2rem'
  },
  
  formContainer: {
    maxWidth: '600px',
    margin: '0 auto'
  },
  
  tabTitle: {
    color: 'white',
    fontSize: '2rem',
    fontWeight: 'bold',
    marginBottom: '0.5rem'
  },
  
  tabSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    marginBottom: '2rem',
    fontSize: '1.1rem'
  },
  
  form: {
    display: 'flex',
    flexDirection: 'column',
    gap: '1.5rem'
  },
  
  formGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '1rem'
  },
  
  formGroup: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  
  label: {
    color: 'white',
    fontWeight: '600',
    fontSize: '0.9rem'
  },
  
  input: {
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    transition: 'all 0.3s',
    fontWeight: '500'
  },
  
  selectContainer: {
    position: 'relative',
    display: 'inline-block'
  },
  
  select: {
    padding: '0.75rem 1rem',
    background: 'rgba(0, 0, 0, 0.4)',
    border: '1px solid rgba(255, 255, 255, 0.5)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    width: '100%',
    appearance: 'none',
    fontWeight: '500'
  },
  
  selectArrow: {
    position: 'absolute',
    right: '1rem',
    top: '50%',
    transform: 'translateY(-50%)',
    color: 'white',
    pointerEvents: 'none'
  },
  
  helperText: {
    color: 'rgba(255, 255, 255, 0.6)',
    fontSize: '0.8rem',
    margin: '0.25rem 0 0 0'
  },
  
  submitButton: {
    padding: '1rem 2rem',
    background: 'linear-gradient(45deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    transition: 'all 0.3s',
    marginTop: '1rem'
  },
  
  secondaryButton: {
    padding: '0.75rem 1.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    fontSize: '1rem',
    fontWeight: '500',
    cursor: 'pointer',
    transition: 'all 0.3s'
  },
  
  buttonDisabled: {
    opacity: '0.5',
    cursor: 'not-allowed'
  },
  
  playerPreview: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '1.5rem',
    margin: '1rem 0'
  },
  
  previewTitle: {
    color: 'white',
    marginBottom: '1rem',
    fontSize: '1.1rem'
  },
  
  previewContent: {
    display: 'flex',
    alignItems: 'center',
    gap: '1.5rem'
  },
  
  rankInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  
  rankImage: {
    width: '60px',
    height: '60px',
    objectFit: 'contain'
  },
  
  rankName: {
    color: 'white',
    fontWeight: '600',
    fontSize: '1.1rem'
  },
  
  mmr: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9rem'
  },
  
  playerInfo: {
    color: 'rgba(255, 255, 255, 0.9)',
    fontSize: '0.9rem'
  },
  
  tabHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem'
  },
  
  counter: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '1.1rem'
  },
  
  emptyState: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  
  emptyIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  
  emptyText: {
    fontSize: '1.2rem',
    margin: 0
  },
  
  grid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
    gap: '1.5rem'
  },
  
  card: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.3s'
  },
  
  cardHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: '1rem'
  },
  
  playerMainInfo: {
    flex: 1
  },
  
  playerName: {
    color: 'white',
    fontSize: '1.3rem',
    fontWeight: '600',
    margin: '0 0 0.5rem 0'
  },
  
  platform: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem',
    fontWeight: '500'
  },
  
  cardRankImage: {
    width: '50px',
    height: '50px',
    objectFit: 'contain'
  },
  
  playerStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1rem'
  },
  
  stat: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  
  statLabel: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem'
  },
  
  statValue: {
    color: 'white',
    fontWeight: '500'
  },
  
  cardActions: {
    display: 'flex',
    gap: '0.5rem'
  },
  
  profileLink: {
    flex: 1,
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    textAlign: 'center',
    padding: '0.75rem',
    borderRadius: '6px',
    textDecoration: 'none',
    transition: 'all 0.3s',
    fontSize: '0.9rem'
  },
  
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.3s',
    fontSize: '0.9rem'
  },
  
  teamCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '1.5rem',
    transition: 'all 0.3s'
  },
  
  teamHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1rem'
  },
  
  teamName: {
    color: 'white',
    fontSize: '1.3rem',
    fontWeight: '600',
    margin: 0
  },
  
  teamInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '0.25rem',
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem'
  },
  
  teamPlayers: {
    marginTop: '1rem'
  },
  
  playersTitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '1rem',
    marginBottom: '0.5rem'
  },
  
  teamPlayer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.75rem',
    borderRadius: '6px',
    marginBottom: '0.5rem'
  },
  
  teamPlayerInfo: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.75rem'
  },
  
  teamPlayerName: {
    color: 'white',
    fontWeight: '500'
  },
  
  teamPlayerPlatform: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'rgba(255, 255, 255, 0.8)',
    padding: '0.2rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem'
  },
  
  teamPlayerRank: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    color: 'rgba(255, 255, 255, 0.8)',
    fontSize: '0.9rem'
  },
  
  smallRankImage: {
    width: '25px',
    height: '25px',
    objectFit: 'contain'
  },
  
  selectedPlayers: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '1rem',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  selectedTitle: {
    color: 'white',
    marginBottom: '0.5rem',
    fontSize: '1rem'
  },
  
  selectedPlayer: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '0.5rem 0',
    color: 'rgba(255, 255, 255, 0.8)',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  selectedCount: {
    color: '#10b981',
    fontWeight: '600'
  },
  
  averageStats: {
    marginTop: '0.5rem',
    paddingTop: '0.5rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)',
    color: '#10b981',
    fontWeight: '600',
    textAlign: 'center'
  },
  
  // Coming Soon Styles
  comingSoonContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    minHeight: '400px'
  },
  
  comingSoonContent: {
    textAlign: 'center',
    color: 'white'
  },
  
  comingSoonIcon: {
    fontSize: '4rem',
    marginBottom: '1rem'
  },
  
  comingSoonTitle: {
    fontSize: '2rem',
    marginBottom: '1rem'
  },
  
  comingSoonText: {
    fontSize: '1.1rem',
    opacity: '0.8',
    marginBottom: '1rem'
  },
  
  organizerNote: {
    fontSize: '0.9rem',
    opacity: '0.6',
    fontStyle: 'italic'
  },
  
  // Modal Styles
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000
  },
  
  modalContent: {
    background: 'linear-gradient(135deg, #1e3c72 0%, #2a5298 100%)',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '600px',
    width: '90%',
    maxHeight: '80vh',
    overflow: 'auto',
    border: '1px solid rgba(255, 255, 255, 0.2)'
  },
  
  modalHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '1.5rem'
  },
  
  modalTitle: {
    color: 'white',
    fontSize: '1.5rem',
    fontWeight: 'bold',
    margin: 0
  },
  
  closeButton: {
    background: 'none',
    border: 'none',
    color: 'white',
    fontSize: '2rem',
    cursor: 'pointer',
    padding: 0,
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  rulesText: {
    color: 'white',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit'
  },
  
  rulesTextarea: {
    width: '100%',
    background: 'rgba(0, 0, 0, 0.3)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    padding: '1rem',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    fontFamily: 'inherit',
    resize: 'vertical',
    minHeight: '200px'
  },
  
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end',
    marginTop: '1rem'
  },
  
  saveButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  
  cancelButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500'
  },
  
  editButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    marginTop: '1rem'
  }
} as const;

export default App;