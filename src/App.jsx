import { HashRouter, Routes, Route } from 'react-router-dom';
import MainLayout from './layouts/MainLayout';
import Home from './pages/Home';
import Dashboard from './pages/Dashboard';
import MyMatches from './pages/MyMatches';
import Standings from './pages/Standings';

function App() {
  return (
    <HashRouter>
      <MainLayout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/my-matches" element={<MyMatches />} />
          <Route path="/standings" element={<Standings />} />
        </Routes>
      </MainLayout>
    </HashRouter>
  );
}

export default App;