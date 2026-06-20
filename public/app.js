// Global state variables
let currentCategory = 'All';
let currentMandal = 'All';
let searchQuery = '';
let newsArticles = [];
let topAds = [];
let inFeedAds = [];
let topAdIndex = 0;
let topAdInterval = null;

document.addEventListener('DOMContentLoaded', () => {
  init();

  // Handle Search input enter key
  const searchInput = document.getElementById('searchInput');
  if (searchInput) {
    searchInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        handleSearch();
      }
    });
  }

  // Bind Submit Tip form
  const tipForm = document.getElementById('tipForm');
  if (tipForm) {
    tipForm.addEventListener('submit', handleTipSubmit);
  }

  // Bind Become a Reporter form
  const reporterForm = document.getElementById('reporterForm');
  if (reporterForm) {
    reporterForm.addEventListener('submit', handleReporterSubmit);
  }
});

// Initializer
function init() {
  initTheme();
  loadGoogleTranslator();
  fetchNews();
  fetchAds();
  fetchDirectory();
  renderWeatherWidget();
  fetchPublicNotices();
}

// ==========================================
// API FETCHERS
// ==========================================

// Fetch news feed
async function fetchNews() {
  const feedContainer = document.getElementById('newsFeed');
  if (!feedContainer) return;

  // Show loading skeleton
  feedContainer.innerHTML = `
    <div class="loading-wave">
      <div class="wave-item"></div>
      <div class="wave-item"></div>
      <div class="wave-item"></div>
    </div>
  `;

  try {
    let url = `/api/news?category=${encodeURIComponent(currentCategory)}&mandal=${encodeURIComponent(currentMandal)}`;
    if (searchQuery) {
      url += `&search=${encodeURIComponent(searchQuery)}`;
    }

    const response = await fetch(url);
    newsArticles = await response.json();

    renderNewsFeed(newsArticles);
    renderBreakingNewsTicker(newsArticles);
  } catch (error) {
    console.error('Error loading news:', error);
    feedContainer.innerHTML = `<p class="error-msg"><i class="fa-solid fa-circle-exclamation"></i> Failed to load news feed. Please try again later.</p>`;
  }
}

// Fetch active ads
async function fetchAds() {
  try {
    const response = await fetch('/api/ads');
    const ads = await response.json();

    const topSponsorSlot = document.getElementById('topSponsorSlot');
    const sideSponsorSlot = document.getElementById('sideSponsorSlot');

    // Filter active ads by position
    const activeTopAds = ads.filter(a => a.position === 'top_banner' && a.status === 'active');
    const activeSidebarAds = ads.filter(a => a.position === 'sidebar' && a.status === 'active');
    inFeedAds = ads.filter(a => a.position === 'in_feed' && a.status === 'active'); // Save globally for news feed injection

    // Render Top Banner Slideshow
    if (topSponsorSlot) {
      if (activeTopAds.length > 0) {
        topAds = activeTopAds;
        topAdIndex = 0;
        
        // Clear any existing slideshow intervals
        if (topAdInterval) clearInterval(topAdInterval);
        
        // Render first top ad
        renderTopAd();
        
        // Start rotation slideshow if there is more than 1 ad
        if (topAds.length > 1) {
          topAdInterval = setInterval(() => {
            topAdIndex = (topAdIndex + 1) % topAds.length;
            renderTopAd();
          }, 5000); // rotate every 5 seconds
        }
      } else {
        // Fallback banner to prompt advertising
        topSponsorSlot.innerHTML = `
          <div class="sponsor-fallback" onclick="window.open('https://wa.me/917816094431?text=Hi, I want to display my business ad on Nandyal Times', '_blank')" style="cursor:pointer; display:flex; flex-direction:column; align-items:center; justify-content:center; height:100%; padding:20px; text-align:center;">
            <span style="font-weight:700; color:var(--crimson); font-size:14px; margin-bottom:4px;">Advertise Here</span>
            <span style="font-size:11px; color:var(--text-secondary);">Reach 90,000+ local readers daily. Click to inquire.</span>
          </div>
        `;
      }
    }

    // Render Sidebar Banner Grid
    if (sideSponsorSlot) {
      let gridHtml = '<div class="side-sponsor-grid">';
      
      // Render all active sidebar ads as small cards
      activeSidebarAds.forEach(ad => {
        gridHtml += `
          <div class="small-sponsor-card sponsor-card" title="Ad by ${ad.advertiser_name}">
            <span class="sponsor-label" style="font-size: 7px; padding: 1px 4px;">AD</span>
            <a href="${ad.link_url}" target="_blank" onclick="logAdClick(${ad.id})">
              <img src="${ad.image_path}" alt="${ad.advertiser_name}">
            </a>
          </div>
        `;
      });
      
      // Add a permanent placeholder card to "Advertise Here" (linked to Admin WhatsApp)
      gridHtml += `
        <div class="small-sponsor-card" onclick="window.open('https://wa.me/917816094431?text=Hi, I want to display my business ad on Nandyal Times', '_blank')" style="border-style: dashed; border-color: var(--crimson); background: rgba(250, 204, 21, 0.02); display: flex; flex-direction: column; justify-content: center; align-items: center; cursor:pointer;">
          <i class="fa-solid fa-square-plus" style="font-size: 14px; color: var(--crimson); margin-bottom: 2px;"></i>
          <span class="add-ad-placeholder">Advertise Here</span>
          <span class="add-ad-subtext">Click to Inquire</span>
        </div>
      `;
      
      gridHtml += '</div>';
      sideSponsorSlot.innerHTML = gridHtml;
    }
  } catch (error) {
    console.error('Error loading ads:', error);
  }
}

