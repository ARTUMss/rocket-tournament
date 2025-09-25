import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc, deleteDoc, doc } from 'firebase/firestore';
import * as cheerio from 'cheerio';

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
  const [isOrganizer, setIsOrganizer] = useState(false); // Простая проверка роли

  useEffect(() => {
    onSnapshot(collection(db, 'players'), (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const parseProfileFromUrl = async (url: string) => {
    try {
      const response = await axios.get(url);
      const $ = cheerio.load(response.data);
      const currentRank = $('.trn-ranking__tier .trn-ranking__tier__name').text().trim() || 'N/A';
      const highestRank = $('.trn-performance__highest .trn-ranking__tier__name, .season-rewards__highest').text().trim() || 'N/A';
      const mmrText = $('.trn-rating__value').text().trim();
      const mmr = isNaN(Number(mmrText)) ? 0 : Number(mmrText);
      return { currentRank, highestRank, mmr };
    } catch (error) {
      console.error('Error parsing profile:', error);
      return { currentRank: 'N/A', highestRank: 'N/A', mmr: 0 };
    }
  };

  const extractFromUrl = (url: string) => {
    const match = url.match(/profile\/(steam|epic|psn|xbl)\/([^\/]+)/i);
    return match ? { platform: match[1], nickname: match[2] } : null;
  };

  const fetchRank = async (nickname: string, platform: string, url?: string) => {
    let currentRank = 'N/A';
    let highestRank = 'N/A';
    let mmr = 0;

    if (url) {
      const parsed = await parseProfileFromUrl(url);
      currentRank = parsed.currentRank;
      highestRank = parsed.highestRank;
      mmr = parsed.mmr;
    } else {
      try {
        const response = await axios.get(`https://api.tracker.gg/api/v2/rocket-league/standard/profile/${platform}/${nickname}`, {
          headers: { 'TRN-Api-Key': '9d369df8-7267-493f-af55-df8c230ddc27' }
        });
        const segment = response.data.data.segments.find((seg: TrackerSegment) => seg.attributes.playlistId === 13);
        mmr = segment?.stats.rating.value || 0;
        currentRank = segment?.stats.tier.metadata.name || 'N/A';
        highestRank = 'N/A';
      } catch (error) {
        console.error('Error fetching from API:', error);
      }
    }

    return { mmr, currentRank, highestRank };
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mmr, currentRank, highestRank } = await fetchRank(nickname, platform, trackerLink);
    await addDoc(collection(db, 'players'), {
      nickname: nickname as string,
      platform: platform as string,
      trackerLink: trackerLink as string,
      currentRank: currentRank as string,
      highestRank: highestRank as string,
      mmr: mmr as number,
      status: status as string
    });
    setNickname('');
    setPlatform('steam');
    setTrackerLink('');
    setStatus('Ищу команду');
  };

  const deletePlayer = async (playerId: string) => {
    if (isOrganizer) {
      await deleteDoc(doc(db, 'players', playerId));
    } else {
      alert('Только организаторы могут удалять игроков!');
    }
  };

  const deleteTeam = async (teamId: string) => {
    if (isOrganizer) {
      await deleteDoc(doc(db, 'teams', teamId));
    } else {
      alert('Только организаторы могут удалять команды!');
    }
  };

  const cloudinaryWidget = () => {
    // @ts-ignore
    const widget = window.cloudinary.createUploadWidget(
      { 
        cloudName: 'dxxxp50c', // Замени на свой
        uploadPreset: 'rocket-logo-upload' // Замени на свой
      },
      (error: any, result: any) => {
        if (!error && result && result.event === "success") {
          setTeamLogo(result.info.secure_url);
        }
      }
    );
    widget.open();
  };

  const createTeam = async (e: React.FormEvent) => {
    e.preventDefault();
    const playerIds = teamPlayers.map((p: { id: string }) => p.id);
    const mmrs = teamPlayers.map((p: { mmr: number }) => p.mmr || 0);
    const averageMMR = mmrs.length ? Math.round(mmrs.reduce((a, b) => a + b, 0) / mmrs.length) : 0;
    await addDoc(collection(db, 'teams'), {
      name: teamName,
      logo: teamLogo,
      players: playerIds,
      averageMMR
    });
    setTeamName('');
    setTeamLogo('');
    setTeamPlayers([]);
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <h1 className="text-4xl font-bold text-center text-blue-600 mb-6">Rocket League Tournament</h1>

        <div className="bg-white shadow-lg rounded-lg p-6 mb-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Add Player</h2>
          <form onSubmit={addPlayer} className="space-y-4">
            <input
              type="text"
              value={nickname}
              onChange={(e) => setNickname(e.target.value)}
              placeholder="Nickname"
              className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <select
              value={platform}
              onChange={(e) => setPlatform(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="steam">Steam</option>
              <option value="epic">Epic</option>
              <option value="psn">PSN</option>
              <option value="xbl">Xbox</option>
            </select>
            <input
              type="text"
              value={trackerLink}
              onChange={(e) => setTrackerLink(e.target.value)}
              placeholder="Tracker Network Profile URL (optional)"
              className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="Ищу команду">Ищу команду</option>
              <option value="Капитан">Капитан</option>
            </select>
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg w-full hover:bg-blue-700 transition duration-300">
              Add Player
            </button>
          </form>
        </div>

        <div className="bg-white shadow-lg rounded-lg p-6">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Create Team</h2>
          <form onSubmit={createTeam} className="space-y-4">
            <input
              type="text"
              value={teamName}
              onChange={(e) => setTeamName(e.target.value)}
              placeholder="Team Name"
              className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500"
              required
            />
            <button
              type="button"
              onClick={cloudinaryWidget}
              className="bg-green-600 text-white p-2 rounded-lg w-full hover:bg-green-700 transition duration-300"
            >
              Upload Team Logo
            </button>
            {teamLogo && <img src={teamLogo} alt="Team Logo" className="w-20 h-20 object-cover mt-2 rounded" />}
            <select
              multiple
              value={teamPlayers.map((p: { id: string }) => p.id)}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
                const options = e.currentTarget.selectedOptions;
                const selectedPlayers = Array.from(options).map(option => players.find(p => p.id === option.value));
                setTeamPlayers(selectedPlayers as any[]);
              }}
              className="border border-gray-300 p-2 rounded-lg w-full focus:outline-none focus:ring-2 focus:ring-blue-500 h-32"
            >
              {players.map(player => (
                <option key={player.id} value={player.id}>{player.nickname} ({player.currentRank})</option>
              ))}
            </select>
            <button type="submit" className="bg-blue-600 text-white p-2 rounded-lg w-full hover:bg-blue-700 transition duration-300">
              Create Team
            </button>
          </form>
        </div>

        <div className="mt-8">
          <h2 className="text-2xl font-semibold text-gray-800 mb-4">Tournament Participants</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {players.map(player => (
              <div key={player.id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-lg text-gray-900">{player.nickname}</h3>
                <p className="text-gray-600">Platform: {player.platform}</p>
                <p className="text-gray-600">Current Rank: {player.currentRank}</p>
                <p className="text-gray-600">Highest Rank: {player.highestRank}</p>
                <p className="text-gray-600">MMR: {player.mmr}</p>
                <p className="text-gray-600">Status: {player.status}</p>
                {player.trackerLink && (
                  <a href={player.trackerLink} target="_blank" className="text-blue-500 hover:underline">Tracker Profile</a>
                )}
                {isOrganizer && (
                  <button
                    onClick={() => deletePlayer(player.id)}
                    className="mt-2 bg-red-600 text-white p-1 rounded-lg hover:bg-red-700 transition duration-300 w-full"
                  >
                    Delete Player
                  </button>
                )}
              </div>
            ))}
          </div>
          <h2 className="text-2xl font-semibold text-gray-800 mt-8 mb-4">Teams</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {teams.map(team => (
              <div key={team.id} className="bg-white shadow-md rounded-lg p-4 border border-gray-200">
                <h3 className="font-bold text-lg text-gray-900">{team.name}</h3>
                {team.logo && <img src={team.logo} alt="Team Logo" className="w-20 h-20 object-cover mt-2 rounded" />}
                <p className="text-gray-600">Average MMR: {team.averageMMR}</p>
                <p className="text-gray-600">Players: {team.players.map((id: any) => players.find(p => p.id === id)?.nickname).join(', ')}</p>
                {isOrganizer && (
                  <button
                    onClick={() => deleteTeam(team.id)}
                    className="mt-2 bg-red-600 text-white p-1 rounded-lg hover:bg-red-700 transition duration-300 w-full"
                  >
                    Delete Team
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default App;