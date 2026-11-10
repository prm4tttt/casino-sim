import { Navigate, Route, Routes } from 'react-router-dom';
import Layout from './components/Layout';
import { GAMES } from './lib/gameList';
import type { GameId } from './store/useStore';
import Lobby from './pages/Lobby';
import Stats from './pages/Stats';
import Fairness from './pages/Fairness';
import Dice from './games/Dice';
import Limbo from './games/Limbo';
import Mines from './games/Mines';
import Plinko from './games/Plinko';
import Crash from './games/Crash';
import Keno from './games/Keno';
import Hilo from './games/Hilo';
import Blackjack from './games/Blackjack';
import CoinLadder from './games/CoinLadder';
import Vault from './games/Vault';

const SCREENS: Record<GameId, () => JSX.Element> = {
  dice: Dice,
  limbo: Limbo,
  mines: Mines,
  plinko: Plinko,
  crash: Crash,
  keno: Keno,
  hilo: Hilo,
  blackjack: Blackjack,
  ladder: CoinLadder,
  vault: Vault,
};

export default function App() {
  return (
    <Routes>
      <Route element={<Layout />}>
        <Route index element={<Lobby />} />
        {GAMES.map((g) => {
          const Screen = SCREENS[g.id];
          return <Route key={g.id} path={g.path} element={<Screen />} />;
        })}
        <Route path="/stats" element={<Stats />} />
        <Route path="/fairness" element={<Fairness />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Route>
    </Routes>
  );
}
