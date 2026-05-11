-- ============================================================
-- CivicSense v2.0 — Complete MySQL Schema
-- Run: mysql -u root -p civicsense_db < schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS civicsense_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE civicsense_db;

-- Users
CREATE TABLE IF NOT EXISTS users (
    id               INT AUTO_INCREMENT PRIMARY KEY,
    username         VARCHAR(80)  NOT NULL UNIQUE,
    email            VARCHAR(200) NOT NULL UNIQUE,
    password_hash    VARCHAR(255) NOT NULL,
    full_name        VARCHAR(200),
    bio              TEXT,
    phone            VARCHAR(20),
    city             VARCHAR(100),
    state            VARCHAR(100),
    role             VARCHAR(20)  DEFAULT 'citizen',
    is_active        BOOLEAN      DEFAULT TRUE,
    is_verified      BOOLEAN      DEFAULT FALSE,
    avatar_url       VARCHAR(500),
    issues_reported  INT          DEFAULT 0,
    helps_given      INT          DEFAULT 0,
    reputation_score INT          DEFAULT 0,
    created_at       DATETIME     DEFAULT CURRENT_TIMESTAMP,
    last_login       DATETIME,
    INDEX idx_username (username),
    INDEX idx_email    (email),
    INDEX idx_role     (role)
);

-- Issues
CREATE TABLE IF NOT EXISTS issues (
    id                   INT AUTO_INCREMENT PRIMARY KEY,
    title                VARCHAR(200) NOT NULL,
    description          TEXT NOT NULL,
    category             VARCHAR(100) NOT NULL,
    subcategory          VARCHAR(100),
    latitude             FLOAT,
    longitude            FLOAT,
    location_text        VARCHAR(300),
    ward                 VARCHAR(100),
    pincode              VARCHAR(10),
    image_url            VARCHAR(500),
    image_url_2          VARCHAR(500),
    is_anonymous         BOOLEAN  DEFAULT TRUE,
    reporter_name        VARCHAR(100),
    user_id              INT,
    upvotes              INT      DEFAULT 0,
    views                INT      DEFAULT 0,
    status               VARCHAR(50)  DEFAULT 'Reported',
    priority             VARCHAR(20)  DEFAULT 'Normal',
    assigned_to          VARCHAR(200),
    authority_note       TEXT,
    resolved_at          DATETIME,
    expected_resolution  DATETIME,
    is_duplicate         BOOLEAN  DEFAULT FALSE,
    tags                 VARCHAR(500),
    created_at           DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at           DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_status   (status),
    INDEX idx_category (category),
    INDEX idx_priority (priority),
    INDEX idx_created  (created_at)
);

-- Issue upvotes (dedup)
CREATE TABLE IF NOT EXISTS issue_upvotes (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    issue_id   INT NOT NULL,
    user_id    INT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id) REFERENCES issues(id) ON DELETE CASCADE,
    UNIQUE KEY uq_issue_user_upvote (issue_id, user_id),
    INDEX idx_issue (issue_id)
);

-- Comments (threaded)
CREATE TABLE IF NOT EXISTS comments (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    issue_id     INT NOT NULL,
    user_id      INT,
    content      TEXT NOT NULL,
    is_anonymous BOOLEAN DEFAULT TRUE,
    author_name  VARCHAR(100),
    is_authority BOOLEAN DEFAULT FALSE,
    likes        INT     DEFAULT 0,
    parent_id    INT,
    is_deleted   BOOLEAN DEFAULT FALSE,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (issue_id)  REFERENCES issues(id)   ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE SET NULL,
    INDEX idx_issue (issue_id)
);

