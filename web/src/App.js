import React, { useContext } from 'react';
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthContext } from './contexts/AuthContext';
import Navbar from './components/Navbar';
import GamesTab from './components/GamesTab';
import AdminPanel from './components/AdminPanel';
import UserProfile from './components/UserProfile';
import Login from './components/Login';
import ChatRoom from './components/ChatRoom';
import Forums from './components/Forums';
import Announcements from './components/Announcements';
import ScriptHub from './components/ScriptHub';
import Tickets from './components/Tickets';
import { Container } from './styles/theme';

const App = () => {
  const { user } = useContext(AuthContext);

  return (
    <Router>
      <Container>
        <Navbar />
        <Routes>
          <Route path="/login" element={!user ? <Login /> : <Navigate to="/" />} />
          <Route path="/" element={user ? <GamesTab /> : <Navigate to="/login" />} />
          <Route path="/profile" element={user ? <UserProfile /> : <Navigate to="/login" />} />
          <Route path="/admin" element={user && [4, 5].includes(user.role_id) ? <AdminPanel /> : <Navigate to="/" />} />
          <Route path="/chat" element={user ? <ChatRoom /> : <Navigate to="/login" />} />
          <Route path="/forums" element={user ? <Forums /> : <Navigate to="/login" />} />
          <Route path="/announcements" element={user ? <Announcements /> : <Navigate to="/login" />} />
          <Route path="/script-hub" element={user && [3, 4, 5].includes(user.role_id) ? <ScriptHub /> : <Navigate to="/" />} />
          <Route path="/tickets" element={user ? <Tickets /> : <Navigate to="/login" />} />
        </Routes>
      </Container>
    </Router>
  );
};

export default App;