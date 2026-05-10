# KidLearn Backend ⚙️
### Node.js REST API for KidLearn App

> ⚠️ **This is an MVP (Minimum Viable Product)** — Core APIs are working and tested with Postman. The full version with advanced features is actively being developed.

---

## 📖 About

This is the Node.js + Express backend for the KidLearn mobile application. It handles authentication, video management, watch history tracking, and screen time controls.

---

## ✅ API Endpoints

### Authentication
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/auth/register` | Parent creates account | ✅ Working |
| POST | `/api/auth/login` | Parent login — returns JWT token | ✅ Working |

### Videos
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| GET | `/api/videos` | Fetch videos (filter by age + category) | ✅ Working |
| POST | `/api/videos/history` | Log a video play | ✅ Working |
| GET | `/api/videos/history/:parentId` | Get watch history | ✅ Working |
| GET | `/api/videos/screentime/:childId` | Get today's screen time | ✅ Working |
| PUT | `/api/videos/screentime/:childId` | Update screen time limit | ✅ Working |

### Children
| Method | Endpoint | Description | Status |
|--------|----------|-------------|--------|
| POST | `/api/children/add` | Parent adds child profile | ✅ Working |
| GET | `/api/children/:parentId` | Get all children for a parent | ✅ Working |

---

## 🛠️ Tech Stack

| Technology | Purpose |
|-----------|---------|
| Node.js v24 | JavaScript runtime |
| Express.js | REST API framework |
| MySQL 8.0 | Relational database |
| jsonwebtoken | JWT authentication |
| bcryptjs | Password hashing |
| multer | File upload handling |
| cors | Cross-origin requests |
| dotenv | Environment variables |
| Cloudinary | Video file storage |

---

## 🗄️ Database Schema

```sql
-- Parents table
CREATE TABLE parents (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(100) UNIQUE NOT NULL,
  password VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Children table
CREATE TABLE children (
  id INT AUTO_INCREMENT PRIMARY KEY,
  parent_id INT NOT NULL,
  name VARCHAR(100) NOT NULL,
  age INT NOT NULL,
  pin VARCHAR(10),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (parent_id) REFERENCES parents(id)
);

-- Videos table
CREATE TABLE videos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  title VARCHAR(200) NOT NULL,
  url VARCHAR(500) NOT NULL,
  category VARCHAR(50) NOT NULL,
  age_min INT DEFAULT 1,
  age_max INT DEFAULT 12,
  duration VARCHAR(20),
  is_approved TINYINT DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Watch history table
CREATE TABLE watch_history (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  video_id INT NOT NULL,
  watched_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  duration_watched INT DEFAULT 0,
  FOREIGN KEY (child_id) REFERENCES children(id),
  FOREIGN KEY (video_id) REFERENCES videos(id)
);

-- Screen time table
CREATE TABLE screen_time (
  id INT AUTO_INCREMENT PRIMARY KEY,
  child_id INT NOT NULL,
  date DATE NOT NULL,
  total_seconds INT DEFAULT 0,
  limit_seconds INT DEFAULT 2700,
  FOREIGN KEY (child_id) REFERENCES children(id)
);
```

---

## 📁 Project Structure

```
kidlearn-backend/
├── server.js           # Express app entry point — port 3000
├── database.js         # MySQL connection pool
├── .env                # Secret keys (not pushed to GitHub)
├── .gitignore          # Excludes .env and node_modules
├── routes/
│   ├── auth.js         # Register + Login APIs
│   ├── videos.js       # Video + History + Screen time APIs
│   └── children.js     # Child profile APIs
└── node_modules/       # Installed packages
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js v18+
- MySQL 8.0
- npm or yarn

### Installation

1. Clone the repository
```bash
git clone https://github.com/Rushwanth-K/kidlearn-backend.git
cd kidlearn-backend
```

2. Install dependencies
```bash
npm install
```

3. Create `.env` file in the root folder
```env
PORT=3000
DB_HOST=localhost
DB_USER=root
DB_PASSWORD=your_mysql_password
DB_NAME=kidlearn_db
JWT_SECRET=your_jwt_secret_key
CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
```

4. Create MySQL database and tables
```sql
CREATE DATABASE kidlearn_db;
USE kidlearn_db;
-- Run the schema SQL from Database Schema section above
```

5. Start the server
```bash
node server.js
```

Server runs at `http://localhost:3000`

---

## 🧪 Testing with Postman

### Register
```json
POST http://localhost:3000/api/auth/register
{
  "name": "Parent Name",
  "email": "parent@email.com",
  "password": "yourpassword"
}
```

### Login
```json
POST http://localhost:3000/api/auth/login
{
  "email": "parent@email.com",
  "password": "yourpassword"
}
```

### Get Videos
```
GET http://localhost:3000/api/videos
GET http://localhost:3000/api/videos?category=Education
GET http://localhost:3000/api/videos?age=5
```

---

## 🔜 Coming in Full Version
- [ ] Middleware for JWT verification on protected routes
- [ ] Content moderation for uploaded videos
- [ ] Push notifications for screen time alerts
- [ ] Admin panel for video management
- [ ] Analytics dashboard
- [ ] Rate limiting and security hardening
- [ ] Docker deployment

---

## 🔗 Flutter App Repository

The Flutter frontend for this backend is available here:
👉 [kidlearn-app](https://github.com/Rushwanth-K/kidlearn-app)

---

## 👨‍💻 Developer

**Rushwanth K**
- BCA Final Year Student
- GitHub: [@Rushwanth-K](https://github.com/Rushwanth-K)

---

## 📄 License

This project is open source and available under the [MIT License](LICENSE).

---

> 💡 **This backend is part of KidLearn — a Final Year Project + Startup MVP.**
> Built to provide a safe, controlled video experience for children aged 1–7.
