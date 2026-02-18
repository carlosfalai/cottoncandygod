class YogaMarathonApp {
    constructor() {
        this.data = null;
        this.sayingsData = null;
        this.eventsData = null;
        this.currentBelt = 0;
        this.currentSession = 0;
        this.userProgress = this.loadProgress();
        this.customSequence = this.loadCustomSequence();
        this.billboardMessages = this.loadBillboardMessages();
        this.billboardIndex = 0;
        this.sanghaFeed = [];
        this.sanghaAlerts = [];
        this.sanghaUser = this.loadSanghaUser();
        this.apiBaseUrl = location.hostname === 'localhost' ? 'http://localhost:3009' : 'https://siddhanath-ashram-sangha.onrender.com';
        this.supabaseUrl = 'https://gbxksgxezbljwlnlpkpz.supabase.co';
        this.supabaseAnonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdieGtzZ3hlemJsandsbmxwa3B6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDg3NTE1ODksImV4cCI6MjA2NDMyNzU4OX0.MCZ9NTKCUe8DLwXz8Cy2-Qr-KYPpq-tn376dpjQ6HxM';
        this.supabaseClient = null;
        this.practiceTimer = null;
        this.practiceState = null;
        this.practiceLog = this.loadPracticeLog();
        this.audioCtx = null;
        // AI Chat state
        this.aiChatHistory = [];
        this.aiChatMode = 'chat'; // 'chat' or 'report'
        this.init();
    }

    getDefaultBillboardMessages() {
        return [
            { id: 1, text: '🙏 "Earth Peace Through Self Peace" - Yogiraj Siddhanath', type: 'quote' },
            { id: 2, text: '🌕 Join Full Moon Earth Peace Meditation - 7-9 PM your local time', type: 'event' },
            { id: 3, text: '🧘 Practice Kriya Yoga daily for spiritual evolution', type: 'tip' },
            { id: 4, text: '📍 Visit siddhanath.org for retreats and empowerments', type: 'info' },
            { id: 5, text: '💫 "The breath is the bridge between body and soul"', type: 'quote' },
        ];
    }

    loadBillboardMessages() {
        try {
            const saved = localStorage.getItem('siddhanath-billboard-messages');
            if (saved) {
                const messages = JSON.parse(saved);
                if (messages.length > 0) return messages;
            }
        } catch (e) {
            console.error('Error loading billboard messages:', e);
        }
        return this.getDefaultBillboardMessages();
    }

    saveBillboardMessages() {
        try {
            localStorage.setItem('siddhanath-billboard-messages', JSON.stringify(this.billboardMessages));
        } catch (e) {
            console.error('Error saving billboard messages:', e);
        }
    }

    async init() {
        console.log('Initializing Yoga Marathon App...');
        await this.loadData();
        this.removeDuplicateSessions(); // Remove duplicates after loading data
        this.setupEventListeners();
        this.renderApp();
        this.startProgressTracking();
        this.startBillboard();
        this.loadSanghaData();
        this.initSupabaseRealtime();
        this.startAshramClock();

        // Hide loading screen
        const loadingScreen = document.querySelector('.loading-screen');
        if (loadingScreen) {
            setTimeout(() => {
                loadingScreen.style.opacity = '0';
                setTimeout(() => loadingScreen.remove(), 500);
            }, 1000);
        }
    }

    loadCustomSequence() {
        try {
            const saved = localStorage.getItem('siddhanath-custom-sequence');
            if (saved) {
                return JSON.parse(saved);
            }
        } catch (e) {
            console.error('Error loading custom sequence:', e);
        }
        // Default sequence
        return [
            { id: 1, name: 'Omkar Kriya', duration: 15, enabled: true },
            { id: 2, name: 'Shiva Shakti Kriya', duration: 20, enabled: true },
            { id: 3, name: 'Mahamudra', duration: 10, enabled: true },
            { id: 4, name: 'Paravastha', duration: 15, enabled: true },
            { id: 5, name: 'Nabho Kriya', duration: 5, enabled: true },
            { id: 6, name: 'Jyoti Mudra', duration: 10, enabled: true },
        ];
    }

    saveCustomSequence() {
        try {
            localStorage.setItem('siddhanath-custom-sequence', JSON.stringify(this.customSequence));
        } catch (e) {
            console.error('Error saving custom sequence:', e);
        }
    }

    startBillboard() {
        const billboard = document.getElementById('billboard-ticker');
        if (!billboard) return;

        this.updateBillboard();
        setInterval(() => this.updateBillboard(), 6000);
    }

    updateBillboard() {
        const billboard = document.getElementById('billboard-ticker');
        if (!billboard) return;

        const message = this.billboardMessages[this.billboardIndex % this.billboardMessages.length];
        const safeType = ['info', 'alert', 'promo', 'custom'].includes(message.type) ? message.type : 'info';
        billboard.innerHTML = `<span class="billboard-message billboard-${safeType}">${this.escapeHtml(message.text)}</span>`;
        billboard.classList.add('billboard-animate');
        setTimeout(() => billboard.classList.remove('billboard-animate'), 500);
        this.billboardIndex++;
    }

    async loadData() {
        try {
            console.log('Loading data files...');
            const [marathonResponse, sayingsResponse, eventsResponse] = await Promise.all([
                fetch('./siddhanath_yoga_marathon.json'),
                fetch('./timestamped_sacred_sayings.json'),
                fetch('./events.json').catch(() => null)
            ]);

            if (!marathonResponse.ok || !sayingsResponse.ok) {
                throw new Error('Failed to fetch data files');
            }

            this.data = await marathonResponse.json();
            this.sayingsData = await sayingsResponse.json();

            // Load events (optional - don't fail if missing)
            if (eventsResponse && eventsResponse.ok) {
                this.eventsData = await eventsResponse.json();
                console.log('Events loaded:', this.eventsData?.events?.length || 0);
            }

            console.log('Data loaded successfully:', {
                beltProgression: this.data?.beltProgression?.length,
                sayingsCategories: Object.keys(this.sayingsData?.categories || {}).length,
                events: this.eventsData?.events?.length || 0
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
            const actionEl = e.target.closest('[data-action]');
            if (actionEl) {
                console.log('Action clicked:', actionEl.dataset.action);
                this.handleAction(actionEl.dataset.action, actionEl);
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
            const actionEl = e.target.closest('[data-action]');
            if (actionEl && actionEl.dataset.action === 'change-sound') {
                localStorage.setItem('kriya-sound', actionEl.value);
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
            case 'events-list-view':
                this.switchEventsView('list');
                break;
            case 'events-calendar-view':
                this.switchEventsView('calendar');
                break;
            case 'prev-month':
                this.navigateCalendar(parseInt(element.dataset.month), parseInt(element.dataset.year), -1);
                break;
            case 'next-month':
                this.navigateCalendar(parseInt(element.dataset.month), parseInt(element.dataset.year), 1);
                break;
            case 'show-all-events':
                this.showAllEvents();
                break;
            case 'toggle-technique':
                this.toggleTechnique(parseInt(element.dataset.index));
                break;
            case 'delete-technique':
                this.deleteTechnique(parseInt(element.dataset.index));
                break;
            case 'add-technique':
                this.addTechnique();
                break;
            case 'start-practice':
                this.startPractice();
                break;
            case 'reset-sequence':
                this.resetSequence();
                break;
            case 'change-sound':
                localStorage.setItem('kriya-sound', element.value);
                break;
            case 'preview-sound':
                this.initAudio();
                this.playSound('transition');
                break;
            case 'open-feedback':
                this.openFeedbackModal();
                break;
            case 'close-feedback':
                this.closeFeedbackModal();
                break;
            case 'open-billboard-editor':
                this.openBillboardEditor();
                break;
            case 'close-billboard-editor':
                this.closeBillboardEditor();
                break;
            case 'add-billboard-message':
                this.addBillboardMessage();
                break;
            case 'delete-billboard-message':
                this.deleteBillboardMessage(parseInt(element.dataset.index));
                break;
            case 'reset-billboard-messages':
                this.resetBillboardMessages();
                break;
            case 'sangha-register':
                this.registerSangha();
                break;
            case 'sangha-react':
                this.reactToPost(element.dataset.postId, element.dataset.type);
                break;
            case 'sangha-comment':
                this.commentOnPost(element.dataset.postId);
                break;
            case 'sangha-share-whatsapp':
                this.shareToWhatsApp(element.dataset.content);
                break;
            case 'start-practice-timer':
                this.startPracticeTimer();
                break;
            case 'pause-practice-timer':
                this.pausePracticeTimer();
                break;
            case 'stop-practice-timer':
                this.stopPracticeTimer();
                break;
            case 'open-help':
                this.openHelpModal();
                break;
            case 'close-help':
                this.closeHelpModal();
                break;
            case 'open-ai-chat':
                this.openAIChat();
                break;
            case 'close-ai-chat':
                this.closeAIChat();
                break;
            case 'send-ai-message':
                this.sendAIMessage();
                break;
            case 'switch-to-report':
                this.switchToReportMode();
                break;
            case 'switch-to-chat':
                this.switchToChatMode();
                break;
            case 'submit-report':
                this.submitReport();
                break;
        }
    }

    openBillboardEditor() {
        const modal = document.getElementById('billboard-editor-modal');
        if (modal) {
            modal.style.display = 'flex';
        }
    }

    closeBillboardEditor() {
        const modal = document.getElementById('billboard-editor-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    initBillboardEditor() {
        const list = document.getElementById('billboard-messages-list');
        if (!list) return;

        // Handle text input changes
        list.addEventListener('input', (e) => {
            if (e.target.classList.contains('message-text-input')) {
                const index = parseInt(e.target.dataset.index);
                if (this.billboardMessages[index]) {
                    this.billboardMessages[index].text = e.target.value;
                    this.saveBillboardMessages();
                }
            }
        });

        // Handle type select changes
        list.addEventListener('change', (e) => {
            if (e.target.classList.contains('message-type-select')) {
                const index = parseInt(e.target.dataset.index);
                if (this.billboardMessages[index]) {
                    this.billboardMessages[index].type = e.target.value;
                    this.saveBillboardMessages();
                }
            }
        });
    }

    addBillboardMessage() {
        this.billboardMessages.push({
            id: Date.now(),
            text: '✨ Your custom message here',
            type: 'tip'
        });
        this.saveBillboardMessages();
        this.rerenderBillboardList();
    }

    deleteBillboardMessage(index) {
        if (this.billboardMessages.length > 1) {
            this.billboardMessages.splice(index, 1);
            this.saveBillboardMessages();
            this.rerenderBillboardList();
        } else {
            alert('You must have at least one message.');
        }
    }

    resetBillboardMessages() {
        if (confirm('Reset billboard messages to defaults?')) {
            this.billboardMessages = this.getDefaultBillboardMessages();
            this.saveBillboardMessages();
            this.rerenderBillboardList();
        }
    }

    rerenderBillboardList() {
        const list = document.getElementById('billboard-messages-list');
        if (list) {
            list.innerHTML = this.billboardMessages.map((msg, idx) =>
                this.renderBillboardMessageItem(msg, idx)
            ).join('');
        }
    }

    toggleTechnique(index) {
        if (this.customSequence[index]) {
            this.customSequence[index].enabled = !this.customSequence[index].enabled;
            this.saveCustomSequence();
            const item = document.querySelector(`.technique-item[data-index="${index}"]`);
            if (item) {
                item.classList.toggle('disabled');
                const toggle = item.querySelector('.technique-toggle');
                toggle.textContent = this.customSequence[index].enabled ? '✓' : '○';
            }
            this.updatePracticeTotal();
        }
    }

    deleteTechnique(index) {
        if (this.customSequence.length > 1 && confirm('Delete this technique?')) {
            this.customSequence.splice(index, 1);
            this.saveCustomSequence();
            this.rerenderPractice();
        }
    }

    addTechnique() {
        const name = prompt('Enter technique name:', 'New Technique');
        if (name) {
            const duration = parseInt(prompt('Duration in minutes:', '10')) || 10;
            this.customSequence.push({
                id: Date.now(),
                name: name,
                duration: Math.max(1, Math.min(120, duration)),
                enabled: true
            });
            this.saveCustomSequence();
            this.rerenderPractice();
        }
    }

    startPractice() {
        const enabledTechniques = this.customSequence.filter(t => t.enabled);
        if (enabledTechniques.length === 0) {
            alert('Please enable at least one technique.');
            return;
        }

        this.practiceState = {
            running: true,
            paused: false,
            techniques: enabledTechniques,
            currentTechIdx: 0,
            secondsLeft: enabledTechniques[0].duration * 60,
            totalSeconds: enabledTechniques[0].duration * 60,
            startTime: Date.now(),
            woodblockCounter: 0
        };

        this.initAudio();
        this.playWoodblock('low'); // Start bell

        this.practiceTimer = setInterval(() => this.tickPractice(), 1000);
        this.rerenderPractice();
    }

    resetSequence() {
        if (confirm('Reset to default sequence?')) {
            this.customSequence = [
                { id: 1, name: 'Omkar Kriya', duration: 15, enabled: true },
                { id: 2, name: 'Shiva Shakti Kriya', duration: 20, enabled: true },
                { id: 3, name: 'Mahamudra', duration: 10, enabled: true },
                { id: 4, name: 'Paravastha', duration: 15, enabled: true },
                { id: 5, name: 'Nabho Kriya', duration: 5, enabled: true },
                { id: 6, name: 'Jyoti Mudra', duration: 10, enabled: true },
            ];
            this.saveCustomSequence();
            this.rerenderPractice();
        }
    }

    rerenderPractice() {
        const section = document.querySelector('.my-practice');
        if (section) {
            section.outerHTML = this.renderMyPractice();
            this.initDragAndDrop();
        }
    }

    openFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'flex';
            this.setupFeedbackForm();
        }
    }

    closeFeedbackModal() {
        const modal = document.getElementById('feedback-modal');
        if (modal) {
            modal.style.display = 'none';
        }
    }

    setupFeedbackForm() {
        const form = document.getElementById('feedback-form');
        if (form && !form.dataset.initialized) {
            form.dataset.initialized = 'true';
            form.addEventListener('submit', async (e) => {
                e.preventDefault();
                const status = document.getElementById('feedback-status');
                const submitBtn = form.querySelector('button[type="submit"]');
                const data = {
                    name: document.getElementById('feedback-name').value || 'Anonymous',
                    email: document.getElementById('feedback-email').value || '',
                    type: document.getElementById('feedback-type').value,
                    message: document.getElementById('feedback-message').value
                };

                status.textContent = 'Sending...';
                status.className = '';
                submitBtn.disabled = true;

                try {
                    // Send to Cloudflare Worker (sends SMS via Twilio)
                    const response = await fetch('https://siddhanath-feedback.cff-704.workers.dev', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(data)
                    });

                    const result = await response.json();

                    if (response.ok && result.success) {
                        status.textContent = '✓ Feedback sent! Thank you for your message.';
                        status.className = 'success';
                        form.reset();
                    } else {
                        throw new Error(result.error || 'Failed to send feedback');
                    }
                } catch (error) {
                    console.error('Feedback error:', error);
                    // Fallback: store locally and show email option
                    const feedbacks = JSON.parse(localStorage.getItem('siddhanath-feedbacks') || '[]');
                    feedbacks.push({ ...data, timestamp: new Date().toISOString() });
                    localStorage.setItem('siddhanath-feedbacks', JSON.stringify(feedbacks));

                    const subject = encodeURIComponent(`[Siddhanath App] ${data.type}: Feedback`);
                    const body = encodeURIComponent(`Name: ${data.name}\nEmail: ${data.email}\nType: ${data.type}\n\nMessage:\n${data.message}`);
                    status.innerHTML = `⚠ Saved locally. <a href="mailto:instanthpi@gmail.com?subject=${subject}&body=${body}" target="_blank">Send via email</a>`;
                    status.className = 'warning';
                } finally {
                    submitBtn.disabled = false;
                }
            });
        }
    }

    switchEventsView(view) {
        const listContainer = document.getElementById('events-list-container');
        const calendarContainer = document.getElementById('events-calendar-container');
        const buttons = document.querySelectorAll('.view-btn');

        buttons.forEach(btn => btn.classList.remove('active'));

        if (view === 'list') {
            listContainer.style.display = 'block';
            calendarContainer.style.display = 'none';
            document.querySelector('[data-action="events-list-view"]')?.classList.add('active');
        } else {
            listContainer.style.display = 'none';
            calendarContainer.style.display = 'block';
            document.querySelector('[data-action="events-calendar-view"]')?.classList.add('active');
        }
    }

    navigateCalendar(currentMonth, currentYear, direction) {
        let newMonth = currentMonth + direction;
        let newYear = currentYear;

        if (newMonth < 0) {
            newMonth = 11;
            newYear--;
        } else if (newMonth > 11) {
            newMonth = 0;
            newYear++;
        }

        const newDate = new Date(newYear, newMonth, 1);
        const upcomingEvents = this.eventsData.events.filter(e => new Date(e.startDate) >= new Date());
        const calendarContainer = document.getElementById('events-calendar-container');
        if (calendarContainer) {
            calendarContainer.innerHTML = this.renderCalendar(newDate, upcomingEvents);
        }
    }

    showAllEvents() {
        const upcomingEvents = this.eventsData.events
            .filter(e => new Date(e.startDate) >= new Date())
            .sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        const listContainer = document.getElementById('events-list-container');
        if (listContainer) {
            listContainer.innerHTML = `
                <div class="events-grid">
                    ${upcomingEvents.map(event => this.renderEventCard(event)).join('')}
                </div>
            `;
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
            ${this.renderBillboard()}
            <div class="yoga-marathon-app">
                ${this.renderHeader()}
                ${this.renderAshramTime()}
                ${this.renderSanghaAlerts()}
                ${this.renderUpcomingEvents()}
                ${this.renderMyPractice()}
                ${this.renderSangha()}
                ${this.renderSacredSayings()}
                ${this.renderFeedbackButton()}
                ${this.renderFooter()}
            </div>
            ${this.renderFeedbackModal()}
            ${this.renderBillboardEditorModal()}
            ${this.renderHelpModal()}
            ${this.renderAIChatModal()}
            ${this.renderAIChatButton()}
        `;
        this.initDragAndDrop();
        this.initBillboardEditor();
        this.initAIChatKeyboard();
    }

    renderBillboard() {
        return `
            <div class="billboard-container">
                <div class="billboard-ticker" id="billboard-ticker">
                    <span class="billboard-message">🙏 Loading...</span>
                </div>
                <button class="billboard-edit-btn" data-action="open-billboard-editor" title="Edit Messages">✏️</button>
            </div>
        `;
    }

    renderBillboardEditorModal() {
        return `
            <div id="billboard-editor-modal" class="modal" style="display: none;">
                <div class="modal-content billboard-editor-modal">
                    <button class="modal-close" data-action="close-billboard-editor">×</button>
                    <h2>📝 Edit Billboard Messages</h2>
                    <p>Customize the scrolling messages. Add your own quotes, reminders, or inspiration.</p>
                    <div class="billboard-messages-list" id="billboard-messages-list">
                        ${this.billboardMessages.map((msg, idx) => this.renderBillboardMessageItem(msg, idx)).join('')}
                    </div>
                    <div class="billboard-editor-actions">
                        <button class="practice-btn" data-action="add-billboard-message">+ Add Message</button>
                        <button class="practice-btn" data-action="reset-billboard-messages">↺ Reset to Default</button>
                    </div>
                </div>
            </div>
        `;
    }

    renderBillboardMessageItem(msg, index) {
        const typeOptions = ['quote', 'event', 'tip', 'info'].map(t =>
            `<option value="${t}" ${msg.type === t ? 'selected' : ''}>${t}</option>`
        ).join('');

        return `
            <div class="billboard-message-item" data-index="${index}">
                <select class="message-type-select" data-action="change-message-type" data-index="${index}">
                    ${typeOptions}
                </select>
                <input type="text"
                       class="message-text-input"
                       value="${msg.text.replace(/"/g, '&quot;')}"
                       data-action="change-message-text"
                       data-index="${index}"
                       placeholder="Enter your message...">
                <button class="technique-delete" data-action="delete-billboard-message" data-index="${index}">×</button>
            </div>
        `;
    }

    renderMyPractice() {
        // If practice is running, show timer
        if (this.practiceState) {
            const tech = this.practiceState.techniques[this.practiceState.currentTechIdx];
            const totalDuration = this.practiceState.techniques.reduce((sum, t) => sum + t.duration, 0);
            return `
                <section class="my-practice practice-active">
                    <div class="practice-header">
                        <h2>🧘 Practice In Progress</h2>
                        <div class="practice-total">Total: ${totalDuration} min</div>
                    </div>
                    <div class="practice-timer-container">
                        <div class="practice-current-name" id="practice-current-name">${tech.name}</div>
                        <div class="practice-step-counter" id="practice-step-counter">${this.practiceState.currentTechIdx + 1} / ${this.practiceState.techniques.length}</div>
                        <div class="practice-timer-display" id="practice-timer-display">
                            ${String(Math.floor(this.practiceState.secondsLeft / 60)).padStart(2, '0')}:${String(this.practiceState.secondsLeft % 60).padStart(2, '0')}
                        </div>
                        <div class="practice-timer-bar">
                            <div class="practice-timer-progress" id="practice-timer-progress" style="width: 0%"></div>
                        </div>
                        <div class="practice-timer-steps">
                            ${this.practiceState.techniques.map((t, i) => `
                                <div class="timer-step ${i < this.practiceState.currentTechIdx ? 'done' : ''} ${i === this.practiceState.currentTechIdx ? 'active' : ''}">
                                    ${i < this.practiceState.currentTechIdx ? '✓' : i === this.practiceState.currentTechIdx ? '▶' : '○'} ${t.name}
                                </div>
                            `).join('')}
                        </div>
                        <div class="practice-timer-actions">
                            <button class="practice-btn" data-action="pause-practice-timer">${this.practiceState.paused ? '▶ Resume' : '⏸ Pause'}</button>
                            <button class="practice-btn" data-action="stop-practice-timer" style="border-color: var(--error-red); color: var(--error-red);">⏹ Stop</button>
                        </div>
                    </div>
                </section>
            `;
        }

        // Normal practice editor
        const totalDuration = this.customSequence
            .filter(t => t.enabled)
            .reduce((sum, t) => sum + t.duration, 0);

        return `
            <section class="my-practice">
                <div class="practice-header">
                    <h2>🧘 My Practice Sequence</h2>
                    <div class="practice-total">Total: ${totalDuration} min</div>
                </div>
                <p class="practice-hint">Drag to reorder • Click duration to edit • Toggle to enable/disable</p>
                <div class="technique-list" id="technique-list">
                    ${this.customSequence.map((tech, idx) => this.renderTechniqueItem(tech, idx)).join('')}
                </div>
                <div class="sound-picker" style="display:flex;align-items:center;gap:8px;margin:12px 0;padding:10px 12px;background:white;border:1px solid #e0e0d0;border-radius:8px;">
                    <label style="font-size:0.9rem;font-weight:500;">🔔 Sound:</label>
                    <select data-action="change-sound" style="flex:1;padding:6px 8px;border:1px solid #ccc;border-radius:4px;font-size:0.9rem;">
                        <option value="woodblock" ${this.getSelectedSound() === 'woodblock' ? 'selected' : ''}>Woodblock</option>
                        <option value="bell" ${this.getSelectedSound() === 'bell' ? 'selected' : ''}>Tibetan Bell</option>
                        <option value="bowl" ${this.getSelectedSound() === 'bowl' ? 'selected' : ''}>Singing Bowl</option>
                        <option value="chime" ${this.getSelectedSound() === 'chime' ? 'selected' : ''}>Wind Chime</option>
                    </select>
                    <button class="practice-btn" data-action="preview-sound" style="padding:6px 12px;">▶ Test</button>
                </div>
                <div class="practice-actions">
                    <button class="practice-btn" data-action="add-technique">+ Add Technique</button>
                    <button class="practice-btn primary" data-action="start-practice">▶ Start Practice</button>
                    <button class="practice-btn" data-action="reset-sequence">↺ Reset to Default</button>
                </div>
                ${this.practiceLog.length > 0 ? `
                    <div class="practice-log-summary">
                        <span>📊 ${this.practiceLog.length} sessions logged</span>
                        <span>⏱ ${this.practiceLog.reduce((sum, s) => sum + s.duration, 0)} total minutes</span>
                    </div>
                ` : ''}
            </section>
        `;
    }

    renderTechniqueItem(tech, index) {
        return `
            <div class="technique-item ${tech.enabled ? '' : 'disabled'}"
                 draggable="true"
                 data-index="${index}"
                 data-id="${tech.id}">
                <div class="technique-drag-handle">⋮⋮</div>
                <div class="technique-toggle" data-action="toggle-technique" data-index="${index}">
                    ${tech.enabled ? '✓' : '○'}
                </div>
                <div class="technique-name">${this.escapeHtml(tech.name)}</div>
                <div class="technique-duration"
                     contenteditable="true"
                     data-action="edit-duration"
                     data-index="${index}">${tech.duration}</div>
                <span class="technique-unit">min</span>
                <button class="technique-delete" data-action="delete-technique" data-index="${index}">×</button>
            </div>
        `;
    }

    initDragAndDrop() {
        const list = document.getElementById('technique-list');
        if (!list) return;

        let draggedItem = null;

        list.addEventListener('dragstart', (e) => {
            if (e.target.classList.contains('technique-item')) {
                draggedItem = e.target;
                e.target.classList.add('dragging');
            }
        });

        list.addEventListener('dragend', (e) => {
            if (e.target.classList.contains('technique-item')) {
                e.target.classList.remove('dragging');
                draggedItem = null;
            }
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            const afterElement = this.getDragAfterElement(list, e.clientY);
            if (draggedItem) {
                if (afterElement == null) {
                    list.appendChild(draggedItem);
                } else {
                    list.insertBefore(draggedItem, afterElement);
                }
            }
        });

        list.addEventListener('drop', () => {
            // Reorder the sequence based on DOM order
            const items = list.querySelectorAll('.technique-item');
            const newSequence = [];
            items.forEach(item => {
                const id = parseInt(item.dataset.id);
                const tech = this.customSequence.find(t => t.id === id);
                if (tech) newSequence.push(tech);
            });
            this.customSequence = newSequence;
            this.saveCustomSequence();
            this.updatePracticeTotal();
        });

        // Duration editing
        list.addEventListener('blur', (e) => {
            if (e.target.dataset.action === 'edit-duration') {
                const index = parseInt(e.target.dataset.index);
                const newDuration = parseInt(e.target.textContent) || 5;
                this.customSequence[index].duration = Math.max(1, Math.min(120, newDuration));
                e.target.textContent = this.customSequence[index].duration;
                this.saveCustomSequence();
                this.updatePracticeTotal();
            }
        }, true);

        list.addEventListener('keydown', (e) => {
            if (e.target.dataset.action === 'edit-duration' && e.key === 'Enter') {
                e.preventDefault();
                e.target.blur();
            }
        });
    }

    getDragAfterElement(container, y) {
        const draggableElements = [...container.querySelectorAll('.technique-item:not(.dragging)')];
        return draggableElements.reduce((closest, child) => {
            const box = child.getBoundingClientRect();
            const offset = y - box.top - box.height / 2;
            if (offset < 0 && offset > closest.offset) {
                return { offset: offset, element: child };
            } else {
                return closest;
            }
        }, { offset: Number.NEGATIVE_INFINITY }).element;
    }

    updatePracticeTotal() {
        const totalDuration = this.customSequence
            .filter(t => t.enabled)
            .reduce((sum, t) => sum + t.duration, 0);
        const totalEl = document.querySelector('.practice-total');
        if (totalEl) {
            totalEl.textContent = `Total: ${totalDuration} min`;
        }
    }

    renderFeedbackButton() {
        return `
            <div class="feedback-float">
                <button class="feedback-btn" data-action="open-feedback">
                    💬 Feedback / Report Issue
                </button>
            </div>
        `;
    }

    renderFeedbackModal() {
        return `
            <div id="feedback-modal" class="modal" style="display: none;">
                <div class="modal-content feedback-modal">
                    <button class="modal-close" data-action="close-feedback">×</button>
                    <h2>📬 Send Feedback</h2>
                    <p>Report a bug, suggest a feature, or share your experience.</p>
                    <form id="feedback-form">
                        <div class="form-group">
                            <label>Your Name (optional)</label>
                            <input type="text" id="feedback-name" placeholder="Anonymous">
                        </div>
                        <div class="form-group">
                            <label>Email (optional, for follow-up)</label>
                            <input type="email" id="feedback-email" placeholder="your@email.com">
                        </div>
                        <div class="form-group">
                            <label>Type</label>
                            <select id="feedback-type">
                                <option value="bug">🐛 Bug Report</option>
                                <option value="feature">💡 Feature Request</option>
                                <option value="feedback">💬 General Feedback</option>
                                <option value="question">❓ Question</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label>Message *</label>
                            <textarea id="feedback-message" rows="5" placeholder="Describe your issue or feedback..." required></textarea>
                        </div>
                        <button type="submit" class="submit-btn">Send Feedback</button>
                    </form>
                    <div id="feedback-status"></div>
                </div>
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
                            <h1>Siddhanath Kriya Yoga</h1>
                            <p>Journey Through Sacred Teachings</p>
                        </div>
                    </div>
                    <div class="header-actions">
                        <button data-action="open-help" class="action-btn help-btn" title="How to use this app">
                            ? Help
                        </button>
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

    renderUpcomingEvents() {
        if (!this.eventsData?.events || this.eventsData.events.length === 0) {
            return '';
        }

        // Filter to only show upcoming events
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const upcomingEvents = this.eventsData.events.filter(event => {
            const eventDate = new Date(event.startDate);
            return eventDate >= today;
        }).sort((a, b) => new Date(a.startDate) - new Date(b.startDate));

        if (upcomingEvents.length === 0) {
            return '';
        }

        // Get current month for calendar
        const currentMonth = new Date();

        return `
            <section class="upcoming-events">
                <div class="events-header">
                    <h2>🙏 Upcoming Events & Calendar</h2>
                    <div class="events-view-toggle">
                        <button class="view-btn active" data-action="events-list-view">📋 List</button>
                        <button class="view-btn" data-action="events-calendar-view">📅 Calendar</button>
                    </div>
                    <a href="https://siddhanath.org/events/" target="_blank" class="view-all-link">
                        View All on siddhanath.org →
                    </a>
                </div>
                <div id="events-list-container" class="events-view-container">
                    <div class="events-grid">
                        ${upcomingEvents.slice(0, 6).map(event => this.renderEventCard(event)).join('')}
                    </div>
                    ${upcomingEvents.length > 6 ? `<button class="load-more-btn" data-action="show-all-events">Show All ${upcomingEvents.length} Events</button>` : ''}
                </div>
                <div id="events-calendar-container" class="events-view-container" style="display: none;">
                    ${this.renderCalendar(currentMonth, upcomingEvents)}
                </div>
            </section>
        `;
    }

    renderCalendar(date, events) {
        const year = date.getFullYear();
        const month = date.getMonth();
        const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
                           'July', 'August', 'September', 'October', 'November', 'December'];

        // Get first day of month and number of days
        const firstDay = new Date(year, month, 1).getDay();
        const daysInMonth = new Date(year, month + 1, 0).getDate();

        // Build calendar grid
        let calendarDays = '';
        const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

        // Day headers
        calendarDays += dayNames.map(d => `<div class="calendar-day-header">${d}</div>`).join('');

        // Empty cells before first day
        for (let i = 0; i < firstDay; i++) {
            calendarDays += '<div class="calendar-day empty"></div>';
        }

        // Days of month
        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.startDate === dateStr || (e.startDate <= dateStr && e.endDate >= dateStr));
            const isToday = new Date().toISOString().split('T')[0] === dateStr;
            const hasFullMoon = dayEvents.some(e => e.type === 'fullmoon');
            const hasRetreat = dayEvents.some(e => e.type === 'retreat' || e.type === 'pilgrimage');

            let dayClass = 'calendar-day';
            if (isToday) dayClass += ' today';
            if (dayEvents.length > 0) dayClass += ' has-events';
            if (hasFullMoon) dayClass += ' full-moon';
            if (hasRetreat) dayClass += ' has-retreat';

            const eventDots = dayEvents.map(e => {
                const icons = { fullmoon: '🌕', retreat: '🧘', pilgrimage: '🏔️', satsang: '🕉️' };
                return icons[e.type] || '•';
            }).join('');

            const tooltip = dayEvents.map(e => e.title).join('\n').replace(/"/g, '&quot;').replace(/</g, '&lt;');

            calendarDays += `
                <div class="${dayClass}" title="${tooltip}">
                    <span class="day-number">${day}</span>
                    ${eventDots ? `<span class="event-dots">${eventDots}</span>` : ''}
                </div>
            `;
        }

        return `
            <div class="calendar-container">
                <div class="calendar-nav">
                    <button class="calendar-nav-btn" data-action="prev-month" data-month="${month}" data-year="${year}">◀</button>
                    <h3 class="calendar-title">${monthNames[month]} ${year}</h3>
                    <button class="calendar-nav-btn" data-action="next-month" data-month="${month}" data-year="${year}">▶</button>
                </div>
                <div class="calendar-grid">
                    ${calendarDays}
                </div>
                <div class="calendar-legend">
                    <span class="legend-item"><span class="legend-dot">🌕</span> Full Moon - Earth Peace Meditation (7-9 PM)</span>
                    <span class="legend-item"><span class="legend-dot">🏔️</span> Pilgrimage</span>
                    <span class="legend-item"><span class="legend-dot">🧘</span> Retreat</span>
                </div>
            </div>
        `;
    }

    renderEventCard(event) {
        const startDate = new Date(event.startDate);
        const endDate = new Date(event.endDate);
        const options = { month: 'short', day: 'numeric' };
        const dateRange = startDate.toLocaleDateString('en-US', options) +
            (event.endDate ? ' - ' + endDate.toLocaleDateString('en-US', options) : '');

        const typeIcons = {
            pilgrimage: '🏔️',
            retreat: '🧘',
            satsang: '🕉️',
            empowerment: '⚡',
            community: '👥',
            fullmoon: '🌕',
            meditation: '🧘‍♂️'
        };
        const icon = typeIcons[event.type] || '📅';

        const safeTitle = this.escapeHtml(event.title || '');
        const safeLocation = this.escapeHtml(event.location || '');
        const safeDescription = this.escapeHtml(event.description || '');
        const safeLink = /^https?:\/\//.test(event.link || '') ? this.escapeHtml(event.link) : '#';

        return `
            <div class="event-card ${event.featured ? 'featured' : ''}">
                <div class="event-icon">${icon}</div>
                <div class="event-content">
                    <h3 class="event-title">${safeTitle}</h3>
                    <div class="event-meta">
                        <span class="event-date">📅 ${dateRange}, ${startDate.getFullYear()}</span>
                        <span class="event-location">📍 ${safeLocation}</span>
                    </div>
                    <p class="event-description">${safeDescription}</p>
                    <a href="${safeLink}" target="_blank" rel="noopener noreferrer" class="event-link">
                        Learn More & Register →
                    </a>
                </div>
            </div>
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
                <h2>Hafiz Gurunath</h2>
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
                <div class="session-title">${this.escapeHtml(session.title || '')}</div>
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

        const safeQuote = this.escapeHtml(saying.quote);
        const safeTheme = this.escapeHtml(saying.theme || 'Sacred Teaching');
        const safeVideoTitle = this.escapeHtml(saying.videoTitle || "Gurunath's Teachings");

        return `
            <div class="saying-card" data-saying-id="${safeQuote}">
                <div class="saying-content">
                    <blockquote class="saying-quote">"${safeQuote}"</blockquote>
                    <div class="saying-meta">
                        <div class="saying-source">
                            <strong>${safeTheme}</strong>
                            <br><small>${safeVideoTitle}</small>
                        </div>
                        <button data-action="toggle-favorites" data-item-id="${safeQuote}"
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
        
        const shareText = `I'm on my Siddhanath Kriya Yoga journey! 🧘‍♂️\\n\\n📊 Progress: ${progressPercentage}% (${completedSessions}/${totalSessions} sessions)\\n🔥 Current streak: ${this.userProgress.currentStreak} days\\n\\nJoin me at: ${window.location.href}`;
        
        if (navigator.share) {
            navigator.share({
                title: 'My Siddhanath Kriya Yoga Progress',
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
        const safeVideoId = /^[\w-]+$/.test(session.videoId || '') ? session.videoId : '';
        const modal = document.createElement('div');
        modal.className = 'modal-overlay';

        const modalContent = document.createElement('div');
        modalContent.className = 'modal-content session-modal';

        const header = document.createElement('div');
        header.className = 'modal-header';
        const h3 = document.createElement('h3');
        h3.textContent = session.title || '';
        const closeBtn = document.createElement('button');
        closeBtn.className = 'close-btn';
        closeBtn.dataset.action = 'close-modal';
        closeBtn.textContent = '×';
        header.appendChild(h3);
        header.appendChild(closeBtn);

        const body = document.createElement('div');
        body.className = 'modal-body';
        const videoDiv = document.createElement('div');
        videoDiv.className = 'session-video';
        if (safeVideoId) {
            const iframe = document.createElement('iframe');
            iframe.src = `https://www.youtube.com/embed/${safeVideoId}?enablejsapi=1&rel=0&modestbranding=1&playsinline=1`;
            iframe.frameBorder = '0';
            iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture';
            iframe.allowFullscreen = true;
            iframe.referrerPolicy = 'no-referrer-when-downgrade';
            videoDiv.appendChild(iframe);
        }
        const detailsDiv = document.createElement('div');
        detailsDiv.className = 'session-details';
        const dur = document.createElement('p');
        dur.innerHTML = `<strong>Duration:</strong> ${parseInt(session.analysis?.estimatedMinutes) || 10} minutes`;
        const diff = document.createElement('p');
        const safeDiff = ['beginner', 'intermediate', 'advanced'].includes(session.analysis?.difficulty) ? session.analysis.difficulty : 'beginner';
        diff.innerHTML = `<strong>Difficulty:</strong> ${safeDiff}`;
        const transcriptDiv = document.createElement('div');
        transcriptDiv.className = 'session-transcript';
        const th4 = document.createElement('h4');
        th4.textContent = 'Session Guidance:';
        const tp = document.createElement('p');
        tp.textContent = this.extractSessionDescription(session);
        transcriptDiv.appendChild(th4);
        transcriptDiv.appendChild(tp);
        detailsDiv.appendChild(dur);
        detailsDiv.appendChild(diff);
        detailsDiv.appendChild(transcriptDiv);
        body.appendChild(videoDiv);
        body.appendChild(detailsDiv);

        const footer = document.createElement('div');
        footer.className = 'modal-footer';
        const completeBtn = document.createElement('button');
        completeBtn.dataset.action = 'complete-session';
        completeBtn.dataset.sessionId = session.videoId || '';
        completeBtn.className = 'primary-btn';
        completeBtn.textContent = 'Mark as Complete';
        const closeBtnFooter = document.createElement('button');
        closeBtnFooter.className = 'secondary-btn';
        closeBtnFooter.dataset.action = 'close-modal';
        closeBtnFooter.textContent = 'Close';
        footer.appendChild(completeBtn);
        footer.appendChild(closeBtnFooter);

        modalContent.appendChild(header);
        modalContent.appendChild(body);
        modalContent.appendChild(footer);
        modal.appendChild(modalContent);
        
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
        const content = document.createElement('div');
        content.className = 'promotion-content';
        const icon = document.createElement('div');
        icon.className = 'promotion-icon';
        icon.textContent = '🥋';
        const title = document.createElement('h3');
        title.textContent = 'Hafiz Advancement!';
        const msg = document.createElement('p');
        msg.textContent = `Congratulations! You've reached ${beltName}!`;
        const btn = document.createElement('button');
        btn.className = 'primary-btn';
        btn.textContent = 'Continue Journey';
        btn.addEventListener('click', () => promotion.remove());
        content.appendChild(icon);
        content.appendChild(title);
        content.appendChild(msg);
        content.appendChild(btn);
        promotion.appendChild(content);
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

    // ============================================
    // SANGHA COMMUNITY METHODS
    // ============================================

    loadSanghaUser() {
        try {
            const saved = localStorage.getItem('siddhanath-sangha-user');
            if (saved) return JSON.parse(saved);
        } catch (e) {
            console.error('[SANGHA] Error loading user:', e);
        }
        return null;
    }

    saveSanghaUser() {
        try {
            localStorage.setItem('siddhanath-sangha-user', JSON.stringify(this.sanghaUser));
        } catch (e) {
            console.error('[SANGHA] Error saving user:', e);
        }
    }

    async loadSanghaData() {
        try {
            const [feedRes, alertsRes] = await Promise.all([
                fetch(`${this.apiBaseUrl}/api/sangha/feed?limit=20`),
                fetch(`${this.apiBaseUrl}/api/sangha/alerts`)
            ]);
            if (feedRes.ok) {
                const feedData = await feedRes.json();
                this.sanghaFeed = feedData.posts || [];
            }
            if (alertsRes.ok) {
                const alertsData = await alertsRes.json();
                this.sanghaAlerts = alertsData.alerts || [];
            }
            this.rerenderSangha();
        } catch (err) {
            console.error('[SANGHA] Load error:', err);
        }
    }

    async initSupabaseRealtime() {
        try {
            // Load Supabase JS client (bundled locally for MV3 compliance)
            if (!window.supabase) {
                const script = document.createElement('script');
                script.src = 'supabase.min.js';
                document.head.appendChild(script);
                await new Promise((resolve, reject) => {
                    script.onload = resolve;
                    script.onerror = reject;
                });
            }

            this.supabaseClient = window.supabase.createClient(this.supabaseUrl, this.supabaseAnonKey);

            // Subscribe to new posts
            this.supabaseClient
                .channel('ashram-posts')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ashram_posts' }, (payload) => {
                    console.log('[SANGHA] New post:', payload.new);
                    this.loadSanghaData(); // Reload full feed for member info
                })
                .subscribe();

            // Subscribe to new alerts
            this.supabaseClient
                .channel('ashram-alerts')
                .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'ashram_alerts' }, (payload) => {
                    console.log('[SANGHA] New alert:', payload.new);
                    this.sanghaAlerts.unshift(payload.new);
                    this.rerenderSanghaAlerts();
                })
                .subscribe();

            console.log('[SANGHA] Realtime subscribed');
        } catch (err) {
            console.error('[SANGHA] Realtime init error:', err);
        }
    }

    startAshramClock() {
        const updateClock = () => {
            const now = new Date();
            const istEl = document.getElementById('ashram-ist-time');
            const localEl = document.getElementById('ashram-local-time');
            if (istEl) {
                const ist = new Date(now.getTime() + (5.5 * 60 * 60 * 1000) + (now.getTimezoneOffset() * 60 * 1000));
                istEl.textContent = ist.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            }
            if (localEl) {
                localEl.textContent = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true });
            }
        };
        updateClock();
        setInterval(updateClock, 1000);
    }

    renderAshramTime() {
        return `
            <div class="ashram-time-bar">
                <div class="time-item">
                    <span class="time-label">🇮🇳 Ashram (IST)</span>
                    <span class="time-value" id="ashram-ist-time">--:--:--</span>
                </div>
                <div class="time-divider">|</div>
                <div class="time-item">
                    <span class="time-label">📍 Your Time</span>
                    <span class="time-value" id="ashram-local-time">--:--:--</span>
                </div>
            </div>
        `;
    }

    renderSanghaAlerts() {
        const recentAlerts = this.sanghaAlerts.filter(a => {
            const age = Date.now() - new Date(a.created_at).getTime();
            return age < 30 * 60 * 1000; // Last 30 minutes
        });

        if (recentAlerts.length === 0) return '';

        return recentAlerts.map(alert => {
            const typeEmoji = alert.type === 'food_prayer' ? '🔔' : alert.type === 'satsang' ? '🕉️' : '📣';
            const isFoodPrayer = alert.type === 'food_prayer';
            return `
                <div class="sangha-alert ${isFoodPrayer ? 'food-prayer-alert' : ''}">
                    <div class="alert-icon">${typeEmoji}</div>
                    <div class="alert-content">
                        <div class="alert-title">${this.escapeHtml(alert.title || '')}</div>
                        <div class="alert-message">${this.escapeHtml(alert.message || '')}</div>
                        ${isFoodPrayer ? `
                            <div class="prayer-text-preview">
                                <img src="https://gbxksgxezbljwlnlpkpz.supabase.co/storage/v1/object/public/ashram-photos/food-prayer/vadani-kaval-gheta.png"
                                     class="prayer-image" alt="Vadani Kaval Gheta">
                                <a href="https://www.youtube.com/watch?v=ot79QTRqZyk" target="_blank" class="prayer-video-link">
                                    🎵 Listen to Prayer
                                </a>
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }).join('');
    }

    renderSangha() {
        const isRegistered = !!this.sanghaUser;

        return `
            <section class="sangha-section">
                <div class="sangha-header">
                    <h2>🙏 Ashram Sangha</h2>
                    ${!isRegistered ? `
                        <button class="action-btn" data-action="sangha-register">Join the Sangha</button>
                    ` : `
                        <span class="sangha-user-badge">
                            ${this.sanghaUser.mode === 'physical' ? '🏕️' : '🌐'} ${this.escapeHtml(this.sanghaUser.name || '')}
                        </span>
                    `}
                </div>
                <div id="sangha-alerts-container">
                    ${this.renderSanghaAlerts()}
                </div>
                <div class="sangha-feed" id="sangha-feed">
                    ${this.sanghaFeed.length === 0
                        ? '<div class="sangha-empty">No posts yet. Join the sangha via Telegram @siddhanath_ashram_bot</div>'
                        : this.sanghaFeed.map(post => this.renderSanghaPost(post)).join('')
                    }
                </div>
            </section>
        `;
    }

    renderSanghaPost(post) {
        const member = post.member || {};
        const modeIcon = member.mode === 'physical' ? '🏕️' : '🌐';
        const timeAgo = this.getTimeAgo(post.created_at);
        const typeEmoji = { photo: '📸', meditation: '🧘', training: '💪', satsang: '🕉️', food_prayer: '🔔', broadcast: '📣' }[post.type] || '📝';

        return `
            <div class="sangha-post">
                <div class="post-header">
                    <span class="post-author">${modeIcon} ${this.escapeHtml(member.name || 'Sangha Member')}</span>
                    <span class="post-time">${timeAgo}</span>
                </div>
                <div class="post-type-badge">${typeEmoji} ${this.escapeHtml(String(post.type || '').replace('_', ' '))}</div>
                ${post.content ? `<div class="post-content">${this.escapeHtml(post.content)}</div>` : ''}
                ${post.photo_url && /^https?:\/\//.test(post.photo_url) ? `<img src="${this.escapeHtml(post.photo_url)}" class="post-photo" alt="Sangha photo" loading="lazy">` : ''}
                ${post.video_url && /^https?:\/\//.test(post.video_url) ? `
                    <a href="${this.escapeHtml(post.video_url)}" target="_blank" rel="noopener" class="post-video-link">🎬 Watch Video</a>
                ` : ''}
                <div class="post-actions">
                    <button class="react-btn" data-action="sangha-react" data-post-id="${post.id}" data-type="heart">
                        ❤️ ${post.reaction_count || 0}
                    </button>
                    <button class="react-btn" data-action="sangha-react" data-post-id="${post.id}" data-type="prayer">
                        🙏
                    </button>
                    <button class="react-btn" data-action="sangha-comment" data-post-id="${post.id}">
                        💬 ${post.comment_count || 0}
                    </button>
                    <button class="react-btn" data-action="sangha-share-whatsapp" data-content="${encodeURIComponent(post.content || 'Hari Om from the Ashram!')}">
                        📲 Share
                    </button>
                </div>
            </div>
        `;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    getTimeAgo(dateStr) {
        const diff = Date.now() - new Date(dateStr).getTime();
        const mins = Math.floor(diff / 60000);
        if (mins < 1) return 'just now';
        if (mins < 60) return `${mins}m ago`;
        const hours = Math.floor(mins / 60);
        if (hours < 24) return `${hours}h ago`;
        const days = Math.floor(hours / 24);
        return `${days}d ago`;
    }

    rerenderSangha() {
        const feed = document.getElementById('sangha-feed');
        if (feed) {
            feed.innerHTML = this.sanghaFeed.length === 0
                ? '<div class="sangha-empty">No posts yet. Join the sangha via Telegram @siddhanath_ashram_bot</div>'
                : this.sanghaFeed.map(post => this.renderSanghaPost(post)).join('');
        }
    }

    rerenderSanghaAlerts() {
        const container = document.getElementById('sangha-alerts-container');
        if (container) {
            container.innerHTML = this.renderSanghaAlerts();
        }
    }

    async registerSangha() {
        const name = prompt('Enter your name (spiritual or given):');
        if (!name) return;

        const mode = confirm('Are you physically at the ashram?\n\nOK = Physical\nCancel = Remote') ? 'physical' : 'remote';

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/sangha/register`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, mode })
            });

            if (!response.ok) throw new Error('Registration failed');

            const data = await response.json();
            this.sanghaUser = { id: data.member.id, name: data.member.name, mode: data.member.mode };
            this.saveSanghaUser();
            this.rerenderSangha();
        } catch (err) {
            console.error('[SANGHA] Register error:', err);
            alert('Registration failed. Please try again.');
        }
    }

    async reactToPost(postId, type) {
        if (!this.sanghaUser) {
            alert('Please join the sangha first.');
            return;
        }
        try {
            await fetch(`${this.apiBaseUrl}/api/sangha/react`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: this.sanghaUser.id, post_id: postId, type })
            });
            this.loadSanghaData();
        } catch (err) {
            console.error('[SANGHA] React error:', err);
        }
    }

    async commentOnPost(postId) {
        if (!this.sanghaUser) {
            alert('Please join the sangha first.');
            return;
        }
        const content = prompt('Your comment:');
        if (!content) return;

        try {
            await fetch(`${this.apiBaseUrl}/api/sangha/comment`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ member_id: this.sanghaUser.id, post_id: postId, content })
            });
            this.loadSanghaData();
        } catch (err) {
            console.error('[SANGHA] Comment error:', err);
        }
    }

    shareToWhatsApp(content) {
        window.open(`https://wa.me/?text=${content}`, '_blank');
    }

    // ============================================
    // PRACTICE TIMER METHODS
    // ============================================

    loadPracticeLog() {
        try {
            return JSON.parse(localStorage.getItem('siddhanath-practice-log') || '[]');
        } catch (e) { return []; }
    }

    savePracticeLog() {
        localStorage.setItem('siddhanath-practice-log', JSON.stringify(this.practiceLog));
    }

    initAudio() {
        if (!this.audioCtx) {
            this.audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        }
    }

    getSelectedSound() {
        return localStorage.getItem('kriya-sound') || 'woodblock';
    }

    playWoodblock(pitch = 'high') {
        this.playSound(pitch === 'high' ? 'tick' : 'transition');
    }

    playSound(type = 'transition') {
        try {
            this.initAudio();
            const sound = this.getSelectedSound();
            const t = this.audioCtx.currentTime;

            if (sound === 'woodblock') {
                const osc = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc.connect(gain); gain.connect(this.audioCtx.destination);
                osc.frequency.value = type === 'tick' ? 800 : 400;
                osc.type = 'triangle';
                gain.gain.setValueAtTime(0.4, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + (type === 'tick' ? 0.15 : 0.5));
                osc.start(t); osc.stop(t + 0.5);
            } else if (sound === 'bell') {
                [523, 659, 784].forEach((freq, i) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.connect(gain); gain.connect(this.audioCtx.destination);
                    osc.frequency.value = type === 'tick' ? freq * 1.5 : freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.15, t);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + (type === 'tick' ? 0.8 : 2.5));
                    osc.start(t + i * 0.02); osc.stop(t + 3);
                });
            } else if (sound === 'bowl') {
                const osc1 = this.audioCtx.createOscillator();
                const osc2 = this.audioCtx.createOscillator();
                const gain = this.audioCtx.createGain();
                osc1.connect(gain); osc2.connect(gain); gain.connect(this.audioCtx.destination);
                osc1.frequency.value = type === 'tick' ? 320 : 220;
                osc2.frequency.value = (type === 'tick' ? 320 : 220) * 1.502;
                osc1.type = 'sine'; osc2.type = 'sine';
                gain.gain.setValueAtTime(0.25, t);
                gain.gain.exponentialRampToValueAtTime(0.001, t + (type === 'tick' ? 1 : 3));
                osc1.start(t); osc2.start(t);
                osc1.stop(t + 3.5); osc2.stop(t + 3.5);
            } else if (sound === 'chime') {
                [1047, 1319, 1568, 2093].forEach((freq, i) => {
                    const osc = this.audioCtx.createOscillator();
                    const gain = this.audioCtx.createGain();
                    osc.connect(gain); gain.connect(this.audioCtx.destination);
                    osc.frequency.value = freq;
                    osc.type = 'sine';
                    gain.gain.setValueAtTime(0.12, t + i * 0.08);
                    gain.gain.exponentialRampToValueAtTime(0.001, t + i * 0.08 + (type === 'tick' ? 0.5 : 1.5));
                    osc.start(t + i * 0.08); osc.stop(t + 2);
                });
            }
        } catch (e) { console.error('Audio error:', e); }
    }

    tickPractice() {
        if (!this.practiceState || this.practiceState.paused) return;

        this.practiceState.secondsLeft--;
        this.practiceState.woodblockCounter++;

        // Woodblock every 15 seconds
        if (this.practiceState.woodblockCounter % 15 === 0) {
            this.playWoodblock('high');
        }

        // Update display
        this.updateTimerDisplay();

        if (this.practiceState.secondsLeft <= 0) {
            // Move to next technique
            this.practiceState.currentTechIdx++;

            if (this.practiceState.currentTechIdx >= this.practiceState.techniques.length) {
                // Practice complete!
                this.completePractice();
                return;
            }

            // Start next technique
            const next = this.practiceState.techniques[this.practiceState.currentTechIdx];
            this.practiceState.secondsLeft = next.duration * 60;
            this.practiceState.totalSeconds = next.duration * 60;
            this.practiceState.woodblockCounter = 0;
            this.playWoodblock('low'); // Transition bell
            this.rerenderPractice();
        }
    }

    updateTimerDisplay() {
        const el = document.getElementById('practice-timer-display');
        if (!el || !this.practiceState) return;

        const mins = Math.floor(this.practiceState.secondsLeft / 60);
        const secs = this.practiceState.secondsLeft % 60;
        el.textContent = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;

        // Update progress bar
        const progressEl = document.getElementById('practice-timer-progress');
        if (progressEl) {
            const pct = ((this.practiceState.totalSeconds - this.practiceState.secondsLeft) / this.practiceState.totalSeconds) * 100;
            progressEl.style.width = `${pct}%`;
        }

        // Update technique name
        const nameEl = document.getElementById('practice-current-name');
        if (nameEl) {
            nameEl.textContent = this.practiceState.techniques[this.practiceState.currentTechIdx].name;
        }

        // Update step counter
        const stepEl = document.getElementById('practice-step-counter');
        if (stepEl) {
            stepEl.textContent = `${this.practiceState.currentTechIdx + 1} / ${this.practiceState.techniques.length}`;
        }
    }

    pausePracticeTimer() {
        if (this.practiceState) {
            this.practiceState.paused = !this.practiceState.paused;
            const btn = document.querySelector('[data-action="pause-practice-timer"]');
            if (btn) btn.textContent = this.practiceState.paused ? '▶ Resume' : '⏸ Pause';
        }
    }

    stopPracticeTimer() {
        if (this.practiceTimer) {
            clearInterval(this.practiceTimer);
            this.practiceTimer = null;
        }
        this.practiceState = null;
        this.rerenderPractice();
    }

    completePractice() {
        clearInterval(this.practiceTimer);
        this.practiceTimer = null;

        const duration = Math.round((Date.now() - this.practiceState.startTime) / 60000);
        const techniques = this.practiceState.techniques.map(t => t.name);

        this.practiceLog.push({
            date: new Date().toISOString(),
            duration,
            techniques,
            completed: true
        });
        this.savePracticeLog();

        this.practiceState = null;
        this.playWoodblock('low');
        setTimeout(() => this.playWoodblock('high'), 300);
        setTimeout(() => this.playWoodblock('low'), 600);

        this.rerenderPractice();
        alert(`🧘 Practice Complete!\n\nDuration: ${duration} minutes\nTechniques: ${techniques.join(', ')}\n\nHari Om 🙏`);
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

    // ═══════════════════════════════════════════════
    // HELP MODAL
    // ═══════════════════════════════════════════════

    renderHelpModal() {
        return `
            <div id="help-modal" class="modal" style="display: none;">
                <div class="modal-content help-modal-content">
                    <button class="modal-close" data-action="close-help">&times;</button>
                    <h2 class="help-title">Welcome to Siddhanath Kriya Yoga</h2>
                    <p class="help-subtitle">Your personal spiritual practice companion</p>

                    <div class="help-sections">
                        <div class="help-section">
                            <h3>What is this app?</h3>
                            <p>This Chrome extension is a companion for practitioners of Kriya Yoga as taught by Yogiraj Siddhanath. It guides you through 280 video sessions organized in 8 groups, helps you build a daily practice, and connects you with the global sangha (community).</p>
                        </div>

                        <div class="help-section">
                            <h3>Hafiz Gurunath System</h3>
                            <p>You progress through 8 groups of guided yoga sessions by watching and completing them. Complete all sessions in a group to unlock the next one. Scroll down to see your progress and click any session to start.</p>
                        </div>

                        <div class="help-section">
                            <h3>Practice Timer</h3>
                            <p>The "My Practice Sequence" section lets you build a custom Kriya Yoga routine. Add techniques like Omkar Kriya, Shiva Shakti Kriya, and more. Set durations, drag to reorder, then click "Start Practice" for a guided countdown with gentle woodblock sound alerts every 15 seconds.</p>
                        </div>

                        <div class="help-section">
                            <h3>Sacred Sayings</h3>
                            <p>Browse 4,941 spiritual quotes from Yogiraj Siddhanath, extracted from his video teachings. Search by keyword or filter by category. Click the heart to save favorites.</p>
                        </div>

                        <div class="help-section">
                            <h3>Events Calendar</h3>
                            <p>Stay updated with retreats, pilgrimages, full moon meditations, and empowerments. Events are pulled directly from siddhanath.org. Toggle between list and calendar views.</p>
                        </div>

                        <div class="help-section">
                            <h3>Ashram Sangha (Community)</h3>
                            <p>Join the global community! Enter your name and choose physical or remote mode. See posts from the ashram Telegram group, react with hearts or prayers, comment, and share to WhatsApp.</p>
                        </div>

                        <div class="help-section">
                            <h3>Billboard</h3>
                            <p>The scrolling text at the top shows quotes, tips, and event reminders. Click the pencil icon to customize your own messages.</p>
                        </div>

                        <div class="help-section">
                            <h3>Need more help?</h3>
                            <p>Click the "Ask Guru AI" button at the bottom-right corner to chat with our AI assistant. It knows the app inside and out and can answer any question. You can also report issues there.</p>
                        </div>
                    </div>

                    <div class="help-footer">
                        <button data-action="close-help" class="primary-btn">Got it, let's practice!</button>
                    </div>
                </div>
            </div>
        `;
    }

    openHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) modal.style.display = 'flex';
    }

    closeHelpModal() {
        const modal = document.getElementById('help-modal');
        if (modal) modal.style.display = 'none';
    }

    // ═══════════════════════════════════════════════
    // AI CHAT + ERROR REPORTER
    // ═══════════════════════════════════════════════

    renderAIChatButton() {
        return `
            <button class="ai-chat-fab" data-action="open-ai-chat" title="Ask Guru AI for help">
                <span class="fab-icon">🙏</span>
                <span class="fab-label">Ask Guru AI</span>
            </button>
        `;
    }

    renderAIChatModal() {
        return `
            <div id="ai-chat-modal" class="modal" style="display: none;">
                <div class="modal-content ai-chat-modal-content">
                    <div class="ai-chat-header">
                        <div class="ai-chat-title">
                            <span class="ai-avatar">🙏</span>
                            <div>
                                <h3>Guru AI</h3>
                                <span class="ai-status">Your yoga app assistant</span>
                            </div>
                        </div>
                        <div class="ai-chat-header-actions">
                            <button class="ai-mode-btn ${this.aiChatMode === 'report' ? 'active' : ''}" data-action="switch-to-report" title="Report an issue">
                                Report Issue
                            </button>
                            <button class="modal-close" data-action="close-ai-chat">&times;</button>
                        </div>
                    </div>

                    <div id="ai-chat-body" class="ai-chat-body">
                        <div id="ai-chat-messages" class="ai-chat-messages">
                            <div class="ai-message assistant">
                                <div class="ai-message-bubble">Hari Om! I'm Guru AI, your guide for this app. Ask me anything about the practice sessions, timer, events, or the sangha. I'm here to help!</div>
                            </div>
                        </div>
                    </div>

                    <div id="ai-report-form" class="ai-report-form" style="display: none;">
                        <div class="report-intro">
                            <h4>Report an Issue</h4>
                            <p>Describe what's not working. Our AI will summarize and send it to the developer.</p>
                        </div>
                        <div class="form-group">
                            <label>Your Name (optional)</label>
                            <input type="text" id="report-name" placeholder="Anonymous" />
                        </div>
                        <div class="form-group">
                            <label>Your Email (optional, for follow-up)</label>
                            <input type="email" id="report-email" placeholder="you@example.com" />
                        </div>
                        <div class="form-group">
                            <label>What happened?</label>
                            <textarea id="report-description" rows="4" placeholder="Describe the issue... e.g. 'The practice timer doesn't make a sound' or 'I can't see my progress'"></textarea>
                        </div>
                        <div class="report-actions">
                            <button data-action="switch-to-chat" class="practice-btn">Back to Chat</button>
                            <button data-action="submit-report" class="practice-btn primary">Send Report</button>
                        </div>
                        <div id="report-status" class="report-status"></div>
                    </div>

                    <div id="ai-chat-input-area" class="ai-chat-input-area">
                        <input type="text" id="ai-chat-input" placeholder="Type a question..." autocomplete="off" />
                        <button data-action="send-ai-message" class="ai-send-btn">Send</button>
                    </div>
                </div>
            </div>
        `;
    }

    initAIChatKeyboard() {
        const input = document.getElementById('ai-chat-input');
        if (input && !input.dataset.listenerAdded) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    this.sendAIMessage();
                }
            });
            input.dataset.listenerAdded = 'true';
        }
    }

    openAIChat() {
        const modal = document.getElementById('ai-chat-modal');
        if (modal) {
            modal.style.display = 'flex';
            setTimeout(() => {
                const input = document.getElementById('ai-chat-input');
                if (input) input.focus();
            }, 100);
        }
    }

    closeAIChat() {
        const modal = document.getElementById('ai-chat-modal');
        if (modal) modal.style.display = 'none';
    }

    switchToReportMode() {
        this.aiChatMode = 'report';
        const chatBody = document.getElementById('ai-chat-body');
        const reportForm = document.getElementById('ai-report-form');
        const inputArea = document.getElementById('ai-chat-input-area');
        const modeBtn = document.querySelector('.ai-mode-btn');
        if (chatBody) chatBody.style.display = 'none';
        if (reportForm) reportForm.style.display = 'block';
        if (inputArea) inputArea.style.display = 'none';
        if (modeBtn) { modeBtn.classList.add('active'); }
    }

    switchToChatMode() {
        this.aiChatMode = 'chat';
        const chatBody = document.getElementById('ai-chat-body');
        const reportForm = document.getElementById('ai-report-form');
        const inputArea = document.getElementById('ai-chat-input-area');
        const modeBtn = document.querySelector('.ai-mode-btn');
        if (chatBody) chatBody.style.display = 'block';
        if (reportForm) reportForm.style.display = 'none';
        if (inputArea) inputArea.style.display = 'flex';
        if (modeBtn) { modeBtn.classList.remove('active'); modeBtn.textContent = 'Report Issue'; }
    }

    async sendAIMessage() {
        const input = document.getElementById('ai-chat-input');
        if (!input) return;
        const message = input.value.trim();
        if (!message) return;

        input.value = '';
        input.disabled = true;
        const sendBtn = document.querySelector('[data-action="send-ai-message"]');
        if (sendBtn) sendBtn.disabled = true;

        // Add user message to chat
        const messagesEl = document.getElementById('ai-chat-messages');
        messagesEl.innerHTML += `<div class="ai-message user"><div class="ai-message-bubble">${this.escapeHtml(message)}</div></div>`;

        // Add typing indicator
        messagesEl.innerHTML += `<div class="ai-message assistant typing" id="ai-typing"><div class="ai-message-bubble">Thinking...</div></div>`;
        setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 0);

        // Add to history
        this.aiChatHistory.push({ role: 'user', content: message });

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/ai/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message,
                    history: this.aiChatHistory.slice(-10)
                })
            });

            // Remove typing indicator
            const typing = document.getElementById('ai-typing');
            if (typing) typing.remove();

            if (!response.ok) {
                throw new Error('AI service unavailable');
            }

            const data = await response.json();
            const reply = data.reply || 'I could not generate a response. Please try again.';

            // Add AI response
            this.aiChatHistory.push({ role: 'assistant', content: reply });
            messagesEl.innerHTML += `<div class="ai-message assistant"><div class="ai-message-bubble">${this.escapeHtml(reply)}</div></div>`;

        } catch (err) {
            // Remove typing indicator
            const typing = document.getElementById('ai-typing');
            if (typing) typing.remove();

            messagesEl.innerHTML += `<div class="ai-message assistant error"><div class="ai-message-bubble">Sorry, I'm having trouble connecting. Please try again in a moment.</div></div>`;
        }

        input.disabled = false;
        if (sendBtn) sendBtn.disabled = false;
        input.focus();
        setTimeout(() => { messagesEl.scrollTop = messagesEl.scrollHeight; }, 0);
    }

    async submitReport() {
        const descEl = document.getElementById('report-description');
        const nameEl = document.getElementById('report-name');
        const emailEl = document.getElementById('report-email');
        const statusEl = document.getElementById('report-status');

        if (!descEl || !descEl.value.trim()) {
            if (statusEl) { statusEl.textContent = 'Please describe the issue.'; statusEl.className = 'report-status error'; }
            return;
        }

        const submitBtn = document.querySelector('[data-action="submit-report"]');
        if (submitBtn) { submitBtn.disabled = true; submitBtn.textContent = 'Sending...'; }
        if (statusEl) { statusEl.textContent = ''; statusEl.className = 'report-status'; }

        try {
            const response = await fetch(`${this.apiBaseUrl}/api/support/report`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    description: descEl.value.trim(),
                    user_name: nameEl?.value.trim() || 'Anonymous',
                    user_email: emailEl?.value.trim() || '',
                    category: 'user_report'
                })
            });

            if (!response.ok) throw new Error('Failed to submit');

            const data = await response.json();

            if (statusEl) {
                const summaryText = data.ai_summary ? `\n\nAI Summary: ${data.ai_summary}` : '';
                statusEl.textContent = `Report sent! The developer has been notified.${summaryText}`;
                statusEl.className = 'report-status success';
            }

            // Clear form
            descEl.value = '';
            if (nameEl) nameEl.value = '';
            if (emailEl) emailEl.value = '';

        } catch (err) {
            if (statusEl) {
                statusEl.textContent = 'Failed to send report. Please try again or use the feedback form.';
                statusEl.className = 'report-status error';
            }
        }

        if (submitBtn) { submitBtn.disabled = false; submitBtn.textContent = 'Send Report'; }
    }

}

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM loaded, initializing app...');
    window.app = new YogaMarathonApp();
});

