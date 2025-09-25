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

  const parseProfileFromUrl = async (url: string) => {
    try {
      // Для CORS обхода используем proxy
      const proxyUrl = `https://api.allorigins.win/raw?url=${encodeURIComponent(url)}`;
      const response = await axios.get(proxyUrl, { timeout: 10000 });
      
      // Создаем временный DOM парсер вместо cheerio для простоты
      const parser = new DOMParser();
      const doc = parser.parseFromString(response.data, 'text/html');
      
      const currentRankElement = doc.querySelector('.trn-ranking__tier .trn-ranking__tier__name');
      const currentRank = currentRankElement?.textContent?.trim() || 'N/A';
      
      const mmrElement = doc.querySelector('.trn-rating__value');
      const mmrText = mmrElement?.textContent?.trim() || '0';
      const mmr = isNaN(Number(mmrText)) ? 0 : Number(mmrText);
      
      return { currentRank, highestRank: 'N/A', mmr };
    } catch (error) {
      console.error('Error parsing profile:', error);
      return { currentRank: 'N/A', highestRank: 'N/A', mmr: 0 };
    }
  };

  const fetchRank = async (nickname: string, platform: string, url?: string) => {
    let currentRank = 'N/A';
    let highestRank = 'N/A';
    let mmr = 0;

    try {
      if (url) {
        const parsed = await parseProfileFromUrl(url);
        currentRank = parsed.currentRank;
        highestRank = parsed.highestRank;
        mmr = parsed.mmr;
      } else {
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
      }
    } catch (error: any) {
      console.error('Error fetching rank:', error);
      if (error.response?.status === 404) {
        setError('Профиль не найден. Проверьте никнейм и платформу.');
      } else {
        setError('Ошибка получения данных. Попробуйте использовать ссылку на tracker.gg');
      }
    }

    return { mmr, currentRank, highestRank };
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const { mmr, currentRank, highestRank } = await fetchRank(nickname, platform, trackerLink);
      
      await addDoc(collection(db, 'players'), {
        nickname: nickname.trim(),
        platform: platform,
        trackerLink: trackerLink.trim(),
        currentRank: currentRank,
        highestRank: highestRank,
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
      // Простая загрузка через FileReader для демо
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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-blue-900 p-4">
      <div className="bg-white/90 backdrop-blur-md rounded-xl shadow-2xl p-6 w-full max-w-6xl mx-auto">
        <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 text-center mb-8">
          Rocket League Tournament
        </h1>

        {/* Организаторский доступ */}
        <div className="mb-6 p-4 bg-yellow-50 rounded-lg">
          <label className="flex items-center space-x-2">
            <input
              type="checkbox"
              checked={isOrganizer}
              onChange={(e) => setIsOrganizer(e.target.checked)}
              className="w-4 h-4"
            />
            <span className="text-gray-700">Режим организатора</span>
          </label>
        </div>

        {/* Сообщения об ошибках */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        {/* Add Player Form */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Добавить игрока</h2>
          <form onSubmit={addPlayer} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Никнейм"
              className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
            >
              <option value="steam">Steam</option>
              <option value="epic">Epic</option>
              <option value="psn">PSN</option>
              <option value="xbl">Xbox</option>
            </select>
            <input
              type="url"
              value={trackerLink}
              onChange={(e) => setTrackerLink(e.target.value)}
              placeholder="Ссылка на tracker.gg (опционально)"
              className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 col-span-2"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 col-span-2"
            >
              <option value="Ищу команду">Ищу команду</option>
              <option value="Капитан">Капитан</option>
            </select>
            <button
              type="submit"
              disabled={loading}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-300 col-span-2 disabled:opacity-50"
            >
              {loading ? 'Добавление...' : 'Добавить игрока'}
            </button>
          </form>
        </div>

        {/* Create Team Form */}
        <div className="bg-gray-50 p-6 rounded-lg shadow-inner mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Создать команду</h2>
          <form onSubmit={createTeam} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Название команды"
              className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              required
            />
            <div>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                id="logo-upload"
              />
              <label
                htmlFor="logo-upload"
                className="block bg-gradient-to-r from-green-500 to-teal-600 text-white p-2 rounded-lg hover:from-green-600 hover:to-teal-700 transition duration-300 text-center cursor-pointer"
              >
                Загрузить логотип
              </label>
            </div>
            {teamLogo && (
              <div className="col-span-2">
                <img src={teamLogo} alt="Team Logo" className="w-20 h-20 object-cover rounded" />
              </div>
            )}
            <div className="col-span-2">
              <label className="block text-gray-700 mb-2">Выберите игроков:</label>
              <select
                multiple
                value={teamPlayers.map((p) => p.id)}
                onChange={(e) => {
                  const selectedIds = Array.from(e.target.selectedOptions, option => option.value);
                  const selectedPlayers = players.filter(p => selectedIds.includes(p.id));
                  setTeamPlayers(selectedPlayers);
                }}
                className="border border-gray-300 p-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 w-full h-32"
                size={5}
              >
                {players.map(player => (
                  <option key={player.id} value={player.id}>
                    {player.nickname} ({player.currentRank}) - {player.mmr} MMR
                  </option>
                ))}
              </select>
              <small className="text-gray-500">Для выбора нескольких игроков удерживайте Ctrl</small>
            </div>
            <button
              type="submit"
              disabled={loading || teamPlayers.length === 0}
              className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-2 rounded-lg hover:from-blue-600 hover:to-purple-700 transition duration-300 col-span-2 disabled:opacity-50"
            >
              {loading ? 'Создание...' : 'Создать команду'}
            </button>
          </form>
        </div>

        {/* Players List */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            Игроки ({players.length})
          </h2>
          {players.length === 0 ? (
            <p className="text-gray-600 text-center p-4">Нет добавленных игроков</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {players.map(player => (
                <div
                  key={player.id}
                  className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200"
                >
                  <h3 className="font-bold text-xl text-gray-800 mb-2">{player.nickname}</h3>
                  <div className="space-y-1 text-sm text-gray-600">
                    <p>Платформа: {player.platform}</p>
                    <p>Текущий ранг: {player.currentRank}</p>
                    <p>Лучший ранг: {player.highestRank}</p>
                    <p>MMR: {player.mmr}</p>
                    <p>Статус: {player.status}</p>
                  </div>
                  {player.trackerLink && (
                    <a 
                      href={player.trackerLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="inline-block mt-2 text-blue-500 hover:underline text-sm"
                    >
                      Профиль на tracker.gg
                    </a>
                  )}
                  {isOrganizer && (
                    <button
                      onClick={() => deletePlayer(player.id)}
                      className="mt-3 w-full bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300 text-sm"
                    >
                      Удалить
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Teams List */}
        <div>
          <h2 className="text-2xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-600 mb-4">
            Команды ({teams.length})
          </h2>
          {teams.length === 0 ? (
            <p className="text-gray-600 text-center p-4">Нет созданных команд</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {teams.map(team => (
                <div
                  key={team.id}
                  className="bg-white rounded-lg p-4 shadow-lg hover:shadow-xl transition-shadow duration-300 border border-gray-200"
                >
                  <div className="flex items-center space-x-3 mb-3">
                    {team.logo && (
                      <img src={team.logo} alt="Team Logo" className="w-12 h-12 object-cover rounded" />
                    )}
                    <h3 className="font-bold text-xl text-gray-800">{team.name}</h3>
                  </div>
                  <div className="space-y-2 text-sm">
                    <p className="text-gray-600">Средний MMR: <strong>{team.averageMMR}</strong></p>
                    <div>
                      <p className="text-gray-700 font-medium mb-1">Игроки:</p>
                      <ul className="list-disc list-inside space-y-1">
                        {team.players.map((id: string) => {
                          const player = players.find(p => p.id === id);
                          return player ? (
                            <li key={id} className="text-gray-600 text-sm">
                              {player.nickname} ({player.currentRank})
                            </li>
                          ) : null;
                        })}
                      </ul>
                    </div>
                  </div>
                  {isOrganizer && (
                    <button
                      onClick={() => deleteTeam(team.id)}
                      className="mt-3 w-full bg-red-500 text-white p-2 rounded-lg hover:bg-red-600 transition duration-300 text-sm"
                    >
                      Удалить команду
                    </button>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default App;