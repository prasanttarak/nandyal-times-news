// Global state variables for dashboard
let currentUser = null;
let activeTab = 'newsSection';

document.addEventListener('DOMContentLoaded', () => {
  // Load theme preference
  const currentTheme = localStorage.getItem('nt-theme') || 'light';
  document.documentElement.setAttribute('data-theme', currentTheme);

  checkAuth();

  // Bind forms
  const loginForm = document.getElementById('loginForm');
  if (loginForm) loginForm.addEventListener('submit', handleLogin);

  const newsForm = document.getElementById('newsForm');
  if (newsForm) newsForm.addEventListener('submit', handleNewsSubmit);

  const newsMedia = document.getElementById('newsMedia');
  if (newsMedia) {
    newsMedia.addEventListener('change', () => {
      if (newsMedia.files && newsMedia.files.length > 0) {
        clearDraftMedia();
      }
    });
  }

  const adForm = document.getElementById('adForm');
  if (adForm) adForm.addEventListener('submit', handleAdSubmit);

  const directoryForm = document.getElementById('directoryForm');
  if (directoryForm) directoryForm.addEventListener('submit', handleDirectorySubmit);

  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', handlePasswordChange);

  const tickerForm = document.getElementById('tickerForm');
  if (tickerForm) tickerForm.addEventListener('submit', handleTickerSubmit);
});

// ==========================================
// AUTHENTICATION LOGIC
// ==========================================

// Check session authentication status on page load
async function checkAuth() {
  try {
    const response = await fetch('/api/auth/status');
    const data = await response.json();

    if (data.authenticated) {
      currentUser = data.user;
      showDashboard();
    } else {
      showLogin();
    }
  } catch (error) {
    console.error('Error checking auth:', error);
    showLogin();
  }
}

// Handle Login submit
async function handleLogin(e) {
  e.preventDefault();
  const usernameInput = document.getElementById('loginUsername').value.trim();
  const passwordInput = document.getElementById('loginPassword').value.trim();

  try {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ username: usernameInput, password: passwordInput })
    });

    const data = await response.json();
    if (response.ok) {
      currentUser = data.user;
      document.getElementById('loginForm').reset();
      showDashboard();
    } else {
      alert(data.error || 'Login failed. Please check credentials.');
    }
  } catch (error) {
    console.error('Error logging in:', error);
    alert('Server error. Please try again later.');
  }
}

// Handle Logout
async function handleLogout() {
  try {
    const response = await fetch('/api/auth/logout', { method: 'POST' });
    if (response.ok) {
      currentUser = null;
      showLogin();
    } else {
      alert('Logout failed.');
    }
  } catch (error) {
    console.error('Error logging out:', error);
  }
}

// Switch view displays
function showLogin() {
  document.getElementById('loginView').style.display = 'flex';
  document.getElementById('dashboardView').style.display = 'none';
}

function showDashboard() {
  document.getElementById('loginView').style.display = 'none';
  document.getElementById('dashboardView').style.display = 'block';

  // Set welcome message
  const roleLabel = currentUser.role === 'admin' ? 'Administrator' : 'Reporter';
  document.getElementById('welcomeMessage').innerHTML = `Logged in as: <strong>${currentUser.name}</strong> (${roleLabel})`;

  // Filter sidebar options based on role
  const adminLinks = ['navAnalytics', 'navApprovals', 'navTips', 'navReporters', 'navAds', 'navDirectory', 'navTicker'];
  
  if (currentUser.role === 'reporter') {
    // Hide administrative links from reporters
    adminLinks.forEach(id => {
      const link = document.getElementById(id);
      if (link) link.style.display = 'none';
    });
    // Set default tab for reporter to News Manager
    switchTab('newsSection', document.getElementById('navNews'));
  } else {
    // Show all links for admin
    adminLinks.forEach(id => {
      const link = document.getElementById(id);
      if (link) link.style.display = 'flex';
    });
    // Set default tab for admin to News Manager (or Analytics)
    switchTab('newsSection', document.getElementById('navNews'));
  }
  
  // Load initial data
  loadNews();
  if (currentUser.role === 'admin') {
    loadAnalytics();
    loadApprovals();
    loadReporters();
    loadAds();
    loadDirectory();
    loadTips();
    loadTicker();
  }
}

