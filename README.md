# Nandyal Times - Local News & Community Portal

Nandyal Times is a secure, dynamic local news portal, business directory, and community announcement system designed specifically for the Nandyal district. It features a complete multi-role publishing workflow for administrators and reporters, an incident reporting notice board for citizens, and a local directory.

---

## 🚀 Key Features

* **Dynamic News Feed:** Filter news articles by categories (Local, Jobs, Education, Sports, Events) or specific Nandyal Mandals (Nandyal Town, Mahanandi, Allagadda, Banaganapalli, Koilkuntla, Atmakur, etc.).
* **Citizens Notice Board:** A platform for citizens to submit local incident reports and tips (with photo/video uploads) for admin review and publication.
* **Featured Business Directory:** A local listings panel with WhatsApp integration for direct contact.
* **Premium Admin Dashboard:** 
  * **Admin Role:** Manage news approvals, review community notices, configure ticker announcements, approve/suspend reporters, and manage advertisements.
  * **Reporter Role:** Write and manage draft news posts for admin approval.
* **Bilingual Support:** Integrated language translation widget supporting English and Telugu.
* **Offline Mock Server Capability:** Automatically falls back to client-side Browser Local Storage (`localStorage` and `sessionStorage`) if the backend Node.js server is offline, allowing testing directly via the web browser.

---

## 🛠 Tech Stack

* **Frontend:** HTML5, CSS3 (Vanilla Glassmorphic Design), FontAwesome Icons, Google Fonts.
* **Backend:** Node.js, Express.js.
* **Database:** SQLite3 (with `connect-sqlite3` session store).
* **Media Handling:** Multer (with disk storage constraints supporting image/video formats up to 200MB).

---

## 💻 Local Installation & Setup

1. **Install Dependencies:**
   ```bash
   npm install
   ```
2. **Initialize Database:**
   Seed default tables, create the administrator login (`admin` / `nandyal123`), and create sample news articles:
   ```bash
   npm run init-db
   ```
3. **Start Server:**
   Run the Node.js backend server:
   ```bash
   npm start
   ```
   The site will be live at: [http://localhost:5000](http://localhost:5000)

---

## ☁️ Production Deployment (e.g., Render.com)

To deploy the backend to a hosting service like Render:

1. **Create a Web Service:** Link your GitHub repository.
2. **Define Deployment Settings:**
   * **Runtime:** `Node`
   * **Build Command:** `npm install`
   * **Start Command:** `npm start`
3. **Configure Persistent SQLite Disk:**
   Because SQLite saves data locally, you must mount a persistent disk to prevent data resets:
   * Go to **Disks** $\rightarrow$ **Add Disk**. Set **Name** to `nandyal-times-data` and **Mount Path** to `/data`.
4. **Configure Environment Variables:**
   * Go to **Environment** $\rightarrow$ **Add Environment Variable**. Add:
     * `DATA_DIR` = `/data`
     * `UPLOADS_DIR` = `/data/uploads`