// Render the active top banner ad
function renderTopAd() {
  const topSponsorSlot = document.getElementById('topSponsorSlot');
  if (!topSponsorSlot || topAds.length === 0) return;
  
  const ad = topAds[topAdIndex];
  topSponsorSlot.innerHTML = `
    <span class="sponsor-label">SPONSORED</span>
    <span class="sponsor-info" title="Advertiser Details"><i class="fa-solid fa-circle-info"></i> ${ad.advertiser_name}</span>
    <a href="${ad.link_url}" target="_blank" onclick="logAdClick(${ad.id})">
      <img src="${ad.image_path}" alt="${ad.advertiser_name}">
    </a>
  `;
}

// Log click event on advertisements
async function logAdClick(adId) {
  try {
    await fetch(`/api/ads/click/${adId}`, { method: 'POST' });
  } catch (error) {
    console.error('Failed to log ad click:', error);
  }
}

// Fetch Directory listings
async function fetchDirectory() {
  const dirContainer = document.getElementById('sidebarDirectoryList');
  if (!dirContainer) return;

  try {
    const response = await fetch('/api/directory');
    const directory = await response.json();
    
    // Render only first 3 featured listings in sidebar widget
    const featuredListings = directory.filter(d => d.is_featured === 1).slice(0, 3);
    
    if (featuredListings.length > 0) {
      dirContainer.innerHTML = featuredListings.map(d => `
        <div class="directory-card">
          <div class="directory-name">${d.business_name}</div>
          <div class="directory-desc">${d.description || ''}</div>
          <div class="directory-actions">
            ${d.whatsapp ? `
              <a href="https://wa.me/91${d.whatsapp.replace(/\s+/g, '')}?text=Hello, saw your listing on Nandyal Times website." target="_blank" class="btn-wa-call">
                <i class="fa-brands fa-whatsapp"></i> Chat
              </a>
            ` : ''}
            ${d.phone ? `
              <a href="tel:${d.phone}" class="btn-wa-call" style="background:#1e293b;">
                <i class="fa-solid fa-phone"></i> Call
              </a>
            ` : ''}
          </div>
        </div>
      `).join('');
    } else {
      dirContainer.innerHTML = `<p class="widget-desc" style="color: var(--text-muted);">No featured directory listings found.</p>`;
    }
  } catch (error) {
    console.error('Error loading directory:', error);
    dirContainer.innerHTML = `<p style="color: var(--text-muted);">Failed to load local directory.</p>`;
  }
}

// ==========================================
// RENDER HELPERS
// ==========================================

