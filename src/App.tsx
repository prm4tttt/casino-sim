import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { GAMES } from './lib/gameList';
import type { GameId } from './store/useStore';
import Lobby from './pages/Lobby';
import Stats from './pages/Stats';
import Fairness from './pages/Fairness';
import ComingSoon from './pages/ComingSoon';
import Dice from './games/Dice';
import Limbo from './games/Limbo';

const SCREENS: Partial<Record<GameId, () => JSX.Element>> = {
  dice: Dice,
  limbo: Limbo,
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Lobby />} />
        {GAMES.map((g) => {
          const Screen = SCREENS[g.id];
          return <Route key={g.id} path={g.path} element={Screen ? <Screen /> : <ComingSoon name={g.name} />} />;
        })}
        <Route path="/stats" element={<Stats />} />
        <Route path="/fairness" element={<Fairness />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