-- Disaster alerts
CREATE TABLE IF NOT EXISTS alerts (
    id                INT AUTO_INCREMENT PRIMARY KEY,
    alert_type        VARCHAR(100) NOT NULL,
    severity          VARCHAR(50)  DEFAULT 'Moderate',
    title             VARCHAR(300) NOT NULL,
    description       TEXT NOT NULL,
    region            VARCHAR(300),
    district          VARCHAR(200),
    state             VARCHAR(100),
    latitude          FLOAT,
    longitude         FLOAT,
    radius_km         FLOAT,
    instructions      TEXT,
    do_list           TEXT,
    dont_list         TEXT,
    contacts          TEXT,
    shelter_locations TEXT,
    source            VARCHAR(200),
    source_url        VARCHAR(500),
    is_active         BOOLEAN  DEFAULT TRUE,
    created_by        INT,
    views             INT      DEFAULT 0,
    created_at        DATETIME DEFAULT CURRENT_TIMESTAMP,
    expires_at        DATETIME,
    FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_active  (is_active),
    INDEX idx_type    (alert_type),
    INDEX idx_created (created_at)
);

-- Help requests & offers
CREATE TABLE IF NOT EXISTS help_requests (
    id             INT AUTO_INCREMENT PRIMARY KEY,
    request_type   VARCHAR(20)  NOT NULL,
    category       VARCHAR(100) NOT NULL,
    title          VARCHAR(200),
    description    TEXT NOT NULL,
    quantity       VARCHAR(100),
    urgency        VARCHAR(20)  DEFAULT 'Normal',
    latitude       FLOAT,
    longitude      FLOAT,
    location_text  VARCHAR(300),
    pincode        VARCHAR(10),
    contact_info   VARCHAR(300),
    contact_method VARCHAR(50),
    is_anonymous   BOOLEAN  DEFAULT TRUE,
    name           VARCHAR(100),
    user_id        INT,
    is_fulfilled   BOOLEAN  DEFAULT FALSE,
    fulfilled_note TEXT,
    views          INT      DEFAULT 0,
    expires_at     DATETIME,
    created_at     DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type      (request_type),
    INDEX idx_fulfilled (is_fulfilled),
    INDEX idx_category  (category)
);

-- Stories
CREATE TABLE IF NOT EXISTS stories (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    title        VARCHAR(300) NOT NULL,
    content      TEXT NOT NULL,
    moral        TEXT,
    dharma_tag   VARCHAR(100),
    related_epic VARCHAR(100),
    quote        TEXT,
    quote_source VARCHAR(200),
    is_anonymous BOOLEAN DEFAULT TRUE,
    author_name  VARCHAR(100),
    user_id      INT,
    likes        INT     DEFAULT 0,
    views        INT     DEFAULT 0,
    is_featured  BOOLEAN DEFAULT FALSE,
    is_approved  BOOLEAN DEFAULT TRUE,
    created_at   DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_dharma_tag (dharma_tag),
    INDEX idx_featured   (is_featured)
);

-- Offline/SOS messages
CREATE TABLE IF NOT EXISTS offline_messages (
    id           INT AUTO_INCREMENT PRIMARY KEY,
    message_type VARCHAR(100) NOT NULL,
    custom_text  TEXT,
    latitude     FLOAT,
    longitude    FLOAT,
    accuracy_m   FLOAT,
    device_id    VARCHAR(200),
    user_id      INT,
    is_resolved  BOOLEAN  DEFAULT FALSE,
    synced_at    DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_type    (message_type),
    INDEX idx_device  (device_id),
    INDEX idx_synced  (synced_at)
);

-- Notifications
CREATE TABLE IF NOT EXISTS notifications (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT NOT NULL,
    type       VARCHAR(50) NOT NULL,
    title      VARCHAR(200) NOT NULL,
    message    TEXT,
    link       VARCHAR(300),
    is_read    BOOLEAN  DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user    (user_id),
    INDEX idx_is_read (is_read),
    INDEX idx_created (created_at)
);

-- Audit log
CREATE TABLE IF NOT EXISTS audit_logs (
    id         INT AUTO_INCREMENT PRIMARY KEY,
    user_id    INT,
    action     VARCHAR(100) NOT NULL,
    entity     VARCHAR(50),
    entity_id  INT,
    detail     TEXT,
    ip_address VARCHAR(45),
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_action  (action),
    INDEX idx_created (created_at)
);
