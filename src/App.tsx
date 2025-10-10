import React, { useState, useEffect, useCallback, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc, updateDoc, getDoc, setDoc, writeBatch } from 'firebase/firestore';
import { Editor } from '@tinymce/tinymce-react';

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

interface TournamentMatch {
  id: string;
  round: number;
  matchNumber: number;
  player1?: string;
  player2?: string;
  team1?: string;
  team2?: string;
  winner?: string;
  score?: string;
  completed: boolean;
}

interface OrganizerInfo {
  code: string;
  name: string;
  role: string;
  color: string;
}

// Rank images mapping
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

const getRankImage = (rank: string): string => {
  return rankImages[rank] || rankImages['Unranked'];
};

// Организаторы с дополнительной информацией
const ORGANIZERS: OrganizerInfo[] = [
  { code: 'RL2024-ORG-7B9X2K', name: 'ARTUM', role: 'Кодер', color: '#ef4444' },
  { code: 'TOURNEY-MASTER-5F8P', name: 'Sferov', role: 'Руководитель', color: '#3b82f6' },
  { code: 'CHAMP-ACCESS-3R6L9Z', name: 'twinkey', role: 'Организатор', color: '#10b981' }
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
      <img
        src="https://i.ibb.co/0RJJYkHR/7cf9d1447585294415a64558ca6203333338s-ezgif-com-optimize.gif"
        alt="background animation"
        style={styles.loginBackground}
      />

      <div style={styles.loginForm}>
        <h2 style={styles.loginTitle}>Вход в турнир</h2>
        <p style={styles.loginSubtitle}>Введите ваш email для участия в турнире</p>

        {error && (
          <div style={styles.errorMessage}>
            <span style={styles.errorIcon}>!</span>
            <span>{error}</span>
          </div>
        )}

        <div style={styles.formGroup}>
          <input
            ref={emailInputRef}
            type="text"
            value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)}
            placeholder="your@email.com"
            style={{ ...styles.input, ...(error && styles.inputError) }}
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleLogin(userEmail);
              }
            }}
          />
          {error && <div style={styles.errorHint}>Пример корректного email: example@domain.com</div>}
        </div>

        <div style={styles.buttonContainer}>
          <button
            onClick={() => handleLogin(userEmail)}
            disabled={!userEmail}
            style={{ ...styles.submitButton, ...(!userEmail && styles.buttonDisabled) }}
          >
            Войти в турнир
          </button>
        </div>
      </div>
    </div>
  );
};


// Компонент турнирной сетки
interface BracketProps {
  players: Player[];
  teams: Team[];
  isOrganizer: boolean;
  tournamentMode: '1vs1' | '3vs3';
  onModeChange: (mode: '1vs1' | '3vs3') => void;
}

