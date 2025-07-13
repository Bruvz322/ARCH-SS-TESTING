const express = require('express');
const mysql = require('mysql2/promise');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const app = express();

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json());
app.use(rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// MySQL Connection
const pool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'arch_ss',
  waitForConnections: true,
  connectionLimit: 10,
});

// Middleware to Verify JWT
const authenticate = async (req, res, next) => {
  const token = req.headers.authorization?.split(' ')[1];
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Middleware to Verify API Key
const verifyApiKey = async (req, res, next) => {
  const apiKey = req.headers['x-api-key'];
  if (!apiKey) return res.status(401).json({ error: 'API key required' });
  const [rows] = await pool.query('SELECT * FROM api_keys WHERE `key` = ?', [apiKey]);
  if (rows.length === 0) return res.status(401).json({ error: 'Invalid API key' });
  req.apiKey = rows[0];
  next();
};

// Middleware to Check Permissions
const checkPermission = (permission) => async (req, res, next) => {
  const [rows] = await pool.query('SELECT permissions FROM roles WHERE id = ?', [req.user.role_id]);
  if (rows.length === 0) return res.status(403).json({ error: 'Role not found' });
  const permissions = JSON.parse(rows[0].permissions);
  if (!permissions[permission]) return res.status(403).json({ error: 'Insufficient permissions' });
  next();
};

// Middleware to Check Role Hierarchy
const checkRoleHierarchy = async (req, res, next) => {
  const [userRole] = await pool.query('SELECT hierarchy FROM roles WHERE id = ?', [req.user.role_id]);
  const targetRoleId = req.body.role_id || req.body.target_role_id || req.params.id;
  const [targetRole] = await pool.query('SELECT hierarchy FROM roles WHERE id = ?', [targetRoleId]);
  if (targetRole.length > 0 && userRole[0].hierarchy <= targetRole[0].hierarchy) {
    return res.status(403).json({ error: 'Cannot modify roles equal or higher than your own' });
  }
  next();
};

// Send Discord Webhook
const sendWebhook = async (message) => {
  const [settings] = await pool.query('SELECT value FROM settings WHERE `key` = ?', ['discord_webhook']);
  if (settings.length === 0) return;
  try {
    await axios.post(settings[0].value, { content: message });
  } catch (err) {
    console.error('Webhook failed:', err.message);
  }
};

// User Registration
app.post('/api/register', async (req, res) => {
  const { username, email, password, roblox_username, discord_username } = req.body;
  if (!username || !email || !password) return res.status(400).json({ error: 'Missing required fields' });
  const password_hash = await bcrypt.hash(password, 10);
  try {
    const [roles] = await pool.query('SELECT id FROM roles WHERE name = ?', ['User']);
    await pool.query(
      'INSERT INTO users (username, email, password_hash, role_id, roblox_username, discord_username, ip_address) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [username, email, password_hash, roles[0].id, roblox_username, discord_username, req.ip]
    );
    res.status(201).json({ message: 'User registered' });
  } catch (err) {
    res.status(500).json({ error: 'Registration failed' });
  }
});

// User Login
app.post('/api/login', async (req, res) => {
  const { email, password } = req.body;
  const [rows] = await pool.query('SELECT * FROM users WHERE email = ?', [email]);
  if (rows.length === 0) return res.status(401).json({ error: 'Invalid credentials' });
  const user = rows[0];
  if (user.banned) return res.status(403).json({ error: 'Account banned' });
  const match = await bcrypt.compare(password, user.password_hash);
  if (!match) return res.status(401).json({ error: 'Invalid credentials' });
  const token = jwt.sign({ id: user.id, role_id: user.role_id }, JWT_SECRET, { expiresIn: '1h' });
  res.json({ token });
});

// Get User Profile
app.get('/api/user', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT u.*, r.name AS role FROM users u JOIN roles r ON u.role_id = r.id WHERE u.id = ?', [req.user.id]);
    res.json(rows[0]);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch user' });
  }
});