// Render Breaking News Ticker
async function renderBreakingNewsTicker(articles) {
  const tickerTrack = document.getElementById('tickerTrack');
  if (!tickerTrack) return;

  try {
    const response = await fetch('/api/ticker');
    const announcements = await response.json();

    if (announcements.length > 0) {
      tickerTrack.innerHTML = announcements.map(t => `
        <span>• ${t.text}</span>
      `).join('');
    } else {
      // Fallback: Take top 5 news
      const published = articles.slice(0, 5);
      if (published.length > 0) {
        tickerTrack.innerHTML = published.map(a => `
          <span onclick="openNewsDetail(${a.id})" style="cursor:pointer;"><i class="fa-solid fa-circle-play"></i> ${a.title}</span>
        `).join('');
      } else {
        tickerTrack.innerHTML = "<span>Welcome to Nandyal Times portal! Keep sending incident tips. Follow our official channels.</span>";
      }
    }
  } catch (error) {
    console.error('Error fetching custom ticker, falling back to news headlines:', error);
    const published = articles.slice(0, 5);
    if (published.length > 0) {
      tickerTrack.innerHTML = published.map(a => `
        <span onclick="openNewsDetail(${a.id})" style="cursor:pointer;"><i class="fa-solid fa-circle-play"></i> ${a.title}</span>
      `).join('');
    } else {
      tickerTrack.innerHTML = "<span>Welcome to Nandyal Times portal! Keep sending incident tips. Follow our official channels.</span>";
    }
  }
}

// Render News Feed List
function renderNewsFeed(articles) {
  const feedContainer = document.getElementById('newsFeed');
  if (!feedContainer) return;

  if (articles.length === 0) {
    feedContainer.innerHTML = `
      <div class="no-news-card" style="background: var(--card-bg); border:1px solid var(--card-border); padding: 40px; border-radius: var(--radius-lg); text-align: center;">
        <i class="fa-regular fa-newspaper" style="font-size: 48px; color: var(--text-muted); margin-bottom: 16px;"></i>
        <h3 style="margin-bottom: 8px;">No updates found</h3>
        <p style="color: var(--text-secondary); max-width: 400px; margin: 0 auto 16px;">No articles are available in the "${currentCategory}" category right now.</p>
        <button class="btn btn-primary" onclick="openModal('tipModal')">Submit an Incident Tip</button>
      </div>
    `;
    return;
  }

  let feedHtml = '';
  articles.forEach((a, index) => {
    // Determine category badge class
    const badgeClass = a.category === 'Jobs' || a.category === 'Education' ? 'badge-gold' : 'badge-crimson';
    
    // Determine media content to render
    let mediaHtml = '';
    if (a.media_path && a.media_type === 'image') {
      mediaHtml = `
        <div class="news-media-wrapper" onclick="openNewsDetail(${a.id})" style="cursor:pointer;">
          <img src="${a.media_path}" alt="news media" loading="lazy">
        </div>
      `;
    } else if (a.media_path && a.media_type === 'video') {
      mediaHtml = `
        <div class="news-media-wrapper">
          <video controls preload="metadata">
            <source src="${a.media_path}" type="video/mp4">
            Your browser does not support the video tag.
          </video>
        </div>
      `;
    }

    const reporterDisplay = a.reporter_name ? a.reporter_name : 'Nandyal Times Desk';

    feedHtml += `
      <article class="news-card">
        ${mediaHtml}
        <div class="news-body">
          <div class="news-card-meta">
            <span class="badge ${badgeClass}">${a.category}</span>
            <span><i class="fa-solid fa-user-pen"></i> By ${reporterDisplay}</span>
            <span><i class="fa-solid fa-calendar-days"></i> ${formatDate(a.created_at)}</span>
          </div>
          <h2 class="news-card-title" onclick="openNewsDetail(${a.id})">${a.title}</h2>
          <p class="news-card-excerpt">${a.content}</p>
          
          <div class="news-card-actions">
            <span class="card-action-btn like-btn ${localStorage.getItem('nt_liked_' + a.id) ? 'liked' : ''}" onclick="likeNews(${a.id}, this)">
              <i class="fa-regular fa-heart"></i> <span class="like-count">${a.likes || 0}</span> Likes
            </span>
            <span class="card-action-btn comment-btn" onclick="openNewsDetail(${a.id})">
              <i class="fa-regular fa-comment"></i> <span class="comment-count">${a.comment_count || 0}</span> Comments
            </span>
            <span class="card-action-btn bookmark-toggle-btn ${localStorage.getItem('nt_bookmarked_' + a.id) ? 'active' : ''}" onclick="toggleBookmark(${a.id}, event, this)">
              <i class="${localStorage.getItem('nt_bookmarked_' + a.id) ? 'fa-solid' : 'fa-regular'} fa-bookmark"></i> Save
            </span>
            <span class="card-action-btn share-btn share-tooltip-container" onclick="openShareTooltip(${a.id}, event, this)">
              <i class="fa-solid fa-share-nodes"></i> Share
            </span>
          </div>

          <div class="news-card-footer">
            <a href="javascript:void(0)" class="read-more-link" onclick="openNewsDetail(${a.id})">Read Full Story <i class="fa-solid fa-arrow-right-long"></i></a>
            <span class="views-count"><i class="fa-regular fa-eye"></i> ${a.views || 0} views</span>
          </div>
        </div>
      </article>
    `;

    // Inject in-feed ad after every 3 articles if active in-feed ads exist
    if ((index + 1) % 3 === 0 && inFeedAds.length > 0) {
      const adIndex = Math.floor((index / 3) % inFeedAds.length);
      const ad = inFeedAds[adIndex];
      feedHtml += `
        <div class="sponsor-card in-feed-sponsor-card" style="margin-bottom:24px; width:100%; height:130px; border-style:dashed;">
          <span class="sponsor-label">SPONSORED</span>
          <span class="sponsor-info" title="Advertiser Details"><i class="fa-solid fa-circle-info"></i> ${ad.advertiser_name}</span>
          <a href="${ad.link_url}" target="_blank" onclick="logAdClick(${ad.id})">
            <img src="${ad.image_path}" alt="${ad.advertiser_name}" style="width:100%; height:100%; object-fit:cover; display:block;">
          </a>
        </div>
      `;
    }
  });

  feedContainer.innerHTML = feedHtml;

  // Update Bookmarks display widget
  renderBookmarksWidget();
}

