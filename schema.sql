CREATE DATABASE arch_ss;
USE arch_ss;

CREATE TABLE users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  username VARCHAR(50) NOT NULL UNIQUE,
  email VARCHAR(100) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  role_id INT NOT NULL,
  roblox_username VARCHAR(50),
  banned BOOLEAN DEFAULT FALSE,
  flagged BOOLEAN DEFAULT FALSE,
  pfp_url VARCHAR(255),
  bio TEXT,
  ip_address VARCHAR(45),
  discord_username VARCHAR(50),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (role_id) REFERENCES roles(id)
);

CREATE TABLE roles (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  hierarchy INT NOT NULL UNIQUE,
  permissions JSON NOT NULL,
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE games (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  access_level ENUM('Public', 'Whitelisted', 'Premium') DEFAULT 'Public',
  ping_key VARCHAR(36) NOT NULL,
  approved_by INT,
  status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
  FOREIGN KEY (approved_by) REFERENCES users(id)
);

CREATE TABLE servers (
  id INT AUTO_INCREMENT PRIMARY KEY,
  game_id INT NOT NULL,
  roblox_server_id VARCHAR(50) NOT NULL,
  player_count INT NOT NULL,
  ping_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY (game_id, roblox_server_id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE scripts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  script_id VARCHAR(50) NOT NULL,
  executed_by INT,
  target_user VARCHAR(50),
  game_id INT,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (executed_by) REFERENCES users(id),
  FOREIGN KEY (game_id) REFERENCES games(id)
);

CREATE TABLE logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  type ENUM('game_ping', 'api_key_created', 'game_approved', 'ban', 'script_execution', 'chat_message', 'forum_post', 'forum_moderation', 'announcement', 'settings_update', 'ticket_created', 'ticket_updated', 'role_created', 'role_updated', 'mod_note') NOT NULL,
  actor_id INT,
  target_id INT,
  action_data JSON,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (actor_id) REFERENCES users(id),
  FOREIGN KEY (target_id) REFERENCES users(id)
);

CREATE TABLE api_keys (
  id INT AUTO_INCREMENT PRIMARY KEY,
  `key` VARCHAR(36) NOT NULL UNIQUE,
  model_id VARCHAR(50),
  created_by INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (created_by) REFERENCES users(id)
);

CREATE TABLE chat_messages (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  message TEXT NOT NULL,
  timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE forums (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  parent_id INT,
  pinned BOOLEAN DEFAULT FALSE,
  locked BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (parent_id) REFERENCES forums(id)
);

CREATE TABLE announcements (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  content TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE settings (
  id INT AUTO_INCREMENT PRIMARY KEY,
  key VARCHAR(50) NOT NULL UNIQUE,
  value TEXT NOT NULL,
  updated_by INT,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (updated_by) REFERENCES users(id)
);

CREATE TABLE tickets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  title VARCHAR(100) NOT NULL,
  content TEXT NOT NULL,
  status ENUM('open', 'in_progress', 'closed') DEFAULT 'open',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

CREATE TABLE mod_notes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  note TEXT NOT NULL,
  created_by INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id),
  FOREIGN KEY (created_by) REFERENCES users(id)
);

-- Default Data
INSERT INTO roles (name, hierarchy, permissions, created_by) VALUES
  ('User', 0, '{"AccessGamesTab": false, "UseExecutor": false, "AccessPremiumGames": false, "ViewGameServerPings": false, "ApproveGameAccess": false, "PromoteDemoteUsers": false, "WhitelistUsers": false, "BanAccounts": false, "IPBan": false, "AccessScriptHub": false, "ViewScriptLogs": false, "ViewAuditLogs": false, "ViewBannedUsers": false, "ViewPrivateData": false}', NULL),
  ('Whitelisted', 1, '{"AccessGamesTab": true, "UseExecutor": true, "AccessPremiumGames": false, "ViewGameServerPings": false, "ApproveGameAccess": false, "PromoteDemoteUsers": false, "WhitelistUsers": false, "BanAccounts": false, "IPBan": false, "AccessScriptHub": false, "ViewScriptLogs": false, "ViewAuditLogs": false, "ViewBannedUsers": false, "ViewPrivateData": false}', NULL),
  ('Premium', 2, '{"AccessGamesTab": true, "UseExecutor": true, "AccessPremiumGames": true, "ViewGameServerPings": false, "ApproveGameAccess": false, "PromoteDemoteUsers": false, "WhitelistUsers": false, "BanAccounts": false, "IPBan": false, "AccessScriptHub": false, "ViewScriptLogs": false, "ViewAuditLogs": false, "ViewBannedUsers": false, "ViewPrivateData": false}', NULL),
  ('Moderator', 3, '{"AccessGamesTab": true, "UseExecutor": true, "AccessPremiumGames": true, "ViewGameServerPings": false, "ApproveGameAccess": false, "PromoteDemoteUsers": false, "WhitelistUsers": true, "BanAccounts": true, "IPBan": false, "AccessScriptHub": true, "ViewScriptLogs": true, "ViewAuditLogs": true, "ViewBannedUsers": true, "ViewPrivateData": false}', NULL),
  ('Admin', 4, '{"AccessGamesTab": true, "UseExecutor": true, "AccessPremiumGames": true, "ViewGameServerPings": true, "ApproveGameAccess": true, "PromoteDemoteUsers": true, "WhitelistUsers": true, "BanAccounts": true, "IPBan": true, "AccessScriptHub": true, "ViewScriptLogs": true, "ViewAuditLogs": true, "ViewBannedUsers": true, "ViewPrivateData": true}', NULL),
  ('Owner', 5, '{"AccessGamesTab": true, "UseExecutor": true, "AccessPremiumGames": true, "ViewGameServerPings": true, "ApproveGameAccess": true, "PromoteDemoteUsers": true, "WhitelistUsers": true, "BanAccounts": true, "IPBan": true, "AccessScriptHub": true, "ViewScriptLogs": true, "ViewAuditLogs": true, "ViewBannedUsers": true, "ViewPrivateData": true}', NULL);

INSERT INTO settings (key, value, updated_by) VALUES
  ('discord_link', 'https://discord.gg/example', NULL),
  ('payment_enabled', 'false', NULL),
  ('payment_link', 'https://buy.stripe.com/example', NULL),
  ('discord_webhook', 'https://discord.com/api/webhooks/example', NULL);

INSERT INTO api_keys (`key`, model_id, created_by) VALUES
  ('TEST_API_KEY_12345', 'test-model', NULL);