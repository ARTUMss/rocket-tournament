import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, onSnapshot, addDoc } from 'firebase/firestore';
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
      const mmr = isNaN(Number(mmrText)) ? 0 : Number(mmrText); // Гарантированное число
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
    let mmr = 0; // По умолчанию число

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
      mmr: mmr as number, // Явно указываем тип number
      status: status as string
    });
    setNickname('');
    setPlatform('steam');
    setTrackerLink('');
    setStatus('Ищу команду');
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
            placeholder="Tracker Network Profile URL (optional)"
            className="border p-2 rounded w-full"
          />
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="border p-2 rounded w-full"
          >
            <option value="Ищу команду">Ищу команду</option>
            <option value="Капитан">Капитан</option>
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
            value={teamPlayers.map((p: { id: string }) => p.id)}
            onChange={(e: React.ChangeEvent<HTMLSelectElement>) => {
              const options = e.currentTarget.selectedOptions;
              const selectedPlayers = Array.from(options).map(option => players.find(p => p.id === option.value));
              setTeamPlayers(selectedPlayers as any[]);
            }}
            className="border p-2 rounded w-full"
          >
            {players.map(player => (
              <option key={player.id} value={player.id}>{player.nickname} ({player.currentRank})</option>
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
              <p>Current Rank: {player.currentRank}</p>
              <p>Highest Rank: {player.highestRank}</p>
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