const TournamentBracket: React.FC<BracketProps> = ({ 
  players, 
  teams, 
  isOrganizer,
  tournamentMode,
  onModeChange 
}) => {
  const [matches, setMatches] = useState<TournamentMatch[]>([]);
  const [draggedPlayer, setDraggedPlayer] = useState<string | null>(null);
  const [draggedTeam, setDraggedTeam] = useState<string | null>(null);

  // Инициализация сетки
  const initializeBracket = useCallback(() => {
    if (tournamentMode === '1vs1') {
      const participantCount = players.length;
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(participantCount)));
      const newMatches: TournamentMatch[] = [];
      
      let matchId = 1;
      for (let i = 0; i < bracketSize / 2; i++) {
        newMatches.push({
          id: `match-${matchId++}`,
          round: 1,
          matchNumber: i + 1,
          completed: false
        });
      }
      
      setMatches(newMatches);
    } else {
      const teamCount = teams.length;
      const bracketSize = Math.pow(2, Math.ceil(Math.log2(teamCount)));
      const newMatches: TournamentMatch[] = [];
      
      let matchId = 1;
      for (let i = 0; i < bracketSize / 2; i++) {
        newMatches.push({
          id: `match-${matchId++}`,
          round: 1,
          matchNumber: i + 1,
          completed: false
        });
      }
      
      setMatches(newMatches);
    }
  }, [players.length, teams.length, tournamentMode]);

  useEffect(() => {
    initializeBracket();
  }, [initializeBracket]);

  // Функции распределения
  const shuffleRandomly = () => {
    if (tournamentMode === '1vs1') {
      const shuffledPlayers = [...players].sort(() => Math.random() - 0.5);
      const newMatches = matches.map((match, index) => ({
        ...match,
        player1: shuffledPlayers[index * 2]?.id,
        player2: shuffledPlayers[index * 2 + 1]?.id
      }));
      setMatches(newMatches);
    } else {
      const shuffledTeams = [...teams].sort(() => Math.random() - 0.5);
      const newMatches = matches.map((match, index) => ({
        ...match,
        team1: shuffledTeams[index * 2]?.id,
        team2: shuffledTeams[index * 2 + 1]?.id
      }));
      setMatches(newMatches);
    }
  };

  const sortByMMR = () => {
    if (tournamentMode === '1vs1') {
      const sortedPlayers = [...players].sort((a, b) => 
        (parseInt(b.mmr) || 0) - (parseInt(a.mmr) || 0)
      );
      const newMatches = matches.map((match, index) => ({
        ...match,
        player1: sortedPlayers[index * 2]?.id,
        player2: sortedPlayers[index * 2 + 1]?.id
      }));
      setMatches(newMatches);
    } else {
      const sortedTeams = [...teams].sort((a, b) => b.averageMMR - a.averageMMR);
      const newMatches = matches.map((match, index) => ({
        ...match,
        team1: sortedTeams[index * 2]?.id,
        team2: sortedTeams[index * 2 + 1]?.id
      }));
      setMatches(newMatches);
    }
  };

  // Drag and Drop функции
  const handleDragStart = (playerId: string, teamId: string | null = null) => {
    if (playerId) setDraggedPlayer(playerId);
    if (teamId) setDraggedTeam(teamId);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (matchId: string, slot: 'player1' | 'player2' | 'team1' | 'team2') => {
    const matchIndex = matches.findIndex(m => m.id === matchId);
    if (matchIndex === -1) return;

    const updatedMatches = [...matches];
    
    if (tournamentMode === '1vs1' && draggedPlayer) {
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        [slot]: draggedPlayer
      };
    } else if (tournamentMode === '3vs3' && draggedTeam) {
      updatedMatches[matchIndex] = {
        ...updatedMatches[matchIndex],
        [slot]: draggedTeam
      };
    }

    setMatches(updatedMatches);
    setDraggedPlayer(null);
    setDraggedTeam(null);
  };

  const getParticipantInfo = (id: string | undefined) => {
    if (!id) return null;
    
    if (tournamentMode === '1vs1') {
      const player = players.find(p => p.id === id);
      return player ? { name: player.nickname, mmr: player.mmr } : null;
    } else {
      const team = teams.find(t => t.id === id);
      return team ? { name: team.name, mmr: team.averageMMR.toString() } : null;
    }
  };

  const renderMatch = (match: TournamentMatch) => {
    const participant1 = getParticipantInfo(
      tournamentMode === '1vs1' ? match.player1 : match.team1
    );
    const participant2 = getParticipantInfo(
      tournamentMode === '1vs1' ? match.player2 : match.team2
    );

    return (
      <div key={match.id} style={styles.matchCard}>
        <div style={styles.matchHeader}>
          <span style={styles.matchTitle}>
            Матч {match.matchNumber} (Раунд {match.round})
          </span>
        </div>
        
        <div style={styles.matchSlots}>
          {/* Слот 1 */}
          <div
            style={styles.matchSlot}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(
              match.id, 
              tournamentMode === '1vs1' ? 'player1' : 'team1'
            )}
          >
            {participant1 ? (
              <div style={styles.participantInfo}>
                <span style={styles.participantName}>{participant1.name}</span>
                <span style={styles.participantMMR}>MMR: {participant1.mmr}</span>
              </div>
            ) : (
              <div style={styles.emptySlot}>
                {isOrganizer ? 'Перетащите сюда' : 'Ожидание игрока'}
              </div>
            )}
          </div>
          
          <div style={styles.vsSeparator}>VS</div>
          
          {/* Слот 2 */}
          <div
            style={styles.matchSlot}
            onDragOver={handleDragOver}
            onDrop={() => handleDrop(
              match.id, 
              tournamentMode === '1vs1' ? 'player2' : 'team2'
            )}
          >
            {participant2 ? (
              <div style={styles.participantInfo}>
                <span style={styles.participantName}>{participant2.name}</span>
                <span style={styles.participantMMR}>MMR: {participant2.mmr}</span>
              </div>
            ) : (
              <div style={styles.emptySlot}>
                {isOrganizer ? 'Перетащите сюда' : 'Ожидание игрока'}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div style={styles.bracketContainer}>
      <div style={styles.bracketHeader}>
        <h2 style={styles.bracketTitle}>Турнирная сетка</h2>
        
        <div style={styles.modeSelector}>
          <button
            onClick={() => onModeChange('1vs1')}
            style={{
              ...styles.modeButton,
              ...(tournamentMode === '1vs1' && styles.modeButtonActive)
            }}
          >
            1vs1
          </button>
          <button
            onClick={() => onModeChange('3vs3')}
            style={{
              ...styles.modeButton,
              ...(tournamentMode === '3vs3' && styles.modeButtonActive)
            }}
          >
            3vs3
          </button>
        </div>

        {isOrganizer && (
          <div style={styles.organizerControls}>
            <button onClick={shuffleRandomly} style={styles.controlButton}>
              Случайное распределение
            </button>
            <button onClick={sortByMMR} style={styles.controlButton}>
              Сортировка по MMR
            </button>
            <button onClick={initializeBracket} style={styles.controlButton}>
              Сбросить сетку
            </button>
          </div>
        )}
      </div>

      {/* Участники для перетаскивания (только для организаторов) */}
      {isOrganizer && (
        <div style={styles.draggableParticipants}>
          <h4 style={styles.draggableTitle}>
            {tournamentMode === '1vs1' ? 'Игроки для распределения' : 'Команды для распределения'}
          </h4>
          <div style={styles.participantsGrid}>
            {(tournamentMode === '1vs1' ? players : teams).map(participant => (
              <div
                key={participant.id}
                draggable
                onDragStart={() => handleDragStart(
                  tournamentMode === '1vs1' ? participant.id : '',
                  tournamentMode === '3vs3' ? participant.id : null
                )}
                style={styles.draggableItem}
              >
                <span style={styles.draggableName}>
                  {'nickname' in participant ? participant.nickname : participant.name}
                </span>
                <span style={styles.draggableMMR}>
                  MMR: {'mmr' in participant ? participant.mmr : participant.averageMMR}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Турнирная сетка */}
      <div style={styles.bracketGrid}>
        {matches.map(renderMatch)}
      </div>

      {matches.length === 0 && (
        <div style={styles.emptyBracket}>
          <div style={styles.emptyBracketText}>
            {tournamentMode === '1vs1' 
              ? 'Недостаточно игроков для создания сетки' 
              : 'Недостаточно команд для создания сетки'}
          </div>
        </div>
      )}
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
  const [currentOrganizer, setCurrentOrganizer] = useState<OrganizerInfo | null>(null);
  const [loading, setLoading] = useState(false);
  const [isDataLoading, setIsDataLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [activeTab, setActiveTab] = useState('add-player');
  const [playerData, setPlayerData] = useState<any>(null);
  const [showRules, setShowRules] = useState(false);
  const [tournamentRules, setTournamentRules] = useState('<p>Правила турнира:</p><ol><li>Состав команды: 3 игрока в команде</li><li>Формат: Двойная элиминация</li><li>Правила матчей: Best of 3 для ранних раундов, Best of 5 для финала</li><li>Выбор сервера: Предпочтительно EU серверы</li><li>Расписание: Матчи должны быть завершены в установленные сроки</li></ol><p>Пожалуйста, обеспечивайте честную игру и хорошее спортивное поведение на протяжении всего турнира.</p>');
  const [editingRules, setEditingRules] = useState(false);
  const [userEmail, setUserEmail] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [teamApplications, setTeamApplications] = useState<Application[]>([]);
  const [myTeam, setMyTeam] = useState<Team | null>(null);
  const [myPlayer, setMyPlayer] = useState<Player | null>(null);
  const [processingApplications, setProcessingApplications] = useState<Set<string>>(new Set());
  const [tournamentMode, setTournamentMode] = useState<'1vs1' | '3vs3'>('1vs1');
  
  const rulesTextareaRef = useRef<HTMLTextAreaElement>(null);

  // Auto-dismiss messages
  useEffect(() => {
    if (error) {
      const timer = setTimeout(() => setError(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [error]);

  useEffect(() => {
    if (successMessage) {
      const timer = setTimeout(() => setSuccessMessage(''), 5000);
      return () => clearTimeout(timer);
    }
  }, [successMessage]);

  // Восстановление состояния аутентификации при загрузке
  useEffect(() => {
    const savedEmail = localStorage.getItem('tournament_user_email');
    const savedOrganizer = localStorage.getItem('tournament_organizer');
    const savedOrganizerInfo = localStorage.getItem('tournament_organizer_info');
    
    if (savedEmail) {
      setUserEmail(savedEmail);
      setIsAuthenticated(true);
      
      if (savedOrganizer === 'true' && savedOrganizerInfo) {
        setIsOrganizer(true);
        setCurrentOrganizer(JSON.parse(savedOrganizerInfo));
      }
    }
  }, []);

  // Оптимизированные подписки на данные с дебаунсингом и loading
  useEffect(() => {
    if (!isAuthenticated) return;

    setIsDataLoading(true);
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

      setIsDataLoading(false);
    };

    // Debounce init
    const timeoutId = setTimeout(initSubscriptions, 300);

    return () => {
      clearTimeout(timeoutId);
      if (playersUnsubscribe) playersUnsubscribe();
      if (teamsUnsubscribe) teamsUnsubscribe();
      if (applicationsUnsubscribe) applicationsUnsubscribe();
      setIsDataLoading(false);
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
    const organizerInfo = ORGANIZERS.find(org => org.code === email);
    if (organizerInfo) {
      setIsOrganizer(true);
      setCurrentOrganizer(organizerInfo);
      localStorage.setItem('tournament_organizer', 'true');
      localStorage.setItem('tournament_organizer_info', JSON.stringify(organizerInfo));
      setUserEmail(`${organizerInfo.name}@tournament.com`);
      setIsAuthenticated(true);
      localStorage.setItem('tournament_user_email', `${organizerInfo.name}@tournament.com`);
      setSuccessMessage(`Режим организатора активирован! (${organizerInfo.name} - ${organizerInfo.role})`);
      setError('');
      return;
    }

    // Для обычных пользователей - валидация и вход
    if (!validateEmail(email)) {
      setError('Некорректный email. Пример: example@domain.com');
      return;
    }

    setIsAuthenticated(true);
    localStorage.setItem('tournament_user_email', email);
    setUserEmail(email);
    setSuccessMessage('Вход выполнен успешно!');
    setError('');
  };

  const handleLogout = () => {
    setUserEmail('');
    setIsAuthenticated(false);
    setIsOrganizer(false);
    setCurrentOrganizer(null);
    setMyTeam(null);
    setMyPlayer(null);
    localStorage.removeItem('tournament_user_email');
    localStorage.removeItem('tournament_organizer');
    localStorage.removeItem('tournament_organizer_info');
  };

  const saveTournamentRules = async () => {
    if (!tournamentRules.trim()) {
      setError('Правила не могут быть пустыми');
      return;
    }

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

    if (myPlayer) {
      setError('Вы уже зарегистрированы в турнире!');
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
    } catch (error) {
      setError('Ошибка регистрации в турнире');
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
    } catch (error) {
      setError('Ошибка выхода из турнира');
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
      const batch = writeBatch(db);
      
      batch.delete(doc(db, 'teams', teamId));
      
      const teamApplicationsToDelete = teamApplications.filter(app => app.teamId === teamId);
      teamApplicationsToDelete.forEach(app => {
        batch.delete(doc(db, 'applications', app.id));
      });

      await batch.commit();
      setSuccessMessage('Команда успешно удалена!');
    } catch (error) {
      setError('Ошибка удаления команды');
    }
  };

  const sendApplication = async (teamId: string) => {
    if (!myPlayer) {
      setError('Сначала зарегистрируйтесь в турнире');
      return;
    }

    if (myTeam) {
      setError('Вы уже состоите в команде!');
      return;
    }

    const existingApplication = teamApplications.find(app => 
      app.teamId === teamId && app.playerId === myPlayer.id && app.status === 'pending'
    );

    if (existingApplication) {
      setError('Вы уже отправили заявку в эту команду');
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
    } catch (error) {
      setError('Ошибка отправки заявки');
    }
  };

  const processApplication = async (applicationId: string, status: 'approved' | 'rejected') => {
    if (processingApplications.has(applicationId)) return;
    
    setProcessingApplications(prev => new Set([...prev, applicationId]));
    
    try {
      const application = teamApplications.find(app => app.id === applicationId);
      if (!application) return;

      if (status === 'approved') {
        const team = teams.find(t => t.id === application.teamId);
        if (!team) return;

        if (team.players.length >= 3) {
          setError('Команда уже заполнена (максимум 3 игрока)');
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
    } catch (error) {
      setError('Ошибка обработки заявки');
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
      return;
    }

    if (myTeam) {
      setError('Вы уже состоите в команде!');
      return;
    }

    const userCreatedTeam = teams.find(team => team.createdBy === userEmail);
    if (userCreatedTeam) {
      setError('Вы уже создали команду! Одна команда на пользователя.');
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
    } catch (error) {
      setError('Ошибка создания команды');
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
    } catch (error) {
      setError('Ошибка выхода из команды');
    }
  };

  const tabs = [
    { id: 'add-player', label: 'Регистрация' },
    { id: 'players-list', label: 'Список игроков' },
    { id: 'create-team', label: 'Команды' },
    { id: 'bracket', label: 'Турнирная сетка' }
  ];

  if (!isAuthenticated) {
    return <LoginForm userEmail={userEmail} setUserEmail={setUserEmail} handleLogin={handleLogin} error={error} />;
  }

  if (isDataLoading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.loadingSpinner}>Загрузка данных...</div>
      </div>
    );
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
              <h2 style={styles.modalTitle}>Правила турнира</h2>
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
                <Editor
                  apiKey="oloehvuqanz1w730d8n49ffecahkqxiz5w3g9tpo2l43qynn" 
                  value={tournamentRules}
                  onEditorChange={(newValue) => setTournamentRules(newValue)}
                  init={{
                    height: 400,
                    menubar: 'file edit insert view format table tools',
                    plugins: [
                      'advlist autolink lists link image charmap print preview anchor',
                      'searchreplace visualblocks code fullscreen',
                      'insertdatetime media table paste code help wordcount',
                      'textcolor colorpicker textpattern'
                    ],
                    toolbar: 'undo redo | formatselect | ' +
                      'bold italic underline strikethrough | forecolor backcolor | ' +
                      'alignleft aligncenter alignright alignjustify | ' +
                      'bullist numlist outdent indent | ' +
                      'removeformat | neon | help',
                    content_style: 'body { font-family:Helvetica,Arial,sans-serif; font-size:14px } ' +
                      '.neon { ' +
                      'text-shadow: 0 0 5px #fff, 0 0 10px #fff, 0 0 15px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00, 0 0 50px #00ff00, 0 0 75px #00ff00; ' +
                      'color: #fff; ' +
                      '}',
                    formats: {
                      neon: { inline: 'span', styles: { 
                        textShadow: '0 0 5px #fff, 0 0 10px #fff, 0 0 15px #00ff00, 0 0 20px #00ff00, 0 0 30px #00ff00, 0 0 40px #00ff00, 0 0 50px #00ff00, 0 0 75px #00ff00', 
                        color: '#fff' 
                      } }
                    },
                    setup: (editor) => {
                      editor.ui.registry.addButton('neon', {
                        text: 'Неон',
                        onAction: () => {
                          editor.execCommand('mceToggleFormat', false, 'neon');
                        },
                        icon: 'lightbulb'
                      });
                    }
                  }}
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
                      loadTournamentRules();
                    }}
                  >
                    Отмена
                  </button>
                </div>
              </div>
            ) : (
              <div>
                <div style={styles.rulesTextContainer}>
                  <div 
                    style={styles.rulesText} 
                    dangerouslySetInnerHTML={{ __html: tournamentRules }}
                  />
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
              {isOrganizer ? `Панель управления турниром - ${currentOrganizer?.role}` : 'Панель участника турнира'}
            </p>
          </div>
          
          <div style={styles.headerRight}>
            <button 
              style={styles.rulesButton}
              onClick={() => setShowRules(true)}
            >
              Правила турнира
            </button>
            
            <div style={styles.userInfo}>
              <span style={{
                ...styles.userEmail,
                ...(currentOrganizer && { color: currentOrganizer.color })
              }}>
                {isOrganizer ? `${currentOrganizer?.name} (${currentOrganizer?.role})` : userEmail}
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

      {/* Navigation - ВСЕГДА ВИДИМА ПРИ АУТЕНТИФИКАЦИИ */}
      {isAuthenticated && (
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
      )}

      {/* Main Content */}
      <main style={styles.main}>
        {/* Messages */}
        {error && (
          <div style={styles.errorMessage}>
            <span style={styles.errorIcon}>!</span>
            <span>{error}</span>
          </div>
        )}

        {successMessage && (
          <div style={styles.successMessage}>
            <span style={styles.successIcon}>✓</span>
            <span>{successMessage}</span>
          </div>
        )}

        {/* Tab Content */}
        <div style={styles.tabContent}>
          {loading && <div style={styles.loadingSpinner}>Загрузка...</div>}
          
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
                                (e.target as HTMLImageElement).src = getRankImage('Unranked');
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
                            (e.target as HTMLImageElement).src = getRankImage('Unranked');
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
                                  {id === team.captain && ' (К)'}
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
                                      {processingApplications.has(application.id) ? '...' : 'Принять'}
                                    </button>
                                    <button
                                      onClick={() => processApplication(application.id, 'rejected')}
                                      disabled={processingApplications.has(application.id)}
                                      style={{
                                        ...styles.rejectBtn,
                                        ...(processingApplications.has(application.id) && styles.buttonDisabled)
                                      }}
                                    >
                                      {processingApplications.has(application.id) ? '...' : 'Отклонить'}
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
            <TournamentBracket
              players={players}
              teams={teams}
              isOrganizer={isOrganizer}
              tournamentMode={tournamentMode}
              onModeChange={setTournamentMode}
            />
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
  loginBackground: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    objectFit: 'cover',
    zIndex: 0,
    opacity: 0.5,
    filter: 'blur(2px)',
    transform: 'scale(1.05)',
  },

  loginContainer: {
    minHeight: '100vh',
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    background: '#000000', // Total black как в Grok
    position: 'relative',
    overflow: 'hidden'
  },
  
  loginForm: {
    background: 'rgba(255, 255, 255, 0.1)',
    backdropFilter: 'blur(10px)',
    padding: '3rem',
    borderRadius: '12px',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    width: '100%',
    maxWidth: '400px',
    zIndex: 2
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
  
  buttonContainer: {
    display: 'flex',
    justifyContent: 'center',
    marginTop: '1.5rem'
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
    fontWeight: '500'
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
    transition: 'border-bottom 0.3s ease',
    borderBottom: '3px solid transparent'
  },
  
  navButtonActive: {
    color: 'white',
    borderBottomColor: '#10b981'
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
  
  errorIcon: {
    background: '#ef4444',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
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
  
  successIcon: {
    background: '#10b981',
    color: 'white',
    borderRadius: '50%',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '12px',
    fontWeight: 'bold'
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
    background: '#ffffff', // Белый фон как в SuperGrok
    color: '#000000', // Черный текст
    border: 'none',
    borderRadius: '20px', // Более скругленный как в SuperGrok
    fontSize: '1.1rem',
    fontWeight: '600',
    cursor: 'pointer',
    marginTop: '1rem',
    transition: 'opacity 0.3s',
    boxShadow: '0 0 10px rgba(255, 255, 255, 0.5)' // Легкое свечение
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
    transition: 'background 0.3s'
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
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '0.5rem',
    fontSize: '0.8rem'
  },
  
  rejectBtn: {
    background: 'rgba(239, 68, 68, 0.2)',
    color: '#fca5a5',
    border: '1px solid rgba(239, 68, 68, 0.3)',
    padding: '0.5rem 1rem',
    borderRadius: '4px',
    cursor: 'pointer',
    marginLeft: '0.5rem',
    fontSize: '0.8rem'
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
  
  // Tournament Bracket Styles
  bracketContainer: {
    width: '100%'
  },
  
  bracketHeader: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '2rem',
    flexWrap: 'wrap',
    gap: '1rem'
  },
  
  bracketTitle: {
    color: 'white',
    fontSize: '2rem',
    fontWeight: 'bold',
    margin: 0
  },
  
  modeSelector: {
    display: 'flex',
    gap: '0.5rem',
    background: 'rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    padding: '0.25rem'
  },
  
  modeButton: {
    background: 'none',
    border: 'none',
    color: 'rgba(255, 255, 255, 0.7)',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  
  modeButtonActive: {
    background: 'rgba(255, 255, 255, 0.2)',
    color: 'white'
  },
  
  organizerControls: {
    display: 'flex',
    gap: '0.5rem',
    flexWrap: 'wrap'
  },
  
  controlButton: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.3)',
    color: 'white',
    padding: '0.5rem 1rem',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '0.8rem'
  },
  
  draggableParticipants: {
    background: 'rgba(255, 255, 255, 0.05)',
    borderRadius: '8px',
    padding: '1rem',
    marginBottom: '2rem'
  },
  
  draggableTitle: {
    color: 'white',
    fontSize: '1rem',
    marginBottom: '1rem'
  },
  
  participantsGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
    gap: '0.5rem'
  },
  
  draggableItem: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '6px',
    padding: '0.75rem',
    cursor: 'grab',
    display: 'flex',
    flexDirection: 'column',
    gap: '0.25rem'
  },
  
  draggableName: {
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  
  draggableMMR: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.8rem'
  },
  
  bracketGrid: {
    display: 'grid',
    gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
    gap: '1rem'
  },
  
  matchCard: {
    background: 'rgba(255, 255, 255, 0.1)',
    border: '1px solid rgba(255, 255, 255, 0.2)',
    borderRadius: '8px',
    padding: '1rem'
  },
  
  matchHeader: {
    marginBottom: '1rem',
    textAlign: 'center'
  },
  
  matchTitle: {
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500'
  },
  
  matchSlots: {
    display: 'flex',
    flexDirection: 'column',
    gap: '0.75rem'
  },
  
  matchSlot: {
    background: 'rgba(255, 255, 255, 0.05)',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '6px',
    padding: '0.75rem',
    minHeight: '60px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center'
  },
  
  emptySlot: {
    color: 'rgba(255, 255, 255, 0.5)',
    fontSize: '0.8rem',
    textAlign: 'center'
  },
  
  vsSeparator: {
    color: 'rgba(255, 255, 255, 0.7)',
    textAlign: 'center',
    fontSize: '0.9rem',
    fontWeight: 'bold'
  },
  
  participantInfo: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '0.25rem',
    width: '100%'
  },
  
  participantName: {
    color: 'white',
    fontSize: '0.9rem',
    fontWeight: '500',
    textAlign: 'center'
  },
  
  participantMMR: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: '0.8rem',
    textAlign: 'center'
  },
  
  emptyBracket: {
    textAlign: 'center',
    padding: '4rem 2rem',
    color: 'rgba(255, 255, 255, 0.7)'
  },
  
  emptyBracketText: {
    fontSize: '1.2rem',
    margin: 0
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
  },

  // New loading styles
  loadingContainer: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center',
    height: '100vh',
    color: 'white'
  },

  loadingSpinner: {
    color: 'white',
    fontSize: '1.5rem'
  },

  // Particles styles
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    width: '100%',
    height: '100%',
    zIndex: 1, // Под формой логина
    pointerEvents: 'none', // Не мешает взаимодействию
    overflow: 'hidden'
  },
  particle: {
    position: 'absolute',
    background: 'rgba(255, 255, 255, 0.95)', // Чуть ярче для заметности
    borderRadius: '50%',
    animation: 'float 120s infinite linear', // Базовая длительность 120 секунд, линейное движение
    boxShadow: '0 0 4px 0.5px rgba(255, 255, 255, 0.2)', // Ещё более мягкое свечение
  }
} as const;

// Keyframes для анимации (добавляем глобально, но в React это можно вставить в <style> или использовать styled-components, здесь - в объекте стилей)
const globalStyles = document.createElement('style');
globalStyles.innerHTML = `
  @keyframes float {
    0% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
    25% {
      transform: translateY(-15px) scale(1.01); // Минимальный подъем
      opacity: 0.4;
    }
    50% {
      transform: translateY(-25px) scale(1.02); // Максимум -25px
      opacity: 0.3;
    }
    75% {
      transform: translateY(-15px) scale(1.01);
      opacity: 0.4;
    }
    100% {
      transform: translateY(0) scale(1);
      opacity: 0.6;
    }
  }
`;
document.head.appendChild(globalStyles);

export default App;