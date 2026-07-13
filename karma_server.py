# """
# karma_server.py
# ─────────────────────────────────────────────────
# Flask backend for KARMA.
# Reads/writes karma.db (SQLite) on your machine.

# SETUP (run once):
#     pip install flask flask-cors

# RUN:
#     python karma_server.py

# Then open Karma.html via Live Server (port 5500).
# ─────────────────────────────────────────────────
# """

# import sqlite3
# import hashlib
# import hmac
# import re
# from flask import Flask, request, jsonify, send_from_directory
# from flask_cors import CORS
# import os
# import uuid

# app = Flask(__name__)
# CORS(app)
# @app.route('/')
# def serve_home():
#     return send_from_directory('.', 'welcome.html')
# @app.route('/<path:filename>')
# def serve_static(filename):
#     return send_from_directory('.', filename)

# DB   = 'karma.db'
# SALT = 'KARMA_SALT_2025'
# UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
# os.makedirs(UPLOAD_FOLDER, exist_ok=True)
# app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


# # ── DB setup ──────────────────────────────────────

# def connect():
#     conn = sqlite3.connect(DB)
#     conn.row_factory = sqlite3.Row
#     return conn

# def init_db():
#     with connect() as conn:
#         # Users table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS Users (
#                 user_id         INTEGER PRIMARY KEY AUTOINCREMENT,
#                 email           TEXT UNIQUE NOT NULL,
#                 full_name       TEXT,
#                 username        TEXT UNIQUE,
#                 bio             TEXT,
#                 avatar_url      TEXT,
#                 role            TEXT DEFAULT 'Individual',
#                 locality        TEXT,
#                 karma_coins     INTEGER DEFAULT 0,
#                 total_donations INTEGER DEFAULT 0,
#                 trust_score     INTEGER DEFAULT 0,
#                 created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#             )
#         ''')
#         # Add password_hash if not already there (safe no-op if present)
#         try:
#             conn.execute('ALTER TABLE Users ADD COLUMN password_hash TEXT')
#         except Exception:
#             pass

#         # Posts / Deeds table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS Posts (
#                 post_id         INTEGER PRIMARY KEY AUTOINCREMENT,
#                 user_email      TEXT NOT NULL,
#                 category        TEXT NOT NULL,  -- 'deed' or 'awaaz'
#                 content         TEXT,
#                 media_url       TEXT,           -- Path to uploaded file
#                 created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#             )
#         ''')
#         # Patch for existing Posts table lacking media_url
#         try:
#             conn.execute('ALTER TABLE Posts ADD COLUMN media_url TEXT')
#         except Exception:
#             pass

#         # Follows table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS Follows (
#                 follower_email  TEXT NOT NULL,
#                 following_email TEXT NOT NULL,
#                 PRIMARY KEY (follower_email, following_email)
#             )
#         ''')

#         # Comments table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS Comments (
#                 comment_id  INTEGER PRIMARY KEY AUTOINCREMENT,
#                 post_id     INTEGER NOT NULL,
#                 user_email  TEXT NOT NULL,
#                 content     TEXT NOT NULL,
#                 created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#             )
#         ''')

#         # Likes table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS Likes (
#                 post_id    INTEGER NOT NULL,
#                 user_email TEXT NOT NULL,
#                 PRIMARY KEY (post_id, user_email)
#             )
#         ''')
#         conn.commit()

#         # NGOs table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS NGOs (
#                 ngo_id      INTEGER PRIMARY KEY AUTOINCREMENT,
#                 name        TEXT NOT NULL,
#                 phone       TEXT,
#                 pincode     TEXT,
#                 city        TEXT,
#                 state       TEXT,
#                 category    TEXT DEFAULT 'both',
#                 website     TEXT,
#                 logo_emoji  TEXT DEFAULT '🤝'
#             )
#         ''')

#         # FoodDonations table
#         conn.execute('''
#             CREATE TABLE IF NOT EXISTS FoodDonations (
#                 donation_id      INTEGER PRIMARY KEY AUTOINCREMENT,
#                 donor_email      TEXT,
#                 food_type        TEXT,
#                 source_type      TEXT,
#                 quantity         INTEGER,
#                 pincode          TEXT,
#                 location_text    TEXT,
#                 is_anonymous     INTEGER DEFAULT 0,
#                 ngo_ids_notified TEXT,
#                 status           TEXT DEFAULT 'pending',
#                 created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
#             )
#         ''')

#         # Seed NGO data (only if empty)
#         existing = conn.execute('SELECT COUNT(*) as c FROM NGOs').fetchone()['c']
#         if existing == 0:
#             seed_ngos = [
#                 ('Robin Hood Army', '+91-9999999901', '110001', 'New Delhi', 'Delhi', 'food', 'https://robinhoodarmy.com', '🦸'),
#                 ('Goonj', '+91-9999999902', '110091', 'New Delhi', 'Delhi', 'both', 'https://goonj.org', '🌾'),
#                 ('Akshaya Patra', '+91-9999999903', '560001', 'Bengaluru', 'Karnataka', 'food', 'https://www.akshayapatra.org', '🍛'),
#                 ('GiveIndia Foundation', '+91-9999999904', '400001', 'Mumbai', 'Maharashtra', 'both', 'https://giveindia.org', '💚'),
#                 ('PM CARES Fund', '+91-9999999905', '110001', 'New Delhi', 'Delhi', 'money', 'https://pmcares.gov.in', '🇮🇳'),
#                 ('Feeding India by Zomato', '+91-9999999906', '751001', 'Bhubaneswar', 'Odisha', 'food', 'https://feedingindia.org', '🍱'),
#             ]
#             conn.executemany(
#                 'INSERT INTO NGOs (name, phone, pincode, city, state, category, website, logo_emoji) VALUES (?,?,?,?,?,?,?,?)',
#                 seed_ngos
#             )
#             print('  Seeded NGO data.')

#         conn.commit()
#     print('  karma.db is ready')


# # ── Helpers ───────────────────────────────────────

# def hash_pw(pw: str) -> str:
#     return hashlib.sha256((SALT + pw).encode()).hexdigest()

# def check_pw(pw: str, stored: str) -> bool:
#     return hmac.compare_digest(hash_pw(pw), stored or '')

# def valid_email(e: str) -> bool:
#     return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', e))


# # ── Routes ────────────────────────────────────────

# @app.route('/api/register', methods=['POST'])
# def register():
#     data     = request.get_json(force=True) or {}
#     email    = (data.get('email') or '').strip().lower()
#     password = (data.get('password') or '')

#     if not valid_email(email):
#         return jsonify({'ok': False, 'error': 'Enter a valid email address.'}), 400
#     if len(password) < 6:
#         return jsonify({'ok': False, 'error': 'Password must be at least 6 characters.'}), 400

#     try:
#         with connect() as conn:
#             conn.execute(
#                 'INSERT INTO Users (email, password_hash) VALUES (?, ?)',
#                 (email, hash_pw(password))
#             )
#             conn.commit()
#         print(f'  Registered: {email}')
#         return jsonify({'ok': True, 'message': 'Account created!'})

#     except sqlite3.IntegrityError:
#         return jsonify({'ok': False, 'error': 'An account with this email already exists.'}), 409
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/login', methods=['POST'])
# def login():
#     data     = request.get_json(force=True) or {}
#     email    = (data.get('email') or '').strip().lower()
#     password = (data.get('password') or '')

#     if not email or not password:
#         return jsonify({'ok': False, 'error': 'Email and password are required.'}), 400

#     with connect() as conn:
#         row = conn.execute('SELECT * FROM Users WHERE email = ?', (email,)).fetchone()