// Game Ping
app.post('/api/game/ping', verifyApiKey, async (req, res) => {
  const { game_id, roblox_server_id, player_count } = req.body;
  if (!game_id || !roblox_server_id || !Number.isInteger(player_count)) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
    const [gameRows] = await pool.query('SELECT * FROM games WHERE id = ?', [game_id]);
    if (gameRows.length === 0) return res.status(404).json({ error: 'Game not found' });
    await pool.query(
      'INSERT INTO servers (game_id, roblox_server_id, player_count, ping_timestamp) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE player_count = ?, ping_timestamp = NOW()',
      [game_id, roblox_server_id, player_count, player_count]
    );
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'game_ping',
      null,
      JSON.stringify({ game_id, roblox_server_id, player_count }),
    ]);
    res.json({ message: 'Ping recorded' });
  } catch (err) {
    res.status(500).json({ error: 'Ping failed' });
  }
});

// Get Games
app.get('/api/games', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT g.*, COALESCE(SUM(s.player_count), 0) as player_count FROM games g LEFT JOIN servers s ON g.id = s.game_id WHERE g.status = "approved" GROUP BY g.id');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Admin: Get Games
app.get('/api/admin/games', authenticate, checkPermission('ApproveGameAccess'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM games');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch games' });
  }
});

// Admin: Generate API Key
app.post('/api/admin/api-keys', authenticate, checkPermission('ApproveGameAccess'), async (req, res) => {
  const { model_id } = req.body;
  if (!model_id) return res.status(400).json({ error: 'Model ID required' });
  const apiKey = uuidv4();
  try {
    await pool.query('INSERT INTO api_keys (`key`, model_id, created_by, created_at) VALUES (?, ?, ?, NOW())', [
      apiKey,
      model_id,
      req.user.id,
    ]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'api_key_created',
      req.user.id,
      JSON.stringify({ model_id, apiKey }),
    ]);
    await sendWebhook(`API key generated for model ${model_id} by user ${req.user.id}`);
    res.json({ apiKey });
  } catch (err) {
    res.status(500).json({ error: 'Failed to generate API key' });
  }
});

// Admin: Approve Game
app.post('/api/admin/games/approve', authenticate, checkPermission('ApproveGameAccess'), async (req, res) => {
  const { game_id, access_level } = req.body;
  if (!['Public', 'Whitelisted', 'Premium'].includes(access_level)) {
    return res.status(400).json({ error: 'Invalid access level' });
  }
  try {
    await pool.query('UPDATE games SET access_level = ?, approved_by = ?, status = ? WHERE id = ?', [
      access_level,
      req.user.id,
      'approved',
      game_id,
    ]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'game_approved',
      req.user.id,
      JSON.stringify({ game_id, access_level }),
    ]);
    await sendWebhook(`Game ${game_id} approved with ${access_level} access by user ${req.user.id}`);
    res.json({ message: 'Game approved' });
  } catch (err) {
    res.status(500).json({ error: 'Approval failed' });
  }
});

// Admin: Ban User
app.post('/api/admin/ban', authenticate, checkPermission('BanAccounts'), async (req, res) => {
  const { user_id, reason } = req.body;
  if (!user_id || !reason) return res.status(400).json({ error: 'User ID and reason required' });
  try {
    await pool.query('UPDATE users SET banned = true WHERE id = ?', [user_id]);
    await pool.query('INSERT INTO logs (type, actor_id, target_id, action_data, timestamp) VALUES (?, ?, ?, ?, NOW())', [
      'ban',
      req.user.id,
      user_id,
      JSON.stringify({ reason }),
    ]);
    await sendWebhook(`User ${user_id} banned by user ${req.user.id}: ${reason}`);
    res.json({ message: 'User banned' });
  } catch (err) {
    res.status(500).json({ error: 'Ban failed' });
  }
});

