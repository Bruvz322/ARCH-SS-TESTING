import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { Card, Button, Input } from '../styles/theme';
import styled from 'styled-components';

const ToggleSwitch = styled.label`
  display: flex;
  align-items: center;
  gap: 10px;
  input {
    width: 40px;
    height: 20px;
    appearance: none;
    background: ${props => props.checked ? props.theme.primary : '#ccc'};
    border-radius: 20px;
    position: relative;
    cursor: pointer;
    outline: none;
    &:checked::after {
      left: 20px;
    }
    &::after {
      content: '';
      position: absolute;
      width: 18px;
      height: 18px;
      background: white;
      border-radius: 50%;
      top: 1px;
      left: ${props => props.checked ? '20px' : '1px'};
      transition: left 0.2s;
    }
  }
`;

const PermissionsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 10px;
  margin: 10px 0;
`;

const AdminPanel = () => {
  const [games, setGames] = useState([]);
  const [newApiKey, setNewApiKey] = useState('');
  const [modelId, setModelId] = useState('');
  const [discordLink, setDiscordLink] = useState('');
  const [paymentEnabled, setPaymentEnabled] = useState(false);
  const [paymentLink, setPaymentLink] = useState('');
  const [discordWebhook, setDiscordWebhook] = useState('');
  const [roles, setRoles] = useState([]);
  const [newRole, setNewRole] = useState({
    name: '',
    hierarchy: 0,
    permissions: {
      AccessGamesTab: false,
      UseExecutor: false,
      AccessPremiumGames: false,
      ViewGameServerPings: false,
      ApproveGameAccess: false,
      PromoteDemoteUsers: false,
      WhitelistUsers: false,
      BanAccounts: false,
      IPBan: false,
      AccessScriptHub: false,
      ViewScriptLogs: false,
      ViewAuditLogs: false,
      ViewBannedUsers: false,
      ViewPrivateData: false,
    },
  });
  const [selectedRoleId, setSelectedRoleId] = useState(null);
  const [modNotes, setModNotes] = useState([]);
  const [noteUserId, setNoteUserId] = useState('');
  const [noteContent, setNoteContent] = useState('');
  const [promoteUserId, setPromoteUserId] = useState('');
  const [promoteRoleId, setPromoteRoleId] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [gamesRes, discordRes, paymentEnabledRes, paymentLinkRes, webhookRes, rolesRes] = await Promise.all([
          axios.get('/api/admin/games', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
          axios.get('/api/settings/discord_link'),
          axios.get('/api/settings/payment_enabled'),
          axios.get('/api/settings/payment_link'),
          axios.get('/api/settings/discord_webhook'),
          axios.get('/api/admin/roles', { headers: { Authorization: `Bearer ${localStorage.getItem('token')}` } }),
        ]);
        setGames(gamesRes.data);
        setDiscordLink(discordRes.data.discord_link);
        setPaymentEnabled(paymentEnabledRes.data.payment_enabled === 'true');
        setPaymentLink(paymentLinkRes.data.payment_link);
        setDiscordWebhook(webhookRes.data.discord_webhook);
        setRoles(rolesRes.data);
      } catch (err) {
        console.error('Failed to fetch data');
      }
    };
    fetchData();
  }, []);

  const approveGame = async (gameId, accessLevel) => {
    try {
      await axios.post('/api/admin/games/approve', { game_id: gameId, access_level: accessLevel }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Game approved');
      setGames(games.map(g => g.id === gameId ? { ...g, access_level: accessLevel, status: 'approved' } : g));
    } catch (err) {
      alert('Approval failed');
    }
  };

  const generateApiKey = async () => {
    if (!modelId.trim()) return alert('Model ID required');
    try {
      const res = await axios.post('/api/admin/api-keys', { model_id: modelId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNewApiKey(res.data.apiKey);
      setModelId('');
      alert('API key generated');
    } catch (err) {
      alert('API key generation failed');
    }
  };

  const updateSetting = async (key, value) => {
    if (key === 'discord_link' && value && !value.match(/^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/)) {
      return alert('Invalid Discord invite link');
    }
    if (key === 'payment_link' && value && !value.match(/^https:\/\/(buy\.stripe\.com|paypal\.me)\/.+$/)) {
      return alert('Invalid payment link');
    }
    if (key === 'discord_webhook' && value && !value.match(/^https:\/\/discord\.com\/api\/webhooks\/.+$/)) {
      return alert('Invalid Discord webhook URL');
    }
    try {
      await axios.post(`/api/admin/settings/${key}`, { value }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      alert('Setting updated');
    } catch (err) {
      alert('Failed to update setting');
    }
  };

  const createRole = async () => {
    if (!newRole.name || !Number.isInteger(newRole.hierarchy)) return alert('Name and hierarchy required');
    try {
      await axios.post('/api/admin/roles', newRole, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNewRole({ name: '', hierarchy: 0, permissions: { ...newRole.permissions } });
      const res = await axios.get('/api/admin/roles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setRoles(res.data);
      alert('Role created');
    } catch (err) {
      alert('Failed to create role');
    }
  };

  const updateRole = async () => {
    if (!selectedRoleId) return alert('Select a role to update');
    try {
      await axios.put(`/api/admin/roles/${selectedRoleId}`, newRole, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNewRole({ name: '', hierarchy: 0, permissions: { ...newRole.permissions } });
      setSelectedRoleId(null);
      const res = await axios.get('/api/admin/roles', {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setRoles(res.data);
      alert('Role updated');
    } catch (err) {
      alert('Failed to update role');
    }
  };

  const selectRole = (role) => {
    setSelectedRoleId(role.id);
    setNewRole({
      name: role.name,
      hierarchy: role.hierarchy,
      permissions: JSON.parse(role.permissions),
    });
  };

  const addModNote = async () => {
    if (!noteUserId || !noteContent.trim()) return alert('User ID and note required');
    try {
      await axios.post('/api/admin/mod-notes', { user_id: noteUserId, note: noteContent }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setNoteContent('');
      setNoteUserId('');
      alert('Mod note added');
      const res = await axios.get(`/api/admin/mod-notes/${noteUserId}`, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setModNotes(res.data);
    } catch (err) {
      alert('Failed to add mod note');
    }
  };

  const promoteUser = async () => {
    if (!promoteUserId || !promoteRoleId) return alert('User ID and role ID required');
    try {
      await axios.post('/api/admin/users/promote', { user_id: promoteUserId, role_id: promoteRoleId }, {
        headers: { Authorization: `Bearer ${localStorage.getItem('token')}` },
      });
      setPromoteUserId('');
      setPromoteRoleId('');
      alert('User role updated');
    } catch (err) {
      alert('Failed to update user role');
    }
  };

  const togglePermission = (perm) => {
    setNewRole({
      ...newRole,
      permissions: {
        ...newRole.permissions,
        [perm]: !newRole.permissions[perm],
      },
    });
  };

  return (
    <Card>
      <h2>ARCH SS Admin Panel</h2>
      <h3>Connected Games</h3>
      {games.map(game => (
        <Card key={game.id}>
          <p>{game.name} (ID: {game.id})</p>
          <p>Status: {game.status}</p>
          <select onChange={(e) => approveGame(game.id, e.target.value)} defaultValue={game.access_level}>
            <option value="Public">Public</option>
            <option value="Whitelisted">Whitelisted</option>
            <option value="Premium">Premium</option>
          </select>
        </Card>
      ))}
      <h3>Generate API Key</h3>
      <Input
        type="text"
        placeholder="Model ID"
        value={modelId}
        onChange={(e) => setModelId(e.target.value)}
      />
      <Button onClick={generateApiKey}>Generate Key</Button>
      {newApiKey && <p>New API Key: {newApiKey}</p>}
      <h3>Configure Discord Link</h3>
      <Input
        type="text"
        placeholder="Discord Invite Link[](https://discord.gg/...)"
        value={discordLink}
        onChange={(e) => setDiscordLink(e.target.value)}
      />
      <Button onClick={() => updateSetting('discord_link', discordLink)}>Update Discord Link</Button>
      <h3>Configure Payment</h3>
      <ToggleSwitch checked={paymentEnabled}>
        Payment Enabled
        <input
          type="checkbox"
          checked={paymentEnabled}
          onChange={(e) => {
            setPaymentEnabled(e.target.checked);
            updateSetting('payment_enabled', e.target.checked.toString());
          }}
        />
      </ToggleSwitch>
      <Input
        type="text"
        placeholder="Payment Link (Stripe or PayPal)"
        value={paymentLink}
        onChange={(e) => setPaymentLink(e.target.value)}
      />
      <Button onClick={() => updateSetting('payment_link', paymentLink)}>Update Payment Link</Button>
      <h3>Configure Discord Webhook</h3>
      <Input
        type="text"
        placeholder="Discord Webhook URL"
        value={discordWebhook}
        onChange={(e) => setDiscordWebhook(e.target.value)}
      />
      <Button onClick={() => updateSetting('discord_webhook', discordWebhook)}>Update Webhook</Button>
      <h3>Role Management</h3>
      <Card>
        <h4>{selectedRoleId ? 'Edit Role' : 'Create Role'}</h4>
        <Input
          type="text"
          placeholder="Role Name"
          value={newRole.name}
          onChange={(e) => setNewRole({ ...newRole, name: e.target.value })}
        />
        <Input
          type="number"
          placeholder="Hierarchy (0-5)"
          value={newRole.hierarchy}
          onChange={(e) => setNewRole({ ...newRole, hierarchy: parseInt(e.target.value) })}
        />
        <PermissionsGrid>
          {Object.keys(newRole.permissions).map(perm => (
            <label key={perm}>
              <input
                type="checkbox"
                checked={newRole.permissions[perm]}
                onChange={() => togglePermission(perm)}
              />
              {perm}
            </label>
          ))}
        </PermissionsGrid>
        <Button onClick={selectedRoleId ? updateRole : createRole}>
          {selectedRoleId ? 'Update Role' : 'Create Role'}
        </Button>
      </Card>
      <h3>Existing Roles</h3>
      {roles.map(role => (
        <Card key={role.id}>
          <p>{role.name} (Hierarchy: {role.hierarchy})</p>
          <Button onClick={() => selectRole(role)}>Edit</Button>
        </Card>
      ))}
      <h3>Promote/Demote User</h3>
      <Input
        type="text"
        placeholder="User ID"
        value={promoteUserId}
        onChange={(e) => setPromoteUserId(e.target.value)}
      />
      <Input
        type="text"
        placeholder="Role ID"
        value={promoteRoleId}
        onChange={(e) => setPromoteRoleId(e.target.value)}
      />
      <Button onClick={promoteUser}>Update User Role</Button>
      <h3>Add Mod Note</h3>
      <Input
        type="text"
        placeholder="User ID"
        value={noteUserId}
        onChange={(e) => setNoteUserId(e.target.value)}
      />
      <Input
        type="text"
        placeholder="Note Content"
        value={noteContent}
        onChange={(e) => setNoteContent(e.target.value)}
      />
      <Button onClick={addModNote}>Add Note</Button>
      {modNotes.map(note => (
        <Card key={note.id}>
          <p>{note.note}</p>
          <p>By {note.created_by} at {new Date(note.created_at).toLocaleString()}</p>
        </Card>
      ))}
    </Card>
  );
};

export default AdminPanel;