#     if not row:
#         return jsonify({'ok': False, 'error': 'No account found with this email.'}), 404
#     if not check_pw(password, row['password_hash']):
#         return jsonify({'ok': False, 'error': 'Incorrect password. Try again.'}), 401

#     print(f'  Login: {email}')
#     return jsonify({
#         'ok': True,
#         'user': {
#             'email':           row['email'],
#             'full_name':       row['full_name'],
#             'username':        row['username'],
#             'role':            row['role'],
#             'karma_coins':     row['karma_coins'],
#             'trust_score':     row['trust_score'],
#             'total_donations': row['total_donations'],
#         }
#     })


# @app.route('/api/profile', methods=['GET'])
# def get_profile():
#     email = request.args.get('email')
#     if not email:
#         return jsonify({'ok': False, 'error': 'Email is required'}), 400

#     with connect() as conn:
#         row = conn.execute('SELECT * FROM Users WHERE email = ?', (email,)).fetchone()
        
#         if not row:
#             return jsonify({'ok': False, 'error': 'User not found'}), 404

#         # Calculate Followers
#         followers_count = conn.execute('SELECT COUNT(*) FROM Follows WHERE following_email = ?', (email,)).fetchone()[0]
#         following_count = conn.execute('SELECT COUNT(*) FROM Follows WHERE follower_email = ?', (email,)).fetchone()[0]
        
#         # Coins are strictly rewarded based on donations (5 coins per donation)
#         dynamic_coins = (row['total_donations'] or 0) * 5

#     return jsonify({
#         'ok': True,
#         'user': {
#             'email':           row['email'],
#             'full_name':       row['full_name'],
#             'username':        row['username'],
#             'bio':             row['bio'],
#             'avatar_url':      row['avatar_url'],
#             'role':            row['role'],
#             'locality':        row['locality'],
#             'karma_coins':     dynamic_coins,
#             'total_donations': row['total_donations'],
#             'trust_score':     row['trust_score'],
#             'followers':       followers_count,
#             'following':       following_count
#         }
#     })


# @app.route('/api/profile/update', methods=['POST'])
# def update_profile():
#     # Attempt to handle as multipart form data first, then fallback to JSON
#     if request.content_type and 'multipart/form-data' in request.content_type:
#         email = request.form.get('email')
#         username = request.form.get('username')
#         full_name = request.form.get('full_name')
#         bio = request.form.get('bio')
#         role = request.form.get('occupation') or request.form.get('role')
#         locality = request.form.get('locality') or request.form.get('city')
#         avatar_file = request.files.get('avatar')
#     else:
#         data  = request.get_json(force=True) or {}
#         email = data.get('email')
#         username  = data.get('username')
#         full_name = data.get('full_name')
#         bio       = data.get('bio')
#         role      = data.get('occupation') or data.get('role')
#         locality  = data.get('locality') or data.get('city')
#         avatar_file = None

#     if not email:
#         return jsonify({'ok': False, 'error': 'Email is required to update profile'}), 400

#     avatar_url = None
#     if avatar_file and avatar_file.filename:
#         ext = os.path.splitext(avatar_file.filename)[1]
#         unique_filename = str(uuid.uuid4()) + ext
#         filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
#         avatar_file.save(filepath)
#         avatar_url = f'/uploads/{unique_filename}'

#     try:
#         with connect() as conn:
#             if avatar_url:
#                 conn.execute('''
#                     UPDATE Users 
#                     SET username=?, full_name=?, bio=?, role=?, locality=?, avatar_url=?
#                     WHERE email=?
#                 ''', (username, full_name, bio, role, locality, avatar_url, email))
#             else:
#                 conn.execute('''
#                     UPDATE Users 
#                     SET username=?, full_name=?, bio=?, role=?, locality=?
#                     WHERE email=?
#                 ''', (username, full_name, bio, role, locality, email))
#             conn.commit()
        
#         # Return the avatar_url so the frontend can update its state/local storage
#         return jsonify({'ok': True, 'message': 'Profile saved successfully!', 'avatar_url': avatar_url})

#     except sqlite3.IntegrityError:
#         return jsonify({'ok': False, 'error': 'Username is already taken.'}), 409
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/search', methods=['GET'])
# def search_users():
#     query = request.args.get('q', '').strip()
#     if not query:
#         return jsonify({'ok': True, 'users': []})

#     like_val = f'%{query}%'
#     try:
#         with connect() as conn:
#             rows = conn.execute('''
#                 SELECT email, username, full_name, role, avatar_url, locality
#                 FROM Users 
#                 WHERE username LIKE ? OR full_name LIKE ?
#                 LIMIT 50
#             ''', (like_val, like_val)).fetchall()
            
#             users = [dict(r) for r in rows]
#             return jsonify({'ok': True, 'users': users})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/posts', methods=['GET'])
# def get_posts():
#     viewer_email = request.args.get('viewer', '')
#     try:
#         with connect() as conn:
#             query = '''
#                 SELECT p.post_id AS id, p.category, p.content, p.media_url, p.created_at,
#                        u.email AS author_email, u.username AS author_username, u.avatar_url AS author_avatar,
#                        (SELECT COUNT(*) FROM Likes l WHERE l.post_id = p.post_id) AS likes,
#                        (SELECT COUNT(*) FROM Comments c WHERE c.post_id = p.post_id) AS comments,
#                        (SELECT COUNT(*) FROM Likes lv WHERE lv.post_id = p.post_id AND lv.user_email = ?) AS is_liked_by_viewer
#                 FROM Posts p
#                 JOIN Users u ON p.user_email = u.email
#                 ORDER BY p.created_at DESC
#                 LIMIT 50
#             '''
#             rows = conn.execute(query, [viewer_email]).fetchall()
#             posts = []
#             for r in rows:
#                 media_urls = []
#                 if r['media_url']:
#                     media_urls = r['media_url'].split(',')
#                 posts.append({
#                     'id': r['id'],
#                     'category': r['category'],
#                     'content': r['content'],
#                     'media_urls': media_urls,
#                     'created_at': r['created_at'],
#                     'author_email': r['author_email'],
#                     'author_username': r['author_username'] or 'User',
#                     'author_avatar': r['author_avatar'] or '',
#                     'likes': r['likes'],
#                     'comments': r['comments'],
#                     'is_liked_by_viewer': bool(r['is_liked_by_viewer'])
#                 })
#         return jsonify({'ok': True, 'posts': posts})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/posts', methods=['POST'])
# def create_post():
#     # Because we're expecting files, this must be multipart/form-data
#     email = request.form.get('email')
#     cat   = request.form.get('category')
#     content = request.form.get('content', '')
    
#     if not email or not cat:
#         return jsonify({'ok': False, 'error': 'Email and category required'}), 400

#     media_paths = []
    
#     # Handle multiple files (new flow)
#     if 'media_files' in request.files:
#         files = request.files.getlist('media_files')
#         for file in files:
#             if file and file.filename:
#                 ext = os.path.splitext(file.filename)[1]
#                 unique_filename = str(uuid.uuid4()) + ext
#                 filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
#                 file.save(filepath)
#                 media_paths.append(f'/api/uploads/{unique_filename}')
                
#     # Handle single file (legacy/cropper flow)
#     elif 'media_file' in request.files:
#         file = request.files['media_file']
#         if file and file.filename:
#             ext = os.path.splitext(file.filename)[1]
#             unique_filename = str(uuid.uuid4()) + ext
#             filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
#             file.save(filepath)
#             media_paths.append(f'/api/uploads/{unique_filename}')

#     media_url = ",".join(media_paths) if media_paths else None

#     try:
#         with connect() as conn:
#             conn.execute(
#                 'INSERT INTO Posts (user_email, category, content, media_url) VALUES (?, ?, ?, ?)',
#                 (email, cat, content, media_url)
#             )
            
