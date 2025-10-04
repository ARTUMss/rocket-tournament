import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

// Firebase Config
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

// Интерфейсы для типов
interface Player {
  id: string;
  nickname: string;
  platform: string;
  trackerLink: string;
  mmr: string;
  rank: string;
  rankImage: string;
  status: string;
  createdAt: Date;
  userEmail: string;
}

interface Team {
  id: string;
  name: string;
  logo: string;
  players: string[];
  captain: string;
  averageMMR: number;
  createdAt: Date;
  createdBy: string;
}

interface Application {
  id: string;
  teamId: string;
  playerId: string;
  playerName: string;
  playerRank: string;
  playerMMR: string;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: Date;
  processedAt?: Date;
}

// Rank images mapping - исправленные ссылки
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
  'Grand Champion III': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s15rank21.png',
  'Supersonic Legend': 'https://trackercdn.com/cdn/tracker.gg/rocket-league/ranks/s4-22.png'
};

const getRankImage = (rank: string): string => {
  return rankImages[rank] || rankImages['Unranked'];
};

// Уникальные коды для организаторов
const ORGANIZER_CODES = [
  'RL2024-ORG-7B9X2K',
  'TOURNEY-MASTER-5F8P',
  'CHAMP-ACCESS-3R6L9Z'
];

interface LoginFormProps {
  userEmail: string;
  setUserEmail: (value: string) => void;
  handleLogin: (email: string) => void;
  error: string;
}