// Format date nicely
function formatDate(dateString) {
  const options = { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}

// ==========================================
// ACTIONS AND FILTERS
// ==========================================

// Change news category filter
function setCategory(category, element) {
  currentCategory = category;
  
  // Update active states on nav links
  const links = document.querySelectorAll('.nav-link');
  links.forEach(l => l.classList.remove('active'));
  
  if (element) {
    element.classList.add('active');
  }

  // Update feed title text
  const title = document.getElementById('feedTitle');
  if (title) {
    title.innerText = category === 'All' ? 'Latest Feed' : `${category} Updates`;
  }

  fetchNews();
}

// Handle search trigger
function handleSearch() {
  const input = document.getElementById('searchInput');
  if (input) {
    searchQuery = input.value.trim();
    fetchNews();
  }
}

// Open dynamic news detail modal
async function openNewsDetail(id) {
  const article = newsArticles.find(a => a.id === id);
  if (!article) return;

  // Log article view count update
  try {
    fetch(`/api/news/view/${id}`, { method: 'POST' });
    article.views = (article.views || 0) + 1; // Update locally for instant display
    renderNewsFeed(newsArticles); // Refresh views in main feed
  } catch (error) {
    console.error('Failed to log view:', error);
  }

  // Set Modal Values
  document.getElementById('modalCategory').innerText = article.category;
  
  // Set category badge classes
  const badge = document.getElementById('modalCategory');
  badge.className = 'badge'; // reset
  badge.classList.add(article.category === 'Jobs' || article.category === 'Education' ? 'badge-gold' : 'badge-crimson');

  document.getElementById('modalTitle').innerText = article.title;
  document.getElementById('modalReporter').innerText = article.reporter_name || 'Nandyal Times Desk';
  document.getElementById('modalDate').innerText = formatDate(article.created_at);
  document.getElementById('modalViews').innerText = article.views;
  document.getElementById('modalContent').innerText = article.content;

  // Set Media Content
  const mediaContainer = document.getElementById('modalMediaContainer');
  mediaContainer.innerHTML = ''; // Clear

  if (article.media_path && article.media_type === 'image') {
    mediaContainer.innerHTML = `<img src="${article.media_path}" alt="news detailed media">`;
  } else if (article.media_path && article.media_type === 'video') {
    mediaContainer.innerHTML = `
      <video controls autoplay>
        <source src="${article.media_path}" type="video/mp4">
        Your browser does not support the video tag.
      </video>
    `;
  }

  // Save current open article ID to window for sharing
  window.currentDetailedArticle = article;

  // Load comments
  loadComments(id);

  // Bind comment submission
  const commentForm = document.getElementById('commentForm');
  if (commentForm) {
    const newForm = commentForm.cloneNode(true);
    commentForm.parentNode.replaceChild(newForm, commentForm);
    newForm.addEventListener('submit', (e) => submitComment(e, id));
  }

  openModal('newsDetailModal');
}

// Sharing functions
function shareNews(platform) {
  const article = window.currentDetailedArticle;
  if (!article) return;

  const url = window.location.origin + `?article=${article.id}`;
  const text = `Read this news update on Nandyal Times: *${article.title}* \n\n`;

  if (platform === 'whatsapp') {
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(text + url)}`, '_blank');
  } else if (platform === 'facebook') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  } else if (platform === 'copy') {
    navigator.clipboard.writeText(url + "\n" + article.title).then(() => {
      alert('Link copied to clipboard!');
    }).catch(err => {
      console.error('Could not copy text: ', err);
    });
  }
}

// ==========================================
// FORM SUBMITTERS
// ==========================================

// Handle incident submission (Community Notice)
async function handleTipSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/tips', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      form.reset();
      closeModal('tipModal');
    } else {
      alert(result.error || 'Failed to submit news tip.');
    }
  } catch (error) {
    console.error('Error submitting tip:', error);
    alert('An unexpected error occurred. Please try again.');
  }
}

// Handle Reporter registration submit
async function handleReporterSubmit(e) {
  e.preventDefault();
  const form = e.target;
  
  const payload = {
    name: form.name.value,
    mobile: form.mobile.value,
    location: form.location.value,
    username: form.username.value,
    password: form.password.value
  };

  try {
    const response = await fetch('/api/auth/register-reporter', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(payload)
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      form.reset();
      closeModal('reporterModal');
    } else {
      alert(result.error || 'Failed to submit application.');
    }
  } catch (error) {
    console.error('Error submitting application:', error);
    alert('An unexpected error occurred. Please check network connection.');
  }
}

// ==========================================
// MODAL CONTROLLER UTILITIES
// ==========================================

function openModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.add('active');
  }
}

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) {
    modal.classList.remove('active');
    // Stop video playback in detail modal if closed
    if (modalId === 'newsDetailModal') {
      const video = modal.querySelector('video');
      if (video) {
        video.pause();
      }
    }
  }
}

// Dynamic script loader for Google Translate
function loadGoogleTranslator() {
  window.googleTranslateElementInit = function() {
    new google.translate.TranslateElement({
      pageLanguage: 'en',
      includedLanguages: 'te,en'
    }, 'google_translate_element');
  };

  const script = document.createElement('script');
  script.type = 'text/javascript';
  script.src = 'https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit';
  document.body.appendChild(script);
}

// Like functionality
async function likeNews(id, element) {
  if (localStorage.getItem('nt_liked_' + id)) {
    alert("You have already liked this article!");
    return;
  }

  try {
    const response = await fetch(`/api/news/like/${id}`, { method: 'POST' });
    if (response.ok) {
      localStorage.setItem('nt_liked_' + id, 'true');
      element.classList.add('liked');
      
      const countSpan = element.querySelector('.like-count');
      if (countSpan) {
        countSpan.innerText = parseInt(countSpan.innerText) + 1;
      }
    }
  } catch (error) {
    console.error('Error liking article:', error);
  }
}

// Card Share popup menu
function openShareTooltip(id, event, element) {
  event.stopPropagation();
  closeAllShareTooltips();

  const tooltip = document.createElement('div');
  tooltip.className = 'share-tooltip';
  
  const articleUrl = `${window.location.origin}${window.location.pathname}?article=${id}`;
  const articleTitle = encodeURIComponent("Check out this news on Nandyal Times!");

  tooltip.innerHTML = `
    <span class="share-tooltip-btn" onclick="shareToPlatform('wa', '${articleUrl}', '${articleTitle}', event)">
      <i class="fa-brands fa-whatsapp"></i>
    </span>
    <span class="share-tooltip-btn" onclick="shareToPlatform('fb', '${articleUrl}', '${articleTitle}', event)">
      <i class="fa-brands fa-facebook-f"></i>
    </span>
    <span class="share-tooltip-btn" onclick="shareToPlatform('copy', '${articleUrl}', '', event)">
      <i class="fa-solid fa-link"></i> Copy
    </span>
  `;

  element.appendChild(tooltip);
  document.addEventListener('click', closeAllShareTooltips);
}

function closeAllShareTooltips() {
  const tooltips = document.querySelectorAll('.share-tooltip');
  tooltips.forEach(t => t.remove());
  document.removeEventListener('click', closeAllShareTooltips);
}

function shareToPlatform(platform, url, title, event) {
  event.stopPropagation();
  closeAllShareTooltips();

  if (platform === 'wa') {
    window.open(`https://api.whatsapp.com/send?text=${title}%20${encodeURIComponent(url)}`, '_blank');
  } else if (platform === 'fb') {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(url)}`, '_blank');
  } else if (platform === 'copy') {
    navigator.clipboard.writeText(url).then(() => {
      alert("Article link copied to clipboard!");
    }).catch(err => {
      console.error('Failed to copy link:', err);
    });
  }
}

// Comments Loader & Submitter
async function loadComments(newsId) {
  const list = document.getElementById('commentsList');
  const countSpan = document.getElementById('modalCommentsCount');
  if (!list) return;

  list.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">Loading comments...</span>`;

  try {
    const response = await fetch(`/api/news/comments/${newsId}`);
    const comments = await response.json();

    countSpan.innerText = comments.length;

    // Update count in main feed card
    const newsItem = newsArticles.find(a => a.id === newsId);
    if (newsItem) {
      newsItem.comment_count = comments.length;
      
      const cards = document.querySelectorAll('.news-card');
      cards.forEach(card => {
        const commentBtn = card.querySelector(`.comment-btn[onclick="openNewsDetail(${newsId})"] .comment-count`);
        if (commentBtn) {
          commentBtn.innerText = comments.length;
        }
      });
    }

    if (comments.length === 0) {
      list.innerHTML = `<span style="font-size:13px; color:var(--text-muted); font-style:italic;">No comments yet. Be the first to share your thoughts!</span>`;
      return;
    }

    list.innerHTML = comments.map(c => `
      <div class="comment-item">
        <div class="comment-header">
          <span class="comment-author">${c.author}</span>
          <span class="comment-date">${formatDate(c.created_at)}</span>
        </div>
        <div class="comment-text">${c.content}</div>
      </div>
    `).join('');
  } catch (error) {
    console.error('Error loading comments:', error);
    list.innerHTML = `<span style="font-size:13px; color:var(--text-muted);">Failed to load comments.</span>`;
  }
}