#             # Remove post coin award
#             conn.commit()
            
#             # Fetch the new dynamic total (now 0 from posts)
#             row = conn.execute('SELECT karma_coins, total_donations FROM Users WHERE email = ?', (email,)).fetchone()
#             # Coins logic now depends on donations (5 per donation)
#             new_coins = row['karma_coins'] + (row['total_donations'] * 5) if row else 0

#         return jsonify({'ok': True, 'message': 'Post created!', 'new_coins': new_coins})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/uploads/<path:filename>')
# def serve_uploads(filename):
#     return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


# @app.route('/api/feed', methods=['GET'])
# def get_feed():
#     viewer_email = request.args.get('viewer', '')
#     target_user = request.args.get('user', '')
#     try:
#         with connect() as conn:
#             query = '''
#                 SELECT p.post_id, p.category, p.content, p.media_url, p.created_at,
#                        u.email, u.username, u.avatar_url, u.full_name, u.locality, u.trust_score,
#                        (SELECT COUNT(*) FROM Likes l WHERE l.post_id = p.post_id) AS like_count,
#                        (SELECT COUNT(*) FROM Comments c WHERE c.post_id = p.post_id) AS comment_count,
#                        (SELECT COUNT(*) FROM Likes lv WHERE lv.post_id = p.post_id AND lv.user_email = ?) AS viewer_liked
#                 FROM Posts p
#                 JOIN Users u ON p.user_email = u.email
#             '''
#             params = [viewer_email]
            
#             if target_user:
#                 query += ' WHERE p.user_email = ? '
#                 params.append(target_user)
                
#             query += '''
#                 ORDER BY p.created_at DESC
#                 LIMIT 50
#             '''
#             rows = conn.execute(query, params).fetchall()
#             posts = []
#             for r in rows:
#                 posts.append({
#                     'post_id':          r['post_id'],
#                     'category':         r['category'],
#                     'content':          r['content'],
#                     'media_url':        r['media_url'],
#                     'created_at':       r['created_at'],
#                     'author_email':     r['email'],
#                     'author_username':  r['username'] or 'User',
#                     'author_fullname':  r['full_name'] or 'Anonymous',
#                     'author_avatar':    r['avatar_url'] or '',
#                     'author_locality':  r['locality'] or 'Earth',
#                     'author_trust':     r['trust_score'],
#                     'like_count':       r['like_count'],
#                     'comment_count':    r['comment_count'],
#                     'viewer_liked':     bool(r['viewer_liked'])
#                 })
#         return jsonify({'ok': True, 'posts': posts})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/followers', methods=['GET'])
# def get_followers():
#     """Return list of users that the logged-in user follows (for the followers strip)."""
#     email = request.args.get('email')
#     if not email:
#         return jsonify({'ok': False, 'error': 'email required'}), 400
#     try:
#         with connect() as conn:
#             rows = conn.execute('''
#                 SELECT u.email, u.username, u.avatar_url, u.bio, u.locality
#                 FROM Follows f
#                 JOIN Users u ON f.following_email = u.email
#                 WHERE f.follower_email = ?
#                 ORDER BY u.username
#             ''', (email,)).fetchall()
#             users = [
#                 {
#                     'email': r['email'],
#                     'username': r['username'] or 'user',
#                     'avatar': r['avatar_url'] or '',
#                     'bio': r['bio'] or '',
#                     'locality': r['locality'] or ''
#                 } for r in rows
#             ]
#         return jsonify({'ok': True, 'followers': users})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/follow', methods=['POST'])
# def toggle_follow():
#     """Follow or unfollow a user. Returns new follow state."""
#     data = request.get_json(force=True) or {}
#     follower = data.get('follower_email')
#     target   = data.get('target_email')
#     if not follower or not target:
#         return jsonify({'ok': False, 'error': 'follower_email and target_email required'}), 400
#     try:
#         with connect() as conn:
#             existing = conn.execute(
#                 'SELECT 1 FROM Follows WHERE follower_email=? AND following_email=?',
#                 (follower, target)
#             ).fetchone()
#             if existing:
#                 conn.execute('DELETE FROM Follows WHERE follower_email=? AND following_email=?', (follower, target))
#                 conn.commit()
#                 return jsonify({'ok': True, 'following': False})
#             else:
#                 conn.execute('INSERT INTO Follows (follower_email, following_email) VALUES (?,?)', (follower, target))
#                 conn.commit()
#                 return jsonify({'ok': True, 'following': True})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/comments', methods=['GET'])
# def get_comments():
#     """Get comments for a post."""
#     post_id = request.args.get('post_id')
#     if not post_id:
#         return jsonify({'ok': False, 'error': 'post_id required'}), 400
#     try:
#         with connect() as conn:
#             rows = conn.execute('''
#                 SELECT c.comment_id, c.content, c.created_at, u.username, u.avatar_url
#                 FROM Comments c
#                 JOIN Users u ON c.user_email = u.email
#                 WHERE c.post_id = ?
#                 ORDER BY c.created_at ASC
#             ''', (post_id,)).fetchall()
#             comments = [{'id': r['comment_id'], 'content': r['content'], 'username': r['username'] or 'user', 'avatar': r['avatar_url'] or '', 'created_at': r['created_at']} for r in rows]
#         return jsonify({'ok': True, 'comments': comments})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/comments', methods=['POST'])
# def post_comment():
#     """Post a comment on a post."""
#     data    = request.get_json(force=True) or {}
#     post_id = data.get('post_id')
#     email   = data.get('email')
#     content = data.get('content', '').strip()
#     if not post_id or not email or not content:
#         return jsonify({'ok': False, 'error': 'post_id, email, content required'}), 400
#     try:
#         with connect() as conn:
#             conn.execute('INSERT INTO Comments (post_id, user_email, content) VALUES (?,?,?)', (post_id, email, content))
#             conn.commit()
#             row = conn.execute('SELECT username FROM Users WHERE email=?', (email,)).fetchone()
#             username = row['username'] if row else 'user'
#         return jsonify({'ok': True, 'username': username, 'content': content})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/like', methods=['POST'])
# def toggle_like():
#     """Toggle like on a post. Returns new like state and updated count."""
#     data    = request.get_json(force=True) or {}
#     post_id = data.get('post_id')
#     email   = data.get('email')
#     if not post_id or not email:
#         return jsonify({'ok': False, 'error': 'post_id and email required'}), 400
#     try:
#         with connect() as conn:
#             existing = conn.execute(
#                 'SELECT 1 FROM Likes WHERE post_id=? AND user_email=?', (post_id, email)
#             ).fetchone()
#             if existing:
#                 conn.execute('DELETE FROM Likes WHERE post_id=? AND user_email=?', (post_id, email))
#                 liked = False
#             else:
#                 conn.execute('INSERT INTO Likes (post_id, user_email) VALUES (?,?)', (post_id, email))
#                 liked = True
#             conn.commit()
#             count = conn.execute('SELECT COUNT(*) AS c FROM Likes WHERE post_id=?', (post_id,)).fetchone()['c']
#         return jsonify({'ok': True, 'liked': liked, 'like_count': count})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/check', methods=['GET'])
# def health():
#     return jsonify({'ok': True, 'status': 'KARMA server running'})


# # ── Donations Endpoints ───────────────────────────