const LoginForm: React.FC<LoginFormProps> = ({ userEmail, setUserEmail, handleLogin, error }) => {
  const emailInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (emailInputRef.current) {
      emailInputRef.current.focus();
    }
  }, []);

  return (
    <div style={styles.loginContainer}>
      <div style={styles.loginForm}>
        <h2 style={styles.loginTitle}>Вход в турнир</h2>
        <p style={styles.loginSubtitle}>
          Введите ваш email для участия или код организатора
        </p>
        
        {error && (
          <div style={styles.errorMessage}>
            <span>⚠️</span>
            <span>{error}</span>
          </div>
        )}
        
        <div style={styles.formGroup}>
          <input
            ref={emailInputRef}
            type="text"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com или код организатора"
            style={{
              ...styles.input,
              ...(error && styles.inputError)
            }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLogin(userEmail);
              }
            }}
          />
          {error && (
            <div style={styles.errorHint}>
              Пример корректного email: example@domain.com
            </div>
          )}
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
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [players, setPlayers] = useState<Player[]>([]);
  const [teams, setTeams] = useState<Team[]>([]);
  const [nickname, setNickname] = useState('');
  const [platform, setPlatform] = useState('steam');
  const [trackerLink, setTrackerLink] = useState('');
  const [status, setStatus] = useState('Ищу команду');
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
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
  const [organizerCode, setOrganizerCode] = useState('');
  const [teamApplications, setTeamApplications] = useState<Application[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [processingApplications, setProcessingApplications] = useState<Set<string>>(new Set());
  
  const rulesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Восстановление состояния аутентификации при загрузке
  useEffect(() => {
    const savedEmail = localStorage.getItem('tournament_user_email');
    const savedOrganizer = localStorage.getItem('tournament_organizer');
    
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsAuthenticated(true);
      
      if (savedOrganizer === 'true') {
        setIsOrganizer(true);
      }
    }
  }, []);

  // Оптимизированные подписки на данные с дебаунсингом
  useEffect(() => {
    if (!isAuthenticated) return;

    let playersUnsubscribe: () => void;
    let teamsUnsubscribe: () => void;
    let applicationsUnsubscribe: () => void;

    const initSubscriptions = () => {
      // Players subscription
      playersUnsubscribe = onSnapshot(collection(db, 'players'), (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date()
        } as Player));
        setPlayers(playersData);
      });

      // Teams subscription
      teamsUnsubscribe = onSnapshot(collection(db, 'teams'), (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          players: doc.data().players || []
        } as Team));
        setTeams(teamsData);
      });

      // Applications subscription
      applicationsUnsubscribe = onSnapshot(collection(db, 'applications'), (snapshot) => {
        const applicationsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          createdAt: doc.data().createdAt?.toDate() || new Date(),
          processedAt: doc.data().processedAt?.toDate()
        } as Application));
        setTeamApplications(applicationsData);
      });
    };

    // Задержка для уменьшения нагрузки
    const timeoutId = setTimeout(initSubscriptions, 100);

    return () => {
      clearTimeout(timeoutId);
      if (playersUnsubscribe) playersUnsubscribe();
      if (teamsUnsubscribe) teamsUnsubscribe();
      if (applicationsUnsubscribe) applicationsUnsubscribe();
    };
  }, [isAuthenticated]);

  // Расчет среднего MMR команды
  const calculateTeamAverageMMR = useCallback((playerIds: string[]): number => {
    if (playerIds.length === 0) return 0;
    
    const teamPlayers = players.filter(player => playerIds.includes(player.id));
    if (teamPlayers.length === 0) return 0;
    
    const totalMMR = teamPlayers.reduce((sum, player) => {
      const mmr = parseInt(player.mmr) || 0;
      return sum + mmr;
    }, 0);
    
    return Math.round(totalMMR / teamPlayers.length);
  }, [players]);

  // Обновление среднего MMR для команд
  useEffect(() => {
    const updatedTeams = teams.map(team => ({
      ...team,
      averageMMR: calculateTeamAverageMMR(team.players)
    }));
    setTeams(updatedTeams);
  }, [players, teams, calculateTeamAverageMMR]);

  // Поиск текущего игрока и команды
  useEffect(() => {
    if (userEmail && players.length > 0) {
      const userPlayer = players.find(p => p.userEmail === userEmail);
      setMyPlayer(userPlayer || null);
      
      if (userPlayer) {
        const userTeam = teams.find(team => team.players.includes(userPlayer.id));
        setMyTeam(userTeam || null);
      } else {
        setMyTeam(null);
      }
    }
  }, [userEmail, players, teams]);

  // Загрузка правил турнира
  const loadTournamentRules = useCallback(async () => {
    try {
      const rulesDoc = await getDoc(doc(db, 'settings', 'tournamentRules'));
      if (rulesDoc.exists()) {
        setTournamentRules(rulesDoc.data().rules);
      }
    } catch (error) {
      console.error('Error loading tournament rules:', error);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      loadTournamentRules();
    }
  }, [isAuthenticated, loadTournamentRules]);

  // Улучшенная валидация email
  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleLogin = (email: string) => {
    // Проверка на код организатора
    if (ORGANIZER_CODES.includes(email)) {
      setIsOrganizer(true);
      localStorage.setItem('tournament_organizer', 'true');
      setUserEmail('organizer@tournament.com');
      setIsAuthenticated(true);
      localStorage.setItem('tournament_user_email', 'organizer@tournament.com');
      setSuccessMessage('Режим организатора активирован!');
      setTimeout(() => setSuccessMessage(''), 3000);
      setError('');
      return;
    }

    // Строгая валидация email
    if (!validateEmail(email)) {
      setError('Пожалуйста, введите корректный email адрес. Пример: example@domain.com');
      return;
    }

    setUserEmail(email);
    setIsAuthenticated(true);
    localStorage.setItem('tournament_user_email', email);
    setError('');
  };

  const handleLogout = () => {
    setUserEmail('');
    setIsAuthenticated(false);
    setIsOrganizer(false);
    setOrganizerCode('');
    setMyTeam(null);
    setMyPlayer(null);
    localStorage.removeItem('tournament_user_email');
    localStorage.removeItem('tournament_organizer');
  };

  const saveTournamentRules = async () => {
    if (!tournamentRules.trim()) {
      setError('Правила не могут быть пустыми');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await setDoc(doc(db, 'settings', 'tournamentRules'), {
        rules: tournamentRules,
        lastUpdated: new Date()
      });
      setEditingRules(false);
      setSuccessMessage('Правила турнира успешно обновлены!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка сохранения правил турнира');
      setTimeout(() => setError(''), 3000);
    }
  };

  const parseTrackerData = async (url: string) => {
    try {
      await new Promise(resolve => setTimeout(resolve, 800));
      
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
      setTimeout(() => setError(''), 3000);
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
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!playerData) {
      setError('Сначала получите данные игрока');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (myPlayer) {
      setError('Вы уже зарегистрированы в турнире!');
      setTimeout(() => setError(''), 3000);
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
        userEmail: userEmail
      });
      
      setNickname('');
      setTrackerLink('');
      setPlayerData(null);
      setSuccessMessage('Вы успешно зарегистрированы в турнире!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка регистрации в турнире');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const deleteMyPlayer = async () => {
    if (!myPlayer) return;

    try {
      const batch = writeBatch(db);

      if (myTeam) {
        const updatedPlayers = myTeam.players.filter(id => id !== myPlayer.id);
        
        if (updatedPlayers.length === 0) {
          batch.delete(doc(db, 'teams', myTeam.id));
        } else {
          const teamUpdate: any = { players: updatedPlayers };
          if (myTeam.captain === myPlayer.id) {
            teamUpdate.captain = updatedPlayers[0];
          }
          batch.update(doc(db, 'teams', myTeam.id), teamUpdate);
        }
      }

      const myApplications = teamApplications.filter(app => app.playerId === myPlayer.id);
      myApplications.forEach(app => {
        batch.delete(doc(db, 'applications', app.id));
      });

      batch.delete(doc(db, 'players', myPlayer.id));
      
      await batch.commit();
      
      setSuccessMessage('Вы вышли из турнира');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка выхода из турнира');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deletePlayer = async (playerId: string) => {
    if (!isOrganizer) {
      setError('Только организаторы могут удалять игроков!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await deleteDoc(doc(db, 'players', playerId));
      setSuccessMessage('Игрок успешно удален!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка удаления игрока');
      setTimeout(() => setError(''), 3000);
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!isOrganizer) {
      setError('Только организаторы могут удалять команды!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      const batch = writeBatch(db);
      
      batch.delete(doc(db, 'teams', teamId));
      
      const teamApplicationsToDelete = teamApplications.filter(app => app.teamId === teamId);
      teamApplicationsToDelete.forEach(app => {
        batch.delete(doc(db, 'applications', app.id));
      });

      await batch.commit();
      setSuccessMessage('Команда успешно удалена!');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка удаления команды');
      setTimeout(() => setError(''), 3000);
    }
  };

  const sendApplication = async (teamId: string) => {
    if (!myPlayer) {
      setError('Сначала зарегистрируйтесь в турнире');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (myTeam) {
      setError('Вы уже состоите в команде!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const existingApplication = teamApplications.find(app => 
      app.teamId === teamId && app.playerId === myPlayer.id && app.status === 'pending'
    );

    if (existingApplication) {
      setError('Вы уже отправили заявку в эту команду');
      setTimeout(() => setError(''), 3000);
      return;
    }

    try {
      await addDoc(collection(db, 'applications'), {
        teamId: teamId,
        playerId: myPlayer.id,
        playerName: myPlayer.nickname,
        playerRank: myPlayer.rank,
        playerMMR: myPlayer.mmr,
        status: 'pending',
        createdAt: new Date()
      });
      
      setSuccessMessage('Заявка отправлена! Ожидайте решения капитана.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка отправки заявки');
      setTimeout(() => setError(''), 3000);
    }
  };

  const processApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (processingApplications.has(applicationId)) return;
    
    setProcessingApplications(prev => new Set(prev).add(applicationId));
    
    try {
      const application = teamApplications.find(app => app.id === applicationId);
      if (!application) return;

      if (status === 'approved') {
        const team = teams.find(t => t.id === application.teamId);
        if (!team) return;

        if (team.players.length >= 3) {
          setError('Команда уже заполнена (максимум 3 игрока)');
          setTimeout(() => setError(''), 3000);
          return;
        }

        const player = players.find(p => p.id === application.playerId);
        if (!player) return;

        const batch = writeBatch(db);

        batch.update(doc(db, 'teams', application.teamId), {
          players: [...team.players, application.playerId]
        });
        
        batch.update(doc(db, 'players', application.playerId), {
          status: 'В команде'
        });

        batch.update(doc(db, 'applications', applicationId), {
          status: status,
          processedAt: new Date()
        });

        await batch.commit();
      } else {
        await updateDoc(doc(db, 'applications', applicationId), {
          status: status,
          processedAt: new Date()
        });
      }

      setSuccessMessage(`Заявка ${status === 'approved' ? 'принята' : 'отклонена'}!`);
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка обработки заявки');
      setTimeout(() => setError(''), 3000);
    } finally {
      setProcessingApplications(prev => {
        const newSet = new Set(prev);
        newSet.delete(applicationId);
        return newSet;
      });
    }
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!myPlayer) {
      setError('Сначала зарегистрируйтесь в турнире');
      setTimeout(() => setError(''), 3000);
      return;
    }

    if (myTeam) {
      setError('Вы уже состоите в команде!');
      setTimeout(() => setError(''), 3000);
      return;
    }

    const userCreatedTeam = teams.find(team => team.createdBy === userEmail);
    if (userCreatedTeam) {
      setError('Вы уже создали команду! Одна команда на пользователя.');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        logo: teamLogo,
        players: [myPlayer.id],
        captain: myPlayer.id,
        averageMMR: parseInt(myPlayer.mmr) || 0,
        createdAt: new Date(),
        createdBy: userEmail
      });
      
      await updateDoc(doc(db, 'players', myPlayer.id), {
        status: 'Капитан'
      });
      
      setTeamName('');
      setTeamLogo('');
      setSuccessMessage('Команда успешно создана! Вы стали капитаном.');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка создания команды');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const leaveTeam = async () => {
    if (!myTeam || !myPlayer) return;

    try {
      const updatedPlayers = myTeam.players.filter(id => id !== myPlayer.id);
      
      if (updatedPlayers.length === 0) {
        await deleteDoc(doc(db, 'teams', myTeam.id));
      } else {
        const teamUpdate: any = { players: updatedPlayers };
        if (myTeam.captain === myPlayer.id) {
          teamUpdate.captain = updatedPlayers[0];
        }
        await updateDoc(doc(db, 'teams', myTeam.id), teamUpdate);
      }

      await updateDoc(doc(db, 'players', myPlayer.id), {
        status: 'Ищу команду'
      });

      setSuccessMessage('Вы вышли из команды');
      setTimeout(() => setSuccessMessage(''), 3000);
    } catch (error) {
      setError('Ошибка выхода из команды');
      setTimeout(() => setError(''), 3000);
    }
  };

  const tabs = [
    { id: 'add-player', label: 'Регистрация' },
    { id: 'players-list', label: 'Список игроков' },
    { id: 'create-team', label: 'Команды' },
    { id: 'bracket', label: 'Турнирная сетка', disabled: true }
  ];

  if (!isAuthenticated) {
    return <LoginForm userEmail={userEmail} setUserEmail={setUserEmail} handleLogin={handleLogin} error={error} />;
  }

  return (
    <div style={styles.container}>
      {/* Rules Modal */}
      {showRules && (
        <div style={styles.modalOverlay} onClick={() => {
          setShowRules(false);
          setEditingRules(false);
        }}>
          <div style={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <div style={styles.modalHeader}>
              <h2 style={styles.modalTitle}>Tournament Rules</h2>
              <button 
                style={styles.closeButton}
                onClick={() => {
                  setShowRules(false);
                  setEditingRules(false);
                }}
              >
                ×
              </button>
            </div>
            
            {isOrganizer && editingRules ? (
              <div>
                <textarea
                  ref={rulesTextareaRef}
                  value={tournamentRules}
                  onChange={(e) => setTournamentRules(e.target.value)}
                  style={styles.rulesTextarea}
                  rows={12}
                  placeholder="Введите правила турнира..."
                />
                <div style={styles.modalActions}>
                  <button 
                    style={styles.saveButton}
                    onClick={saveTournamentRules}
                    disabled={!tournamentRules.trim()}
                  >
                    Сохранить правила
                  </button>
                  <button 
                    style={styles.cancelButton}
                    onClick={() => {
                      setEditingRules(false);
                      loadTournamentRules(); // Восстанавливаем оригинальные правила
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={styles.rulesTextContainer}>
                  <pre style={styles.rulesText}>{tournamentRules}</pre>
                </div>
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
              <span style={styles.userEmail}>
                {isOrganizer ? 'Организатор' : userEmail}
              </span>
              {myTeam && (
                <span style={styles.teamBadge}>{myTeam.name}</span>
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
              {myPlayer ? (
                <div style={styles.myProfileContainer}>
                  <h2 style={styles.tabTitle}>Мой профиль</h2>
                  <div style={styles.profileCard}>
                    <div style={styles.profileHeader}>
                      <h3 style={styles.playerName}>{myPlayer.nickname}</h3>
                      <span style={styles.platform}>{myPlayer.platform}</span>
                    </div>
                    
                    <div style={styles.profileStats}>
                      <div style={styles.stat}>
                        <span style={styles.statLabel}>Ранг:</span>
                        <span style={styles.statValue}>{myPlayer.rank}</span>
                      </div>
                      <div style={styles.stat}>
                        <span style={styles.statLabel}>MMR:</span>
                        <span style={styles.statValue}>{myPlayer.mmr}</span>
                      </div>
                      <div style={styles.stat}>
                        <span style={styles.statLabel}>Статус:</span>
                        <span style={styles.statValue}>{myPlayer.status}</span>
                      </div>
                    </div>

                    {myTeam && (
                      <div style={styles.teamSection}>
                        <h4>Моя команда: {myTeam.name}</h4>
                        <div style={styles.teamMMR}>
                          Средний MMR команды: {myTeam.averageMMR}
                        </div>
                        <button
                          onClick={leaveTeam}
                          style={styles.leaveTeamBtn}
                        >
                          Покинуть команду
                        </button>
                      </div>
                    )}

                    <button
                      onClick={deleteMyPlayer}
                      style={styles.deleteAccountBtn}
                    >
                      Выйти из турнира
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <h2 style={styles.tabTitle}>Регистрация в турнире</h2>
                  <p style={styles.tabSubtitle}>Зарегистрируйте свой аккаунт для участия</p>
                  
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
                                const target = e.target as HTMLImageElement;
                                target.src = getRankImage('Unranked');
                              }}
                            />
                            <div>
                              <div style={styles.rankName}>{playerData.rank}</div>
                              <div style={styles.mmr}>MMR: {playerData.mmr}</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    <button
                      type="submit"
                      disabled={loading || !playerData}
                      style={{
                        ...styles.submitButton,
                        ...((loading || !playerData) && styles.buttonDisabled)
                      }}
                    >
                      {loading ? 'Регистрация...' : 'Зарегистрироваться в турнире'}
                    </button>
                  </form>
                </>
              )}
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
                        <img 
                          src={player.rankImage} 
                          alt={player.rank}
                          style={styles.cardRankImage}
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.src = getRankImage('Unranked');
                          }}
                        />
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
                        <a 
                          href={player.trackerLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          style={styles.profileLink}
                        >
                          Профиль
                        </a>
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

          {/* Teams Tab */}
          {activeTab === 'create-team' && (
            <div>
              <div style={styles.tabHeader}>
                <h2 style={styles.tabTitle}>Команды</h2>
                <span style={styles.counter}>Всего: {teams.length}</span>
              </div>
              
              {myPlayer && !myTeam && !teams.some(team => team.createdBy === userEmail) && (
                <div style={styles.createTeamSection}>
                  <h3>Создать команду</h3>
                  <form onSubmit={createTeam} style={styles.form}>
                    <div style={styles.formGroup}>
                      <input
                        type="text"
                        value={teamName}
                        onChange={(e) => setTeamName(e.target.value)}
                        placeholder="Название команды"
                        style={styles.input}
                        required
                      />
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      style={{
                        ...styles.submitButton,
                        ...(loading && styles.buttonDisabled)
                      }}
                    >
                      Создать команду
                    </button>
                  </form>
                </div>
              )}

              {teams.length === 0 ? (
                <div style={styles.emptyState}>
                  <div style={styles.emptyIcon}>🏆</div>
                  <p style={styles.emptyText}>Пока нет созданных команд</p>
                </div>
              ) : (
                <div style={styles.grid}>
                  {teams.map(team => {
                    const isInTeam = myPlayer && team.players.includes(myPlayer.id);
                    const hasApplied = myPlayer && teamApplications.some(app => 
                      app.teamId === team.id && app.playerId === myPlayer.id && app.status === 'pending'
                    );
                    const isCaptain = myPlayer && team.captain === myPlayer.id;
                    const canApply = myPlayer && !isInTeam && !hasApplied && !myTeam && team.players.length < 3;

                    return (
                      <div key={team.id} style={styles.teamCard}>
                        <div style={styles.teamHeader}>
                          <h3 style={styles.teamName}>{team.name}</h3>
                          <div style={styles.teamInfo}>
                            <span>{team.players.length}/3 игроков</span>
                            <span>Avg MMR: {team.averageMMR}</span>
                          </div>
                        </div>
                        
                        <div style={styles.teamPlayers}>
                          <h4>Состав:</h4>
                          {team.players.map((id: string) => {
                            const player = players.find(p => p.id === id);
                            return player ? (
                              <div key={id} style={styles.teamPlayer}>
                                <span style={styles.teamPlayerName}>
                                  {player.nickname}
                                  {id === team.captain && ' 👑'}
                                </span>
                                <span>{player.rank} ({player.mmr})</span>
                              </div>
                            ) : null;
                          })}
                        </div>
                        
                        <div style={styles.teamActions}>
                          {canApply && (
                            <button
                              onClick={() => sendApplication(team.id)}
                              style={styles.applyBtn}
                            >
                              Вступить в команду
                            </button>
                          )}
                          {hasApplied && (
                            <span style={styles.pendingBadge}>Заявка отправлена</span>
                          )}
                          {isInTeam && (
                            <span style={styles.memberBadge}>Вы в команде</span>
                          )}
                          {isOrganizer && (
                            <button
                              onClick={() => deleteTeam(team.id)}
                              style={styles.deleteBtn}
                            >
                              Удалить
                            </button>
                          )}
                        </div>

                        {isCaptain && (
                          <div style={styles.applicationsSection}>
                            <h5>Заявки:</h5>
                            {teamApplications
                              .filter(app => app.teamId === team.id && app.status === 'pending')
                              .map(application => (
                                <div key={application.id} style={styles.applicationCard}>
                                  <div>
                                    <div style={styles.applicationPlayer}>{application.playerName}</div>
                                    <div style={styles.applicationDetails}>
                                      {application.playerRank} ({application.playerMMR} MMR)
                                    </div>
                                  </div>
                                  <div>
                                    <button
                                      onClick={() => processApplication(application.id, 'approved')}
                                      disabled={processingApplications.has(application.id)}
                                      style={{
                                        ...styles.approveBtn,
                                        ...(processingApplications.has(application.id) && styles.buttonDisabled)
                                      }}
                                    >
                                      {processingApplications.has(application.id) ? '...' : '✓'}
                                    </button>
                                    <button
                                      onClick={() => processApplication(application.id, 'rejected')}
                                      disabled={processingApplications.has(application.id)}
                                      style={{
                                        ...styles.rejectBtn,
                                        ...(processingApplications.has(application.id) && styles.buttonDisabled)
                                      }}
                                    >
                                      {processingApplications.has(application.id) ? '...' : '✕'}
                                    </button>
                                  </div>
                                </div>
                              ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
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
                  Раздел находится в разработке
                </p>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

// Полные стили
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
    marginBottom: '0.5rem',
    fontSize: '2rem'
  },
  
  loginSubtitle: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    marginBottom: '2rem'
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
  
  teamBadge: {
    background: 'rgba(59, 130, 246, 0.2)',
    color: '#3b82f6',
    border: '1px solid rgba(59, 130, 246, 0.3)',
    padding: '0.25rem 0.75rem',
    borderRadius: '12px',
    fontSize: '0.8rem'
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
    fontWeight: '500'
  },
  
  inputError: {
    borderColor: '#ef4444',
    background: 'rgba(239, 68, 68, 0.1)'
  },
  
  errorHint: {
    color: '#fca5a5',
    fontSize: '0.8rem',
    marginTop: '0.25rem'
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
  
  submitButton: {
    padding: '1rem 2rem',
    background: 'linear-gradient(45deg, #10b981, #059669)',
    color: 'white',
    border: 'none',
    borderRadius: '8px',
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
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
    cursor: 'pointer'
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
    padding: '1.5rem'
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
    fontSize: '0.9rem'
  },
  
  deleteBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.75rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem'
  },
  
  teamCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '1.5rem'
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
    marginTop: '1rem',
    color: 'rgba(255, 255, 255, 0.8)'
  },
  
  teamPlayer: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.5rem 0',
    borderBottom: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  teamPlayerName: {
    color: 'white',
    fontWeight: '500'
  },
  
  teamActions: {
    display: 'flex',
    gap: '0.5rem',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: '1rem'
  },
  
  applyBtn: {
    background: 'linear-gradient(45deg, #3b82f6, #1d4ed8)',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  
  pendingBadge: {
    background: 'rgba(245, 158, 11, 0.2)',
    color: '#fcd34d',
    border: '1px solid rgba(245, 158, 11, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  
  memberBadge: {
    background: 'rgba(16, 185, 129, 0.2)',
    color: '#10b981',
    border: '1px solid rgba(16, 185, 129, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    fontSize: '0.8rem'
  },
  
  applicationsSection: {
    marginTop: '1rem',
    paddingTop: '1rem',
    borderTop: '1px solid rgba(255, 255, 255, 0.1)'
  },
  
  applicationCard: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: '0.75rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '6px',
    marginBottom: '0.5rem'
  },
  
  applicationPlayer: {
    color: 'white',
    fontWeight: '500'
  },
  
  applicationDetails: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.8rem'
  },
  
  approveBtn: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '0.5rem',
    width: '32px',
    height: '32px'
  },
  
  rejectBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.5rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '0.5rem',
    width: '32px',
    height: '32px'
  },
  
  createTeamSection: {
    background: 'rgba(255, 255, 255, 0.05)',
    padding: '1.5rem',
    borderRadius: '8px',
    marginBottom: '2rem'
  },
  
  myProfileContainer: {
    textAlign: 'center'
  },
  
  profileCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '12px',
    padding: '2rem',
    maxWidth: '400px',
    margin: '0 auto'
  },
  
  profileHeader: {
    marginBottom: '1.5rem'
  },
  
  profileStats: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.5rem',
    marginBottom: '1.5rem'
  },
  
  teamSection: {
    marginBottom: '1.5rem',
    padding: '1rem',
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px'
  },
  
  teamMMR: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.9rem',
    margin: '0.5rem 0'
  },
  
  leaveTeamBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    marginTop: '0.5rem'
  },
  
  deleteAccountBtn: {
    background: 'rgba(239, 68, 68, 0.3)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.5)',
    padding: '0.75rem 1.5rem',
    borderRadius: '8px',
    cursor: 'pointer',
    width: '100%'
  },
  
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
    opacity: '0.8'
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
  
  rulesTextContainer: {
    maxHeight: '400px',
    overflowY: 'auto',
    padding: '1rem',
    background: 'rgba(0, 0, 0, 0.2)',
    borderRadius: '8px',
    marginBottom: '1rem'
  },
  
  rulesText: {
    color: 'white',
    fontSize: '0.9rem',
    lineHeight: '1.5',
    whiteSpace: 'pre-wrap',
    fontFamily: 'inherit',
    margin: 0
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
    minHeight: '300px',
    marginBottom: '1rem'
  },
  
  modalActions: {
    display: 'flex',
    gap: '1rem',
    justifyContent: 'flex-end'
  },
  
  saveButton: {
    background: '#10b981',
    color: 'white',
    border: 'none',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem'
  },
  
  cancelButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem'
  },
  
  editButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    color: 'white',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    padding: '0.75rem 1.5rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontWeight: '500',
    fontSize: '1rem',
    width: '100%'
  }
} as const;

export default App;