async function submitComment(event, newsId) {
  event.preventDefault();
  const authorInput = document.getElementById('commentAuthor');
  const contentInput = document.getElementById('commentContent');

  const payload = {
    author: authorInput.value.trim(),
    content: contentInput.value.trim()
  };

  try {
    const response = await fetch(`/api/news/comments/${newsId}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      contentInput.value = '';
      loadComments(newsId);
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to submit comment.');
    }
  } catch (error) {
    console.error('Error submitting comment:', error);
    alert('Failed to submit comment. Please check your connection.');
  }
}

// ==========================================
// 5 PREMIUM FEATURES HANDLERS
// ==========================================

// 1. LIGHT/DARK THEME TOGGLER
function initTheme() {
  const toggleBtn = document.getElementById('themeToggleBtn');
  const currentTheme = localStorage.getItem('nt-theme') || 'light';
  
  document.documentElement.setAttribute('data-theme', currentTheme);
  updateThemeToggleIcon(currentTheme);

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const theme = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
      document.documentElement.setAttribute('data-theme', theme);
      localStorage.setItem('nt-theme', theme);
      updateThemeToggleIcon(theme);
    });
  }
}

function updateThemeToggleIcon(theme) {
  const toggleBtn = document.getElementById('themeToggleBtn');
  if (!toggleBtn) return;
  const icon = toggleBtn.querySelector('i');
  if (icon) {
    if (theme === 'dark') {
      icon.className = 'fa-solid fa-sun';
    } else {
      icon.className = 'fa-solid fa-moon';
    }
  }
}

// 2. MANDAL FILTER HANDLER
function handleMandalChange() {
  const select = document.getElementById('mandalSelect');
  if (select) {
    currentMandal = select.value;
    fetchNews();
  }
}

// 3. WEATHER WIDGET RENDERER
function renderWeatherWidget() {
  const weatherContainer = document.getElementById('weatherWidget');
  if (!weatherContainer) return;
  
  const temp = 34; // standard warm temperature in Nandyal (Celsius)
  const humidity = '42%';
  const wind = '12 km/h';
  const time = new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });

  weatherContainer.innerHTML = `
    <div class="weather-header">
      <span class="weather-city"><i class="fa-solid fa-cloud-sun"></i> Nandyal Weather</span>
      <span class="weather-time">${time}</span>
    </div>
    <div class="weather-body">
      <div class="weather-temp-block">
        <span class="weather-temp">${temp}°C</span>
        <span class="weather-desc">Sunny & Dry</span>
      </div>
      <i class="fa-solid fa-sun weather-icon"></i>
    </div>
    <div class="weather-details">
      <span>Humidity: ${humidity}</span>
      <span>Wind: ${wind}</span>
    </div>
  `;
}

// 4. BOOKMARKS/SAVED ARTICLES LOGIC
function toggleBookmark(id, event, element) {
  event.stopPropagation();
  const key = 'nt_bookmarked_' + id;
  const isBookmarked = localStorage.getItem(key);
  
  if (isBookmarked) {
    localStorage.removeItem(key);
    element.classList.remove('active');
    element.querySelector('i').className = 'fa-regular fa-bookmark';
  } else {
    localStorage.setItem(key, 'true');
    element.classList.add('active');
    element.querySelector('i').className = 'fa-solid fa-bookmark';
  }
  renderBookmarksWidget();
}

function renderBookmarksWidget() {
  const listContainer = document.getElementById('sidebarBookmarksList');
  if (!listContainer) return;
  
  const bookmarkedIds = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (key && key.startsWith('nt_bookmarked_')) {
      const id = parseInt(key.replace('nt_bookmarked_', ''));
      if (!isNaN(id)) bookmarkedIds.push(id);
    }
  }
  
  if (bookmarkedIds.length === 0) {
    listContainer.innerHTML = `<p class="widget-desc" style="color: var(--text-muted); font-style: italic;">No saved articles yet. Save news cards to read them here.</p>`;
    return;
  }
  
  const savedArticles = newsArticles.filter(a => bookmarkedIds.includes(a.id));
  
  if (savedArticles.length === 0) {
    listContainer.innerHTML = `<p class="widget-desc" style="color: var(--text-muted); font-style: italic;">No saved articles yet. Save news cards to read them here.</p>`;
    return;
  }
  
  listContainer.innerHTML = savedArticles.map(a => {
    const image = a.media_path && a.media_type === 'image' 
      ? a.media_path 
      : 'https://images.unsplash.com/photo-1504711434969-e33886168f5c?w=150&auto=format&fit=crop&q=60';
    
    return `
      <div class="bookmark-card">
        <img src="${image}" class="bookmark-img" alt="bookmark img">
        <div class="bookmark-title" onclick="openNewsDetail(${a.id})">${a.title}</div>
        <i class="fa-regular fa-trash-can bookmark-remove-btn" onclick="removeBookmark(${a.id})" title="Remove bookmark"></i>
      </div>
    `;
  }).join('');
}

function removeBookmark(id) {
  localStorage.removeItem('nt_bookmarked_' + id);
  
  const cards = document.querySelectorAll('.news-card');
  cards.forEach(card => {
    const btn = card.querySelector(`.bookmark-toggle-btn[onclick*="toggleBookmark(${id},"]`);
    if (btn) {
      btn.classList.remove('active');
      btn.querySelector('i').className = 'fa-regular fa-bookmark';
    }
  });
  
  renderBookmarksWidget();
}

// 5. CITIZENS NOTICE BOARD ALERTS FETCHING
async function fetchPublicNotices() {
  const feed = document.getElementById('publicNoticeFeed');
  const container = document.getElementById('publicNoticeBoard');
  if (!feed || !container) return;

  try {
    const response = await fetch('/api/public-notices');
    const notices = await response.json();

    if (notices.length === 0) {
      container.style.display = 'none';
      return;
    }

    container.style.display = 'block';
    feed.innerHTML = notices.map(n => {
      return `
        <div class="notice-item">
          <div class="notice-item-title">${n.title}</div>
          <div class="notice-item-desc">${n.description}</div>
          <div class="notice-item-meta">
            <span><i class="fa-regular fa-clock"></i> ${formatDate(n.created_at)}</span>
            <span>Citizen Report</span>
          </div>
        </div>
      `;
    }).join('');
  } catch (error) {
    console.error('Error fetching public notices:', error);
    container.style.display = 'none';
  }
}