// Executor: Run Script
app.post('/api/executor/run', authenticate, checkPermission('UseExecutor'), verifyApiKey, async (req, res) => {
  const { game_id, script_id, target_user } = req.body;
  if (!game_id || !script_id || !target_user) return res.status(400).json({ error: 'Missing required fields' });
  try {
    await pool.query(
      'INSERT INTO scripts (script_id, executed_by, target_user, game_id, timestamp) VALUES (?, ?, ?, ?, NOW())',
      [script_id, req.user.id, target_user, game_id]
    );
    await pool.query('INSERT INTO logs (type, actor_id, target_id, action_data, timestamp) VALUES (?, ?, ?, ?, NOW())', [
      'script_execution',
      req.user.id,
      target_user,
      JSON.stringify({ game_id, script_id }),
    ]);
    await sendWebhook(`Script ${script_id} executed by user ${req.user.id} on ${target_user} in game ${game_id}`);
    res.json({ message: 'Script executed' });
  } catch (err) {
    res.status(500).json({ error: 'Execution failed' });
  }
});

// Chat Messages
app.get('/api/chat', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT c.*, u.username FROM chat_messages c JOIN users u ON c.user_id = u.id ORDER BY c.timestamp DESC LIMIT 50');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch chat messages' });
  }
});

app.post('/api/chat', authenticate, async (req, res) => {
  const { message } = req.body;
  if (!message || message.length > 500) return res.status(400).json({ error: 'Invalid message' });
  try {
    await pool.query('INSERT INTO chat_messages (user_id, message, timestamp) VALUES (?, ?, NOW())', [req.user.id, message]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'chat_message',
      req.user.id,
      JSON.stringify({ message }),
    ]);
    res.json({ message: 'Message sent' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send message' });
  }
});

// Forum Threads
app.get('/api/forums', authenticate, async (req, res) => {
  try {
    const [threads] = await pool.query('SELECT f.*, u.username FROM forums f JOIN users u ON f.user_id = u.id WHERE f.parent_id IS NULL ORDER BY f.pinned DESC, f.created_at DESC');
    res.json(threads);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch threads' });
  }
});

app.post('/api/forums', authenticate, async (req, res) => {
  const { title, content, parent_id } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  try {
    await pool.query('INSERT INTO forums (user_id, title, content, parent_id, created_at) VALUES (?, ?, ?, ?, NOW())', [
      req.user.id,
      title,
      content,
      parent_id || null,
    ]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'forum_post',
      req.user.id,
      JSON.stringify({ title, parent_id }),
    ]);
    res.json({ message: 'Thread/reply posted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post thread' });
  }
});

app.post('/api/forums/moderate', authenticate, checkPermission('WhitelistUsers'), async (req, res) => {
  const { thread_id, action } = req.body;
  if (!['pin', 'lock', 'delete'].includes(action)) return res.status(400).json({ error: 'Invalid action' });
  try {
    if (action === 'pin') {
      await pool.query('UPDATE forums SET pinned = NOT pinned WHERE id = ?', [thread_id]);
    } else if (action === 'lock') {
      await pool.query('UPDATE forums SET locked = NOT locked WHERE id = ?', [thread_id]);
    } else if (action === 'delete') {
      await pool.query('DELETE FROM forums WHERE id = ? OR parent_id = ?', [thread_id, thread_id]);
    }
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'forum_moderation',
      req.user.id,
      JSON.stringify({ thread_id, action }),
    ]);
    res.json({ message: `Thread ${action}ed` });
  } catch (err) {
    res.status(500).json({ error: 'Moderation failed' });
  }
});

// Announcements
app.get('/api/announcements', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT a.*, u.username FROM announcements a JOIN users u ON a.user_id = u.id ORDER BY a.created_at DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements' });
  }
});

app.post('/api/announcements', authenticate, checkPermission('ApproveGameAccess'), async (req, res) => {
  const { content } = req.body;
  if (!content) return res.status(400).json({ error: 'Content required' });
  try {
    await pool.query('INSERT INTO announcements (user_id, content, created_at) VALUES (?, ?, NOW())', [req.user.id, content]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'announcement',
      req.user.id,
      JSON.stringify({ content }),
    ]);
    await sendWebhook(`Announcement posted by user ${req.user.id}: ${content}`);
    res.json({ message: 'Announcement posted' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to post announcement' });
  }
});

// Script Hub
app.get('/api/scripts', authenticate, checkPermission('AccessScriptHub'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT s.*, u.username AS executed_by, g.name AS game_name FROM scripts s JOIN users u ON s.executed_by = u.id JOIN games g ON s.game_id = g.id ORDER BY s.timestamp DESC');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch script logs' });
  }
});

