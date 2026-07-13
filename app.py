import sqlite3
import json
import uuid
from flask import Flask, request, jsonify
from flask_cors import CORS

app = Flask(__name__)
from flask import send_from_directory

@app.route('/')
def serve_home():
    return send_from_directory('.', 'welcome.html')

@app.route('/<path:filename>')
def serve_static(filename):
    return send_from_directory('.', filename)
CORS(app)
 

# -------------------- DATABASE INIT (with migrations) --------------------
def init_db():
    with sqlite3.connect('dastarkhwan.db') as conn:
        cursor = conn.cursor()
        # ----- Hotels table (unchanged) -----
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS hotels (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                unique_id TEXT UNIQUE,
                name TEXT,
                category TEXT,
                owner TEXT,
                phone TEXT,
                location TEXT,
                image TEXT,
                menu TEXT,
                rating REAL DEFAULT 5.0,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
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

        # ----- Comments table (hotel-level) (unchanged) -----
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hotel_id TEXT NOT NULL,
                username TEXT NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ----- Ratings table (unchanged) -----
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS ratings (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hotel_id TEXT NOT NULL,
                rating INTEGER NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ----- Memories table (add likes column if missing) -----
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memories (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                hotel_id TEXT NOT NULL,
                image_data LONGTEXT NOT NULL,
                caption TEXT,
                filter_used TEXT DEFAULT 'normal',
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)
        # Add likes column if not exists
        cursor.execute("PRAGMA table_info(memories)")
        mem_cols = [col[1] for col in cursor.fetchall()]
        if 'likes' not in mem_cols:
            cursor.execute("ALTER TABLE memories ADD COLUMN likes INTEGER DEFAULT 0")

        # ----- NEW: Memory‑specific comments table -----
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_comments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                memory_id INTEGER NOT NULL,
                username TEXT NOT NULL,
                comment TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
            )
        """)

        # ----- NEW: Memory likes tracking (toggle with IP) -----
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS memory_likes (
                memory_id INTEGER NOT NULL,
                user_ip TEXT NOT NULL,
                created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                PRIMARY KEY (memory_id, user_ip)
            )
        """)

        conn.commit()
    print("✅ Database Ready: dastarkhwan.db (with toggle likes & memory comments)")

# ==================== HOTELS (unchanged) ====================
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
            cursor.execute("""
                INSERT INTO hotels 
                (unique_id, name, category, owner, phone, location, image, rating, menu)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (u_id, data['name'], data.get('category', 'veg'), data['owner'],
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
            cursor.execute("""
                UPDATE hotels SET name=?, owner=?, phone=?, location=?, image=?, category=?, menu=?
                WHERE unique_id = ?
            """, (data.get('name'), data.get('owner'), data.get('phone'), data.get('location', ''),
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
                if result['menu']:
                    result['menu'] = json.loads(result['menu'])
                else:
                    result['menu'] = []
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
                if hotel['menu']:
                    hotel['menu'] = json.loads(hotel['menu'])
                else:
                    hotel['menu'] = []
                hotels.append(hotel)
            return jsonify(hotels), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==================== COMMENTS (hotel‑level, unchanged) ====================
@app.route('/add_comment', methods=['POST'])
def add_comment():
    try:
        data = request.json
        if not data.get('hotel_id') or not data.get('username') or not data.get('comment'):
            return jsonify({"status": "error", "message": "Missing required fields"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO comments (hotel_id, username, comment)
                VALUES (?, ?, ?)
            """, (data['hotel_id'], data['username'], data['comment']))
            conn.commit()
            comment_id = cursor.lastrowid
        return jsonify({"status": "success", "id": comment_id}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/get_comments', methods=['GET'])
def get_comments():
    try:
        hotel_id = request.args.get('hotel_id')
        if not hotel_id:
            return jsonify({"status": "error", "message": "hotel_id required"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            conn.row_factory = sqlite3.Row
            cursor = conn.cursor()
            cursor.execute("SELECT * FROM comments WHERE hotel_id = ? ORDER BY created_at DESC", (hotel_id,))
            rows = cursor.fetchall()
            comments = [dict(row) for row in rows]
            return jsonify(comments), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==================== RATINGS (unchanged) ====================
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

# ==================== MEMORIES (unchanged) ====================
@app.route('/add_memory', methods=['POST'])
def add_memory():
    try:
        data = request.json
        if not data.get('hotel_id') or not data.get('image_data'):
            return jsonify({"status": "error", "message": "Missing hotel_id or image_data"}), 400
        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO memories (hotel_id, image_data, caption, filter_used)
                VALUES (?, ?, ?, ?)
            """, (data['hotel_id'], data['image_data'], data.get('caption', ''), data.get('filter_used', 'normal')))
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
            rows = cursor.fetchall()
            memories = [dict(row) for row in rows]
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

# ==================== FIXED: TOGGLE LIKE (uses client IP, no frontend changes) ====================
@app.route('/like_memory', methods=['POST'])
def like_memory():
    """Toggle like for a memory using client IP address – works with existing frontend."""
    try:
        data = request.json
        memory_id = data.get('memory_id')
        if not memory_id:
            return jsonify({"status": "error", "message": "memory_id required"}), 400

        # Get client IP (works behind proxies if needed)
        user_ip = request.headers.get('X-Forwarded-For', request.remote_addr)

        with sqlite3.connect('dastarkhwan.db') as conn:
            cursor = conn.cursor()

            # Check if this IP already liked this memory
            cursor.execute("SELECT 1 FROM memory_likes WHERE memory_id = ? AND user_ip = ?", (memory_id, user_ip))
            already_liked = cursor.fetchone() is not None

            if already_liked:
                # Unlike: remove like record, decrement count
                cursor.execute("DELETE FROM memory_likes WHERE memory_id = ? AND user_ip = ?", (memory_id, user_ip))
                cursor.execute("UPDATE memories SET likes = likes - 1 WHERE id = ?", (memory_id,))
            else:
                # Like: add like record, increment count
                cursor.execute("INSERT INTO memory_likes (memory_id, user_ip) VALUES (?, ?)", (memory_id, user_ip))
                cursor.execute("UPDATE memories SET likes = likes + 1 WHERE id = ?", (memory_id,))

            # Get updated like count
            cursor.execute("SELECT likes FROM memories WHERE id = ?", (memory_id,))
            row = cursor.fetchone()
            new_likes = row[0] if row else 0
            conn.commit()

        return jsonify({"status": "success", "likes": new_likes}), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==================== MEMORY COMMENTS (unchanged) ====================
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
            cursor.execute("""
                INSERT INTO memory_comments (memory_id, username, comment)
                VALUES (?, ?, ?)
            """, (memory_id, username, comment))
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
            rows = cursor.fetchall()
            comments = [dict(row) for row in rows]
            return jsonify(comments), 200
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

# ==================== NEW: DELETE MEMORY COMMENT ====================
@app.route('/delete_comment', methods=['DELETE'])
def delete_memory_comment():
    """Delete a comment from memory_comments by ID"""
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

# ==================== HEALTH CHECK ====================
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "message": "Dastarkhwan backend is running"}), 200

if __name__ == '__main__':
    init_db()
    print("🚀 Dastarkhwan Backend (merged) started on ")
    app.run(host='127.0.0.1', port=5000, debug=True)