import { Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import Dashboard from './pages/Dashboard';
import Roster from './pages/Roster';
import Settings from './pages/Settings';
import NewAnalysis from './pages/NewAnalysis';
import GameDetail from './pages/GameDetail';
import PlayerProfile from './pages/PlayerProfile';

export default function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/roster" element={<Roster />} />
        <Route path="/settings" element={<Settings />} />
        <Route path="/new" element={<NewAnalysis />} />
        <Route path="/games/:gameId/new" element={<NewAnalysis />} />
        <Route path="/games/:gameId" element={<GameDetail />} />
        <Route path="/players/:playerId" element={<PlayerProfile />} />
      </Routes>
    </Layout>
  );
}
