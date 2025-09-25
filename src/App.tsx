import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';

// Интерфейс для данных Tracker API
interface TrackerSegment {
  attributes: {
    playlistId: number;
  };
  stats: {
    rating: {
      value: number;
    };
    tier: {
      metadata: {
        name: string;
      };
    };
  };
}

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
  const [activeTab, setActiveTab] = useState('add-player');
  const [successMessage, setSuccessMessage] = useState('');

  useEffect(() => {
    const unsubscribePlayers = onSnapshot(
      collection(db, 'players'), 
      (snapshot) => {
        const playersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setPlayers(playersData);
      },
      (error) => {
        console.error('Error fetching players:', error);
        setError('Ошибка загрузки игроков');
      }
    );

    const unsubscribeTeams = onSnapshot(
      collection(db, 'teams'), 
      (snapshot) => {
        const teamsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setTeams(teamsData);
      },
      (error) => {
        console.error('Error fetching teams:', error);
        setError('Ошибка загрузки команд');
      }
    );

    return () => {
      unsubscribePlayers();
      unsubscribeTeams();
    };
  }, []);

  const fetchRank = async (nickname: string, platform: string) => {
    let currentRank = 'Не определен';
    let mmr = 0;

    try {
      const response = await axios.get(
        `https://api.tracker.gg/api/v2/rocket-league/standard/profile/${platform}/${encodeURIComponent(nickname)}`, 
        {
          headers: { 
            'TRN-Api-Key': '9d369df8-7267-493f-af55-df8c230ddc27',
            'Accept': 'application/json'
          },
          timeout: 10000
        }
      );
      
      const segment = response.data.data.segments.find((seg: TrackerSegment) => seg.attributes.playlistId === 13);
      mmr = segment?.stats.rating.value || 0;
      currentRank = segment?.stats.tier.metadata.name || 'Не определен';
    } catch (error: any) {
      console.error('Error fetching rank:', error);
      if (error.response?.status === 404) {
        throw new Error('Профиль не найден. Проверьте никнейм и платформу.');
      } else {
        throw new Error('Ошибка получения данных от tracker.gg');
      }
    }

    return { mmr, currentRank };
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMessage('');

    try {
      const { mmr, currentRank } = await fetchRank(nickname, platform);
      
      await addDoc(collection(db, 'players'), {
        nickname: nickname.trim(),
        platform: platform,
        trackerLink: trackerLink.trim(),
        currentRank: currentRank,
        mmr: mmr,
        status: status,
        createdAt: new Date()
      });
      
      setNickname('');
      setPlatform('steam');
      setTrackerLink('');
      setStatus('Ищу команду');
      setSuccessMessage('Игрок успешно добавлен!');
    } catch (error: any) {
      setError(error.message);
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

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        setTeamLogo(event.target?.result as string);
      };
      reader.readAsDataURL(file);
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
      const mmrs = teamPlayers.map((p) => p.mmr || 0);
      const averageMMR = mmrs.length ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : 0;
      
      await addDoc(collection(db, 'teams'), {
        name: teamName.trim(),
        logo: teamLogo,
        players: playerIds,
        averageMMR,
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

  const getRankColor = (rank: string) => {
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('grand champion')) return 'bg-gradient-to-r from-red-500 to-pink-600';
    if (rankLower.includes('champion')) return 'bg-gradient-to-r from-purple-500 to-purple-600';
    if (rankLower.includes('diamond')) return 'bg-gradient-to-r from-blue-500 to-cyan-500';
    if (rankLower.includes('platinum')) return 'bg-gradient-to-r from-green-500 to-teal-500';
    if (rankLower.includes('gold')) return 'bg-gradient-to-r from-yellow-500 to-orange-500';
    if (rankLower.includes('silver')) return 'bg-gradient-to-r from-gray-400 to-gray-500';
    if (rankLower.includes('bronze')) return 'bg-gradient-to-r from-orange-800 to-orange-900';
    return 'bg-gradient-to-r from-gray-600 to-gray-700';
  };

  const getRankBorderColor = (rank: string) => {
    const rankLower = rank.toLowerCase();
    if (rankLower.includes('grand champion')) return 'border-red-400';
    if (rankLower.includes('champion')) return 'border-purple-400';
    if (rankLower.includes('diamond')) return 'border-blue-400';
    if (rankLower.includes('platinum')) return 'border-green-400';
    if (rankLower.includes('gold')) return 'border-yellow-400';
    if (rankLower.includes('silver')) return 'border-gray-400';
    if (rankLower.includes('bronze')) return 'border-orange-400';
    return 'border-gray-400';
  };

  const tabs = [
    { id: 'add-player', label: 'Добавление аккаунта' },
    { id: 'players-list', label: 'Список игроков' },
    { id: 'create-team', label: 'Создание команды' },
    { id: 'teams-list', label: 'Список команд' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-purple-400 bg-clip-text text-transparent">
                Rocket League Tournament
              </h1>
              <p className="text-slate-300 mt-1">Панель управления турниром</p>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3 bg-slate-700/50 rounded-lg px-4 py-2">
                <span className="text-slate-300 text-sm">Режим:</span>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isOrganizer}
                    onChange={(e) => setIsOrganizer(e.target.checked)}
                    className="sr-only"
                  />
                  <div className={`w-11 h-6 rounded-full transition-colors duration-200 ${
                    isOrganizer ? 'bg-green-500' : 'bg-slate-600'
                  }`}></div>
                  <div className={`absolute left-1 top-1 bg-white w-4 h-4 rounded-full transition-transform duration-200 ${
                    isOrganizer ? 'transform translate-x-5' : ''
                  }`}></div>
                </label>
                <span className="text-slate-300 text-sm font-medium">
                  {isOrganizer ? 'Организатор' : 'Игрок'}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="bg-slate-800/30 border-b border-slate-700/30">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex space-x-1">
            {tabs.map(tab => (
              <button
                key={tab.id}
                onClick={() => {
                  setActiveTab(tab.id);
                  setError('');
                  setSuccessMessage('');
                }}
                className={`px-6 py-4 font-medium text-sm transition-all duration-200 border-b-2 ${
                  activeTab === tab.id 
                    ? 'text-blue-400 border-blue-400 bg-blue-400/10' 
                    : 'text-slate-400 border-transparent hover:text-slate-300 hover:border-slate-400'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Messages */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-red-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
              </svg>
              <span>{error}</span>
            </div>
          </div>
        )}

        {successMessage && (
          <div className="mb-6 p-4 bg-green-500/10 border border-green-500/20 rounded-lg">
            <div className="flex items-center space-x-2 text-green-400">
              <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
              </svg>
              <span>{successMessage}</span>
            </div>
          </div>
        )}

        {/* Tab Content */}
        <div className="bg-slate-800/20 backdrop-blur-sm rounded-xl border border-slate-700/50 p-8">
          
          {/* Добавление аккаунта */}
          {activeTab === 'add-player' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Добавление аккаунта</h2>
                <p className="text-slate-400">Зарегистрируйте свой аккаунт для участия в турнире</p>
              </div>

              <form onSubmit={addPlayer} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-3">Никнейм</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Введите ваш никнейм"
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-3">Платформа</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors duration-200"
                    >
                      <option value="steam">Steam</option>
                      <option value="epic">Epic Games</option>
                      <option value="psn">PlayStation</option>
                      <option value="xbl">Xbox</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-3">
                    Ссылка на tracker.gg
                  </label>
                  <input
                    type="url"
                    value={trackerLink}
                    onChange={(e) => setTrackerLink(e.target.value)}
                    placeholder="https://rocketleague.tracker.network/..."
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  />
                </div>

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-3">Статус в команде</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-blue-500 transition-colors duration-200"
                  >
                    <option value="Ищу команду">Ищу команду</option>
                    <option value="Капитан">Капитан (ищу команду)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Добавление...
                    </span>
                  ) : (
                    'Добавить аккаунт'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Список игроков */}
          {activeTab === 'players-list' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Список игроков</h2>
                  <p className="text-slate-400">Всего зарегистрировано: {players.length} игроков</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-4 py-2">
                  <span className="text-slate-300 text-sm">Обновляется автоматически</span>
                </div>
              </div>
              
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-lg mb-2">Пока нет зарегистрированных игроков</div>
                  <div className="text-slate-500 text-sm">Будьте первым, кто добавит свой аккаунт!</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {players.map(player => (
                    <div
                      key={player.id}
                      className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 group"
                    >
                      <div className="flex items-start justify-between mb-4">
                        <div>
                          <h3 className="text-lg font-semibold text-white group-hover:text-blue-300 transition-colors">
                            {player.nickname}
                          </h3>
                          <span className="text-xs bg-slate-600/50 text-slate-300 px-2 py-1 rounded">
                            {player.platform}
                          </span>
                        </div>
                        <div className={`px-3 py-1 rounded-full text-xs font-semibold ${getRankColor(player.currentRank)} text-white`}>
                          {player.currentRank}
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">MMR:</span>
                          <span className="text-white font-semibold">{player.mmr}</span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400 text-sm">Статус:</span>
                          <span className="text-white font-medium text-sm">{player.status}</span>
                        </div>
                      </div>
                      
                      <div className="flex space-x-2 mt-4">
                        {player.trackerLink && (
                          <a 
                            href={player.trackerLink} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="flex-1 bg-slate-600/50 hover:bg-slate-600 text-slate-300 text-center py-2 rounded-lg transition-colors text-sm"
                          >
                            Профиль
                          </a>
                        )}
                        {isOrganizer && (
                          <button
                            onClick={() => deletePlayer(player.id)}
                            className="flex-1 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50 py-2 rounded-lg transition-colors text-sm"
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

          {/* Создание команды */}
          {activeTab === 'create-team' && (
            <div className="max-w-2xl mx-auto">
              <div className="text-center mb-8">
                <h2 className="text-2xl font-bold text-white mb-2">Создание команды</h2>
                <p className="text-slate-400">Соберите команду для участия в турнире</p>
              </div>

              <form onSubmit={createTeam} className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-3">Название команды</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Введите название команды"
                      className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white placeholder-slate-400 focus:outline-none focus:border-green-500 transition-colors duration-200"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-slate-300 text-sm font-medium mb-3">Логотип команды</label>
                    <div className="relative">
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoUpload}
                        className="hidden"
                        id="logo-upload"
                      />
                      <label
                        htmlFor="logo-upload"
                        className="block w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-slate-300 text-center cursor-pointer hover:border-green-500 transition-colors duration-200"
                      >
                        {teamLogo ? 'Логотип загружен' : 'Выберите файл'}
                      </label>
                    </div>
                  </div>
                </div>

                {teamLogo && (
                  <div className="flex justify-center">
                    <img src={teamLogo} alt="Team Logo" className="w-24 h-24 object-cover rounded-lg border-2 border-green-500/50" />
                  </div>
                )}

                <div>
                  <label className="block text-slate-300 text-sm font-medium mb-3">
                    Выберите игроков для команды
                    {teamPlayers.length > 0 && <span className="text-green-400 ml-2">({teamPlayers.length} выбрано)</span>}
                  </label>
                  <select
                    multiple
                    value={teamPlayers.map((p) => p.id)}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
                      setTeamPlayers(selectedPlayers);
                    }}
                    className="w-full bg-slate-700/50 border border-slate-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-green-500 transition-colors duration-200 h-32"
                  >
                    {players.map(player => (
                      <option key={player.id} value={player.id} className="py-2">
                        {player.nickname} • {player.currentRank} • {player.mmr} MMR
                      </option>
                    ))}
                  </select>
                </div>

                {teamPlayers.length > 0 && (
                  <div className="bg-slate-700/30 rounded-lg p-4">
                    <h4 className="text-white font-medium mb-3">Выбранные игроки:</h4>
                    <div className="space-y-2">
                      {teamPlayers.map(player => (
                        <div key={player.id} className="flex items-center justify-between bg-slate-600/20 rounded-lg px-3 py-2">
                          <span className="text-white text-sm">{player.nickname}</span>
                          <span className={`px-2 py-1 rounded text-xs font-semibold ${getRankColor(player.currentRank)} text-white`}>
                            {player.currentRank} ({player.mmr} MMR)
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || teamPlayers.length === 0}
                  className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white font-semibold py-4 px-6 rounded-lg transition-all duration-200 transform hover:scale-[1.02] disabled:opacity-50 disabled:hover:scale-100"
                >
                  {loading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Создание...
                    </span>
                  ) : (
                    'Создать команду'
                  )}
                </button>
              </form>
            </div>
          )}

          {/* Список команд */}
          {activeTab === 'teams-list' && (
            <div>
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-2">Список команд</h2>
                  <p className="text-slate-400">Всего создано: {teams.length} команд</p>
                </div>
                <div className="bg-slate-700/50 rounded-lg px-4 py-2">
                  <span className="text-slate-300 text-sm">Обновляется автоматически</span>
                </div>
              </div>
              
              {teams.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-slate-400 text-lg mb-2">Пока нет созданных команд</div>
                  <div className="text-slate-500 text-sm">Создайте первую команду для участия в турнире!</div>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="bg-slate-700/30 rounded-xl p-5 border border-slate-600/50 hover:border-slate-500/50 transition-all duration-200 group"
                    >
                      <div className="flex items-center space-x-4 mb-4">
                        {team.logo ? (
                          <img src={team.logo} alt="Team Logo" className="w-16 h-16 object-cover rounded-lg border-2 border-green-500/50" />
                        ) : (
                          <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-cyan-600 rounded-lg flex items-center justify-center text-white font-bold text-xl">
                            T
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <h3 className="text-lg font-semibold text-white group-hover:text-green-300 transition-colors truncate">
                            {team.name}
                          </h3>
                          <div className="flex items-center space-x-3 mt-1">
                            <span className="text-cyan-400 font-semibold">{team.averageMMR} MMR</span>
                            <span className="text-slate-400">•</span>
                            <span className="text-slate-300 text-sm">{team.players.length} игроков</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-3">
                        <h4 className="text-slate-300 font-medium text-sm">Состав команды:</h4>
                        <div className="space-y-2">
                          {team.players.map((id: string) => {
                            const player = players.find(p => p.id === id);
                            return player ? (
                              <div key={id} className="flex items-center justify-between bg-slate-600/20 rounded-lg px-3 py-2">
                                <span className="text-white text-sm truncate">{player.nickname}</span>
                                <span className={`px-2 py-1 rounded text-xs font-semibold ${getRankColor(player.currentRank)} text-white`}>
                                  {player.currentRank}
                                </span>
                              </div>
                            ) : null;
                          })}
                        </div>
                      </div>
                      
                      {isOrganizer && (
                        <button
                          onClick={() => deleteTeam(team.id)}
                          className="w-full mt-4 bg-red-600/20 hover:bg-red-600/30 text-red-400 border border-red-500/30 hover:border-red-500/50 py-2 rounded-lg transition-colors text-sm"
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
      </div>
    </div>
  );
};

export default App;