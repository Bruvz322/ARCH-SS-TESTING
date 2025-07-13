import React, { useState, useEffect, useContext } from 'react';
import axios from 'axios';
import { AuthContext } from '../contexts/AuthContext';
import { Card, Button, Input } from '../styles/theme';

const ScriptHub = () => {
  const { user } = useContext(AuthContext);
  const [scripts, setScripts] = useState([]);
  const [scriptId, setScriptId] = useState('');
  const [targetUser, setTargetUser] = useState('');
  const [gameId, setGameId] = useState('');

  useEffect(() => {
    const fetchScripts = async () => {
      try {
        const res = await axios.get('/api/scripts', {
          headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
        });
        setScripts(res.data);
      } catch (err) {
        console.error('Failed to fetch scripts');
      }
    };
    fetchScripts();
  }, []);

  const executeScript = async (e) => {
    e.preventDefault();
    if (!scriptId.trim() || !targetUser.trim() || !gameId.trim()) return alert('All fields required');
    try {
      await axios.post('/api/executor/run', { script_id: scriptId, target_user: targetUser, game_id: gameId }, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
          'x-api-key': 'TEST_API_KEY_12345',
        },
      });
      setScriptId('');
      setTargetUser('');
      setGameId('');
      const res = await axios.get('/api/scripts', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setScripts(res.data);
    } catch (err) {
      alert('Script execution failed');
    }
  };

  return (
    <div>
      <h2>Script Hub</h2>
      {[3, 4, 5].includes(user?.role_id) && (
        <Card>
          <h3>Execute Script</h3>
          <form onSubmit={executeScript}>
            <Input
              type="text"
              placeholder="Script ID (e.g., require ID)"
              value={scriptId}
              onChange={(e) => setScriptId(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Target Roblox Username"
              value={targetUser}
              onChange={(e) => setTargetUser(e.target.value)}
            />
            <Input
              type="text"
              placeholder="Game ID"
              value={gameId}
              onChange={(e) => setGameId(e.target.value)}
            />
            <Button type="submit">Execute</Button>
          </form>
        </Card>
      )}
      <h3>Execution Logs</h3>
      {scripts.map(script => (
        <Card key={script.id}>
          <p>Script ID: {script.script_id}</p>
          <p>Executed By: {script.executed_by}</p>
          <p>Target: {script.target_user}</p>
          <p>Game: {script.game_name}</p>
          <p>Time: {new Date(script.timestamp).toLocaleString()}</p>
        </Card>
      ))}
    </div>
  );
};

export default ScriptHub;