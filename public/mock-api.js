// mock-api.js - Self-contained mock database for Nandyal Times
// Runs automatically when the Node.js backend is offline or the files are opened directly in the browser.

(function () {
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1' || window.location.hostname === '';
  const useMock = window.location.protocol === 'file:' || (isLocalhost && window.location.port !== '5000');

  if (!useMock) {
    console.log("Nandyal Times: Node.js server environment detected. Mock API disabled.");
    return;
  }

  console.warn("Nandyal Times: Backend server not detected. Running in Browser Local Storage Mode!");

  // --- INITIALIZE STORAGE SCHEMA ---
  function initLocalStorage() {
    // 1. Seed Users (Admin & Reporter)
    if (!localStorage.getItem('nt_users')) {
      const defaultUsers = [
        {
          id: 1,
          name: "Nandyal Times Admin",
          mobile: "9000000000",
          location: "Nandyal Office",
          username: "admin",
          passwordHash: "nandyal123", // Using simple check in mock mode for simplicity
          role: "admin",
          status: "active",
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          name: "Siva Kumar",
          mobile: "9876543210",
          location: "NGO Colony, Nandyal",
          username: "reporter1",
          passwordHash: "nandyal123",
          role: "reporter",
          status: "active",
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('nt_users', JSON.stringify(defaultUsers));
    }

    // 2. Seed News Articles
    const currentNews = JSON.parse(localStorage.getItem('nt_news') || '[]');
    if (!localStorage.getItem('nt_news') || currentNews.length < 7) {
      const defaultNews = [
        {
          id: 1,
          title: "Grand Celebrations Planned at Mahanandi Temple for Shivaratri",
          content: "The historic Mahanandi temple is gearing up for grand Maha Shivaratri celebrations next week. The temple administration has made elaborate arrangements for drinking water, queue lines, and prasadam distribution for over 2 lakh devotees expected from all over Andhra Pradesh and neighboring states. Special cultural programs will be held in the temple premises throughout the night.",
          media_path: "https://images.unsplash.com/photo-1608976328371-611b85737416?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Local",
          reporter_id: 2,
          status: "published",
          views: 120,
          likes: 24,
          created_at: new Date(Date.now() - 3600000 * 2).toISOString() // 2 hours ago
        },
        {
          id: 2,
          title: "Nandyal Mega Job Fair 2026: 50+ Multi-National Companies to Participate",
          content: "The District Employment Office has announced a Mega Job Fair to be held at Government Degree College, Nandyal, on the 25th of this month. Over 50 MNCs from IT, Pharma, Banking, and Retail sectors are participating with 2,500+ vacant positions. Graduates and diploma holders of batches 2023, 2024, and 2025 are eligible. Candidates must bring 5 copies of resumes and certificates.",
          media_path: "https://images.unsplash.com/photo-1521737711867-e3b90473bd58?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Jobs",
          reporter_id: 2,
          status: "published",
          views: 85,
          likes: 12,
          created_at: new Date(Date.now() - 3600000 * 10).toISOString() // 10 hours ago
        },
        {
          id: 3,
          title: "Nandyal District Sports Meet: Local Athlete Wins Gold in 100m Dash",
          content: "In the ongoing Nandyal District Annual Sports Meet at the Regional Stadium, R. Mahesh from NGO Colony clinched the Gold medal in the 100m sprint running at a record time of 10.82 seconds. The District Collector congratulated the athlete and promised support for his national qualifications training.",
          media_path: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Sports",
          reporter_id: 2,
          status: "published",
          views: 50,
          likes: 8,
          created_at: new Date(Date.now() - 3600000 * 24).toISOString() // 1 day ago
        },
        {
          id: 4,
          title: "Nandyal Railway Station Upgraded Under Amrit Bharat Scheme",
          content: "Nandyal railway station is undergoing a major facelift with a budget of ₹24 crores under the central government's Amrit Bharat Station Scheme. Redevelopment works include a modernized station entrance, second entry point, extended platform shelters, escalators, and improved waiting halls. The railway division officials inspected the progress and stated that the major amenities will be open to passengers by August 2026.",
          media_path: "https://images.unsplash.com/photo-1541417904950-b855846fe074?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Local",
          reporter_id: 2,
          status: "published",
          views: 65,
          likes: 15,
          created_at: new Date(Date.now() - 3600000 * 28).toISOString() // 1.1 days ago
        },
        {
          id: 5,
          title: "Nandyal Government Medical College Secures 150 MBBS Seats for 2026-27",
          content: "The National Medical Commission (NMC) has officially renewed the permission for 150 MBBS seats at the Government Medical College in Nandyal for the academic year 2026-27. The college administration highlighted that the hospital facilities, modern laboratories, and library infrastructures were inspected and approved. The admissions will be conducted through the upcoming NEET counselling sessions.",
          media_path: "https://images.unsplash.com/photo-1584515979956-d9f6e5d09982?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Education",
          reporter_id: 2,
          status: "published",
          views: 110,
          likes: 20,
          created_at: new Date(Date.now() - 3600000 * 48).toISOString() // 2 days ago
        },
        {
          id: 6,
          title: "Nandyal Cotton Market Yard Records Peak Arrivals; Prices Steady at ₹7,500",
          content: "The agricultural market yard in Nandyal saw high volumes of cotton arrivals this week, with farmers from across Kurnool and Nandyal districts bringing their harvests. The pricing remained steady, ranging between ₹7,000 and ₹7,800 per quintal depending on quality. Market yard committee officials urged farmers to dry their cotton crops to maintain low moisture levels for better competitive bids.",
          media_path: "https://images.unsplash.com/photo-1594489428504-5c0c480a15fa?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Local",
          reporter_id: 2,
          status: "published",
          views: 95,
          likes: 18,
          created_at: new Date(Date.now() - 3600000 * 72).toISOString() // 3 days ago
        },
        {
          id: 7,
          title: "Construction of New Bridge Over Kundu River Near Nandyal Nearing Completion",
          content: "The Roads and Buildings (R&B) department announced that 85% of the construction work on the new high-level bridge across the Kundu River on the Nandyal-Giddalur highway is complete. The bridge is expected to solve seasonal flooding issues that cut off communication during heavy monsoons. The project is expected to be fully inaugurated before the onset of this year's seasonal rains.",
          media_path: "https://images.unsplash.com/photo-1545642111-bc6c11732609?w=800&auto=format&fit=crop&q=60",
          media_type: "image",
          category: "Local",
          reporter_id: 2,
          status: "published",
          views: 40,
          likes: 9,
          created_at: new Date(Date.now() - 3600000 * 96).toISOString() // 4 days ago
        }
      ];
      localStorage.setItem('nt_news', JSON.stringify(defaultNews));
    }

    // 3. Seed Ads
    const currentAds = JSON.parse(localStorage.getItem('nt_ads') || '[]');
    if (!localStorage.getItem('nt_ads') || currentAds.length < 4) {
      const defaultAds = [
        {
          id: 1,
          advertiser_name: "Sri Sai Jewellers Nandyal",
          image_path: "https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?w=800&auto=format&fit=crop&q=60",
          link_url: "https://instagram.com",
          position: "top_banner",
          status: "active",
          clicks: 12,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          advertiser_name: "Spicy Rayalaseema Ruchulu",
          image_path: "https://images.unsplash.com/photo-1601050690597-df056fb4ce78?w=800&auto=format&fit=crop&q=60",
          link_url: "https://instagram.com",
          position: "sidebar",
          status: "active",
          clicks: 5,
          created_at: new Date().toISOString()
        },
        {
          id: 3,
          advertiser_name: "Nandyal Silks & Textiles",
          image_path: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&auto=format&fit=crop&q=60",
          link_url: "https://instagram.com",
          position: "sidebar",
          status: "active",
          clicks: 8,
          created_at: new Date().toISOString()
        },
        {
          id: 4,
          advertiser_name: "Harsha Electronic Mall",
          image_path: "https://images.unsplash.com/photo-1542751371-adc38448a05e?w=800&auto=format&fit=crop&q=60",
          link_url: "https://instagram.com",
          position: "sidebar",
          status: "active",
          clicks: 14,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('nt_ads', JSON.stringify(defaultAds));
    }

    // 4. Seed Directory Listings
    if (!localStorage.getItem('nt_directory')) {
      const defaultDirectory = [
        {
          id: 1,
          business_name: "Spicy Rayalaseema Ruchulu",
          description: "Authentic local Rayalaseema spices. Famous for Natu Kodi Pulusu and Ragi Sangati.",
          category: "Food",
          phone: "9848022338",
          whatsapp: "9848022338",
          address: "Near Srinivasa Center, Nandyal",
          image_path: "",
          is_featured: 1,
          created_at: new Date().toISOString()
        },
        {
          id: 2,
          business_name: "Nandyal Kids Care Clinic",
          description: "Consultation for all pediatric needs. Specialized child wellness and vaccination center.",
          category: "Health",
          phone: "08514223456",
          whatsapp: "9440234567",
          address: "Sanjeeva Nagar, Nandyal",
          image_path: "",
          is_featured: 1,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('nt_directory', JSON.stringify(defaultDirectory));
    }

    // 5. Seed Tips Table
    if (!localStorage.getItem('nt_tips')) {
      const defaultTips = [];
      localStorage.setItem('nt_tips', JSON.stringify(defaultTips));
    }

    // 6. Seed Comments Table
    if (!localStorage.getItem('nt_comments')) {
      const defaultComments = [
        {
          id: 1,
          news_id: 1,
          author: "Ramesh Naidu",
          content: "Mahanandi arrangements are really great this year. Direct buses are also available.",
          created_at: new Date(Date.now() - 3600000 * 3).toISOString()
        },
        {
          id: 2,
          news_id: 1,
          author: "Jyothi",
          content: "Very informative update. Thanks Nandyal Times!",
          created_at: new Date(Date.now() - 3600000 * 1).toISOString()
        }
      ];
      localStorage.setItem('nt_comments', JSON.stringify(defaultComments));
    }

    // 7. Seed Ticker Table
    if (!localStorage.getItem('nt_ticker')) {
      const defaultTicker = [
        {
          id: 1,
          text: "Welcome to Nandyal Times! Submit incident reports or local updates using the buttons above.",
          active: 1,
          created_at: new Date().toISOString()
        }
      ];
      localStorage.setItem('nt_ticker', JSON.stringify(defaultTicker));
    }
  }

  initLocalStorage();

  // Helper getters/setters for collections
  const getCollection = (key) => JSON.parse(localStorage.getItem(key) || '[]');
  const setCollection = (key, data) => localStorage.setItem(key, JSON.stringify(data));

  // Mock Session functions
  function getLoggedInUser() {
    const userId = sessionStorage.getItem('nt_session_userId');
    if (!userId) return null;
    const users = getCollection('nt_users');
    return users.find(u => u.id === parseInt(userId)) || null;
  }

  // Helper to read file as base64 URL
  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  // --- INTERCEPT FETCH ---
  const originalFetch = window.fetch;

  window.fetch = async function (resource, options = {}) {
    let url = typeof resource === 'string' ? resource : resource.url;
    
    // Ignore external assets, only mock /api/ endpoints
    if (!url.startsWith('/api/')) {
      return originalFetch(resource, options);
    }

    const method = (options.method || 'GET').toUpperCase();
    const queryParams = {};
    
    // Parse query string parameters
    if (url.includes('?')) {
      const parts = url.split('?');
      url = parts[0];
      const searchParams = new URLSearchParams(parts[1]);
      for (const [key, val] of searchParams.entries()) {
        queryParams[key] = val;
      }
    }

    console.log(`[Mock Server Interface] Intercepted: ${method} ${url}`, queryParams);

    // Mock API Route Handlers
    try {
      // 1. AUTH ROUTES
      if (url === '/api/auth/status') {
        const user = getLoggedInUser();
        if (user) {
          return jsonResponse({
            authenticated: true,
            user: { id: user.id, name: user.name, username: user.username, role: user.role }
          });
        }
        return jsonResponse({ authenticated: false });
      }

      if (url === '/api/auth/login' && method === 'POST') {
        const { username, password } = JSON.parse(options.body);
        const users = getCollection('nt_users');
        const user = users.find(u => u.username === username && u.passwordHash === password);

        if (!user) {
          return jsonError('Invalid username or password.', 400);
        }
        if (user.status !== 'active') {
          return jsonError(`Login failed: Your account status is currently '${user.status}'.`, 403);
        }

        sessionStorage.setItem('nt_session_userId', user.id);
        return jsonResponse({
          success: true,
          message: 'Logged in successfully.',
          user: { id: user.id, name: user.name, username: user.username, role: user.role }
        });
      }

      if (url === '/api/auth/logout' && method === 'POST') {
        sessionStorage.removeItem('nt_session_userId');
        return jsonResponse({ success: true, message: 'Logged out successfully.' });
      }

      if (url === '/api/auth/register-reporter' && method === 'POST') {
        const payload = JSON.parse(options.body);
        const users = getCollection('nt_users');

        if (users.some(u => u.username === payload.username)) {
          return jsonError('Username already exists. Please choose another one.', 400);
        }

        const newUser = {
          id: Date.now(),
          name: payload.name,
          mobile: payload.mobile,
          location: payload.location,
          username: payload.username,
          passwordHash: payload.password, // Plain text in mock db is fine
          role: 'reporter',
          status: 'pending',
          created_at: new Date().toISOString()
        };

        users.push(newUser);
        setCollection('nt_users', users);

        return jsonResponse({
          success: true,
          message: 'Your application has been submitted! Admin will verify and activate your account shortly.'
        }, 201);
      }

      if (url === '/api/auth/change-password' && method === 'PUT') {
        const currentUser = getLoggedInUser();
        if (!currentUser) return jsonError('Unauthorized: Please log in.', 401);

        const { currentPassword, newPassword } = JSON.parse(options.body);
        const users = getCollection('nt_users');
        const dbUser = users.find(u => u.id === currentUser.id);

        if (dbUser.passwordHash !== currentPassword) {
          return jsonError('Incorrect current password.', 400);
        }

        dbUser.passwordHash = newPassword;
        setCollection('nt_users', users);
        return jsonResponse({ success: true, message: 'Password updated successfully!' });
      }

      // 2. NEWS ROUTES
      if (url === '/api/news' && method === 'GET') {
        const category = queryParams.category || 'All';
        const search = queryParams.search || '';
        const news = getCollection('nt_news');
        const users = getCollection('nt_users');

        let filtered = news.filter(n => n.status === 'published');

        if (category !== 'All') {
          filtered = filtered.filter(n => n.category === category);
        }

        if (search) {
          const lower = search.toLowerCase();
          filtered = filtered.filter(n => n.title.toLowerCase().includes(lower) || n.content.toLowerCase().includes(lower));
        }

        // Add reporter info, likes, and comment_count
        const result = filtered.map(n => {
          const rep = users.find(u => u.id === n.reporter_id);
          const comments = getCollection('nt_comments');
          const commentsForPost = comments.filter(c => c.news_id === n.id);
          return {
            ...n,
            reporter_name: rep ? rep.name : 'Admin Desk',
            reporter_location: rep ? rep.location : 'Nandyal Office',
            likes: n.likes || 0,
            comment_count: commentsForPost.length
          };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return jsonResponse(result);
      }

      if (url.startsWith('/api/news/view/') && method === 'POST') {
        const id = parseInt(url.split('/').pop());
        const news = getCollection('nt_news');
        const item = news.find(n => n.id === id);
        if (item) {
          item.views = (item.views || 0) + 1;
          setCollection('nt_news', news);
        }
        return jsonResponse({ success: true });
      }

      if (url === '/api/news' && method === 'POST') {
        const currentUser = getLoggedInUser();
        if (!currentUser) return jsonError('Unauthorized: Please log in.', 401);

        // Form Data Parsing
        const formData = options.body; 
        const title = formData.get('title');
        const content = formData.get('content');
        const category = formData.get('category');
        const mediaFile = formData.get('media');

        let mediaPath = '';
        let mediaType = 'none';

        if (mediaFile && mediaFile.size > 0) {
          mediaPath = await readFileAsDataURL(mediaFile);
          mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
        } else if (formData.get('existing_media_path')) {
          mediaPath = formData.get('existing_media_path');
          mediaType = formData.get('existing_media_type') || 'image';
        }

        const status = currentUser.role === 'admin' ? 'published' : 'pending';
        const news = getCollection('nt_news');
        const newPost = {
          id: Date.now(),
          title,
          content,
          media_path: mediaPath,
          media_type: mediaType,
          category,
          reporter_id: currentUser.id,
          status,
          views: 0,
          created_at: new Date().toISOString()
        };

        news.push(newPost);
        setCollection('nt_news', news);

        return jsonResponse({
          success: true,
          message: status === 'published' ? 'News published successfully!' : 'News submitted successfully for Admin approval.',
          postId: newPost.id,
          status
        }, 201);
      }

      if (url === '/api/admin/news' && method === 'GET') {
        const currentUser = getLoggedInUser();
        if (!currentUser) return jsonError('Unauthorized: Please log in.', 401);

        const news = getCollection('nt_news');
        const users = getCollection('nt_users');

        let filtered = news;
        if (currentUser.role === 'reporter') {
          filtered = news.filter(n => n.reporter_id === currentUser.id);
        }

        const result = filtered.map(n => {
          const rep = users.find(u => u.id === n.reporter_id);
          const comments = getCollection('nt_comments');
          const commentsForPost = comments.filter(c => c.news_id === n.id);
          return {
            ...n,
            reporter_name: rep ? rep.name : 'Admin Desk',
            likes: n.likes || 0,
            comment_count: commentsForPost.length
          };
        }).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));

        return jsonResponse(result);
      }

      if (url.startsWith('/api/admin/news/publish/') && method === 'PUT') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') {
          return jsonError('Forbidden: Admin access required.', 403);
        }

        const id = parseInt(url.split('/').pop());
        const { status } = JSON.parse(options.body);

        const news = getCollection('nt_news');
        const item = news.find(n => n.id === id);
        if (item) {
          item.status = status;
          setCollection('nt_news', news);
          return jsonResponse({ success: true, message: `News status set to ${status}.` });
        }
        return jsonError('Article not found.', 404);
      }

      if (url.startsWith('/api/news/') && method === 'DELETE') {
        const currentUser = getLoggedInUser();
        if (!currentUser) return jsonError('Unauthorized: Please log in.', 401);

        const id = parseInt(url.split('/').pop());
        const news = getCollection('nt_news');
        const index = news.findIndex(n => n.id === id);

        if (index === -1) return jsonError('Article not found.', 404);

        const article = news[index];
        if (currentUser.role === 'admin' || (article.reporter_id === currentUser.id && article.status === 'pending')) {
          news.splice(index, 1);
          setCollection('nt_news', news);
          return jsonResponse({ success: true, message: 'News article deleted.' });
        }

        return jsonError('Cannot delete: Article either published or belongs to someone else.', 403);
      }

      // Add like to article
      if (url.startsWith('/api/news/like/') && method === 'POST') {
        const id = parseInt(url.split('/').pop());
        const news = getCollection('nt_news');
        const item = news.find(n => n.id === id);
        if (item) {
          item.likes = (item.likes || 0) + 1;
          setCollection('nt_news', news);
        }
        return jsonResponse({ success: true });
      }

      // Get comments for an article
      if (url.startsWith('/api/news/comments/') && method === 'GET') {
        const news_id = parseInt(url.split('/').pop());
        const comments = getCollection('nt_comments');
        const filtered = comments.filter(c => c.news_id === news_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        return jsonResponse(filtered);
      }

      // Add comment to an article
      if (url.startsWith('/api/news/comments/') && method === 'POST') {
        const news_id = parseInt(url.split('/').pop());
        const { author, content } = JSON.parse(options.body);

        if (!author || !content) {
          return jsonError('Author and comment text are required.', 400);
        }

        const comments = getCollection('nt_comments');
        const newComment = {
          id: Date.now(),
          news_id: news_id,
          author: author,
          content: content,
          created_at: new Date().toISOString()
        };

        comments.push(newComment);
        setCollection('nt_comments', comments);
        return jsonResponse({ success: true, commentId: newComment.id }, 201);
      }

      // 3. AD ROUTES
      if (url === '/api/ads' && method === 'GET') {
        const ads = getCollection('nt_ads');
        return jsonResponse(ads.filter(a => a.status === 'active'));
      }

      if (url === '/api/admin/ads' && method === 'GET') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const ads = getCollection('nt_ads');
        return jsonResponse(ads.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }

      if (url === '/api/admin/ads' && method === 'POST') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const formData = options.body;
        const advertiser_name = formData.get('advertiser_name');
        const link_url = formData.get('link_url');
        const position = formData.get('position');
        const mediaFile = formData.get('media');

        if (!mediaFile || mediaFile.size === 0) {
          return jsonError('Ad banner image is required.', 400);
        }

        const imagePath = await readFileAsDataURL(mediaFile);
        const ads = getCollection('nt_ads');
        const newAd = {
          id: Date.now(),
          advertiser_name,
          image_path: imagePath,
          link_url,
          position,
          status: 'active',
          clicks: 0,
          created_at: new Date().toISOString()
        };

        ads.push(newAd);
        setCollection('nt_ads', ads);
        return jsonResponse({ success: true, message: 'Ad created and activated successfully.' }, 201);
      }

      if (url.startsWith('/api/admin/ads/status/') && method === 'PUT') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const { status } = JSON.parse(options.body);

        const ads = getCollection('nt_ads');
        const ad = ads.find(a => a.id === id);
        if (ad) {
          ad.status = status;
          setCollection('nt_ads', ads);
          return jsonResponse({ success: true, message: `Ad status updated to ${status}.` });
        }
        return jsonError('Ad not found.', 404);
      }

      if (url.startsWith('/api/admin/ads/') && method === 'DELETE') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const ads = getCollection('nt_ads');
        const filtered = ads.filter(a => a.id !== id);
        setCollection('nt_ads', filtered);
        return jsonResponse({ success: true, message: 'Advertisement deleted.' });
      }

      if (url.startsWith('/api/ads/click/') && method === 'POST') {
        const id = parseInt(url.split('/').pop());
        const ads = getCollection('nt_ads');
        const ad = ads.find(a => a.id === id);
        if (ad) {
          ad.clicks = (ad.clicks || 0) + 1;
          setCollection('nt_ads', ads);
        }
        return jsonResponse({ success: true });
      }

      // TICKER ROUTES
      if (url === '/api/ticker' && method === 'GET') {
        const ticker = getCollection('nt_ticker');
        return jsonResponse(ticker.filter(t => t.active === 1));
      }

      if (url === '/api/admin/ticker' && method === 'GET') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const ticker = getCollection('nt_ticker');
        return jsonResponse(ticker.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }

      if (url === '/api/admin/ticker' && method === 'POST') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const { text } = JSON.parse(options.body);
        if (!text || !text.trim()) {
          return jsonError('Ticker text announcement is required.', 400);
        }

        const ticker = getCollection('nt_ticker');
        const newTicker = {
          id: Date.now(),
          text: text.trim(),
          active: 1,
          created_at: new Date().toISOString()
        };

        ticker.push(newTicker);
        setCollection('nt_ticker', ticker);
        return jsonResponse({ success: true, message: 'Ticker announcement added successfully.' }, 201);
      }

      if (url.startsWith('/api/admin/ticker/status/') && method === 'PUT') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const { active } = JSON.parse(options.body);

        if (active !== 1 && active !== 0) {
          return jsonError('Invalid active status. Must be 1 or 0.', 400);
        }

        const ticker = getCollection('nt_ticker');
        const item = ticker.find(t => t.id === id);
        if (item) {
          item.active = active;
          setCollection('nt_ticker', ticker);
          return jsonResponse({ success: true, message: 'Ticker announcement status updated.' });
        }
        return jsonError('Ticker announcement not found.', 404);
      }

      if (url.startsWith('/api/admin/ticker/') && method === 'DELETE') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const ticker = getCollection('nt_ticker');
        const filtered = ticker.filter(t => t.id !== id);
        setCollection('nt_ticker', filtered);
        return jsonResponse({ success: true, message: 'Ticker announcement deleted.' });
      }

      // 4. REPORTER MANAGEMENT ROUTES
      if (url === '/api/admin/reporters' && method === 'GET') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const users = getCollection('nt_users');
        const reporters = users.filter(u => u.role === 'reporter');
        return jsonResponse(reporters.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }

      if (url.startsWith('/api/admin/reporters/') && method === 'PUT') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const { status } = JSON.parse(options.body);

        const users = getCollection('nt_users');
        const target = users.find(u => u.id === id && u.role === 'reporter');
        if (target) {
          target.status = status;
          setCollection('nt_users', users);
          return jsonResponse({ success: true, message: `Reporter status updated to ${status}.` });
        }
        return jsonError('Reporter not found.', 404);
      }

      if (url.startsWith('/api/admin/reporters/') && method === 'DELETE') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const users = getCollection('nt_users');
        const filtered = users.filter(u => !(u.id === id && u.role === 'reporter'));
        setCollection('nt_users', filtered);
        return jsonResponse({ success: true, message: 'Reporter account deleted.' });
      }

      // 5. DIRECTORY ROUTES
      if (url === '/api/directory' && method === 'GET') {
        const directory = getCollection('nt_directory');
        const sorted = directory.sort((a, b) => (b.is_featured || 0) - (a.is_featured || 0));
        return jsonResponse(sorted);
      }

      if (url === '/api/admin/directory' && method === 'POST') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const formData = options.body;
        const business_name = formData.get('business_name');
        const description = formData.get('description');
        const category = formData.get('category');
        const phone = formData.get('phone');
        const whatsapp = formData.get('whatsapp');
        const address = formData.get('address');
        const mediaFile = formData.get('media');
        const is_featured = formData.get('is_featured') === 'true' || formData.get('is_featured') === '1' ? 1 : 0;

        let imagePath = '';
        if (mediaFile && mediaFile.size > 0) {
          imagePath = await readFileAsDataURL(mediaFile);
        }

        const directory = getCollection('nt_directory');
        const newListing = {
          id: Date.now(),
          business_name,
          description,
          category,
          phone,
          whatsapp,
          address,
          image_path: imagePath,
          is_featured,
          created_at: new Date().toISOString()
        };

        directory.push(newListing);
        setCollection('nt_directory', directory);
        return jsonResponse({ success: true, message: 'Directory entry added successfully.' }, 201);
      }

      if (url.startsWith('/api/admin/directory/') && method === 'DELETE') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const directory = getCollection('nt_directory');
        const filtered = directory.filter(d => d.id !== id);
        setCollection('nt_directory', filtered);
        return jsonResponse({ success: true, message: 'Listing deleted.' });
      }

      // 6. TIPS / SUBMISSIONS
      if (url === '/api/tips' && method === 'POST') {
        const formData = options.body;
        const name = formData.get('name');
        const contact = formData.get('contact');
        const title = formData.get('title');
        const description = formData.get('description');
        const mediaFile = formData.get('media');

        let mediaPath = '';
        let mediaType = 'none';

        if (mediaFile && mediaFile.size > 0) {
          mediaPath = await readFileAsDataURL(mediaFile);
          mediaType = mediaFile.type.startsWith('video/') ? 'video' : 'image';
        }

        const tips = getCollection('nt_tips');
        const newTip = {
          id: Date.now(),
          name,
          contact,
          title,
          description,
          media_path: mediaPath,
          media_type: mediaType,
          status: 'pending',
          created_at: new Date().toISOString()
        };

        tips.push(newTip);
        setCollection('nt_tips', tips);
        return jsonResponse({
          success: true,
          message: 'Thank you! Your news tip has been successfully submitted to Nandyal Times admins.'
        }, 201);
      }

      if (url === '/api/admin/tips' && method === 'GET') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const tips = getCollection('nt_tips');
        return jsonResponse(tips.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)));
      }

      if (url.startsWith('/api/admin/tips/') && method === 'PUT') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const tips = getCollection('nt_tips');
        const tip = tips.find(t => t.id === id);
        if (tip) {
          tip.status = 'reviewed';
          setCollection('nt_tips', tips);
          return jsonResponse({ success: true, message: 'Tip marked as reviewed.' });
        }
        return jsonError('Tip not found.', 404);
      }

      if (url.startsWith('/api/admin/tips/') && method === 'DELETE') {
        const currentUser = getLoggedInUser();
        if (!currentUser || currentUser.role !== 'admin') return jsonError('Forbidden: Admin access required.', 403);

        const id = parseInt(url.split('/').pop());
        const tips = getCollection('nt_tips');
        const index = tips.findIndex(t => t.id === id);
        if (index !== -1) {
          tips.splice(index, 1);
          setCollection('nt_tips', tips);
          return jsonResponse({ success: true, message: 'Tip deleted successfully.' });
        }
        return jsonError('Tip not found.', 404);
      }

      // Default error for unhandled API paths
      return jsonError(`API Endpoint ${method} ${url} not found in Mock Server.`, 404);

    } catch (e) {
      console.error("[Mock Server Error]:", e);
      return jsonError("Mock Server Internal Error: " + e.message, 500);
    }
  };

  // Helper mock Response generators
  function jsonResponse(data, status = 200) {
    return new Response(JSON.stringify(data), {
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Server': 'true'
      }
    });
  }

  function jsonError(message, status = 400) {
    return new Response(JSON.stringify({ error: message }), {
      status: status,
      headers: {
        'Content-Type': 'application/json',
        'X-Mock-Server': 'true'
      }
    });
  }
})();