// Settings (Discord Link, Payment, Webhook)
app.get('/api/settings/:key', async (req, res) => {
  const { key } = req.params;
  try {
    const [rows] = await pool.query('SELECT value FROM settings WHERE `key` = ?', [key]);
    if (rows.length === 0) return res.status(404).json({ error: 'Setting not found' });
    res.json({ [key]: rows[0].value });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch setting' });
  }
});

app.post('/api/admin/settings/:key', authenticate, checkPermission('ApproveGameAccess'), async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;
  if (key === 'discord_link' && value && !value.match(/^https:\/\/discord\.gg\/[a-zA-Z0-9]+$/)) {
    return res.status(400).json({ error: 'Invalid Discord invite link' });
  }
  if (key === 'payment_link' && value && !value.match(/^https:\/\/(buy\.stripe\.com|paypal\.me)\/.+$/)) {
    return res.status(400).json({ error: 'Invalid payment link' });
  }
  if (key === 'payment_enabled' && !['true', 'false'].includes(value)) {
    return res.status(400).json({ error: 'Invalid payment enabled value' });
  }
  if (key === 'discord_webhook' && value && !value.match(/^https:\/\/discord\.com\/api\/webhooks\/.+$/)) {
    return res.status(400).json({ error: 'Invalid Discord webhook URL' });
  }
  try {
    await pool.query(
      'INSERT INTO settings (`key`, value, updated_by, updated_at) VALUES (?, ?, ?, NOW()) ON DUPLICATE KEY UPDATE value = ?, updated_by = ?, updated_at = NOW()',
      [key, value, req.user.id, value, req.user.id]
    );
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'settings_update',
      req.user.id,
      JSON.stringify({ key, value }),
    ]);
    await sendWebhook(`Setting ${key} updated to ${value} by user ${req.user.id}`);
    res.json({ message: 'Setting updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update setting' });
  }
});

// Support Tickets
app.get('/api/tickets', authenticate, async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT t.*, u.username FROM tickets t JOIN users u ON t.user_id = u.id WHERE t.user_id = ? OR ? IN (SELECT id FROM roles WHERE hierarchy >= 4) ORDER BY t.created_at DESC',
      [req.user.id, req.user.role_id]
    );
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch tickets' });
  }
});

app.post('/api/tickets', authenticate, async (req, res) => {
  const { title, content } = req.body;
  if (!title || !content) return res.status(400).json({ error: 'Title and content required' });
  try {
    await pool.query('INSERT INTO tickets (user_id, title, content, created_at) VALUES (?, ?, ?, NOW())', [req.user.id, title, content]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'ticket_created',
      req.user.id,
      JSON.stringify({ title }),
    ]);
    await sendWebhook(`Ticket "${title}" created by user ${req.user.id}`);
    res.json({ message: 'Ticket created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create ticket' });
  }
});

app.post('/api/admin/tickets/:id', authenticate, checkPermission('ApproveGameAccess'), async (req, res) => {
  const { id } = req.params;
  const { status } = req.body;
  if (!['open', 'in_progress', 'closed'].includes(status)) return res.status(400).json({ error: 'Invalid status' });
  try {
    await pool.query('UPDATE tickets SET status = ?, updated_at = NOW() WHERE id = ?', [status, id]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'ticket_updated',
      req.user.id,
      JSON.stringify({ ticket_id: id, status }),
    ]);
    await sendWebhook(`Ticket ${id} updated to ${status} by user ${req.user.id}`);
    res.json({ message: 'Ticket updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update ticket' });
  }
});