# @app.route('/api/ngos', methods=['GET'])
# def get_ngos():
#     """Return NGOs matching a pincode (exact) or all food NGOs as fallback."""
#     pincode  = (request.args.get('pincode') or '').strip()
#     category = (request.args.get('category') or 'food').strip()
#     try:
#         with connect() as conn:
#             if pincode:
#                 rows = conn.execute(
#                     "SELECT * FROM NGOs WHERE (pincode=? OR pincode LIKE ?) AND (category=? OR category='both') ORDER BY ngo_id",
#                     (pincode, pincode[:3] + '%', category)
#                 ).fetchall()
#                 # Fallback: if no local NGOs, return all with matching category
#                 if not rows:
#                     rows = conn.execute(
#                         "SELECT * FROM NGOs WHERE category=? OR category='both' ORDER BY ngo_id",
#                         (category,)
#                     ).fetchall()
#             else:
#                 rows = conn.execute(
#                     "SELECT * FROM NGOs WHERE category=? OR category='both' ORDER BY ngo_id",
#                     (category,)
#                 ).fetchall()
#         ngos = [{
#             'ngo_id':     r['ngo_id'],
#             'name':       r['name'],
#             'phone':      r['phone'],
#             'city':       r['city'],
#             'state':      r['state'],
#             'category':   r['category'],
#             'website':    r['website'],
#             'logo_emoji': r['logo_emoji'],
#         } for r in rows]
#         return jsonify({'ok': True, 'ngos': ngos})
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500


# @app.route('/api/donate/food', methods=['POST'])
# def donate_food():
#     """Record a food donation, award +100 Karma Coins, log simulated SMS."""
#     data         = request.get_json(force=True) or {}
#     donor_email  = (data.get('donor_email') or '').strip().lower()
#     food_type    = data.get('food_type', 'Paka hua Khana')
#     source_type  = data.get('source_type', 'Ghar')
#     quantity     = int(data.get('quantity', 1))
#     pincode      = (data.get('pincode') or '').strip()
#     location     = data.get('location_text', '')
#     is_anonymous = 1 if data.get('is_anonymous') else 0
#     ngo_ids      = data.get('ngo_ids', [])  # list of ngo_id integers

#     if not donor_email or not pincode or not ngo_ids:
#         return jsonify({'ok': False, 'error': 'donor_email, pincode, ngo_ids required'}), 400

#     try:
#         with connect() as conn:
#             # Save donation record
#             conn.execute(
#                 '''INSERT INTO FoodDonations
#                    (donor_email, food_type, source_type, quantity, pincode, location_text, is_anonymous, ngo_ids_notified, status)
#                    VALUES (?,?,?,?,?,?,?,?,?)''',
#                 (donor_email, food_type, source_type, quantity, pincode, location,
#                  is_anonymous, ','.join(str(i) for i in ngo_ids), 'notified')
#             )

#             # Award +100 Karma Coins
#             conn.execute(
#                 'UPDATE Users SET karma_coins = karma_coins + 100, total_donations = total_donations + 1 WHERE email = ?',
#                 (donor_email,)
#             )

#             # Fetch updated coin count
#             row = conn.execute('SELECT karma_coins FROM Users WHERE email=?', (donor_email,)).fetchone()
#             new_coins = row['karma_coins'] if row else 0

#             # Fetch NGO details for SMS simulation
#             if ngo_ids:
#                 placeholders = ','.join('?' * len(ngo_ids))
#                 ngo_rows = conn.execute(
#                     f'SELECT name, phone FROM NGOs WHERE ngo_id IN ({placeholders})',
#                     ngo_ids
#                 ).fetchall()
#             else:
#                 ngo_rows = []

#             conn.commit()

#         # ── Simulate SMS (replace with Twilio/Fast2SMS in production) ──
#         donor_display = 'Anonymous Donor' if is_anonymous else donor_email
#         print('\n' + '='*60)
#         print('📱  KARMA ALERT — SIMULATED SMS TO NGOs')
#         print('='*60)
#         for ngo in ngo_rows:
#             sms_body = (
#                 f"KARMA ALERT: Naya Anna Daan aaya! "
#                 f"{food_type} ({quantity} logo ka) {source_type} se bacha hai. "
#                 f"Pickup: {location}, {pincode}. "
#                 f"Daani: {donor_display}. "
#                 f"Abhi collect karein: karma.app/accept/new"
#             )
#             print(f"  TO: {ngo['name']} ({ngo['phone']}): {sms_body}")
#         print('='*60 + '\n')

#         return jsonify({
#             'ok':        True,
#             'message':   'Daan bhej di gayi! +100 Karma Coins mile!',
#             'new_coins': new_coins,
#         })
#     except Exception as ex:
#         return jsonify({'ok': False, 'error': str(ex)}), 500



# if __name__ == '__main__':
#     init_db()
#     print('KARMA Auth Server running at ')
#     app.run(debug=True, port=5000)

"""
karma_server.py  (MERGED — Dastarkhwan hotels + KARMA social, one server)
─────────────────────────────────────────────────
Single Flask app. Two SQLite databases (dastarkhwan.db + karma.db),
one process, one URL, one Render deploy.
─────────────────────────────────────────────────
"""

import sqlite3
import hashlib
import hmac
import re
import json
import os
import uuid
from flask import Flask, request, jsonify, send_from_directory
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ── Frontend routes (serve HTML/CSS/JS files) ─────
@app.route('/')
def serve_home():
    return send_from_directory('.', 'welcome.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)

DB   = 'karma.db'
SALT = 'KARMA_SALT_2025'
UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'uploads')
os.makedirs(UPLOAD_FOLDER, exist_ok=True)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER


# ══════════════════════════════════════════════════
# KARMA DB SETUP
# ══════════════════════════════════════════════════

def connect():
    conn = sqlite3.connect(DB)
    conn.row_factory = sqlite3.Row
    return conn

