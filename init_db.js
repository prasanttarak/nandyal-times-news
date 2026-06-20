require('dotenv').config();
const { Client } = require('pg');
const crypto = require('crypto');

function hashPassword(password) {
  return crypto.createHash('sha256').update(password).digest('hex');
}

async function run() {
  const client = new Client({
    connectionString: process.env.NEON_DATABASE_URL,
    ssl: {
      rejectUnauthorized: false
    }
  });

  try {
    await client.connect();
    console.log("Connected to Neon PostgreSQL database.");

    console.log("Initializing database tables...");

    // Create session table
    await client.query(`
      CREATE TABLE IF NOT EXISTS "session" (
        "sid" varchar NOT NULL COLLATE "default",
        "sess" json NOT NULL,
        "expire" timestamp(6) NOT NULL,
        CONSTRAINT "session_pkey" PRIMARY KEY ("sid")
      ) WITH (OIDS=FALSE)
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire")`);

    // Create users table
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        mobile VARCHAR(50) NOT NULL,
        location VARCHAR(255) NOT NULL,
        username VARCHAR(255) UNIQUE NOT NULL,
        password VARCHAR(255) NOT NULL,
        role VARCHAR(20) CHECK(role IN ('admin', 'reporter')) DEFAULT 'reporter',
        status VARCHAR(20) CHECK(status IN ('pending', 'active', 'suspended')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create news table
    await client.query(`
      CREATE TABLE IF NOT EXISTS news (
        id SERIAL PRIMARY KEY,
        title VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        media_path VARCHAR(2000),
        media_type VARCHAR(20) CHECK(media_type IN ('image', 'video', 'none')) DEFAULT 'none',
        category VARCHAR(50) CHECK(category IN ('Local', 'Jobs', 'Education', 'Sports', 'Events')) DEFAULT 'Local',
        reporter_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
        status VARCHAR(20) CHECK(status IN ('pending', 'published')) DEFAULT 'pending',
        views INTEGER DEFAULT 0,
        likes INTEGER DEFAULT 0,
        mandal VARCHAR(100) DEFAULT 'Nandyal Town',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ads table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ads (
        id SERIAL PRIMARY KEY,
        advertiser_name VARCHAR(255) NOT NULL,
        image_path VARCHAR(2000) NOT NULL,
        link_url VARCHAR(2000) NOT NULL,
        position VARCHAR(50) CHECK(position IN ('top_banner', 'sidebar', 'in_feed')) DEFAULT 'top_banner',
        status VARCHAR(20) CHECK(status IN ('active', 'inactive')) DEFAULT 'active',
        clicks INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create directory table
    await client.query(`
      CREATE TABLE IF NOT EXISTS directory (
        id SERIAL PRIMARY KEY,
        business_name VARCHAR(255) NOT NULL,
        description TEXT,
        category VARCHAR(50) CHECK(category IN ('Food', 'Shopping', 'Services', 'Health', 'Education', 'Other')) DEFAULT 'Other',
        phone VARCHAR(50),
        whatsapp VARCHAR(50),
        address VARCHAR(500),
        image_path VARCHAR(2000),
        is_featured INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create tips table
    await client.query(`
      CREATE TABLE IF NOT EXISTS tips (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        contact VARCHAR(50) NOT NULL,
        title VARCHAR(255) NOT NULL,
        description TEXT NOT NULL,
        media_path VARCHAR(2000),
        media_type VARCHAR(20) CHECK(media_type IN ('image', 'video', 'none')) DEFAULT 'none',
        status VARCHAR(20) CHECK(status IN ('pending', 'reviewed')) DEFAULT 'pending',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create comments table
    await client.query(`
      CREATE TABLE IF NOT EXISTS comments (
        id SERIAL PRIMARY KEY,
        news_id INTEGER NOT NULL REFERENCES news(id) ON DELETE CASCADE,
        author VARCHAR(255) NOT NULL,
        content TEXT NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // Create ticker table
    await client.query(`
      CREATE TABLE IF NOT EXISTS ticker (
        id SERIAL PRIMARY KEY,
        text TEXT NOT NULL,
        active INTEGER DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      )
    `);

    // --- SEED DATA ---

    // 1. Seed Users (Admin & Reporter)
    const userCountRes = await client.query("SELECT COUNT(*) as count FROM users");
    const userCount = parseInt(userCountRes.rows[0].count);
    if (userCount === 0) {
      await client.query(
        "INSERT INTO users (name, mobile, location, username, password, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Nandyal Times Admin", "9000000000", "Nandyal Office", "admin", hashPassword("nandyal123"), "admin", "active"]
      );
      await client.query(
        "INSERT INTO users (name, mobile, location, username, password, role, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        ["Siva Kumar", "9876543210", "NGO Colony, Nandyal", "reporter1", hashPassword("nandyal123"), "reporter", "active"]
      );
      console.log("Seeded default users (Admin: admin/nandyal123, Reporter: reporter1/nandyal123)");
    }

    // 2. Seed News Articles
    const newsCountRes = await client.query("SELECT COUNT(*) as count FROM news");
    const newsCount = parseInt(newsCountRes.rows[0].count);
    if (newsCount === 0) {
      // Find Siva Kumar's ID
      const repRes = await client.query("SELECT id FROM users WHERE username = 'reporter1'");
      const repId = repRes.rows[0].id;

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Grand Celebrations Planned at Mahanandi Temple for Shivaratri",
          "The historic Mahanandi temple is gearing up for grand Maha Shivaratri celebrations next week. The temple administration has made elaborate arrangements for the drinking water, queue lines, and prasadam distribution for over 2 lakh devotees expected from all over Andhra Pradesh and neighboring states. Special cultural programs will be held in the temple premises throughout the night.",
          "https://images.unsplash.com/photo-1608976328371-611b85737416?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          repId,
          "published",
          "Mahanandi"
        ]
      );

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Nandyal Mega Job Fair 2026: 50+ Multi-National Companies to Participate",
          "The District Employment Office has announced a Mega Job Fair to be held at Government Degree College, Nandyal, on the 25th of this month. Over 50 MNCs from IT, Pharma, Banking, and Retail sectors are participating with 2,500+ vacant positions. Graduates and diploma holders of batches 2023, 2024, and 2025 are eligible. Candidates must bring 5 copies of resumes and certificates.",
          "https://images.unsplash.com/photo-1521737711867-e3b90473bd58?w=800&auto=format&fit=crop&q=60",
          "image",
          "Jobs",
          repId,
          "published",
          "Nandyal Town"
        ]
      );

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Nandyal District Sports Meet: Local Athlete Wins Gold in 100m Dash",
          "In the ongoing Nandyal District Annual Sports Meet at the Regional Stadium, R. Mahesh from NGO Colony clinched the Gold medal in the 100m sprint running at a record time of 10.82 seconds. The District Collector congratulated the athlete and promised support for his national qualifications training.",
          "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=60",
          "image",
          "Sports",
          repId,
          "published",
          "Nandyal Town"
        ]
      );

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Nandyal Railway Station Upgraded Under Amrit Bharat Scheme",
          "Nandyal railway station is undergoing a major facelift with a budget of ₹24 crores under the central government's Amrit Bharat Station Scheme. Redevelopment works include a modernized station entrance, second entry point, extended platform shelters, escalators, and improved waiting halls. The railway division officials inspected the progress and stated that the major amenities will be open to passengers by August 2026.",
          "https://images.unsplash.com/photo-1541417904950-b855846fe074?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          repId,
          "published",
          "Nandyal Town"
        ]
      );

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Nandyal Government Medical College Secures 150 MBBS Seats for 2026-27",
          "The National Medical Commission (NMC) has officially renewed the permission for 150 MBBS seats at the Government Medical College in Nandyal for the academic year 2026-27. The college administration highlighted that the hospital facilities, modern laboratories, and library infrastructures were inspected and approved. The admissions will be conducted through the upcoming NEET counselling sessions.",
          "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=60",
          "image",
          "Education",
          repId,
          "published",
          "Allagadda"
        ]
      );

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Nandyal Cotton Market Yard Records Peak Arrivals; Prices Steady at ₹7,500",
          "The agricultural market yard in Nandyal saw high volumes of cotton arrivals this week, with farmers from across Kurnool and Nandyal districts bringing their harvests. The pricing remained steady, ranging between ₹7,000 and ₹7,800 per quintal depending on quality. Market yard committee officials urged farmers to dry their cotton crops to maintain low moisture levels for better competitive bids.",
          "https://images.unsplash.com/photo-1594489428504-5c0c480a15fa?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          repId,
          "published",
          "Banaganapalli"
        ]
      );

      await client.query(
        "INSERT INTO news (title, content, media_path, media_type, category, reporter_id, status, mandal) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)",
        [
          "Construction of New Bridge Over Kundu River Near Nandyal Nearing Completion",
          "The Roads and Buildings (R&B) department announced that 85% of the construction work on the new high-level bridge across the Kundu River on the Nandyal-Giddalur highway is complete. The bridge is expected to solve seasonal flooding issues that cut off communication during heavy monsoons. The project is expected to be fully inaugurated before the onset of this year's seasonal rains.",
          "https://images.unsplash.com/photo-1545642111-bc6c11732609?w=800&auto=format&fit=crop&q=60",
          "image",
          "Local",
          repId,
          "published",
          "Atmakur"
        ]
      );
      console.log("Seeded default news articles.");
    }

    // 3. Seed Sample Directory
    const dirCountRes = await client.query("SELECT COUNT(*) as count FROM directory");
    const dirCount = parseInt(dirCountRes.rows[0].count);
    if (dirCount === 0) {
      await client.query(
        "INSERT INTO directory (business_name, description, category, phone, whatsapp, address, is_featured) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          "Spicy Rayalaseema Ruchulu",
          "Authentic local Rayalaseema spices. Famous for Natu Kodi Pulusu and Ragi Sangati.",
          "Food",
          "9848022338",
          "9848022338",
          "Near Srinivasa Center, Nandyal",
          1
        ]
      );

      await client.query(
        "INSERT INTO directory (business_name, description, category, phone, whatsapp, address, is_featured) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          "Nandyal Kids Care Clinic",
          "Consultation for all pediatric needs. Specialized child wellness and vaccination center.",
          "Health",
          "08514223456",
          "9440234567",
          "Sanjeeva Nagar, Nandyal",
          1
        ]
      );
      console.log("Seeded directory entries.");
    }

    // 4. Seed Sample Ads
    const adsCountRes = await client.query("SELECT COUNT(*) as count FROM ads");
    const adsCount = parseInt(adsCountRes.rows[0].count);
    if (adsCount === 0) {
      await client.query(
        "INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES ($1, $2, $3, $4, $5)",
        [
          "Sri Sai Jewellers Nandyal",
          "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=60",
          "https://instagram.com",
          "top_banner",
          "active"
        ]
      );
      await client.query(
        "INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES ($1, $2, $3, $4, $5)",
        [
          "Spicy Rayalaseema Ruchulu",
          "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800&auto=format&fit=crop&q=60",
          "https://instagram.com",
          "sidebar",
          "active"
        ]
      );
      await client.query(
        "INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES ($1, $2, $3, $4, $5)",
        [
          "Nandyal Silks & Textiles",
          "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=60",
          "https://instagram.com",
          "sidebar",
          "active"
        ]
      );
      await client.query(
        "INSERT INTO ads (advertiser_name, image_path, link_url, position, status) VALUES ($1, $2, $3, $4, $5)",
        [
          "Harsha Electronic Mall",
          "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60",
          "https://instagram.com",
          "sidebar",
          "active"
        ]
      );
      console.log("Seeded default advertisements.");
    }

    // 5. Seed Sample Citizen Notices (Tips)
    const tipsCountRes = await client.query("SELECT COUNT(*) as count FROM tips");
    const tipsCount = parseInt(tipsCountRes.rows[0].count);
    if (tipsCount === 0) {
      await client.query(
        "INSERT INTO tips (name, contact, title, description, media_path, media_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          "Ravi Kumar",
          "9000123456",
          "Dangerous Pothole near RTC Bus Stand Entrance",
          "A large pothole has formed right at the entrance of the Nandyal RTC Bus Stand. It is causing severe traffic slow-downs during peak hours and is highly risky for two-wheelers, especially at night.",
          null,
          "none",
          "reviewed"
        ]
      );
      await client.query(
        "INSERT INTO tips (name, contact, title, description, media_path, media_type, status) VALUES ($1, $2, $3, $4, $5, $6, $7)",
        [
          "Lakshmi Prasanna",
          "9440123456",
          "Water Stagnation in NGO Colony 4th Lane",
          "Due to blocked drainage lines, dirty water is stagnating on the road in NGO Colony 4th Lane. This has become a major breeding ground for mosquitoes, raising hygiene concerns for children.",
          null,
          "none",
          "reviewed"
        ]
      );
      console.log("Seeded sample reviewed citizen notices.");
    }

    // 6. Seed Sample Ticker Announcement
    const tickerCountRes = await client.query("SELECT COUNT(*) as count FROM ticker");
    const tickerCount = parseInt(tickerCountRes.rows[0].count);
    if (tickerCount === 0) {
      await client.query(
        "INSERT INTO ticker (text, active) VALUES ($1, $2)",
        ["Welcome to Nandyal Times! Submit incident reports or local updates using the buttons above.", 1]
      );
      console.log("Seeded default ticker announcement.");
    }

    console.log("Nandyal Times PostgreSQL database initialized successfully.");
  } catch (err) {
    console.error("Error during database initialization:", err.message);
  } finally {
    await client.end();
  }
}

run();
