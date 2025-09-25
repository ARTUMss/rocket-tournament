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

  const fetchRank = async (nickname: string, platform: string, url?: string) => {
    let currentRank = 'N/A';
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
      currentRank = segment?.stats.tier.metadata.name || 'N/A';
    } catch (error: any) {
      console.error('Error fetching rank:', error);
      if (error.response?.status === 404) {
        setError('Профиль не найден. Проверьте никнейм и платформу.');
      } else {
        setError('Ошибка получения данных. Попробуйте позже.');
      }
    }

    return { mmr, currentRank };
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { mmr, currentRank } = await fetchRank(nickname, platform, trackerLink);
      
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
    } catch (error) {
      console.error('Error adding player:', error);
      setError('Ошибка добавления игрока');
    } finally {
      setLoading(false);
    }
  };

  const deletePlayer = async (playerId: string) => {
    if (!isOrganizer) {
      alert('Только организаторы могут удалять игроков!');
      return;
    }

    try {
      await deleteDoc(doc(db, 'players', playerId));
    } catch (error) {
      console.error('Error deleting player:', error);
      setError('Ошибка удаления игрока');
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (!isOrganizer) {
      alert('Только организаторы могут удалять команды!');
      return;
    }

    try {
      await deleteDoc(doc(db, 'teams', teamId));
    } catch (error) {
      console.error('Error deleting team:', error);
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
    } catch (error) {
      console.error('Error creating team:', error);
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

  // Навигационные вкладки
  const tabs = [
    { id: 'add-player', label: 'Добавление аккаунта' },
    { id: 'players-list', label: 'Список игроков' },
    { id: 'create-team', label: 'Создание команды' },
    { id: 'teams-list', label: 'Список команд' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-4">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">Rocket League Tournament</h1>
          <p className="text-gray-300">Панель управления турниром</p>
        </div>

        {/* Organizer Switch */}
        <div className="flex justify-center mb-8">
          <div className="bg-gray-800/50 backdrop-blur-lg rounded-xl p-3 border border-gray-700/50">
            <label className="flex items-center space-x-3 cursor-pointer">
              <div className="relative">
                <input
                  type="checkbox"
                  checked={isOrganizer}
                  onChange={(e) => setIsOrganizer(e.target.checked)}
                  className="sr-only"
                />
                <div className={`w-12 h-6 rounded-full transition-colors duration-300 ${
                  isOrganizer ? 'bg-green-500' : 'bg-gray-600'
                }`}></div>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${
                  isOrganizer ? 'transform translate-x-6' : 'transform translate-x-1'
                }`}></div>
              </div>
              <span className="text-white font-medium text-sm">
                {isOrganizer ? 'Режим организатора' : 'Обычный режим'}
              </span>
            </label>
          </div>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-3 bg-red-500/20 border border-red-500/50 rounded-lg">
            <div className="text-red-200 text-sm">{error}</div>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-4 py-2 rounded-lg font-medium transition-all duration-200 ${
                activeTab === tab.id 
                  ? 'bg-white text-gray-900 shadow-lg' 
                  : 'bg-gray-800/50 text-gray-300 hover:bg-gray-700/50'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="bg-gray-800/30 backdrop-blur-lg rounded-xl p-6 border border-gray-700/50">
          
          {/* Вкладка добавления аккаунта */}
          {activeTab === 'add-player' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Добавление аккаунта</h2>
              
              <form onSubmit={addPlayer} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Никнейм</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      placeholder="Введите ваш никнейм"
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Платформа</label>
                    <select
                      value={platform}
                      onChange={(e) => setPlatform(e.target.value)}
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                    >
                      <option value="steam">Steam</option>
                      <option value="epic">Epic Games</option>
                      <option value="psn">PlayStation</option>
                      <option value="xbl">Xbox</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Ссылка на tracker.gg (для автоматического определения ранга)
                  </label>
                  <input
                    type="url"
                    value={trackerLink}
                    onChange={(e) => setTrackerLink(e.target.value)}
                    placeholder="https://rocketleague.tracker.network/..."
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-purple-500 transition-colors"
                  />
                  <p className="text-gray-400 text-xs mt-1">
                    Если не указать ссылку, ранг будет определен через API по никнейму
                  </p>
                </div>

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">Статус в команде</label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 transition-colors"
                  >
                    <option value="Ищу команду">Ищу команду</option>
                    <option value="Капитан">Капитан (ищу команду)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Добавление...' : 'Добавить аккаунт'}
                </button>
              </form>
            </div>
          )}

          {/* Вкладка списка игроков */}
          {activeTab === 'players-list' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Список игроков</h2>
                <span className="text-gray-300">Всего: {players.length}</span>
              </div>
              
              {players.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Пока нет добавленных игроков</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                  {players.map(player => (
                    <div
                      key={player.id}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-purple-500/50 transition-all duration-200"
                    >
                      <div className="flex items-start justify-between mb-3">
                        <h3 className="text-lg font-bold text-white truncate">{player.nickname}</h3>
                        <span className="text-xs bg-gray-600 px-2 py-1 rounded text-gray-300">
                          {player.platform}
                        </span>
                      </div>
                      
                      <div className={`inline-block px-3 py-1 rounded-full text-xs font-semibold ${getRankColor(player.currentRank)} text-white mb-3`}>
                        {player.currentRank}
                      </div>
                      
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between text-gray-300">
                          <span>MMR:</span>
                          <span className="font-semibold text-white">{player.mmr}</span>
                        </div>
                        <div className="flex justify-between text-gray-300">
                          <span>Статус:</span>
                          <span className="font-semibold text-white">{player.status}</span>
                        </div>
                      </div>
                      
                      {player.trackerLink && (
                        <a 
                          href={player.trackerLink} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="inline-block mt-3 text-blue-400 hover:text-blue-300 text-xs font-medium"
                        >
                          Открыть профиль на tracker.gg
                        </a>
                      )}
                      
                      {isOrganizer && (
                        <button
                          onClick={() => deletePlayer(player.id)}
                          className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm"
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

          {/* Вкладка создания команды */}
          {activeTab === 'create-team' && (
            <div className="max-w-2xl mx-auto">
              <h2 className="text-2xl font-bold text-white mb-6">Создание команды</h2>
              
              <form onSubmit={createTeam} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Название команды</label>
                    <input
                      type="text"
                      value={teamName}
                      onChange={(e) => setTeamName(e.target.value)}
                      placeholder="Введите название команды"
                      className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white placeholder-gray-400 focus:outline-none focus:border-cyan-500 transition-colors"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-gray-300 text-sm font-medium mb-2">Логотип команды</label>
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
                        className="block w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white text-center cursor-pointer hover:border-cyan-500 transition-colors"
                      >
                        {teamLogo ? 'Логотип загружен' : 'Выберите файл'}
                      </label>
                    </div>
                  </div>
                </div>

                {teamLogo && (
                  <div className="flex justify-center">
                    <img src={teamLogo} alt="Team Logo" className="w-20 h-20 object-cover rounded-lg border border-cyan-500/50" />
                  </div>
                )}

                <div>
                  <label className="block text-gray-300 text-sm font-medium mb-2">
                    Выберите игроков для команды ({teamPlayers.length} выбрано)
                  </label>
                  <select
                    multiple
                    value={teamPlayers.map((p) => p.id)}
                    onChange={(e) => {
                      const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                      const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
                      setTeamPlayers(selectedPlayers);
                    }}
                    className="w-full bg-gray-700/50 border border-gray-600/50 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-cyan-500 transition-colors h-32"
                    size={4}
                  >
                    {players.map(player => (
                      <option key={player.id} value={player.id} className="py-1">
                        {player.nickname} • {player.currentRank} • {player.mmr} MMR
                      </option>
                    ))}
                  </select>
                  <p className="text-gray-400 text-xs mt-1">
                    Для выбора нескольких игроков удерживайте Ctrl (Cmd на Mac)
                  </p>
                </div>

                {teamPlayers.length > 0 && (
                  <div className="bg-gray-700/30 rounded-lg p-3">
                    <h4 className="text-white font-medium mb-2">Выбранные игроки:</h4>
                    <div className="space-y-1">
                      {teamPlayers.map(player => (
                        <div key={player.id} className="flex justify-between text-sm text-gray-300">
                          <span>{player.nickname}</span>
                          <span>{player.currentRank} ({player.mmr} MMR)</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading || teamPlayers.length === 0}
                  className="w-full bg-gradient-to-r from-green-600 to-cyan-600 hover:from-green-700 hover:to-cyan-700 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 disabled:opacity-50"
                >
                  {loading ? 'Создание...' : 'Создать команду'}
                </button>
              </form>
            </div>
          )}

          {/* Вкладка списка команд */}
          {activeTab === 'teams-list' && (
            <div>
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-bold text-white">Список команд</h2>
                <span className="text-gray-300">Всего: {teams.length}</span>
              </div>
              
              {teams.length === 0 ? (
                <div className="text-center py-12">
                  <p className="text-gray-400 text-lg">Пока нет созданных команд</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                  {teams.map(team => (
                    <div
                      key={team.id}
                      className="bg-gray-700/50 rounded-lg p-4 border border-gray-600/50 hover:border-cyan-500/50 transition-all duration-200"
                    >
                      <div className="flex items-center space-x-3 mb-4">
                        {team.logo ? (
                          <img src={team.logo} alt="Team Logo" className="w-12 h-12 object-cover rounded-lg border border-cyan-500/50" />
                        ) : (
                          <div className="w-12 h-12 bg-gradient-to-br from-cyan-500 to-blue-600 rounded-lg flex items-center justify-center text-white font-bold">
                            T
                          </div>
                        )}
                        <div>
                          <h3 className="text-lg font-bold text-white">{team.name}</h3>
                          <div className="flex items-center space-x-2 text-sm text-gray-300">
                            <span>{team.averageMMR} MMR</span>
                            <span>•</span>
                            <span>{team.players.length} игроков</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="space-y-2">
                        <h4 className="text-white font-medium text-sm">Состав:</h4>
                        <div className="space-y-1">
                          {team.players.map((id: string) => {
                            const player = players.find(p => p.id === id);
                            return player ? (
                              <div key={id} className="flex justify-between items-center bg-gray-600/30 rounded px-2 py-1">
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
                          className="w-full mt-3 bg-red-600 hover:bg-red-700 text-white py-2 rounded-lg transition-colors text-sm"
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