// Mod Notes
app.post('/api/admin/mod-notes', authenticate, checkPermission('WhitelistUsers'), async (req, res) => {
  const { user_id, note } = req.body;
  if (!user_id || !note) return res.status(400).json({ error: 'User ID and note required' });
  try {
    await pool.query('INSERT INTO mod_notes (user_id, note, created_by, created_at) VALUES (?, ?, ?, NOW())', [user_id, note, req.user.id]);
    await pool.query('UPDATE users SET flagged = true WHERE id = ?', [user_id]);
    await pool.query('INSERT INTO logs (type, actor_id, target_id, action_data, timestamp) VALUES (?, ?, ?, ?, NOW())', [
      'mod_note',
      req.user.id,
      user_id,
      JSON.stringify({ note }),
    ]);
    await sendWebhook(`Mod note added for user ${user_id} by user ${req.user.id}: ${note}`);
    res.json({ message: 'Mod note added' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to add mod note' });
  }
});

app.get('/api/admin/mod-notes/:user_id', authenticate, checkPermission('WhitelistUsers'), async (req, res) => {
  const { user_id } = req.params;
  try {
    const [rows] = await pool.query('SELECT m.*, u.username AS created_by FROM mod_notes m JOIN users u ON m.created_by = u.id WHERE m.user_id = ?', [user_id]);
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch mod notes' });
  }
});

// Role Management
app.get('/api/admin/roles', authenticate, checkPermission('PromoteDemoteUsers'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM roles');
    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

app.post('/api/admin/roles', authenticate, checkPermission('PromoteDemoteUsers'), async (req, res) => {
  const { name, hierarchy, permissions } = req.body;
  if (!name || !Number.isInteger(hierarchy) || !permissions) return res.status(400).json({ error: 'Name, hierarchy, and permissions required' });
  try {
    const [userRole] = await pool.query('SELECT hierarchy FROM roles WHERE id = ?', [req.user.role_id]);
    if (userRole[0].hierarchy <= hierarchy) return res.status(403).json({ error: 'Cannot create roles equal or higher than your own' });
    await pool.query('INSERT INTO roles (name, hierarchy, permissions, created_by, created_at) VALUES (?, ?, ?, ?, NOW())', [
      name,
      hierarchy,
      JSON.stringify(permissions),
      req.user.id,
    ]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'role_created',
      req.user.id,
      JSON.stringify({ name, hierarchy }),
    ]);
    await sendWebhook(`Role ${name} created by user ${req.user.id}`);
    res.json({ message: 'Role created' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create role' });
  }
});

app.put('/api/admin/roles/:id', authenticate, checkPermission('PromoteDemoteUsers'), checkRoleHierarchy, async (req, res) => {
  const { id } = req.params;
  const { name, hierarchy, permissions } = req.body;
  if (!name || !Number.isInteger(hierarchy) || !permissions) return res.status(400).json({ error: 'Name, hierarchy, and permissions required' });
  try {
    await pool.query('UPDATE roles SET name = ?, hierarchy = ?, permissions = ? WHERE id = ?', [
      name,
      hierarchy,
      JSON.stringify(permissions),
      id,
    ]);
    await pool.query('INSERT INTO logs (type, actor_id, action_data, timestamp) VALUES (?, ?, ?, NOW())', [
      'role_updated',
      req.user.id,
      JSON.stringify({ role_id: id, name, hierarchy }),
    ]);
    await sendWebhook(`Role ${id} updated by user ${req.user.id}`);
    res.json({ message: 'Role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// Admin: Promote/Demote User
app.post('/api/admin/users/promote', authenticate, checkPermission('PromoteDemoteUsers'), checkRoleHierarchy, async (req, res) => {
  const { user_id, role_id } = req.body;
  if (!user_id || !role_id) return res.status(400).json({ error: 'User ID and role ID required' });
  try {
    await pool.query('UPDATE users SET role_id = ? WHERE id = ?', [role_id, user_id]);
    await pool.query('INSERT INTO logs (type, actor_id, target_id, action_data, timestamp) VALUES (?, ?, ?, ?, NOW())', [
      'role_updated',
      req.user.id,
      user_id,
      JSON.stringify({ role_id }),
    ]);
    await sendWebhook(`User ${user_id} promoted to role ${role_id} by user ${req.user.id}`);
    res.json({ message: 'User role updated' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

app.listen(PORT, () => console.log(`Server running on port ${PORT}`));