// ==========================================
// SIDEBAR TAB NAVIGATION
// ==========================================

function switchTab(tabId, element) {
  activeTab = tabId;

  // Toggle active class on links
  const links = document.querySelectorAll('.sidebar-link');
  links.forEach(l => l.classList.remove('active'));
  if (element) element.classList.add('active');

  // Toggle active class on sections
  const sections = document.querySelectorAll('.tab-section');
  sections.forEach(s => s.classList.remove('active'));
  
  const targetSection = document.getElementById(tabId);
  if (targetSection) targetSection.classList.add('active');

  // Refresh data based on loaded tab
  if (tabId === 'newsSection') loadNews();
  if (tabId === 'analyticsSection' && currentUser.role === 'admin') {
    loadAnalytics();
  }
  if (tabId === 'tipsSection' && currentUser.role === 'admin') {
    loadTips();
  }
  if (tabId === 'approvalsSection' && currentUser.role === 'admin') loadApprovals();
  if (tabId === 'reportersSection' && currentUser.role === 'admin') loadReporters();
  if (tabId === 'adsSection' && currentUser.role === 'admin') loadAds();
  if (tabId === 'directorySection' && currentUser.role === 'admin') loadDirectory();
  if (tabId === 'tickerSection' && currentUser.role === 'admin') loadTicker();
}

// ==========================================
// 1. NEWS MANAGER PORTAL (CRUD)
// ==========================================

