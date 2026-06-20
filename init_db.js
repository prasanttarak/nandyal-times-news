const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const crypto = require('crypto');

const dbDir = process.env.DATA_DIR || __dirname;
const dbPath = path.join(dbDir, 'database.db');
const db = new sqlite3.Database(dbPath);

// Password hashing helper using SHA-256
function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

db.serialize(() => {
  console.log("Initializing database tables...");

  // 1. Users Table (Admin & Reporters)
  db.run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    mobile TEXT NOT NULL,
    location TEXT NOT NULL,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'reporter')) DEFAULT 'reporter',
    status TEXT CHECK(status IN ('pending', 'active', 'suspended')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 2. News Table
  db.run(`CREATE TABLE IF NOT EXISTS news (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    media_path TEXT,
    media_type TEXT CHECK(media_type IN ('image', 'video', 'none')) DEFAULT 'none',
    category TEXT CHECK(category IN ('Local', 'Jobs', 'Education', 'Sports', 'Events')) DEFAULT 'Local',
    reporter_id INTEGER,
    status TEXT CHECK(status IN ('pending', 'published')) DEFAULT 'pending',
    views INTEGER DEFAULT 0,
    likes INTEGER DEFAULT 0,
    mandal TEXT DEFAULT 'Nandyal Town',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(reporter_id) REFERENCES users(id)
  )`);

  // 3. Ads Table
  db.run(`CREATE TABLE IF NOT EXISTS ads (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    advertiser_name TEXT NOT NULL,
    image_path TEXT NOT NULL,
    link_url TEXT NOT NULL,
    position TEXT CHECK(position IN ('top_banner', 'sidebar', 'in_feed')) DEFAULT 'top_banner',
    status TEXT CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
    clicks INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 4. Business Directory Table
  db.run(`CREATE TABLE IF NOT EXISTS directory (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    business_name TEXT NOT NULL,
    description TEXT,
    category TEXT CHECK(category IN ('Food', 'Shopping', 'Services', 'Health', 'Education', 'Other')) DEFAULT 'Other',
    phone TEXT,
    whatsapp TEXT,
    address TEXT,
    image_path TEXT,
    is_featured INTEGER DEFAULT 0, -- 1 = true, 0 = false
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 5. Tips Table (Community reports)
  db.run(`CREATE TABLE IF NOT EXISTS tips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    contact TEXT NOT NULL,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    media_path TEXT,
    media_type TEXT CHECK(media_type IN ('image', 'video', 'none')) DEFAULT 'none',
    status TEXT CHECK(status IN ('pending', 'reviewed')) DEFAULT 'pending',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // 6. Comments Table
  db.run(`CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    news_id INTEGER NOT NULL,
    author TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY(news_id) REFERENCES news(id) ON DELETE CASCADE
  )`);

  // 7. Ticker Table
  db.run(`CREATE TABLE IF NOT EXISTS ticker (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    text TEXT NOT NULL,
    active INTEGER DEFAULT 1,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  )`);

  // --- SEED DATA ---

  // --- SEED DATA ---

  // 1. Seed Admin & Reporter
  db.get("SELECT COUNT(*) as count FROM users", (err, row) => {
    if (err) {
      console.error("Error checking users count:", err.message);
    } else if (row && row.count === 0) {
      const stmt = db.prepare("INSERT INTO users (name, mobile, location, username, password, role, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
      stmt.run("Nandyal Times Admin", "9000000000", "Nandyal Office", "admin", hashPassword("nandyal123"), "admin", "active");
      stmt.run("Siva Kumar", "9876543210", "NGO Colony, Nandyal", "reporter1", hashPassword("nandyal123"), "reporter", "active");
      stmt.finalize();
      console.log("Seeded default users (Admin: admin/nandyal123, Reporter: reporter1/nandyal123)");
    }

    // 2. Seed Sample News
    db.get("SELECT COUNT(*) as count FROM news", (err, row) => {
      if (err) {
        console.error("Error checking news count:", err.message);
      } else if (row && row.count === 0) {
        const stmt = db.prepare("INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES (?, ?, ?, ?, ?, ?, ?, ?)");
        stmt.run(
          "Grand Celebrations Planned at Mahanandi Temple for Shivaratri",
          "The historic Mahanandi temple is gearing up for grand Maha Shivaratri celebrations next week. The temple administration has made elaborate arrangements for the drinking water, queue lines, and prasadam distribution for over 2 lakh devotees expected from all over Andhra Pradesh and neighboring states. Special cultural programs will be held in the temple premises throughout the night.",
          "https://images.unsplash.com/photo-1608976328371-611b85737416?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          2,
          "published",
          "Mahanandi"
        );
        stmt.run(
          "Nandyal Mega Job Fair 2026: 50+ Multi-National Companies to Participate",
          "The District Employment Office has announced a Mega Job Fair to be held at Government Degree College, Nandyal, on the 25th of this month. Over 50 MNCs from IT, Pharma, Banking, and Retail sectors are participating with 2,500+ vacant positions. Graduates and diploma holders of batches 2023, 2024, and 2025 are eligible. Candidates must bring 5 copies of resumes and certificates.",
          "https://images.unsplash.com/photo-1521737711867-e3b90473bd58?w=800&auto=format&fit=crop&q=60",
          "image",
          "Jobs",
          2,
          "published",
          "Nandyal Town"
        );
        stmt.run(
          "Nandyal District Sports Meet: Local Athlete Wins Gold in 100m Dash",
          "In the ongoing Nandyal District Annual Sports Meet at the Regional Stadium, R. Mahesh from NGO Colony clinched the Gold medal in the 100m sprint running at a record time of 10.82 seconds. The District Collector congratulated the athlete and promised support for his national qualifications training.",
          "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=60",
          "image",
          "Sports",
          2,
          "published",
          "Nandyal Town"
        );
        stmt.run(
          "Nandyal Railway Station Upgraded Under Amrit Bharat Scheme",
          "Nandyal railway station is undergoing a major facelift with a budget of ₹24 crores under the central government's Amrit Bharat Station Scheme. Redevelopment works include a modernized station entrance, second entry point, extended platform shelters, escalators, and improved waiting halls. The railway division officials inspected the progress and stated that the major amenities will be open to passengers by August 2026.",
          "https://images.unsplash.com/photo-1541417904950-b855846fe074?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          2,
          "published",
          "Nandyal Town"
        );
        stmt.run(
          "Nandyal Government Medical College Secures 150 MBBS Seats for 2026-27",
          "The National Medical Commission (NMC) has officially renewed the permission for 150 MBBS seats at the Government Medical College in Nandyal for the academic year 2026-27. The college administration highlighted that the hospital facilities, modern laboratories, and library infrastructures were inspected and approved. The admissions will be conducted through the upcoming NEET counselling sessions.",
          "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=60",
          "image",
          "Education",
          2,
          "published",
          "Allagadda"
        );
        stmt.run(
          "Nandyal Cotton Market Yard Records Peak Arrivals; Prices Steady at ₹7,500",
          "The agricultural market yard in Nandyal saw high volumes of cotton arrivals this week, with farmers from across Kurnool and Nandyal districts bringing their harvests. The pricing remained steady, ranging between ₹7,000 and ₹7,800 per quintal depending on quality. Market yard committee officials urged farmers to dry their cotton crops to maintain low moisture levels for better competitive bids.",
          "https://images.unsplash.com/photo-1594489428504-5c0c480a15fa?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          2,
          "published",
          "Banaganapalli"
        );
        stmt.run(
          "Construction of New Bridge Over Kundu River Near Nandyal Nearing Completion",
          "The Roads and Buildings (R&B) department announced that 85% of the construction work on the new high-level bridge across the Kundu River on the Nandyal-Giddalur highway is complete. The bridge is expected to solve seasonal flooding issues that cut off communication during heavy monsoons. The project is expected to be fully inaugurated before the onset of this year's seasonal rains.",
          "https://images.unsplash.com/photo-1545642111-bc6c11732609?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          2,
          "published",
          "Atmakur"
        );
        stmt.finalize();
        console.log("Seeded default news articles.");
      }

      // 3. Seed Sample Directory
      db.get("SELECT COUNT(*) as count FROM directory", (err, row) => {
        if (err) {
          console.error("Error checking directory count:", err.message);
        } else if (row && row.count === 0) {
          const stmt = db.prepare("INSERT INTO directory (business_name, description, category, phone, whatsapp, address, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?)");
          stmt.run(
            "Spicy Rayalaseema Ruchulu",
            "Authentic local Rayalaseema spices. Famous for Natu Kodi Pulusu and Ragi Sangati.",
            "Food",
            "9848022338",
            "9848022338",
            "Near Srinivasa Center, Nandyal",
            1
          );
          stmt.run(
            "Nandyal Kids Care Clinic",
            "Consultation for all pediatric needs. Specialized child wellness and vaccination center.",
            "Health",
            "08514223456",
            "9440234567",
            "Sanjeeva Nagar, Nandyal",
            1
          );
          stmt.finalize();
          console.log("Seeded directory entries.");
        }

        // 4. Seed Sample Ads
        db.get("SELECT COUNT(*) as count FROM ads", (err, row) => {
          if (err) {
            console.error("Error checking ads count:", err.message);
          } else if (row && row.count === 0) {
            const stmt = db.prepare("INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES (?, ?, ?, ?, ?)");
            stmt.run(
              "Sri Sai Jewellers Nandyal",
              "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=60",
              "https://instagram.com",
              "top_banner",
              "active"
            );
            stmt.run(
              "Spicy Rayalaseema Ruchulu",
              "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800&auto=format&fit=crop&q=60",
              "https://instagram.com",
              "sidebar",
              "active"
            );
            stmt.run(
              "Nandyal Silks & Textiles",
              "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=60",
              "https://instagram.com",
              "sidebar",
              "active"
            );
            stmt.run(
              "Harsha Electronic Mall",
              "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60",
              "https://instagram.com",
              "sidebar",
              "active"
            );
            stmt.finalize();
            console.log("Seeded default advertisements.");
          }

          // 5. Seed Sample Citizen Notices (Tips with 'reviewed' status)
          db.get("SELECT COUNT(*) as count FROM tips", (err, row) => {
            if (err) {
              console.error("Error checking tips count:", err.message);
            } else if (row && row.count === 0) {
              const stmt = db.prepare("INSERT INTO tips (name, contact, title, description, media_path, media_type, status) VALUES (?, ?, ?, ?, ?, ?, ?)");
              stmt.run(
                "Ravi Kumar",
                "9000123456",
                "Dangerous Pothole near RTC Bus Stand Entrance",
                "A large pothole has formed right at the entrance of the Nandyal RTC Bus Stand. It is causing severe traffic slow-downs during peak hours and is highly risky for two-wheelers, especially at night.",
                null,
                "none",
                "reviewed"
              );
              stmt.run(
                "Lakshmi Prasanna",
                "9440123456",
                "Water Stagnation in NGO Colony 4th Lane",
                "Due to blocked drainage lines, dirty water is stagnating on the road in NGO Colony 4th Lane. This has become a major breeding ground for mosquitoes, raising hygiene concerns for children.",
                null,
                "none",
                "reviewed"
              );
              stmt.finalize();
              console.log("Seeded sample reviewed citizen notices.");
            }

            // 6. Seed Sample Ticker Announcement
            db.get("SELECT COUNT(*) as count FROM ticker", (err, row) => {
              if (err) {
                console.error("Error checking ticker count:", err.message);
              } else if (row && row.count === 0) {
                db.run(
                  "INSERT INTO ticker (text, active) VALUES (?, ?)",
                  "Welcome to Nandyal Times! Submit incident reports or local updates using the buttons above.",
                  1
                );
                console.log("Seeded default ticker announcement.");
              }

              // FINALLY, CLOSE THE DATABASE CONNECTION!
              db.close((err) => {
                if (err) {
                  console.error("Error closing database:", err.message);
                } else {
                  console.log("Nandyal Times database initialized successfully.");
                }
              });
            }); // ticker
          }); // tips
        }); // ads
      }); // directory
    }); // news
  }); // users

}); // closes db.serialize
