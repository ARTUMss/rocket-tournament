import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc } from 'firebase/firestore';

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

// Firebase Config (Replace with your config from Firebase Console)
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
  const [rank, setRank] = useState('');
  const [status, setStatus] = useState('Свободен');
  const [teamName, setTeamName] = useState('');
  const [teamLogo, setTeamLogo] = useState('');
  const [teamPlayers, setTeamPlayers] = useState<any[]>([]);

  useEffect(() => {
    onSnapshot(collection(db, 'players'), (snapshot) => {
      setPlayers(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    onSnapshot(collection(db, 'teams'), (snapshot) => {
      setTeams(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
  }, []);

  const fetchRank = async (nickname: string, platform: string) => {
    try {
      const response = await axios.get(`https://api.tracker.gg/api/v2/rocket-league/standard/profile/${platform}/${nickname}`, {
        headers: { 'TRN-Api-Key': 'YOUR_TRACKER_API_KEY' }
      });
      const segment = response.data.data.segments.find((seg: TrackerSegment) => seg.attributes.playlistId === 13);
      const mmr = segment?.stats.rating.value || 'N/A';
      const rank = segment?.stats.tier.metadata.name || 'N/A';
      return { mmr, rank };
    } catch (error) {
      console.error('Error fetching rank:', error);
      return { mmr: 'N/A', rank: 'N/A' };
    }
  };

  const addPlayer = async (e: React.FormEvent) => {
    e.preventDefault();
    const { mmr, rank: fetchedRank } = await fetchRank(nickname, platform);
    await addDoc(collection(db, 'players'), {
      nickname,
      platform,
      trackerLink,
      rank: rank || fetchedRank,
      mmr: mmr !== 'N/A' ? mmr : 0,
      status
    });
    setNickname('');
    setPlatform('steam');
    setTrackerLink('');
    setRank('');
    setStatus('Свободен');
  };

  const cloudinaryWidget = () => {
    // @ts-ignore (временное игнорирование, пока нет официальных типов)
    const widget = window.cloudinary.createUploadWidget(
      { 
        cloudName: 'dxxxpp50c', // Замени на свой cloud name
        uploadPreset: 'rocket-logo-upload' // Замени на свой preset
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
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-4">Rocket League Tournament</h1>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Add Player</h2>
        <form onSubmit={addPlayer} className="space-y-4">
          <input
            type="text"
            value={nickname}
            onChange={(e) => setNickname(e.target.value)}
            placeholder="Nickname"
            className="border p-2 rounded w-full"
            required
          />
          <select
            value={platform}
            onChange={(e) => setPlatform(e.target.value)}
            className="border p-2 rounded w-full"
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
            placeholder="Tracker Network Profile URL"
            className="border p-2 rounded w-full"
          />
          <select
            value={rank}
            onChange={(e) => setRank(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="">Select Rank (Optional)</option>
            <option value="Bronze 1">Bronze 1</option>
            <option value="Silver 1">Silver 1</option>
            <option value="Gold 1">Gold 1</option>
            <option value="Platinum 1">Platinum 1</option>
            <option value="Diamond 1">Diamond 1</option>
            <option value="Champion 1">Champion 1</option>
            <option value="Grand Champion 1">Grand Champion 1</option>
          </select>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="Свободен">Свободен</option>
            <option value="Ищу команду">Ищу команду</option>
            <option value="Лидер команды">Лидер команды</option>
          </select>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Add Player</button>
        </form>
      </div>

      <div className="mb-8">
        <h2 className="text-2xl font-semibold mb-2">Create Team</h2>
        <form onSubmit={createTeam} className="space-y-4">
          <input
            type="text"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Team Name"
            className="border p-2 rounded w-full"
            required
          />
          <button
            type="button"
            onClick={cloudinaryWidget}
            className="bg-green-500 text-white p-2 rounded"
          >
            Upload Team Logo
          </button>
          {teamLogo && <img src={teamLogo} alt="Team Logo" className="w-20 h-20 object-cover" />}
          <select
            multiple
            value={teamPlayers.map((p: { id: string }) => p.id)} // Явная типизация
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const options = e.currentTarget.selectedOptions;
              const selectedPlayers = Array.from(options).map(option => players.find(p => p.id === option.value));
              setTeamPlayers(selectedPlayers as any[]);
            }}
            className="border p-2 rounded w-full"
          >
            {players.map(player => (
              <option key={player.id} value={player.id}>{player.nickname} ({player.rank})</option>
            ))}
          </select>
          <button type="submit" className="bg-blue-500 text-white p-2 rounded">Create Team</button>
        </form>
      </div>

      <div>
        <h2 className="text-2xl font-semibold mb-2">Tournament Participants</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {players.map(player => (
            <div key={player.id} className="border p-4 rounded">
              <h3 className="font-bold">{player.nickname}</h3>
              <p>Platform: {player.platform}</p>
              <p>Rank: {player.rank}</p>
              <p>MMR: {player.mmr}</p>
              <p>Status: {player.status}</p>
              {player.trackerLink && (
                <a href={player.trackerLink} target="_blank" className="text-blue-500">Tracker Profile</a>
              )}
            </div>
          ))}
        </div>
        <h2 className="text-2xl font-semibold mt-8 mb-2">Teams</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {teams.map(team => (
            <div key={team.id} className="border p-4 rounded">
              <h3 className="font-bold">{team.name}</h3>
              {team.logo && <img src={team.logo} alt="Team Logo" className="w-20 h-20 object-cover" />}
              <p>Average MMR: {team.averageMMR}</p>
              <p>Players: {team.players.map((id: any) => players.find(p => p.id === id)?.nickname).join(', ')}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default App;