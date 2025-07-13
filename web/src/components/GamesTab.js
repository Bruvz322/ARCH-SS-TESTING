import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, DiscordButton } from '../styles/theme';

const GamesTab = () => {
  const { user } = useContext(AuthContext);
  const [games, setGames] = useState([]);
  const [discordLink, setDiscordLink] = useState('');
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, discordRes, paymentEnabledRes, paymentLinkRes] = await Promise.all([
          axios.get('/api/games', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get('/api/settings/discord_link'),
          axios.get('/api/settings/payment_enabled'),
          axios.get('/api/settings/payment_link'),
        ]);
        setGames(gamesRes.data);
        setDiscordLink(discordRes.data.discord_link);
        setPaymentEnabled(paymentEnabledRes.data.payment_enabled === 'true');
        setPaymentLink(paymentLinkRes.data.payment_link);
      } catch (err) {
        console.error('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const canAccess = (accessLevel) => {
    if (!user) return false;
    const roleHierarchy = { User: 0, Whitelisted: 1, Premium: 2, Moderator: 3, Admin: 4, Owner: 5 };
    const userRole = user.role;
    if (accessLevel === 'Public') return true;
    if (accessLevel === 'Whitelisted' && roleHierarchy[userRole] >= 1) return true;
    if (accessLevel === 'Premium' && roleHierarchy[userRole] >= 2) return true;
    return false;
  };

  const executeScript = async (gameId) => {
    try {
      await axios.post('/api/executor/run', {
        game_id: gameId,
        script_id: 'example_script',
        target_user: 'example_user',
      }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'x-api-key': 'TEST_API_KEY_12345',
        },
      });
      alert('Script executed');
    } catch (err) {
      alert('Execution failed');
    }
  };

  return (
    <div>
      <h2>Games</h2>
      {discordLink && (
        <DiscordButton href={discordLink} target="_blank" rel="noopener noreferrer">
          Join Our Discord
        </DiscordButton>
      )}
      {paymentEnabled && paymentLink && (
        <DiscordButton href={paymentLink} target="_blank" rel="noopener noreferrer">
          Upgrade to Premium
        </DiscordButton>
      )}
      {games.filter(game => canAccess(game.access_level)).map(game => (
        <Card key={game.id}>
          <h3>{game.name}</h3>
          <p>Access: {game.access_level}</p>
          <p>Players: {game.player_count}</p>
          {[1, 2, 3, 4, 5].includes(user.role_id) && (
            <Button onClick={() => executeScript(game.id)}>Run Executor</Button>
          )}
        </Card>
      ))}
    </div>
  );
};

export default GamesTab;