def init_karma_db():
    with connect() as conn:
        conn.execute('''
            CREATE TABLE IF NOT EXISTS Users (
                user_id         INTEGER PRIMARY KEY AUTOINCREMENT,
                email           TEXT UNIQUE NOT NULL,
                full_name       TEXT,
                username        TEXT UNIQUE,
                bio             TEXT,
                avatar_url      TEXT,
                role            TEXT DEFAULT 'Individual',
                locality        TEXT,
                karma_coins     INTEGER DEFAULT 0,
                total_donations INTEGER DEFAULT 0,
                trust_score     INTEGER DEFAULT 0,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        try:
            conn.execute('ALTER TABLE Users ADD COLUMN password_hash TEXT')
        except Exception:
            pass

        conn.execute('''
            CREATE TABLE IF NOT EXISTS Posts (
                post_id         INTEGER PRIMARY KEY AUTOINCREMENT,
                user_email      TEXT NOT NULL,
                category        TEXT NOT NULL,
                content         TEXT,
                media_url       TEXT,
                created_at      TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')
        try:
            conn.execute('ALTER TABLE Posts ADD COLUMN media_url TEXT')
        except Exception:
            pass

        conn.execute('''
            CREATE TABLE IF NOT EXISTS Follows (
                follower_email  TEXT NOT NULL,
                following_email TEXT NOT NULL,
                PRIMARY KEY (follower_email, following_email)
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS Comments (
                comment_id  INTEGER PRIMARY KEY AUTOINCREMENT,
                post_id     INTEGER NOT NULL,
                user_email  TEXT NOT NULL,
                content     TEXT NOT NULL,
                created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS Likes (
                post_id    INTEGER NOT NULL,
                user_email TEXT NOT NULL,
                PRIMARY KEY (post_id, user_email)
            )
        ''')
        conn.commit()

        conn.execute('''
            CREATE TABLE IF NOT EXISTS NGOs (
                ngo_id      INTEGER PRIMARY KEY AUTOINCREMENT,
                name        TEXT NOT NULL,
                phone       TEXT,
                pincode     TEXT,
                city        TEXT,
                state       TEXT,
                category    TEXT DEFAULT 'both',
                website     TEXT,
                logo_emoji  TEXT DEFAULT '🤝'
            )
        ''')

        conn.execute('''
            CREATE TABLE IF NOT EXISTS FoodDonations (
                donation_id      INTEGER PRIMARY KEY AUTOINCREMENT,
                donor_email      TEXT,
                food_type        TEXT,
                source_type      TEXT,
                quantity         INTEGER,
                pincode          TEXT,
                location_text    TEXT,
                is_anonymous     INTEGER DEFAULT 0,
                ngo_ids_notified TEXT,
                status           TEXT DEFAULT 'pending',
                created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        ''')

        existing = conn.execute('SELECT COUNT(*) as c FROM NGOs').fetchone()['c']
        if existing == 0:
            seed_ngos = [
                ('Robin Hood Army', '+91-9999999901', '110001', 'New Delhi', 'Delhi', 'food', 'https://robinhoodarmy.com', '🦸'),
                ('Goonj', '+91-9999999902', '110091', 'New Delhi', 'Delhi', 'both', 'https://goonj.org', '🌾'),
                ('Akshaya Patra', '+91-9999999903', '560001', 'Bengaluru', 'Karnataka', 'food', 'https://www.akshayapatra.org', '🍛'),
                ('GiveIndia Foundation', '+91-9999999904', '400001', 'Mumbai', 'Maharashtra', 'both', 'https://giveindia.org', '💚'),
                ('PM CARES Fund', '+91-9999999905', '110001', 'New Delhi', 'Delhi', 'money', 'https://pmcares.gov.in', '🇮🇳'),
                ('Feeding India by Zomato', '+91-9999999906', '751001', 'Bhubaneswar', 'Odisha', 'food', 'https://feedingindia.org', '🍱'),
            ]
            conn.executemany(
                'INSERT INTO NGOs (name, phone, pincode, city, state, category, website, logo_emoji) VALUES (?,?,?,?,?,?,?,?)',
                seed_ngos
            )
        conn.commit()
    print('  karma.db is ready')


# ── Helpers ───────────────────────────────────────

def hash_pw(pw: str) -> str:
    return hashlib.sha256((SALT + pw).encode()).hexdigest()

def check_pw(pw: str, stored: str) -> bool:
    return hmac.compare_digest(hash_pw(pw), stored or '')

def valid_email(e: str) -> bool:
    return bool(re.match(r'^[^@\s]+@[^@\s]+\.[^@\s]+$', e))


# ══════════════════════════════════════════════════
# KARMA ROUTES
# ══════════════════════════════════════════════════

@app.route('/api/register', methods=['POST'])
def register():
    data     = request.get_json(force=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '')
    if not valid_email(email):
        return jsonify({'ok': False, 'error': 'Enter a valid email address.'}), 400
    if len(password) < 6:
        return jsonify({'ok': False, 'error': 'Password must be at least 6 characters.'}), 400
    try:
        with connect() as conn:
            conn.execute('INSERT INTO Users (email, password_hash) VALUES (?, ?)', (email, hash_pw(password)))
            conn.commit()
        return jsonify({'ok': True, 'message': 'Account created!'})
    except sqlite3.IntegrityError:
        return jsonify({'ok': False, 'error': 'An account with this email already exists.'}), 409
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/login', methods=['POST'])
def login():
    data     = request.get_json(force=True) or {}
    email    = (data.get('email') or '').strip().lower()
    password = (data.get('password') or '')
    if not email or not password:
        return jsonify({'ok': False, 'error': 'Email and password are required.'}), 400
    with connect() as conn:
        row = conn.execute('SELECT * FROM Users WHERE email = ?', (email,)).fetchone()
    if not row:
        return jsonify({'ok': False, 'error': 'No account found with this email.'}), 404
    if not check_pw(password, row['password_hash']):
        return jsonify({'ok': False, 'error': 'Incorrect password. Try again.'}), 401
    return jsonify({
        'ok': True,
        'user': {
            'email': row['email'], 'full_name': row['full_name'], 'username': row['username'],
            'role': row['role'], 'karma_coins': row['karma_coins'],
            'trust_score': row['trust_score'], 'total_donations': row['total_donations'],
        }
    })


@app.route('/api/profile', methods=['GET'])
def get_profile():
    email = request.args.get('email')
    if not email:
        return jsonify({'ok': False, 'error': 'Email is required'}), 400
    with connect() as conn:
        row = conn.execute('SELECT * FROM Users WHERE email = ?', (email,)).fetchone()
        if not row:
            return jsonify({'ok': False, 'error': 'User not found'}), 404
        followers_count = conn.execute('SELECT COUNT(*) FROM Follows WHERE following_email = ?', (email,)).fetchone()[0]
        following_count = conn.execute('SELECT COUNT(*) FROM Follows WHERE follower_email = ?', (email,)).fetchone()[0]
        dynamic_coins = (row['total_donations'] or 0) * 5
    return jsonify({
        'ok': True,
        'user': {
            'email': row['email'], 'full_name': row['full_name'], 'username': row['username'],
            'bio': row['bio'], 'avatar_url': row['avatar_url'], 'role': row['role'],
            'locality': row['locality'], 'karma_coins': dynamic_coins,
            'total_donations': row['total_donations'], 'trust_score': row['trust_score'],
            'followers': followers_count, 'following': following_count
        }
    })


@app.route('/api/profile/update', methods=['POST'])
def update_profile():
    if request.content_type and 'multipart/form-data' in request.content_type:
        email = request.form.get('email')
        username = request.form.get('username')
        full_name = request.form.get('full_name')
        bio = request.form.get('bio')
        role = request.form.get('occupation') or request.form.get('role')
        locality = request.form.get('locality') or request.form.get('city')
        avatar_file = request.files.get('avatar')
    else:
        data  = request.get_json(force=True) or {}
        email = data.get('email')
        username  = data.get('username')
        full_name = data.get('full_name')
        bio       = data.get('bio')
        role      = data.get('occupation') or data.get('role')
        locality  = data.get('locality') or data.get('city')
        avatar_file = None

    if not email:
        return jsonify({'ok': False, 'error': 'Email is required to update profile'}), 400

    avatar_url = None
    if avatar_file and avatar_file.filename:
        ext = os.path.splitext(avatar_file.filename)[1]
        unique_filename = str(uuid.uuid4()) + ext
        filepath = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        avatar_file.save(filepath)
        avatar_url = f'/uploads/{unique_filename}'

    try:
        with connect() as conn:
            if avatar_url:
                conn.execute('''UPDATE Users SET username=?, full_name=?, bio=?, role=?, locality=?, avatar_url=? WHERE email=?''',
                             (username, full_name, bio, role, locality, avatar_url, email))
            else:
                conn.execute('''UPDATE Users SET username=?, full_name=?, bio=?, role=?, locality=? WHERE email=?''',
                             (username, full_name, bio, role, locality, email))
            conn.commit()
        return jsonify({'ok': True, 'message': 'Profile saved successfully!', 'avatar_url': avatar_url})
    except sqlite3.IntegrityError:
        return jsonify({'ok': False, 'error': 'Username is already taken.'}), 409
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/search', methods=['GET'])
def search_users():
    query = request.args.get('q', '').strip()
    if not query:
        return jsonify({'ok': True, 'users': []})
    like_val = f'%{query}%'
    try:
        with connect() as conn:
            rows = conn.execute('''SELECT email, username, full_name, role, avatar_url, locality FROM Users
                                    WHERE username LIKE ? OR full_name LIKE ? LIMIT 50''', (like_val, like_val)).fetchall()
            users = [dict(r) for r in rows]
            return jsonify({'ok': True, 'users': users})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/posts', methods=['GET'])
def get_posts():
    viewer_email = request.args.get('viewer', '')
    try:
        with connect() as conn:
            query = '''
                SELECT p.post_id AS id, p.category, p.content, p.media_url, p.created_at,
                       u.email AS author_email, u.username AS author_username, u.avatar_url AS author_avatar,
                       (SELECT COUNT(*) FROM Likes l WHERE l.post_id = p.post_id) AS likes,
                       (SELECT COUNT(*) FROM Comments c WHERE c.post_id = p.post_id) AS comments,
                       (SELECT COUNT(*) FROM Likes lv WHERE lv.post_id = p.post_id AND lv.user_email = ?) AS is_liked_by_viewer
                FROM Posts p JOIN Users u ON p.user_email = u.email
                ORDER BY p.created_at DESC LIMIT 50
            '''
            rows = conn.execute(query, [viewer_email]).fetchall()
            posts = []
            for r in rows:
                media_urls = r['media_url'].split(',') if r['media_url'] else []
                posts.append({
                    'id': r['id'], 'category': r['category'], 'content': r['content'],
                    'media_urls': media_urls, 'created_at': r['created_at'],
                    'author_email': r['author_email'], 'author_username': r['author_username'] or 'User',
                    'author_avatar': r['author_avatar'] or '', 'likes': r['likes'], 'comments': r['comments'],
                    'is_liked_by_viewer': bool(r['is_liked_by_viewer'])
                })
        return jsonify({'ok': True, 'posts': posts})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/posts', methods=['POST'])
def create_post():
    email = request.form.get('email')
    cat   = request.form.get('category')
    content = request.form.get('content', '')
    if not email or not cat:
        return jsonify({'ok': False, 'error': 'Email and category required'}), 400

    media_paths = []
    if 'media_files' in request.files:
        for file in request.files.getlist('media_files'):
            if file and file.filename:
                ext = os.path.splitext(file.filename)[1]
                unique_filename = str(uuid.uuid4()) + ext
                file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
                media_paths.append(f'/api/uploads/{unique_filename}')
    elif 'media_file' in request.files:
        file = request.files['media_file']
        if file and file.filename:
            ext = os.path.splitext(file.filename)[1]
            unique_filename = str(uuid.uuid4()) + ext
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], unique_filename))
            media_paths.append(f'/api/uploads/{unique_filename}')

    media_url = ",".join(media_paths) if media_paths else None
    try:
        with connect() as conn:
            conn.execute('INSERT INTO Posts (user_email, category, content, media_url) VALUES (?, ?, ?, ?)',
                         (email, cat, content, media_url))
            conn.commit()
            row = conn.execute('SELECT karma_coins, total_donations FROM Users WHERE email = ?', (email,)).fetchone()
            new_coins = row['karma_coins'] + (row['total_donations'] * 5) if row else 0
        return jsonify({'ok': True, 'message': 'Post created!', 'new_coins': new_coins})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/uploads/<path:filename>')
