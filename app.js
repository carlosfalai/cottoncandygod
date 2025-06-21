// Enhanced Yoga Marathon Application with Interactive Features and Duplicate Prevention
class YogaMarathonApp {
    constructor() {
        this.data = null;
        this.sayingsData = null;
        this.currentBelt = 0;
        this.currentSession = 0;
        this.userProgress = this.loadProgress();
        this.init();
    }

    async init() {
        console.log('Initializing Yoga Marathon App...');
        await this.loadData();
        this.removeDuplicateSessions(); // Remove duplicates after loading data
        this.setupEventListeners();
        this.renderApp();
        this.startProgressTracking();
        
        // Hide loading screen
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.remove(), 500);
            }, 1000);
        }
    }

    async loadData() {
        try {
            console.log('Loading data files...');
            const [marathonResponse, sayingsResponse] = await Promise.all([
                fetch('./siddhanath_yoga_marathon.json'),
                fetch('./timestamped_sacred_sayings.json')
            ]);
            
            if (!marathonResponse.ok || !sayingsResponse.ok) {
                throw new Error('Failed to fetch data files');
            }
            
            this.data = await marathonResponse.json();
            this.sayingsData = await sayingsResponse.json();
            console.log('Data loaded successfully:', {
                beltProgression: this.data?.beltProgression?.length,
                sayingsCategories: Object.keys(this.sayingsData?.categories || {}).length
            });
        } catch (error) {
            console.error('Error loading data:', error);
            this.showError('Failed to load application data');
        }
    }

    removeDuplicateSessions() {
        if (!this.data?.beltProgression) return;
        
        console.log('Removing duplicate sessions...');
        
        this.data.beltProgression.forEach(belt => {
            const seenTitles = new Set();
            const seenVideoIds = new Set();
            const uniqueSessions = [];
            
            belt.sessions.forEach(session => {
                // Normalize title for comparison (remove case and punctuation differences)
                const normalizedTitle = session.title.toLowerCase()
                    .replace(/[^\w\s]/g, '')
                    .replace(/\s+/g, ' ')
                    .trim();
                
                // Check if we've seen this title or video ID before
                if (!seenTitles.has(normalizedTitle) && !seenVideoIds.has(session.videoId)) {
                    seenTitles.add(normalizedTitle);
                    seenVideoIds.add(session.videoId);
                    uniqueSessions.push(session);
                } else {
                    console.log('Removing duplicate session:', session.title);
                }
            });
            
            belt.sessions = uniqueSessions;
            console.log(`${belt.belt}: ${uniqueSessions.length} unique sessions (removed ${belt.sessions.length - uniqueSessions.length} duplicates)`);
        });
    }

    setupEventListeners() {
        console.log('Setting up event listeners...');
        // Navigation
        document.addEventListener('click', (e) => {
            if (e.target.matches('[data-action]')) {
                console.log('Action clicked:', e.target.dataset.action);
                this.handleAction(e.target.dataset.action, e.target);
            }
        });

        // Search functionality
        document.addEventListener('input', (e) => {
            if (e.target.id === 'sayings-search') {
                this.searchSayings(e.target.value);
            }
        });

        // Category filter
        document.addEventListener('change', (e) => {
            if (e.target.id === 'category-filter') {
                this.filterSayings(e.target.value);
            }
        });

        // Keyboard shortcuts
        document.addEventListener('keydown', (e) => {
            if (e.ctrlKey || e.metaKey) {
                switch(e.key) {
                    case 'n':
                        e.preventDefault();
                        this.nextSession();
                        break;
                    case 'p':
                        e.preventDefault();
                        this.previousSession();
                        break;
                }
            }
        });

        // Progress tracking
        window.addEventListener('beforeunload', () => {
            this.saveProgress();
        });
    }

    handleAction(action, element) {
        console.log('Handling action:', action);
        switch(action) {
            case 'start-session':
                this.startSession(element.dataset.sessionId);
                break;
            case 'complete-session':
                this.completeSession(element.dataset.sessionId);
                break;
            case 'view-saying':
                this.viewSaying(element.dataset.sayingId);
                break;
            case 'search-sayings':
                this.scrollToSayings();
                break;
            case 'toggle-favorites':
                this.toggleFavorites(element.dataset.itemId);
                break;
            case 'share-progress':
                this.shareProgress();
                break;
        }
    }

    scrollToSayings() {
        const sayingsSection = document.querySelector('.sacred-sayings');
        if (sayingsSection) {
            sayingsSection.scrollIntoView({ behavior: 'smooth' });
            const searchInput = document.getElementById('sayings-search');
            if (searchInput) {
                setTimeout(() => searchInput.focus(), 500);
            }
        }
    }

    searchSayings(query) {
        console.log('Searching sayings for:', query);
        if (!this.sayingsData?.categories) return;
        
        const filteredSayings = [];
        Object.entries(this.sayingsData.categories).forEach(([category, sayings]) => {
            const matchingSayings = sayings.filter(saying => 
                saying.quote.toLowerCase().includes(query.toLowerCase()) ||
                saying.theme?.toLowerCase().includes(query.toLowerCase()) ||
                saying.videoTitle?.toLowerCase().includes(query.toLowerCase())
            );
            matchingSayings.forEach(saying => filteredSayings.push({ ...saying, category }));
        });
        
        this.renderSayingsGrid(filteredSayings.slice(0, 12));
    }

    filterSayings(category) {
        console.log('Filtering sayings by category:', category);
        if (!this.sayingsData?.categories) return;
        
        let filteredSayings = [];
        if (category === '') {
            // Show all categories
            filteredSayings = this.getFeaturedSayings();
        } else {
            const categoryData = this.sayingsData.categories[category] || [];
            filteredSayings = categoryData.slice(0, 12).map(saying => ({ ...saying, category }));
        }
        
        this.renderSayingsGrid(filteredSayings);
    }

    renderSayingsGrid(sayings) {
        const grid = document.getElementById('sayings-grid');
        if (grid) {
            grid.innerHTML = sayings.map(saying => this.renderSayingCard(saying)).join('');
        }
    }

    renderApp() {
        console.log('Rendering app...');
        const app = document.getElementById('app');
        app.innerHTML = `
            <div class="yoga-marathon-app">
                ${this.renderHeader()}
                ${this.renderProgressDashboard()}
                ${this.renderBeltProgression()}
                ${this.renderCurrentSession()}
                ${this.renderSacredSayings()}
                ${this.renderFooter()}
            </div>
        `;
    }

    renderHeader() {
        return `
            <header class="app-header">
                <div class="header-content">
                    <div class="logo-section">
                        <img src="./generated-icon.png" alt="Siddhanath Yoga" class="logo">
                        <div class="title-section">
                            <h1>Siddhanath Yoga Marathon</h1>
                            <p>Journey Through Sacred Teachings</p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button data-action="search-sayings" class="action-btn">
                            🔍 Search Sayings
                        </button>
                        <button data-action="share-progress" class="action-btn">
                            📊 Share Progress
                        </button>
                    </div>
                </div>
            </header>
        `;
    }

    renderProgressDashboard() {
        const totalSessions = this.data?.beltProgression?.reduce((sum, belt) => sum + belt.sessions.length, 0) || 0;
        const completedSessions = this.userProgress.completedSessions.length;
        const progressPercentage = totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(1) : 0;

        return `
            <section class="progress-dashboard">
                <div class="progress-stats">
                    <div class="stat-item">
                        <div class="stat-number">${completedSessions}</div>
                        <div class="stat-label">Sessions Completed</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${totalSessions}</div>
                        <div class="stat-label">Total Sessions</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${progressPercentage}%</div>
                        <div class="stat-label">Progress</div>
                    </div>
                    <div class="stat-item">
                        <div class="stat-number">${this.userProgress.currentStreak}</div>
                        <div class="stat-label">Day Streak</div>
                    </div>
                </div>
                <div class="progress-bar">
                    <div class="progress-fill" style="width: ${progressPercentage}%"></div>
                </div>
            </section>
        `;
    }

    renderBeltProgression() {
        if (!this.data?.beltProgression) return '';

        return `
            <section class="belt-progression">
                <h2>Belt Progression</h2>
                <div class="belts-grid">
                    ${this.data.beltProgression.map((belt, index) => this.renderBeltCard(belt, index)).join('')}
                </div>
            </section>
        `;
    }

    renderBeltCard(belt, index) {
        const isUnlocked = index <= this.userProgress.currentBelt;
        const completedSessions = belt.sessions.filter(session => 
            this.userProgress.completedSessions.includes(session.videoId)
        ).length;
        const progressPercent = (completedSessions / belt.sessions.length * 100).toFixed(0);

        return `
            <div class="belt-card ${isUnlocked ? 'unlocked' : 'locked'}">
                <div class="belt-header">
                    <div class="belt-color" style="background-color: ${belt.color}"></div>
                    <h3>${belt.belt}</h3>
                    ${isUnlocked ? '' : '<span class="lock-icon">🔒</span>'}
                </div>
                <div class="belt-progress">
                    <div class="progress-text">${completedSessions}/${belt.sessions.length} sessions</div>
                    <div class="mini-progress-bar">
                        <div class="mini-progress-fill" style="width: ${progressPercent}%"></div>
                    </div>
                </div>
                <div class="belt-sessions">
                    ${belt.sessions.slice(0, 3).map(session => this.renderSessionPreview(session)).join('')}
                    ${belt.sessions.length > 3 ? `<div class="more-sessions">+${belt.sessions.length - 3} more</div>` : ''}
                </div>
            </div>
        `;
    }

    renderSessionPreview(session) {
        const isCompleted = this.userProgress.completedSessions.includes(session.videoId);
        const difficulty = session.analysis?.difficulty || 'beginner';
        const duration = session.analysis?.estimatedMinutes || 10;

        return `
            <div class="session-preview ${isCompleted ? 'completed' : ''}">
                <div class="session-title">${session.title}</div>
                <div class="session-meta">
                    <span class="difficulty ${difficulty}">${difficulty}</span>
                    <span class="duration">${duration}min</span>
                    ${isCompleted ? '<span class="completed-badge">✓</span>' : ''}
                </div>
            </div>
        `;
    }

    renderCurrentSession() {
        const currentBelt = this.data?.beltProgression?.[this.userProgress.currentBelt];
        if (!currentBelt) return '';

        const nextSession = currentBelt.sessions.find(session => 
            !this.userProgress.completedSessions.includes(session.videoId)
        );

        if (!nextSession) return this.renderBeltComplete();

        return `
            <section class="current-session">
                <h2>Current Session</h2>
                <div class="session-card featured">
                    <div class="session-header">
                        <h3>${nextSession.title}</h3>
                        <div class="session-badges">
                            <span class="belt-badge" style="background-color: ${currentBelt.color}">
                                ${currentBelt.belt}
                            </span>
                            <span class="difficulty-badge ${nextSession.analysis?.difficulty || 'beginner'}">
                                ${nextSession.analysis?.difficulty || 'beginner'}
                            </span>
                        </div>
                    </div>
                    <div class="session-content">
                        <div class="session-description">
                            ${this.extractSessionDescription(nextSession)}
                        </div>
                        <div class="session-actions">
                            <button data-action="start-session" data-session-id="${nextSession.videoId}" 
                                    class="primary-btn">
                                ▶️ Start Session
                            </button>
                            <a href="${nextSession.url}" target="_blank" class="secondary-btn">
                                🎥 Watch on YouTube
                            </a>
                        </div>
                    </div>
                </div>
            </section>
        `;
    }

    renderSacredSayings() {
        if (!this.sayingsData?.categories) return '';

        const featuredSayings = this.getFeaturedSayings();

        return `
            <section class="sacred-sayings">
                <h2>Sacred Sayings</h2>
                <div class="sayings-controls">
                    <input type="text" id="sayings-search" placeholder="Search sacred sayings..." class="search-input">
                    <select id="category-filter" class="category-select">
                        <option value="">All Categories</option>
                        ${Object.keys(this.sayingsData.categories).map(cat => 
                            `<option value="${cat}">${cat}</option>`
                        ).join('')}
                    </select>
                </div>
                <div class="sayings-grid" id="sayings-grid">
                    ${featuredSayings.map(saying => this.renderSayingCard(saying)).join('')}
                </div>
                <button id="load-more-sayings" class="load-more-btn" data-action="load-more-sayings">Load More Sayings</button>
            </section>
        `;
    }

    renderSayingCard(saying) {
        const isFavorite = this.userProgress.favoriteSayings.includes(saying.quote);

        return `
            <div class="saying-card" data-saying-id="${saying.quote}">
                <div class="saying-content">
                    <blockquote class="saying-quote">"${saying.quote}"</blockquote>
                    <div class="saying-meta">
                        <div class="saying-source">
                            <strong>${saying.theme || 'Sacred Teaching'}</strong>
                            <br><small>${saying.videoTitle || 'Gurunath\'s Teachings'}</small>
                        </div>
                        <button data-action="toggle-favorites" data-item-id="${saying.quote}" 
                                class="favorite-btn ${isFavorite ? 'favorited' : ''}">
                            ${isFavorite ? '❤️' : '🤍'}
                        </button>
                    </div>
                </div>
            </div>
        `;
    }

    renderFooter() {
        return `
            <footer class="app-footer">
                <div class="footer-content">
                    <p>&copy; 2025 Siddhanath Gurunath Yogiraj. All rights reserved.</p>
                    <div class="footer-links">
                        <a href="https://hamsa-yoga.org" target="_blank">Official Website</a>
                        <a href="#" data-action="about">About</a>
                        <a href="#" data-action="contact">Contact</a>
                    </div>
                </div>
            </footer>
        `;
    }

    // Utility methods
    extractSessionDescription(session) {
        if (session.sacred_sayings) {
            try {
                const sayings = JSON.parse(session.sacred_sayings);
                if (sayings.themes && sayings.themes.length > 0) {
                    return sayings.themes[0].gurunath_words.substring(0, 200) + '...';
                }
            } catch (e) {
                // Fallback to transcript
            }
        }
        return session.transcript ? session.transcript.substring(0, 200) + '...' : 'A guided session in the sacred teachings of Yogiraj Siddhanath.';
    }

    getFeaturedSayings() {
        const allSayings = [];
        Object.entries(this.sayingsData.categories || {}).forEach(([category, sayings]) => {
            sayings.slice(0, 2).forEach(saying => {
                allSayings.push({ ...saying, category });
            });
        });
        return allSayings.slice(0, 12);
    }

    // Progress management
    loadProgress() {
        const saved = localStorage.getItem('yogaMarathonProgress');
        return saved ? JSON.parse(saved) : {
            currentBelt: 0,
            currentSession: 0,
            completedSessions: [],
            favoriteSayings: [],
            currentStreak: 0,
            lastSessionDate: null
        };
    }

    saveProgress() {
        localStorage.setItem('yogaMarathonProgress', JSON.stringify(this.userProgress));
    }

    startSession(sessionId) {
        console.log('Starting session:', sessionId);
        // Mark session as started
        const session = this.findSession(sessionId);
        if (session) {
            this.showSessionModal(session);
        }
    }

    completeSession(sessionId) {
        console.log('Completing session:', sessionId);
        if (!this.userProgress.completedSessions.includes(sessionId)) {
            this.userProgress.completedSessions.push(sessionId);
            this.updateStreak();
            this.checkBeltProgression();
            this.saveProgress();
            this.renderApp();
            this.showCompletionCelebration();
        }
    }

    updateStreak() {
        const today = new Date().toDateString();
        const lastDate = this.userProgress.lastSessionDate;
        
        if (lastDate === today) {
            // Already practiced today
            return;
        }
        
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        if (lastDate === yesterday.toDateString()) {
            this.userProgress.currentStreak++;
        } else {
            this.userProgress.currentStreak = 1;
        }
        
        this.userProgress.lastSessionDate = today;
    }

    checkBeltProgression() {
        const currentBelt = this.data.beltProgression[this.userProgress.currentBelt];
        if (currentBelt) {
            const completedInBelt = currentBelt.sessions.filter(session =>
                this.userProgress.completedSessions.includes(session.videoId)
            ).length;
            
            if (completedInBelt === currentBelt.sessions.length) {
                this.userProgress.currentBelt++;
                this.showBeltPromotion(currentBelt.belt);
            }
        }
    }

    toggleFavorites(quote) {
        console.log('Toggling favorite for:', quote);
        const index = this.userProgress.favoriteSayings.indexOf(quote);
        if (index > -1) {
            this.userProgress.favoriteSayings.splice(index, 1);
        } else {
            this.userProgress.favoriteSayings.push(quote);
        }
        this.saveProgress();
        this.renderApp();
    }

    shareProgress() {
        console.log('Sharing progress...');
        const totalSessions = this.data?.beltProgression?.reduce((sum, belt) => sum + belt.sessions.length, 0) || 0;
        const completedSessions = this.userProgress.completedSessions.length;
        const progressPercentage = totalSessions > 0 ? (completedSessions / totalSessions * 100).toFixed(1) : 0;
        
        const shareText = `I'm on my Siddhanath Yoga Marathon journey! 🧘‍♂️\\n\\n📊 Progress: ${progressPercentage}% (${completedSessions}/${totalSessions} sessions)\\n🔥 Current streak: ${this.userProgress.currentStreak} days\\n\\nJoin me at: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Siddhanath Yoga Marathon Progress',
                text: shareText,
                url: window.location.href
            });
        } else {
            // Fallback to clipboard
            navigator.clipboard.writeText(shareText).then(() => {
                this.showNotification('Progress copied to clipboard!');
            });
        }
    }

    // UI Methods
    showError(message) {
        console.error('Showing error:', message);
        const errorDiv = document.createElement('div');
        errorDiv.className = 'error-message';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #ff4444;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(errorDiv);
        setTimeout(() => errorDiv.remove(), 5000);
    }

    showNotification(message) {
        console.log('Showing notification:', message);
        const notificationDiv = document.createElement('div');
        notificationDiv.className = 'notification-message';
        notificationDiv.textContent = message;
        notificationDiv.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #4CAF50;
            color: white;
            padding: 15px;
            border-radius: 8px;
            z-index: 10000;
            max-width: 300px;
        `;
        document.body.appendChild(notificationDiv);
        setTimeout(() => notificationDiv.remove(), 3000);
    }

    showSessionModal(session) {
        console.log('Showing session modal for:', session.title);
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';
        modal.innerHTML = `
            <div class="modal-content session-modal">
                <div class="modal-header">
                    <h3>${session.title}</h3>
                    <button class="close-btn" data-action="close-modal">&times;</button>
                </div>
                <div class="modal-body">
                    <div class="session-video">
                        <iframe src="https://www.youtube.com/embed/${session.videoId}" 
                                frameborder="0" allowfullscreen></iframe>
                    </div>
                    <div class="session-details">
                        <p><strong>Duration:</strong> ${session.analysis?.estimatedMinutes || 10} minutes</p>
                        <p><strong>Difficulty:</strong> ${session.analysis?.difficulty || 'beginner'}</p>
                        <div class="session-transcript">
                            <h4>Session Guidance:</h4>
                            <p>${this.extractSessionDescription(session)}</p>
                        </div>
                    </div>
                </div>
                <div class="modal-footer">
                    <button data-action="complete-session" data-session-id="${session.videoId}" 
                            class="primary-btn">Mark as Complete</button>
                    <button class="secondary-btn" data-action="close-modal">Close</button>
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
        
        modal.addEventListener('click', (e) => {
            if (e.target.matches('.close-btn') || e.target === modal || e.target.dataset.action === 'close-modal') {
                modal.remove();
            }
        });
    }

    showCompletionCelebration() {
        const celebration = document.createElement('div');
        celebration.className = 'celebration-overlay';
        celebration.innerHTML = `
            <div class="celebration-content">
                <div class="celebration-icon">🎉</div>
                <h3>Session Complete!</h3>
                <p>You've completed another step on your spiritual journey.</p>
                <button class="primary-btn" onclick="this.parentElement.parentElement.remove()">
                    Continue
                </button>
            </div>
        `;
        celebration.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        document.body.appendChild(celebration);
        setTimeout(() => celebration.remove(), 3000);
    }

    showBeltPromotion(beltName) {
        const promotion = document.createElement('div');
        promotion.className = 'promotion-overlay';
        promotion.innerHTML = `
            <div class="promotion-content">
                <div class="promotion-icon">🥋</div>
                <h3>Belt Promotion!</h3>
                <p>Congratulations! You've earned your ${beltName}!</p>
                <button class="primary-btn" onclick="this.parentElement.parentElement.remove()">
                    Continue Journey
                </button>
            </div>
        `;
        promotion.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0,0,0,0.8);
            display: flex;
            align-items: center;
            justify-content: center;
            z-index: 10000;
        `;
        document.body.appendChild(promotion);
    }

    findSession(sessionId) {
        for (const belt of this.data.beltProgression) {
            const session = belt.sessions.find(s => s.videoId === sessionId);
            if (session) return session;
        }
        return null;
    }

    startProgressTracking() {
        // Auto-save progress every 30 seconds
        setInterval(() => this.saveProgress(), 30000);
    }
}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.app = new YogaMarathonApp();
});

