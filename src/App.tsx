import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// Firebase Config
const firebaseConfig = {
  apiKey: "AIzaSyDwSE1p_SeMwQSiV1Yu5rxYBjC_RKw9bF0",
  authDomain: "rocket-a799b.firebaseapp.com",
  projectId: "rocket-a799b",
  storageBucket: "rocket-a799b.firebasestorage.app",
  messagingSenderId: "678735595601",
  appId: "1:678735595601:web:cd917684a68a0bffdcd070",
  measurementId: "G-GZTHX189LL"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

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

  useEffect(() => {
    const unsubscribePlayers = onSnapshot(
      collection(db, 'players'), 
      (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlayers(playersData);
      }
    );

    const unsubscribeTeams = onSnapshot(
      collection(db, 'teams'), 
      (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeams(teamsData);
      }
    );

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await addDoc(collection(db, 'players'), {
        nickname: nickname.trim(),
        platform: platform,
        trackerLink: trackerLink.trim(),
        status: status,
        createdAt: new Date()
      });
      
      setNickname('');
      setTrackerLink('');
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
      
      await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        logo: teamLogo,
        players: playerIds,
        createdAt: new Date()
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
    { id: 'teams-list', label: 'Список команд' }
  ];

  return (
    <div style={styles.container}>
      {/* Header */}
      <header style={styles.header}>
        <div style={styles.headerContent}>
          <h1 style={styles.title}>Rocket League Tournament</h1>
          <p style={styles.subtitle}>Панель управления турниром</p>
        </div>
        
        <div style={styles.organizerSwitch}>
          <label style={styles.switchLabel}>
            <input
              type="checkbox"
              checked={isOrganizer}
              onChange={(e) => setIsOrganizer(e.target.checked)}
              style={styles.switchInput}
            />
            <span style={{
              ...styles.switchSlider,
              ...(isOrganizer ? styles.switchSliderActive : {})
            }}></span>
            <span style={styles.switchText}>
              {isOrganizer ? 'Организатор' : 'Игрок'}
            </span>
          </label>
        </div>
      </header>

      {/* Navigation */}
      <nav style={styles.nav}>
        <div style={styles.navContent}>
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={{
                ...styles.navButton,
                ...(activeTab === tab.id ? styles.navButtonActive : {})
              }}
            >
              {tab.label}
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
                    <label style={styles.label}>Никнейм</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Введите ваш никнейм"
                      style={styles.input}
                      required
                    />
                  </div>
                  
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Платформа</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      style={styles.select}
                    >
                      <option value="steam">Steam</option>
                      <option value="epic">Epic Games</option>
                      <option value="psn">PlayStation</option>
                      <option value="xbl">Xbox</option>
                    </select>
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Ссылка на tracker.gg</label>
                  <input
                    type="url"
                    value={trackerLink}
                    onChange={(e) => setTrackerLink(e.target.value)}
                    placeholder="https://rocketleague.tracker.network/..."
                    style={styles.input}
                  />
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Статус в команде</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    style={styles.select}
                  >
                    <option value="Ищу команду">Ищу команду</option>
                    <option value="Капитан">Капитан (ищу команду)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    ...styles.submitButton,
                    ...(loading ? styles.submitButtonDisabled : {})
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
                        <h3 style={styles.playerName}>{player.nickname}</h3>
                        <span style={styles.platform}>{player.platform}</span>
                      </div>
                      
                      <div style={styles.playerInfo}>
                        <div style={styles.infoRow}>
                          <span>Статус:</span>
                          <span style={styles.infoValue}>{player.status}</span>
                        </div>
                      </div>
                      
                      {player.trackerLink && (
                        <a 
                          href={player.trackerLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={styles.link}
                        >
                          Открыть профиль
                        </a>
                      )}
                      
                      {isOrganizer && (
                        <button
                          onClick={() => deletePlayer(player.id)}
                          style={styles.deleteButton}
                        >
                          Удалить
                        </button>
                      )}
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
                <div style={styles.formGrid}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Название команды</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Введите название команды"
                      style={styles.input}
                      required
                    />
                  </div>
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Выберите игроков для команды
                    {teamPlayers.length > 0 && ` (${teamPlayers.length} выбрано)`}
                  </label>
                  <select
                    multiple
                    value={teamPlayers.map((p) => p.id)}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
                      setTeamPlayers(selectedPlayers);
                    }}
                    style={{...styles.select, height: '120px'}}
                  >
                    {players.map(player => (
                      <option key={player.id} value={player.id}>
                        {player.nickname} • {player.platform}
                      </option>
                    ))}
                  </select>
                </div>

                {teamPlayers.length > 0 && (
                  <div style={styles.selectedPlayers}>
                    <h4 style={styles.selectedTitle}>Выбранные игроки:</h4>
                    {teamPlayers.map(player => (
                      <div key={player.id} style={styles.selectedPlayer}>
                        <span>{player.nickname}</span>
                        <span>{player.platform}</span>
                      </div>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || teamPlayers.length === 0}
                  style={{
                    ...styles.submitButton,
                    ...((loading || teamPlayers.length === 0) ? styles.submitButtonDisabled : {})
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
                        <span style={styles.teamStats}>{team.players.length} игроков</span>
                      </div>
                      
                      <div style={styles.teamPlayers}>
                        <h4 style={styles.playersTitle}>Состав:</h4>
                        {team.players.map((id: string) => {
                          const player = players.find(p => p.id === id);
                          return player ? (
                            <div key={id} style={styles.teamPlayer}>
                              <span>{player.nickname}</span>
                              <span>{player.platform}</span>
                            </div>
                          ) : null;
                        })}
                      </div>
                      
                      {isOrganizer && (
                        <button
                          onClick={() => deleteTeam(team.id)}
                          style={styles.deleteButton}
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
        </div>
      </main>
    </div>
  );
};

// Modern CSS-in-JS styles
const styles = {
  container: {
    minHeight: '100vh',
    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif"
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
  
  title: {
    color: 'white',
    fontSize: '2.5rem',
    fontWeight: 'bold',
    margin: 0,
    background: 'linear-gradient(45deg, #fff, #e0e7ff)',
    WebkitBackgroundClip: 'text',
    WebkitTextFillColor: 'transparent'
  },
  
  subtitle: {
    color: 'rgba(255, 255, 255, 0.8)',
    margin: 0,
    fontSize: '1.1rem'
  },
  
  organizerSwitch: {
    display: 'flex',
    alignItems: 'center',
    gap: '1rem'
  },
  
  switchLabel: {
    display: 'flex',
    alignItems: 'center',
    gap: '0.5rem',
    cursor: 'pointer',
    color: 'white'
  },
  
  switchInput: {
    display: 'none'
  },
  
  switchSlider: {
    width: '50px',
    height: '24px',
    backgroundColor: '#ccc',
    borderRadius: '24px',
    position: 'relative',
    transition: 'all 0.3s'
  },
  
  switchSliderActive: {
    backgroundColor: '#10b981'
  },
  
  switchText: {
    fontSize: '0.9rem',
    fontWeight: '500'
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
    borderBottom: '3px solid transparent'
  },
  
  navButtonActive: {
    color: 'white',
    borderBottomColor: '#10b981',
    background: 'rgba(255, 255, 255, 0.1)'
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
    fontWeight: '500',
    fontSize: '0.9rem'
  },
  
  input: {
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem',
    transition: 'all 0.3s'
  },
  
  select: {
    padding: '0.75rem 1rem',
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    borderRadius: '8px',
    color: 'white',
    fontSize: '1rem'
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
  
  submitButtonDisabled: {
    opacity: '0.6',
    cursor: 'not-allowed'
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
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
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
  
  playerName: {
    color: 'white',
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: 0
  },
  
  platform: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white',
    padding: '0.25rem 0.5rem',
    borderRadius: '4px',
    fontSize: '0.8rem'
  },
  
  playerInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem'
  },
  
  infoRow: {
    display: 'flex',
    justifyContent: 'space-between',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  
  infoValue: {
    color: 'white',
    fontWeight: '500'
  },
  
  link: {
    display: 'block',
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    textAlign: 'center',
    padding: '0.5rem',
    borderRadius: '6px',
    textDecoration: 'none',
    marginTop: '1rem',
    transition: 'all 0.3s'
  },
  
  deleteButton: {
    width: '100%',
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.75rem',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'all 0.3s'
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
    fontSize: '1.2rem',
    fontWeight: '600',
    margin: 0
  },
  
  teamStats: {
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
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '0.5rem',
    borderRadius: '4px',
    marginBottom: '0.25rem',
    color: 'white',
    fontSize: '0.9rem'
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
  }
} as const;

export default App;