def serve_uploads(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)


@app.route('/api/feed', methods=['GET'])
def get_feed():
    viewer_email = request.args.get('viewer', '')
    target_user = request.args.get('user', '')
    try:
        with connect() as conn:
            query = '''
                SELECT p.post_id, p.category, p.content, p.media_url, p.created_at,
                       u.email, u.username, u.avatar_url, u.full_name, u.locality, u.trust_score,
                       (SELECT COUNT(*) FROM Likes l WHERE l.post_id = p.post_id) AS like_count,
                       (SELECT COUNT(*) FROM Comments c WHERE c.post_id = p.post_id) AS comment_count,
                       (SELECT COUNT(*) FROM Likes lv WHERE lv.post_id = p.post_id AND lv.user_email = ?) AS viewer_liked
                FROM Posts p JOIN Users u ON p.user_email = u.email
            '''
            params = [viewer_email]
            if target_user:
                query += ' WHERE p.user_email = ? '
                params.append(target_user)
            query += ' ORDER BY p.created_at DESC LIMIT 50'
            rows = conn.execute(query, params).fetchall()
            posts = []
            for r in rows:
                posts.append({
                    'post_id': r['post_id'], 'category': r['category'], 'content': r['content'],
                    'media_url': r['media_url'], 'created_at': r['created_at'],
                    'author_email': r['email'], 'author_username': r['username'] or 'User',
                    'author_fullname': r['full_name'] or 'Anonymous', 'author_avatar': r['avatar_url'] or '',
                    'author_locality': r['locality'] or 'Earth', 'author_trust': r['trust_score'],
                    'like_count': r['like_count'], 'comment_count': r['comment_count'],
                    'viewer_liked': bool(r['viewer_liked'])
                })
        return jsonify({'ok': True, 'posts': posts})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/followers', methods=['GET'])
def get_followers():
    email = request.args.get('email')
    if not email:
        return jsonify({'ok': False, 'error': 'email required'}), 400
    try:
        with connect() as conn:
            rows = conn.execute('''SELECT u.email, u.username, u.avatar_url, u.bio, u.locality
                                    FROM Follows f JOIN Users u ON f.following_email = u.email
                                    WHERE f.follower_email = ? ORDER BY u.username''', (email,)).fetchall()
            users = [{'email': r['email'], 'username': r['username'] or 'user', 'avatar': r['avatar_url'] or '',
                      'bio': r['bio'] or '', 'locality': r['locality'] or ''} for r in rows]
        return jsonify({'ok': True, 'followers': users})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/follow', methods=['POST'])
def toggle_follow():
    data = request.get_json(force=True) or {}
    follower = data.get('follower_email')
    target   = data.get('target_email')
    if not follower or not target:
        return jsonify({'ok': False, 'error': 'follower_email and target_email required'}), 400
    try:
        with connect() as conn:
            existing = conn.execute('SELECT 1 FROM Follows WHERE follower_email=? AND following_email=?',
                                     (follower, target)).fetchone()
            if existing:
                conn.execute('DELETE FROM Follows WHERE follower_email=? AND following_email=?', (follower, target))
                conn.commit()
                return jsonify({'ok': True, 'following': False})
            else:
                conn.execute('INSERT INTO Follows (follower_email, following_email) VALUES (?,?)', (follower, target))
                conn.commit()
                return jsonify({'ok': True, 'following': True})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/comments', methods=['GET'])
def get_comments():
    post_id = request.args.get('post_id')
    if not post_id:
        return jsonify({'ok': False, 'error': 'post_id required'}), 400
    try:
        with connect() as conn:
            rows = conn.execute('''SELECT c.comment_id, c.content, c.created_at, u.username, u.avatar_url
                                    FROM Comments c JOIN Users u ON c.user_email = u.email
                                    WHERE c.post_id = ? ORDER BY c.created_at ASC''', (post_id,)).fetchall()
            comments = [{'id': r['comment_id'], 'content': r['content'], 'username': r['username'] or 'user',
                         'avatar': r['avatar_url'] or '', 'created_at': r['created_at']} for r in rows]
        return jsonify({'ok': True, 'comments': comments})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/comments', methods=['POST'])
def post_comment():
    data    = request.get_json(force=True) or {}
    post_id = data.get('post_id')
    email   = data.get('email')
    content = data.get('content', '').strip()
    if not post_id or not email or not content:
        return jsonify({'ok': False, 'error': 'post_id, email, content required'}), 400
    try:
        with connect() as conn:
            conn.execute('INSERT INTO Comments (post_id, user_email, content) VALUES (?,?,?)', (post_id, email, content))
            conn.commit()
            row = conn.execute('SELECT username FROM Users WHERE email=?', (email,)).fetchone()
            username = row['username'] if row else 'user'
        return jsonify({'ok': True, 'username': username, 'content': content})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/like', methods=['POST'])