// Load news listing
async function loadNews() {
  const tbody = document.getElementById('newsTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/admin/news');
    const news = await response.json();

    if (news.length === 0) {
      tbody.innerHTML = `<tr><td colspan="8" class="no-data-msg">No news articles found. Write your first post!</td></tr>`;
      return;
    }

    tbody.innerHTML = news.map(a => {
      let mediaPreview = '<i class="fa-regular fa-image" style="font-size:20px; color:var(--text-muted);"></i>';
      if (a.media_path && a.media_type === 'image') {
        mediaPreview = `<div class="media-preview-cell"><img src="${a.media_path}"></div>`;
      } else if (a.media_path && a.media_type === 'video') {
        mediaPreview = `<div class="media-preview-cell"><video src="${a.media_path}"></video></div>`;
      }

      const statusBadge = a.status === 'published' ? 'badge-success' : 'badge-gold';
      const reporterDisplay = a.reporter_name ? a.reporter_name : 'Admin Desk';

      // Delete action configuration (Reporter can only delete pending drafts)
      const canDelete = currentUser.role === 'admin' || a.status === 'pending';
      const deleteButtonHtml = canDelete ? `
        <button class="btn-action btn-action-delete" onclick="deleteNews(${a.id})">
          <i class="fa-regular fa-trash-can"></i> Delete
        </button>
      ` : `<span style="font-size:11px; color:var(--text-muted);">Locked</span>`;

      return `
        <tr>
          <td>${mediaPreview}</td>
          <td style="font-weight:600; max-width:250px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${a.title}</td>
          <td>
            <span class="badge ${a.category === 'Jobs' || a.category === 'Education' ? 'badge-gold' : 'badge-crimson'}">${a.category}</span>
            <div style="font-size:11px; color:var(--text-muted); margin-top:4px; font-weight:500;"><i class="fa-solid fa-location-dot" style="font-size:10px;"></i> ${a.mandal || 'Nandyal Town'}</div>
          </td>
          <td>${reporterDisplay}</td>
          <td><span class="badge ${statusBadge}">${a.status}</span></td>
          <td>${a.views || 0}</td>
          <td>${formatDate(a.created_at)}</td>
          <td>${deleteButtonHtml}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading news list:', error);
  }
}

// Handle news submission
async function handleNewsSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  if (window.currentDraftMedia && window.currentDraftMedia.path) {
    formData.append('existing_media_path', window.currentDraftMedia.path);
    formData.append('existing_media_type', window.currentDraftMedia.type);
  }

  try {
    const response = await fetch('/api/news', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      form.reset();
      clearDraftMedia();
      loadNews();
    } else {
      alert(result.error || 'Failed to submit article.');
    }
  } catch (error) {
    console.error('Error publishing news:', error);
    alert('Network error. Failed to send post.');
  }
}

// Delete News Post
async function deleteNews(id) {
  if (!confirm('Are you sure you want to delete this news article? This cannot be undone.')) return;

  try {
    const response = await fetch(`/api/news/${id}`, { method: 'DELETE' });
    const result = await response.json();

    if (response.ok) {
      alert(result.message);
      loadNews();
      if (currentUser.role === 'admin') loadApprovals(); // Sync reviews if admin
    } else {
      alert(result.error || 'Failed to delete post.');
    }
  } catch (error) {
    console.error('Error deleting news:', error);
  }
}

// ==========================================
// 2. ANALYTICS & NOTICE BOARD (ADMIN ONLY)
// ==========================================

async function loadAnalytics() {
  try {
    // Collect stats via background requests
    const resNews = await fetch('/api/admin/news');
    const news = await resNews.json();

    const resReporters = await fetch('/api/admin/reporters');
    const reporters = await resReporters.json();

    const resAds = await fetch('/api/admin/ads');
    const ads = await resAds.json();

    const totalNews = news.filter(n => n.status === 'published').length;
    const pendingNews = news.filter(n => n.status === 'pending').length;
    const activeReporters = reporters.filter(r => r.status === 'active').length;
    
    // Sum clicks
    let totalAdClicks = 0;
    ads.forEach(ad => { totalAdClicks += (ad.clicks || 0); });

    // Populate DOM labels
    document.getElementById('statNewsCount').innerText = totalNews;
    document.getElementById('statPendingNewsCount').innerText = pendingNews;
    document.getElementById('statReportersCount').innerText = activeReporters;
    document.getElementById('statAdClicks').innerText = totalAdClicks;
  } catch (error) {
    console.error('Error fetching analytics:', error);
  }
}

// Load Community Notice Board Tips
async function loadTips() {
  const tbody = document.getElementById('tipsTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/admin/tips');
    const tips = await response.json();

    if (tips.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="no-data-msg">No follower submissions on notice board.</td></tr>`;
      return;
    }

    tbody.innerHTML = tips.map(t => {
      let mediaCell = '<span style="color:var(--text-muted);">None</span>';
      if (t.media_path && t.media_type === 'image') {
        mediaCell = `<div class="media-preview-cell"><a href="${t.media_path}" target="_blank"><img src="${t.media_path}"></a></div>`;
      } else if (t.media_path && t.media_type === 'video') {
        mediaCell = `<div class="media-preview-cell"><a href="${t.media_path}" target="_blank"><video src="${t.media_path}"></video></a></div>`;
      }

      const isPending = t.status === 'pending';
      const statusBadge = isPending ? '<span class="badge badge-gold">Pending</span>' : '<span class="badge badge-success"><i class="fa-solid fa-check"></i> Reviewed</span>';
      
      const reviewButton = isPending ? `
        <button class="btn-action btn-action-publish" onclick="reviewTip(${t.id})" style="background:var(--success-glow); border-color:var(--success); color:#ffffff;">
          <i class="fa-solid fa-check"></i> Mark Reviewed
        </button>
      ` : '';

      const actionHtml = `
        <button class="btn-action" onclick="copyTipToForm(${t.id})" style="background:var(--gold-glow); border-color:var(--gold); color:#ffffff;">
          <i class="fa-solid fa-copy"></i> Use as Draft
        </button>
        ${reviewButton}
        <button class="btn-action btn-action-delete" onclick="deleteTip(${t.id})">
          <i class="fa-regular fa-trash-can"></i> Delete
        </button>
      `;

      return `
        <tr>
          <td>${mediaCell}</td>
          <td><strong>${t.name}</strong><br>${statusBadge}</td>
          <td>${t.contact}</td>
          <td>${t.title}</td>
          <td style="max-width:250px; font-size:12px; color:var(--text-secondary); white-space:normal; word-break:break-word;">${t.description}</td>
          <td>${formatDate(t.created_at)}</td>
          <td class="td-actions">${actionHtml}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading tips:', error);
  }
}

// Copy Tip info to create news form
async function copyTipToForm(tipId) {
  try {
    const response = await fetch('/api/admin/tips');
    const tips = await response.json();
    const tip = tips.find(t => t.id === tipId);

    if (tip) {
      document.getElementById('newsTitle').value = `[Report] ${tip.title}`;
      document.getElementById('newsContent').value = `Incident reported by: ${tip.name} (${tip.contact})\n\nReport details:\n${tip.description}`;
      
      // Copy media preview if present
      if (tip.media_path) {
        window.currentDraftMedia = { path: tip.media_path, type: tip.media_type };
        const previewDiv = document.getElementById('newsMediaPreview');
        if (tip.media_type === 'image') {
          previewDiv.innerHTML = `<img src="${tip.media_path}" style="width:100%; max-height:100px; object-fit:cover;">`;
        } else if (tip.media_type === 'video') {
          previewDiv.innerHTML = `<video src="${tip.media_path}" style="width:100%; max-height:100px; object-fit:cover;" controls></video>`;
        }
        document.getElementById('newsMediaPreviewContainer').style.display = 'block';
      } else {
        clearDraftMedia();
      }

      switchTab('newsSection', document.getElementById('navNews'));
    }
  } catch (error) {
    console.error('Error copying tip details:', error);
  }
}

// Clear draft media variables and UI preview
function clearDraftMedia() {
  window.currentDraftMedia = null;
  const container = document.getElementById('newsMediaPreviewContainer');
  if (container) container.style.display = 'none';
  const previewDiv = document.getElementById('newsMediaPreview');
  if (previewDiv) previewDiv.innerHTML = '';
}

// Mark tip as reviewed
async function reviewTip(id) {
  try {
    const response = await fetch(`/api/admin/tips/${id}`, { method: 'PUT' });
    if (response.ok) {
      loadTips();
      loadAnalytics();
    } else {
      alert('Failed to update status.');
    }
  } catch (error) {
    console.error('Error reviewing tip:', error);
  }
}

// Delete tip
async function deleteTip(id) {
  if (!confirm('Are you sure you want to permanently delete this report/tip?')) return;

  try {
    const response = await fetch(`/api/admin/tips/${id}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Report deleted successfully.');
      loadTips();
      loadAnalytics();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to delete report.');
    }
  } catch (error) {
    console.error('Error deleting tip:', error);
  }
}

// ==========================================
// 3. NEWS APPROVALS PANEL (ADMIN ONLY)
// ==========================================

async function loadApprovals() {
  const tbody = document.getElementById('approvalsTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/admin/news');
    const news = await response.json();
    const pending = news.filter(n => n.status === 'pending');

    if (pending.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="no-data-msg">No news articles awaiting approval. Everything is published!</td></tr>`;
      return;
    }

    tbody.innerHTML = pending.map(a => {
      let mediaPreview = '<i class="fa-regular fa-image" style="font-size:20px; color:var(--text-muted);"></i>';
      if (a.media_path && a.media_type === 'image') {
        mediaPreview = `<div class="media-preview-cell"><img src="${a.media_path}"></div>`;
      } else if (a.media_path && a.media_type === 'video') {
        mediaPreview = `<div class="media-preview-cell"><video src="${a.media_path}"></video></div>`;
      }

      return `
        <tr>
          <td>${mediaPreview}</td>
          <td style="font-weight:600;">${a.title}</td>
          <td><span class="badge badge-crimson">${a.category}</span></td>
          <td>${a.reporter_name || 'Anonymous Reporter'}</td>
          <td>${formatDate(a.created_at)}</td>
          <td class="td-actions">
            <button class="btn-action btn-action-publish" onclick="publishArticle(${a.id})">
              <i class="fa-regular fa-circle-check"></i> Approve & Publish
            </button>
            <button class="btn-action btn-action-delete" onclick="deleteNews(${a.id})">
              <i class="fa-regular fa-circle-xmark"></i> Reject & Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading approvals table:', error);
  }
}

async function publishArticle(id) {
  try {
    const response = await fetch(`/api/admin/news/publish/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: 'published' })
    });

    if (response.ok) {
      alert('Article published successfully!');
      loadApprovals();
      loadNews();
    } else {
      alert('Failed to publish article.');
    }
  } catch (error) {
    console.error('Error publishing article:', error);
  }
}

// ==========================================
// 4. REPORTER REQUESTS PANEL (ADMIN ONLY)
// ==========================================

async function loadReporters() {
  const tbody = document.getElementById('reportersTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/admin/reporters');
    const reporters = await response.json();

    if (reporters.length === 0) {
      tbody.innerHTML = `<tr><td colspan="7" class="no-data-msg">No reporter applications or accounts on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = reporters.map(r => {
      let statusColor = 'badge-gold';
      if (r.status === 'active') statusColor = 'badge-success';
      if (r.status === 'suspended') statusColor = 'badge-crimson';

      // Action layouts
      let actionButtons = '';
      if (r.status === 'pending') {
        actionButtons = `
          <button class="btn-action btn-action-publish" onclick="updateReporterStatus(${r.id}, 'active')">
            <i class="fa-solid fa-user-check"></i> Approve
          </button>
          <button class="btn-action btn-action-delete" onclick="updateReporterStatus(${r.id}, 'rejected')">
            <i class="fa-solid fa-user-xmark"></i> Reject
          </button>
        `;
      } else if (r.status === 'active') {
        actionButtons = `
          <button class="btn-action btn-action-delete" onclick="updateReporterStatus(${r.id}, 'suspended')">
            <i class="fa-solid fa-user-slash"></i> Suspend
          </button>
        `;
      } else if (r.status === 'suspended') {
        actionButtons = `
          <button class="btn-action btn-action-publish" onclick="updateReporterStatus(${r.id}, 'active')">
            <i class="fa-solid fa-user-check"></i> Activate
          </button>
          <button class="btn-action btn-action-delete" onclick="deleteReporter(${r.id})">
            <i class="fa-solid fa-trash-can"></i> Delete Account
          </button>
        `;
      }

      return `
        <tr>
          <td><strong>${r.name}</strong></td>
          <td>${r.mobile}</td>
          <td>${r.location}</td>
          <td><code>${r.username}</code></td>
          <td><span class="badge ${statusColor}">${r.status}</span></td>
          <td>${formatDate(r.created_at)}</td>
          <td class="td-actions">${actionButtons}</td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading reporters list:', error);
  }
}

async function updateReporterStatus(id, newStatus) {
  const confirmMsg = newStatus === 'rejected' ? 'Are you sure you want to reject this applicant?' : `Set reporter status to ${newStatus}?`;
  if (!confirm(confirmMsg)) return;

  try {
    const response = await fetch(`/api/admin/reporters/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
      alert(`Reporter status updated to ${newStatus}.`);
      loadReporters();
      loadAnalytics();
    } else {
      const data = await response.json();
      alert(data.error || 'Failed to update reporter status.');
    }
  } catch (error) {
    console.error('Error updating reporter status:', error);
  }
}

async function deleteReporter(id) {
  if (!confirm('Permanently delete this reporter profile? All historic credentials will be deleted.')) return;

  try {
    const response = await fetch(`/api/admin/reporters/${id}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Reporter account deleted.');
      loadReporters();
      loadAnalytics();
    } else {
      alert('Failed to delete account.');
    }
  } catch (error) {
    console.error('Error deleting reporter:', error);
  }
}

// ==========================================
// 5. AD MANAGER PANEL (ADMIN ONLY)
// ==========================================

async function loadAds() {
  const tbody = document.getElementById('adsTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/admin/ads');
    const ads = await response.json();

    if (ads.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="no-data-msg">No advertisements configured. Create one above!</td></tr>`;
      return;
    }

    tbody.innerHTML = ads.map(ad => {
      const statusBadge = ad.status === 'active' ? 'badge-success' : 'badge-gold';
      const nextStatus = ad.status === 'active' ? 'inactive' : 'active';
      const toggleLabel = ad.status === 'active' ? 'Deactivate' : 'Activate';

      return `
        <tr>
          <td><div class="media-preview-cell"><img src="${ad.image_path}"></div></td>
          <td><strong>${ad.advertiser_name}</strong><br><span style="font-size:11px; color:var(--text-secondary); word-break:break-all;">Link: ${ad.link_url}</span></td>
          <td><code>${ad.position}</code></td>
          <td><strong>${ad.clicks || 0}</strong> clicks</td>
          <td><span class="badge ${statusBadge}">${ad.status}</span></td>
          <td class="td-actions">
            <button class="btn-action" onclick="toggleAdStatus(${ad.id}, '${nextStatus}')">
              <i class="fa-solid fa-power-off"></i> ${toggleLabel}
            </button>
            <button class="btn-action btn-action-delete" onclick="deleteAd(${ad.id})">
              <i class="fa-regular fa-trash-can"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading ads list:', error);
  }
}

async function handleAdSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  try {
    const response = await fetch('/api/admin/ads', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      form.reset();
      loadAds();
      loadAnalytics();
    } else {
      alert(result.error || 'Failed to publish advertisement.');
    }
  } catch (error) {
    console.error('Error submitting advertisement:', error);
  }
}

async function toggleAdStatus(id, newStatus) {
  try {
    const response = await fetch(`/api/admin/ads/status/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: newStatus })
    });

    if (response.ok) {
      loadAds();
      loadAnalytics();
    } else {
      alert('Failed to update ad status.');
    }
  } catch (error) {
    console.error('Error toggling ad status:', error);
  }
}

async function deleteAd(id) {
  if (!confirm('Permanently delete this advertisement campaign?')) return;

  try {
    const response = await fetch(`/api/admin/ads/${id}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Ad campaign deleted.');
      loadAds();
      loadAnalytics();
    } else {
      alert('Failed to delete ad.');
    }
  } catch (error) {
    console.error('Error deleting ad:', error);
  }
}

// ==========================================
// 6. DIRECTORY MANAGER PANEL (ADMIN ONLY)
// ==========================================

async function loadDirectory() {
  const tbody = document.getElementById('directoryTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/directory');
    const directory = await response.json();

    if (directory.length === 0) {
      tbody.innerHTML = `<tr><td colspan="6" class="no-data-msg">No local directory listings on record.</td></tr>`;
      return;
    }

    tbody.innerHTML = directory.map(d => {
      const isFeaturedBadge = d.is_featured === 1 ? '<span class="badge badge-gold">Sidebar</span>' : '<span style="color:var(--text-muted); font-size:12px;">No</span>';
      
      const phoneDisplay = d.phone ? `Call: ${d.phone}` : '';
      const waDisplay = d.whatsapp ? `WA: ${d.whatsapp}` : '';
      const contacts = [phoneDisplay, waDisplay].filter(Boolean).join('<br>');

      return `
        <tr>
          <td><strong>${d.business_name}</strong><br><span style="font-size:11px; color:var(--text-secondary);">${d.description || ''}</span></td>
          <td><span class="badge badge-crimson" style="background:rgba(255,255,255,0.03); color:#ffffff; border-color:var(--card-border);">${d.category}</span></td>
          <td style="font-size:12px;">${contacts}</td>
          <td style="font-size:12px; color:var(--text-secondary);">${d.address || ''}</td>
          <td>${isFeaturedBadge}</td>
          <td>
            <button class="btn-action btn-action-delete" onclick="deleteDirectory(${d.id})">
              <i class="fa-regular fa-trash-can"></i> Delete
            </button>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading directory list:', error);
  }
}

async function handleDirectorySubmit(e) {
  e.preventDefault();
  const form = e.target;
  const formData = new FormData(form);

  // Ensure is_featured is mapped properly since checkbox value works differently
  const isFeaturedChecked = document.getElementById('dirFeatured').checked;
  formData.set('is_featured', isFeaturedChecked ? '1' : '0');

  try {
    const response = await fetch('/api/admin/directory', {
      method: 'POST',
      body: formData
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      form.reset();
      loadDirectory();
    } else {
      alert(result.error || 'Failed to create directory entry.');
    }
  } catch (error) {
    console.error('Error submitting directory entry:', error);
  }
}

async function deleteDirectory(id) {
  if (!confirm('Permanently delete this business listing?')) return;

  try {
    const response = await fetch(`/api/admin/directory/${id}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Listing deleted successfully.');
      loadDirectory();
    } else {
      alert('Failed to delete directory entry.');
    }
  } catch (error) {
    console.error('Error deleting directory listing:', error);
  }
}

// ==========================================
// 7. PASSWORD SETTINGS (COMMON)
// ==========================================

async function handlePasswordChange(e) {
  e.preventDefault();
  
  const currentPassword = document.getElementById('currentPassword').value;
  const newPassword = document.getElementById('newPassword').value;
  const confirmPassword = document.getElementById('confirmPassword').value;

  if (newPassword !== confirmPassword) {
    alert('Passwords do not match. Please re-type.');
    return;
  }

  try {
    const response = await fetch('/api/auth/change-password', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ currentPassword, newPassword })
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      document.getElementById('settingsForm').reset();
    } else {
      alert(result.error || 'Failed to change password.');
    }
  } catch (error) {
    console.error('Error updating password:', error);
  }
}

// ==========================================
// TICKER MANAGEMENT FUNCTIONS
// ==========================================

async function loadTicker() {
  const tbody = document.getElementById('tickerTableBody');
  if (!tbody) return;

  try {
    const response = await fetch('/api/admin/ticker');
    const ticker = await response.json();

    if (ticker.length === 0) {
      tbody.innerHTML = `<tr><td colspan="4" class="no-data-msg">No custom ticker alerts created yet.</td></tr>`;
      return;
    }

    tbody.innerHTML = ticker.map(t => {
      const activeText = t.active === 1 ? 'Active' : 'Inactive';
      const activeBtnText = t.active === 1 ? 'Deactivate' : 'Activate';
      const activeBtnClass = t.active === 1 ? 'btn-action-publish' : 'btn-action';
      const nextActiveState = t.active === 1 ? 0 : 1;

      return `
        <tr>
          <td style="font-weight: 500; font-size:14px; max-width:400px; white-space:pre-wrap; color:var(--text-main);">${t.text}</td>
          <td>
            <span class="badge ${t.active === 1 ? 'badge-success' : 'badge-gold'}">${activeText}</span>
          </td>
          <td style="color:var(--text-muted); font-size:12px;">${formatDate(t.created_at)}</td>
          <td>
            <div class="td-actions">
              <button class="btn-action ${activeBtnClass}" onclick="toggleTickerStatus(${t.id}, ${nextActiveState})">
                <i class="fa-solid fa-power-off"></i> ${activeBtnText}
              </button>
              <button class="btn-action btn-action-delete" onclick="deleteTicker(${t.id})">
                <i class="fa-regular fa-trash-can"></i> Delete
              </button>
            </div>
          </td>
        </tr>
      `;
    }).join('');
  } catch (error) {
    console.error('Error loading ticker items:', error);
  }
}

async function handleTickerSubmit(e) {
  e.preventDefault();
  const form = e.target;
  const textInput = document.getElementById('tickerText');
  const text = textInput.value.trim();

  try {
    const response = await fetch('/api/admin/ticker', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    const result = await response.json();
    if (response.ok) {
      alert(result.message);
      form.reset();
      loadTicker();
    } else {
      alert(result.error || 'Failed to publish alert.');
    }
  } catch (error) {
    console.error('Error publishing ticker alert:', error);
  }
}

async function toggleTickerStatus(id, activeState) {
  try {
    const response = await fetch(`/api/admin/ticker/status/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: activeState })
    });

    if (response.ok) {
      loadTicker();
    } else {
      const result = await response.json();
      alert(result.error || 'Failed to toggle alert status.');
    }
  } catch (error) {
    console.error('Error toggling ticker status:', error);
  }
}

async function deleteTicker(id) {
  if (!confirm('Permanently delete this ticker alert message?')) return;

  try {
    const response = await fetch(`/api/admin/ticker/${id}`, { method: 'DELETE' });
    if (response.ok) {
      alert('Alert deleted successfully.');
      loadTicker();
    } else {
      alert('Failed to delete ticker alert.');
    }
  } catch (error) {
    console.error('Error deleting ticker alert:', error);
  }
}

// ==========================================
// UTIL FUNCTIONS
// ==========================================

function formatDate(dateString) {
  const options = { year: '2-digit', month: 'numeric', day: 'numeric', hour: '2-digit', minute: '2-digit' };
  return new Date(dateString).toLocaleDateString('en-US', options);
}