def toggle_like():
    data    = request.get_json(force=True) or {}
    post_id = data.get('post_id')
    email   = data.get('email')
    if not post_id or not email:
        return jsonify({'ok': False, 'error': 'post_id and email required'}), 400
    try:
        with connect() as conn:
            existing = conn.execute('SELECT 1 FROM Likes WHERE post_id=? AND user_email=?', (post_id, email)).fetchone()
            if existing:
                conn.execute('DELETE FROM Likes WHERE post_id=? AND user_email=?', (post_id, email))
                liked = False
            else:
                conn.execute('INSERT INTO Likes (post_id, user_email) VALUES (?,?)', (post_id, email))
                liked = True
            conn.commit()
            count = conn.execute('SELECT COUNT(*) AS c FROM Likes WHERE post_id=?', (post_id,)).fetchone()['c']
        return jsonify({'ok': True, 'liked': liked, 'like_count': count})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/check', methods=['GET'])
def karma_health():
    return jsonify({'ok': True, 'status': 'KARMA server running'})


@app.route('/api/ngos', methods=['GET'])
def get_ngos():
    pincode  = (request.args.get('pincode') or '').strip()
    category = (request.args.get('category') or 'food').strip()
    try:
        with connect() as conn:
            if pincode:
                rows = conn.execute(
                    "SELECT * FROM NGOs WHERE (pincode=? OR pincode LIKE ?) AND (category=? OR category='both') ORDER BY ngo_id",
                    (pincode, pincode[:3] + '%', category)).fetchall()
                if not rows:
                    rows = conn.execute("SELECT * FROM NGOs WHERE category=? OR category='both' ORDER BY ngo_id",
                                        (category,)).fetchall()
            else:
                rows = conn.execute("SELECT * FROM NGOs WHERE category=? OR category='both' ORDER BY ngo_id",
                                    (category,)).fetchall()
        ngos = [{'ngo_id': r['ngo_id'], 'name': r['name'], 'phone': r['phone'], 'city': r['city'],
                 'state': r['state'], 'category': r['category'], 'website': r['website'],
                 'logo_emoji': r['logo_emoji']} for r in rows]
        return jsonify({'ok': True, 'ngos': ngos})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


@app.route('/api/donate/food', methods=['POST'])
def donate_food():
    data         = request.get_json(force=True) or {}
    donor_email  = (data.get('donor_email') or '').strip().lower()
    food_type    = data.get('food_type', 'Paka hua Khana')
    source_type  = data.get('source_type', 'Ghar')
    quantity     = int(data.get('quantity', 1))
    pincode      = (data.get('pincode') or '').strip()
    location     = data.get('location_text', '')
    is_anonymous = 1 if data.get('is_anonymous') else 0
    ngo_ids      = data.get('ngo_ids', [])

    if not donor_email or not pincode or not ngo_ids:
        return jsonify({'ok': False, 'error': 'donor_email, pincode, ngo_ids required'}), 400
    try:
        with connect() as conn:
            conn.execute('''INSERT INTO FoodDonations
                             (donor_email, food_type, source_type, quantity, pincode, location_text, is_anonymous, ngo_ids_notified, status)
                             VALUES (?,?,?,?,?,?,?,?,?)''',
                         (donor_email, food_type, source_type, quantity, pincode, location,
                          is_anonymous, ','.join(str(i) for i in ngo_ids), 'notified'))
            conn.execute('UPDATE Users SET karma_coins = karma_coins + 100, total_donations = total_donations + 1 WHERE email = ?',
                         (donor_email,))
            row = conn.execute('SELECT karma_coins FROM Users WHERE email=?', (donor_email,)).fetchone()
            new_coins = row['karma_coins'] if row else 0
            conn.commit()
        return jsonify({'ok': True, 'message': 'Daan bhej di gayi! +100 Karma Coins mile!', 'new_coins': new_coins})
    except Exception as ex:
        return jsonify({'ok': False, 'error': str(ex)}), 500


# ══════════════════════════════════════════════════
# DASTARKHWAN (HOTELS) DB SETUP
# ══════════════════════════════════════════════════

def init_dastarkhwan_db():
    with sqlite3.connect('dastarkhwan.db') as conn:
        cursor = conn.cursor()
        cursor.execute("""CREATE TABLE IF NOT EXISTS hotels (
            id INTEGER PRIMARY KEY AUTOINCREMENT, unique_id TEXT UNIQUE, name TEXT, category TEXT,
            owner TEXT, phone TEXT, location TEXT, image TEXT, menu TEXT, rating REAL DEFAULT 5.0,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        cursor.execute("PRAGMA table_info(hotels)")
        cols = [col[1] for col in cursor.fetchall()]
        if 'unique_id' not in cols:
            cursor.execute("ALTER TABLE hotels ADD COLUMN unique_id TEXT UNIQUE")
        if 'menu' not in cols:
            cursor.execute("ALTER TABLE hotels ADD COLUMN menu TEXT")
        if 'category' not in cols:
            cursor.execute("ALTER TABLE hotels ADD COLUMN category TEXT")
        if 'rating' not in cols:
            cursor.execute("ALTER TABLE hotels ADD COLUMN rating REAL DEFAULT 5.0")

        cursor.execute("""CREATE TABLE IF NOT EXISTS comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id TEXT NOT NULL, username TEXT NOT NULL,
            comment TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")

        cursor.execute("""CREATE TABLE IF NOT EXISTS ratings (
            id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id TEXT NOT NULL, rating INTEGER NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")

        cursor.execute("""CREATE TABLE IF NOT EXISTS memories (
            id INTEGER PRIMARY KEY AUTOINCREMENT, hotel_id TEXT NOT NULL, image_data LONGTEXT NOT NULL,
            caption TEXT, filter_used TEXT DEFAULT 'normal', created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")
        cursor.execute("PRAGMA table_info(memories)")
        mem_cols = [col[1] for col in cursor.fetchall()]
        if 'likes' not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN likes INTEGER DEFAULT 0")

        cursor.execute("""CREATE TABLE IF NOT EXISTS memory_comments (
            id INTEGER PRIMARY KEY AUTOINCREMENT, memory_id INTEGER NOT NULL, username TEXT NOT NULL,
            comment TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP)""")

        cursor.execute("""CREATE TABLE IF NOT EXISTS memory_likes (
            memory_id INTEGER NOT NULL, user_ip TEXT NOT NULL, created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            PRIMARY KEY (memory_id, user_ip))""")
        conn.commit()
    print('  dastarkhwan.db is ready')


# ══════════════════════════════════════════════════
# DASTARKHWAN (HOTELS) ROUTES
# ══════════════════════════════════════════════════

@app.route('/register_hotel', methods=['POST'])
def register_hotel():
    try:
        data = request.json
        if not data.get('name') or not data.get('owner') or not data.get('phone'):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
        u_id = "DK-" + str(uuid.uuid4())[:4].upper()
        menu_json = json.dumps(data.get('menu', []))
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("""INSERT INTO hotels (unique_id, name, category, owner, phone, location, image, rating, menu)
                               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)""",
                           (u_id, data['name'], data.get('category', 'veg'), data['owner'],
                            data['phone'], data.get('location', ''), data.get('image', ''), 5.0, menu_json))
            conn.commit()
        return jsonify({"status": "success", "unique_id": u_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/update_hotel', methods=['POST'])
def update_hotel():
    try:
        data = request.json
        u_id = data.get('unique_id')
        if not u_id:
            return jsonify({"status": "error", "message": "unique_id required"}), 400
        menu_json = json.dumps(data.get('menu', []))
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("""UPDATE hotels SET name=?, owner=?, phone=?, location=?, image=?, category=?, menu=?
                               WHERE unique_id = ?""",
                           (data.get('name'), data.get('owner'), data.get('phone'), data.get('location', ''),
                            data.get('image', ''), data.get('category', 'veg'), menu_json, u_id))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"status": "error", "message": "Hotel not found"}), 404
        return jsonify({"status": "success", "message": "Hotel updated"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_hotel_by_id', methods=['GET'])
def get_hotel_by_id():
    try:
        val = request.args.get('value')
        if not val:
            return jsonify({"status": "error", "message": "value required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM hotels WHERE unique_id = ? OR phone = ?", (val, val))
            row = cursor.fetchone()
            if row:
                result = dict(row)
                result['menu'] = json.loads(result['menu']) if result['menu'] else []
                return jsonify(result), 200
        return jsonify({"status": "error", "message": "Hotel not found"}), 404
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_hotels', methods=['GET'])
def get_hotels():
    try:
        cat = request.args.get('category', 'all')
        with sqlite3.connect('dastarkhwan.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            if cat == 'all':
                cursor.execute("SELECT * FROM hotels ORDER BY created_at DESC")
            else:
                cursor.execute("SELECT * FROM hotels WHERE category = ? ORDER BY created_at DESC", (cat,))
            rows = cursor.fetchall()
            hotels = []
            for row in rows:
                hotel = dict(row)
                hotel['menu'] = json.loads(hotel['menu']) if hotel['menu'] else []
                hotels.append(hotel)
            return jsonify(hotels), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/add_comment', methods=['POST'])
def add_comment():
    try:
        data = request.json
        if not data.get('hotel_id') or not data.get('username') or not data.get('comment'):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO comments (hotel_id, username, comment) VALUES (?, ?, ?)",
                           (data['hotel_id'], data['username'], data['comment']))
            conn.commit()
            comment_id = cursor.lastrowid
        return jsonify({"status": "success", "id": comment_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_comments', methods=['GET'])
def get_hotel_comments():
    try:
        hotel_id = request.args.get('hotel_id')
        if not hotel_id:
            return jsonify({"status": "error", "message": "hotel_id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM comments WHERE hotel_id = ? ORDER BY created_at DESC", (hotel_id,))
            comments = [dict(row) for row in cursor.fetchall()]
            return jsonify(comments), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/add_rating', methods=['POST'])
def add_rating():
    try:
        data = request.json
        hotel_id = data.get('hotel_id')
        rating = data.get('rating')
        if not hotel_id or not rating or not (1 <= int(rating) <= 5):
            return jsonify({"status": "error", "message": "Invalid hotel_id or rating"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("INSERT INTO ratings (hotel_id, rating) VALUES (?, ?)", (hotel_id, int(rating)))
            cursor.execute("SELECT AVG(rating) as avg FROM ratings WHERE hotel_id = ?", (hotel_id,))
            avg = cursor.fetchone()[0]
            avg = round(float(avg), 1) if avg else 5.0
            cursor.execute("UPDATE hotels SET rating = ? WHERE unique_id = ?", (avg, hotel_id))
            conn.commit()
        return jsonify({"status": "success", "new_average": avg}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_hotel_rating', methods=['GET'])
def get_hotel_rating():
    try:
        hotel_id = request.args.get('hotel_id')
        if not hotel_id:
            return jsonify({"status": "error", "message": "hotel_id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT AVG(rating) as avg FROM ratings WHERE hotel_id = ?", (hotel_id,))
            avg = cursor.fetchone()[0]
            avg = round(float(avg), 1) if avg else 5.0
            return jsonify({"average": avg}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/add_memory', methods=['POST'])
def add_memory():
    try:
        data = request.json
        if not data.get('hotel_id') or not data.get('image_data'):
            return jsonify({"status": "error", "message": "Missing hotel_id or image_data"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("""INSERT INTO memories (hotel_id, image_data, caption, filter_used)
                               VALUES (?, ?, ?, ?)""",
                           (data['hotel_id'], data['image_data'], data.get('caption', ''), data.get('filter_used', 'normal')))
            conn.commit()
            memory_id = cursor.lastrowid
        return jsonify({"status": "success", "id": memory_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_memories', methods=['GET'])
def get_memories():
    try:
        hotel_id = request.args.get('hotel_id')
        if not hotel_id:
            return jsonify({"status": "error", "message": "hotel_id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM memories WHERE hotel_id = ? ORDER BY created_at DESC", (hotel_id,))
            memories = [dict(row) for row in cursor.fetchall()]
            return jsonify(memories), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/delete_memory', methods=['POST'])
def delete_memory():
    try:
        data = request.json
        memory_id = data.get('id')
        if not memory_id:
            return jsonify({"status": "error", "message": "id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memories WHERE id = ?", (memory_id,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"status": "error", "message": "Memory not found"}), 404
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/like_memory', methods=['POST'])
def like_memory():
    try:
        data = request.json
        memory_id = data.get('memory_id')
        if not memory_id:
            return jsonify({"status": "error", "message": "memory_id required"}), 400
        user_ip = request.headers.get('X-Forwarded-For', request.remote_addr)
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("SELECT 1 FROM memory_likes WHERE memory_id = ? AND user_ip = ?", (memory_id, user_ip))
            already_liked = cursor.fetchone() is not None
            if already_liked:
                cursor.execute("DELETE FROM memory_likes WHERE memory_id = ? AND user_ip = ?", (memory_id, user_ip))
                cursor.execute("UPDATE memories SET likes = likes - 1 WHERE id = ?", (memory_id,))
            else:
                cursor.execute("INSERT INTO memory_likes (memory_id, user_ip) VALUES (?, ?)", (memory_id, user_ip))
                cursor.execute("UPDATE memories SET likes = likes + 1 WHERE id = ?", (memory_id,))
            cursor.execute("SELECT likes FROM memories WHERE id = ?", (memory_id,))
            row = cursor.fetchone()
            new_likes = row[0] if row else 0
            conn.commit()
        return jsonify({"status": "success", "likes": new_likes}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/add_memory_comment', methods=['POST'])
def add_memory_comment():
    try:
        data = request.json
        memory_id = data.get('memory_id')
        username = data.get('username')
        comment = data.get('comment')
        if not memory_id or not username or not comment:
            return jsonify({"status": "error", "message": "Missing memory_id, username, or comment"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("""INSERT INTO memory_comments (memory_id, username, comment) VALUES (?, ?, ?)""",
                           (memory_id, username, comment))
            conn.commit()
            comment_id = cursor.lastrowid
        return jsonify({"status": "success", "id": comment_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/get_memory_comments', methods=['GET'])
def get_memory_comments():
    try:
        memory_id = request.args.get('memory_id')
        if not memory_id:
            return jsonify({"status": "error", "message": "memory_id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM memory_comments WHERE memory_id = ? ORDER BY created_at DESC", (memory_id,))
            comments = [dict(row) for row in cursor.fetchall()]
            return jsonify(comments), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/delete_comment', methods=['DELETE'])
def delete_memory_comment():
    try:
        comment_id = request.args.get('comment_id')
        if not comment_id:
            return jsonify({"status": "error", "message": "comment_id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("DELETE FROM memory_comments WHERE id = ?", (comment_id,))
            conn.commit()
            if cursor.rowcount == 0:
                return jsonify({"status": "error", "message": "Comment not found"}), 404
        return jsonify({"status": "success"}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500


@app.route('/health', methods=['GET'])
def dastarkhwan_health():
    return jsonify({"status": "ok", "message": "Dastarkhwan backend is running"}), 200


# ══════════════════════════════════════════════════
# STARTUP
# ══════════════════════════════════════════════════

if __name__ == '__main__':
    init_karma_db()
    init_dastarkhwan_db()
    print('MERGED SERVER (KARMA + Dastarkhwan) running')
    app.run(debug=True, port=5000)
else:
    # Also runs under gunicorn (production)
    init_karma_db()
    init_dastarkhwan_db()