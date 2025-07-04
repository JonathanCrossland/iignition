declare const initTimerWorker: Function;
declare const timerWorkerInit: Function;
declare const TimerStateManager: {
    saveTimerState: (timerData: TimerData) => Promise<void>;
    getTimerState: () => Promise<TimerData | undefined>;
};

interface TimerData {
    completionTime: number;
    duration: number;
    status: 'running' | 'stopped';
    timerId: string;
}

// Countdown Timer Component
class CountdownTimerElement extends HTMLElement {
    private _duration: number = 0;
    private _remainingSeconds: number = 0;
    private _timer: number | undefined;
    private _warningThreshold: number = 30;
    private _format: string = 'mm:ss';
    private _fontFamily: string = 'Arial, sans-serif';
    private _lastHourMark: number = 0;
    private _completionTime: number = 0;
    private _layerLocalStorage: boolean = true; // Toggle LocalStorage layer
    private _layerNotification: boolean = true; // Toggle Notification layer
    private _layerMultiTab: boolean = true;    // Toggle Multi-tab sync layer
    private _timerId: string = 'default'; // For future multi-timer support
    private _worker: ServiceWorkerRegistration | null = null;
    private _isRunning: boolean = false; // Track if timer is currently running
    private _ignoreNextStorageEvent: boolean = false; // Prevent reacting to own storage changes

    constructor() {
        super();
        console.log('CountdownTimer: Constructor called');
        this.attachShadow({ mode: 'open' });
    }

    static get observedAttributes() {
        return ['duration', 'warning-threshold', 'format', 'font-family', 'timer-id'];
    }

    attributeChangedCallback(name: string, oldValue: string, newValue: string) {
        console.log(`CountdownTimer: Attribute changed - ${name}:`, oldValue, '->', newValue);
        if (name === 'duration') {
            // Only update duration if timer is not currently running
            if (this._isRunning) {
                console.log('Timer is running, ignoring duration change');
                return;
            }
            this._duration = this.parseTimeToSeconds(newValue);
            this._remainingSeconds = this._duration;
            this._lastHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
            this.updateDisplay();
        } else if (name === 'warning-threshold') {
            this._warningThreshold = parseInt(newValue);
        } else if (name === 'format') {
            this._format = newValue;
        } else if (name === 'font-family') {
            this._fontFamily = newValue;
            this.updateDisplay();
        } else if (name === 'timer-id') {
            this._timerId = newValue;
        }
    }

    private parseTimeToSeconds(timeStr: string): number {
        const parts = timeStr.split(':').map(Number);
        if (parts.length === 3) { // HH:MM:SS
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        } else if (parts.length === 2) { // MM:SS
            return parts[0] * 60 + parts[1];
        }
        return parseInt(timeStr); // Assume seconds
    }

    private formatTime(seconds: number): string {
        const hours = Math.floor(seconds / 3600);
        const minutes = Math.floor((seconds % 3600) / 60);
        const secs = seconds % 60;

        if (this._format === 'HH:mm:ss') {
            return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
        } else {
            return `${minutes}:${secs.toString().padStart(2, '0')}`;
        }
    }

    async connectedCallback() {
        console.log('CountdownTimer: Connected to DOM');
        // Initialize attributes
        this._duration = this.parseTimeToSeconds(this.getAttribute('duration') || '0');
        this._warningThreshold = parseInt(this.getAttribute('warning-threshold') || '30');
        this._format = this.getAttribute('format') || 'mm:ss';
        this._fontFamily = this.getAttribute('font-family') || 'Arial, sans-serif';
        this._timerId = this.getAttribute('timer-id') || 'default';

        console.log('CountdownTimer: Initialized with:', {
            duration: this._duration,
            warningThreshold: this._warningThreshold,
            format: this._format,
            fontFamily: this._fontFamily,
            timerId: this._timerId
        });

        // Initialize remaining seconds but don't update display yet
        this._remainingSeconds = this._duration;
        this._lastHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
        
        // Set up background notifications system first
        await this.registerWorker();

        // Set up multi-tab sync if enabled
        if (this._layerMultiTab) {
            console.log('CountdownTimer: Setting up multi-tab sync');
            this.layer_multiTabSyncInit();
        }

        // Try to restore previous state AFTER setting up sync - this will call updateDisplay()
        console.log('CountdownTimer: Attempting to restore state');
        await this.restoreState();
        console.log('CountdownTimer: State restoration complete');
    }

    disconnectedCallback() {
        if (this._timer) {
            window.clearInterval(this._timer);
        }
        if (this._layerMultiTab) {
            window.removeEventListener('storage', this.layer_multiTabSyncListener);
        }
        this.stopWorker();
    }

    // --- LAYER 1: LOCAL STORAGE ---
    private layer_localStorageKey(): string {
        return `countdown-timer-${this._timerId}`;
    }

    private layer_localStorageSave(completionTime: number, duration: number) {
        const data = {
            completionTime,
            duration,
            status: 'running'
        };
        const key = this.layer_localStorageKey();
        console.log('Saving timer state to localStorage:', key, data);
        this._ignoreNextStorageEvent = true; // Ignore our own storage event
        localStorage.setItem(key, JSON.stringify(data));
    }

    private layer_localStorageRemove() {
        const key = this.layer_localStorageKey();
        console.log('Removing timer state from localStorage:', key);
        this._ignoreNextStorageEvent = true; // Ignore our own storage event
        localStorage.removeItem(key);
    }

    // --- LAYER 2: NOTIFICATIONS ---
    private layer_notificationSchedule(completionTime: number) {
        if (!('Notification' in window)) return;
        if (Notification.permission === 'granted') {
            const delay = completionTime - Date.now();
            if (delay > 0) {
                setTimeout(() => this.layer_notificationShow(), delay);
            }
        } else if (Notification.permission !== 'denied') {
            Notification.requestPermission().then(permission => {
                if (permission === 'granted') {
                    this.layer_notificationSchedule(completionTime);
                }
            });
        }
    }

    private layer_notificationShow() {
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Timer Complete!', {
                body: 'Your countdown timer has finished.',
                icon: '' // Optionally set an icon
            });
        }
    }

    // --- LAYER 3: MULTI-TAB SYNC ---
    private layer_multiTabSyncInit() {
        window.addEventListener('storage', this.layer_multiTabSyncListener);
    }

    private layer_multiTabSyncListener = (e: StorageEvent) => {
        if (e.key === this.layer_localStorageKey()) {
            // Check if we should ignore this event (it was triggered by this tab)
            if (this._ignoreNextStorageEvent) {
                console.log('Ignoring storage event from this tab:', this._timerId);
                this._ignoreNextStorageEvent = false;
                return;
            }
            
            console.log('Storage event for timer:', this._timerId, 'newValue:', e.newValue);
            
            if (!e.newValue) {
                // Timer was cleared in another tab - stop this timer too
                console.log('Timer stopped in another tab:', this._timerId);
                if (this._timer) {
                    window.clearInterval(this._timer);
                    this._timer = undefined;
                }
                this._isRunning = false;
                this._remainingSeconds = this._duration;
                this._completionTime = 0;
                this.updateDisplay();
                this.clearBackgroundNotification();
                return;
            }

            try {
                const { completionTime, duration, status } = JSON.parse(e.newValue);
                if (status === 'running') {
                    const now = Date.now();
                    const remainingMs = completionTime - now;
                    
                    if (remainingMs > 0) {
                        // Another tab started/updated the timer - sync this tab
                        console.log('Syncing with timer from another tab:', this._timerId);
                        this._completionTime = completionTime;
                        this._duration = Math.floor(duration / 1000);
                        this._remainingSeconds = Math.ceil(remainingMs / 1000);
                        this._isRunning = true;
                        
                        // Start local display updates if not already running
                        if (!this._timer) {
                            this._timer = window.setInterval(() => this.tick(), 1000);
                        }
                        
                        // Set up background notification for this tab too
                        this.scheduleBackgroundNotification(this._completionTime);
                        this.updateDisplay();
                        
                        console.log('Successfully synced timer:', this._timerId, 'remaining:', this._remainingSeconds);
                    } else {
                        // Timer completed while we were syncing
                        console.log('Timer completed during sync:', this._timerId);
                        this._isRunning = false;
                        this._remainingSeconds = 0;
                        this._completionTime = 0;
                        if (this._timer) {
                            window.clearInterval(this._timer);
                            this._timer = undefined;
                        }
                        this.updateDisplay();
                        this.dispatchEvent(new CustomEvent('complete'));
                    }
                }
            } catch (error) {
                console.error('Error parsing storage sync data:', error);
            }
        }
    };

    // --- TIMER LOGIC ---
    private layer_startTimerInterval() {
        if (this._timer) {
            window.clearInterval(this._timer);
        }
        this._timer = window.setInterval(() => this.tick(), 1000);
    }

    private async restoreState() {
        try {
            // First check localStorage for timer state
            const savedState = localStorage.getItem(this.layer_localStorageKey());
            console.log('Checking localStorage for timer state:', this._timerId, savedState);
            
            if (savedState) {
                const { completionTime, duration, status } = JSON.parse(savedState);
                if (status === 'running') {
                    const now = Date.now();
                    const remainingMs = completionTime - now;
                    
                    console.log('Found running timer in localStorage:', {
                        timerId: this._timerId,
                        completionTime: new Date(completionTime),
                        remainingMs,
                        remainingSeconds: Math.ceil(remainingMs / 1000)
                    });
                    
                    if (remainingMs > 0) {
                        console.log('Restoring timer from localStorage:', this._timerId, 'remaining:', Math.ceil(remainingMs / 1000), 'seconds');
                        
                        // Update component state - DON'T change the original duration
                        this._completionTime = completionTime;
                        // Keep original duration from attribute, don't overwrite with localStorage duration
                        this._remainingSeconds = Math.ceil(remainingMs / 1000);
                        this._isRunning = true;
                        
                        // Start local display timer
                        this._timer = window.setInterval(() => this.tick(), 1000);
                        this.updateDisplay();
                        
                        // Set up background notifications for this restored timer
                        await this.registerWorker();
                        this.scheduleBackgroundNotification(this._completionTime);
                        
                        console.log('Timer successfully restored and running');
                        return; // Successfully restored
                    } else {
                        // Timer expired while tab was closed
                        console.log('Timer expired while tab was closed:', this._timerId);
                        this.layer_localStorageRemove();
                        // Show completion notification
                        if ('Notification' in window && Notification.permission === 'granted') {
                            new Notification('Timer Complete!', {
                                body: `Timer ${this._timerId} finished while tab was closed.`,
                                tag: `timer-${this._timerId}`
                            });
                        }
                        this.dispatchEvent(new CustomEvent('complete'));
                    }
                }
            } else {
                console.log('No saved timer state found for:', this._timerId);
            }
            
            // No saved state or timer wasn't running - ensure timer is in initial state
            console.log('Setting timer to initial state - duration:', this._duration, 'seconds');
            this._remainingSeconds = this._duration;
            this._isRunning = false;
            this._completionTime = 0;
            this.updateDisplay();
            
        } catch (error) {
            console.error('Failed to restore timer state:', error);
            // Fallback to initial state
            this._remainingSeconds = this._duration;
            this._isRunning = false;
            this._completionTime = 0;
            this.updateDisplay();
        }
    }

    private async checkExistingTimer() {
        if (navigator.serviceWorker.controller) {
            console.log('Checking existing timer with service worker:', this._timerId);
            navigator.serviceWorker.controller.postMessage({
                type: 'CHECK_TIMER',
                timerId: this._timerId
            });
        }
    }

    private async registerWorker() {
        if (!('serviceWorker' in navigator)) {
            console.warn('Service Worker not supported, using localStorage notifications');
            return;
        }

        // Skip service worker registration due to browser restrictions on dynamic workers
        // Use localStorage + notification fallback which is more reliable
        console.log('Using localStorage-based background notifications (more reliable than dynamic service workers)');
        this._worker = null;
        this.setupBackgroundNotifications();
    }

    private getServiceWorkerCode(): string {
        return `
// Dynamic Timer Service Worker (generated from bundle)
const TIMER_STORE = new Map();

self.addEventListener('install', (event) => {
    console.log('Timer service worker installing');
    self.skipWaiting();
});

self.addEventListener('activate', (event) => {
    console.log('Timer service worker activated');
    event.waitUntil(self.clients.claim());
});

self.addEventListener('message', (event) => {
    const data = event.data || {};
    const { type, timerId, duration, completionTime } = data;
    
    console.log('Service worker received message:', type, 'for timer:', timerId);

    switch (type) {
        case 'START_TIMER':
            startTimer(timerId, completionTime);
            break;
        case 'STOP_TIMER':
            stopTimer(timerId);
            break;
        case 'CHECK_TIMER':
            checkTimerStatus(event, timerId);
            break;
    }
});

function startTimer(timerId, completionTime) {
    console.log('Starting background timer:', timerId);
    
    stopTimer(timerId);
    
    const intervalId = setInterval(() => {
        const now = Date.now();
        if (now >= completionTime) {
            console.log('Timer completed:', timerId);
            
            self.registration.showNotification('Timer Complete!', {
                body: \`Timer \${timerId} has finished.\`,
                tag: \`timer-\${timerId}\`,
                requireInteraction: true
            }).catch(err => {
                console.error('Failed to show notification:', err);
            });
            
            stopTimer(timerId);
        }
    }, 1000);
    
    TIMER_STORE.set(timerId, {
        intervalId: intervalId,
        completionTime: completionTime,
        startedAt: Date.now()
    });
}

function stopTimer(timerId) {
    const timer = TIMER_STORE.get(timerId);
    if (timer) {
        clearInterval(timer.intervalId);
        TIMER_STORE.delete(timerId);
    }
}

function checkTimerStatus(event, timerId) {
    const timer = TIMER_STORE.get(timerId);
    const isRunning = !!timer;
    
    if (event.source && event.source.postMessage) {
        event.source.postMessage({
            type: 'TIMER_STATUS',
            timerId: timerId,
            isRunning: isRunning,
            completionTime: timer ? timer.completionTime : null,
            remainingTime: timer ? Math.max(0, Math.ceil((timer.completionTime - Date.now()) / 1000)) : 0
        });
    }
}

self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    event.waitUntil(
        self.clients.matchAll().then(clients => {
            if (clients.length > 0) {
                return clients[0].focus();
            }
        })
    );
});
`;
    }

    private async stopWorker() {
        // Clear local interval
        if (this._timer) {
            window.clearInterval(this._timer);
            this._timer = undefined;
        }

        // Stop service worker timer
        try {
            await navigator.serviceWorker.ready;
            if (navigator.serviceWorker.controller) {
                console.log('Sending stop command to service worker for timer:', this._timerId);
                navigator.serviceWorker.controller.postMessage({
                    type: 'STOP_TIMER',
                    timerId: this._timerId
                });
            } else {
                console.warn('No service worker controller found');
            }
        } catch (error) {
            console.error('Failed to stop timer:', error);
        }
    }

    public async startCountdown() {
        console.log('Starting countdown for timer:', this._timerId);
        
        // Check if already running
        if (this._isRunning) {
            console.log('Timer is already running:', this._timerId);
            return;
        }

        // Clear any existing timer (safety check)
        if (this._timer) {
            window.clearInterval(this._timer);
        }

        // Set up new timer
        this._remainingSeconds = this._duration;
        this._completionTime = Date.now() + (this._remainingSeconds * 1000);
        this._isRunning = true;

        // Register service worker for background notifications
        await this.registerWorker();

        // Request notification permission if needed
        if ('Notification' in window) {
            const permission = await Notification.requestPermission();
            if (permission !== 'granted') {
                console.warn('Notification permission not granted');
            }
        }

        // Start the background timer in service worker
        if (navigator.serviceWorker.controller) {
            console.log('Sending start command to service worker for timer:', this._timerId);
            navigator.serviceWorker.controller.postMessage({
                type: 'START_TIMER',
                timerId: this._timerId,
                duration: this._duration,
                completionTime: this._completionTime
            });
        } else {
            console.warn('No service worker controller found, using fallback notifications');
            // Use fallback background notification
            this.scheduleBackgroundNotification(this._completionTime);
        }

        // Start local display updates
        this._timer = window.setInterval(() => this.tick(), 1000);
        this.updateDisplay();

        // Save to localStorage for multi-tab sync and restoration
        if (this._layerLocalStorage) {
            this.layer_localStorageSave(this._completionTime, this._duration);
        }

        // Dispatch start event
        this.dispatchEvent(new CustomEvent('start'));
    }

    public async stopCountdown() {
        console.log('Stopping countdown for timer:', this._timerId);
        
        // Mark as not running
        this._isRunning = false;
        
        // Clear local interval
        if (this._timer) {
            window.clearInterval(this._timer);
            this._timer = undefined;
        }

        // Stop the background timer in service worker
        if (navigator.serviceWorker.controller) {
            console.log('Sending stop command to service worker for timer:', this._timerId);
            navigator.serviceWorker.controller.postMessage({
                type: 'STOP_TIMER',
                timerId: this._timerId
            });
        } else {
            // Clear fallback background notification
            this.clearBackgroundNotification();
        }
        
        // Reset display to original duration
        this._remainingSeconds = this._duration;
        this._completionTime = 0;
        this.updateDisplay();
        
        // Clear localStorage
        if (this._layerLocalStorage) {
            this.layer_localStorageRemove();
        }
        
        // Dispatch stop event
        this.dispatchEvent(new CustomEvent('stop'));
    }

    // Public getter for running state
    public get isRunning(): boolean {
        return this._isRunning;
    }

    // Public getter for remaining time
    public get remainingSeconds(): number {
        return this._remainingSeconds;
    }

    private tick() {
        this._remainingSeconds = Math.ceil((this._completionTime - Date.now()) / 1000);
        if (this._remainingSeconds <= 0) {
            this._remainingSeconds = 0;
            this._isRunning = false;
            this.updateDisplay();
            if (this._timer) {
                window.clearInterval(this._timer);
                this._timer = undefined;
            }
            if (this._layerLocalStorage) this.layer_localStorageRemove();
            if (this._layerNotification) this.layer_notificationShow();
            this.dispatchEvent(new CustomEvent('complete'));
            return;
        }
        
        // Periodically update localStorage for cross-tab sync (every 10 seconds)
        if (this._layerLocalStorage && this._remainingSeconds % 10 === 0) {
            console.log('Periodic localStorage update for cross-tab sync');
            this.layer_localStorageSave(this._completionTime, this._duration * 1000);
        }
        
        this.checkHourElapsed();
        this.updateDisplay();
    }

    private updateDisplay() {
        console.log('CountdownTimer: Updating display -', this._remainingSeconds, 'seconds remaining');
        if (!this.shadowRoot) return;

        // Create or update the display element
        let display = this.shadowRoot.querySelector('.timer-display');
        if (!display) {
            console.log('CountdownTimer: Creating initial display');
            // Add styles first
            const style = document.createElement('style');
            style.textContent = `
                .timer-display {
                    font-family: ${this._fontFamily};
                    font-size: 2em;
                    padding: 10px;
                    border-radius: 5px;
                    background: #2b2b2b;
                    color: #ffffff;
                    text-align: center;
                    transition: background-color 0.3s, color 0.3s;
                    min-width: 100px;
                    display: inline-block;
                }
                .timer-display.warning {
                    background: #ff5722;
                    color: #ffffff;
                }
            `;
            this.shadowRoot.appendChild(style);

            // Create display element
            display = document.createElement('div');
            display.className = 'timer-display';
            this.shadowRoot.appendChild(display);
        }

        const timeStr = this.formatTime(this._remainingSeconds);
        const isWarning = this._remainingSeconds <= this._warningThreshold;

        display.textContent = timeStr;
        display.classList.toggle('warning', isWarning);

        // Check if an hour has elapsed
        this.checkHourElapsed();
    }

    private checkHourElapsed() {
        // Check if we've crossed an hour boundary
        const currentHourMark = Math.ceil(this._remainingSeconds / 3600) * 3600;
        if (currentHourMark < this._lastHourMark) {
            this._lastHourMark = currentHourMark;
            this.dispatchEvent(new CustomEvent('hourElapsed', {
                detail: {
                    hoursRemaining: Math.floor(this._remainingSeconds / 3600),
                    totalSecondsRemaining: this._remainingSeconds
                }
            }));
        }
    }

    private setupBackgroundNotifications() {
        // Store a reference for background notification management
        const manager = (window as any).__timerBackgroundManager = (window as any).__timerBackgroundManager || {
            timers: new Map(),
            checkInterval: null,
            storageListenerAdded: false
        };
        
        console.log('Using localStorage-based background notifications');
        
        // Set up periodic check for expired timers (every 5 seconds)
        if (!manager.checkInterval) {
            manager.checkInterval = setInterval(() => {
                this.checkAllExpiredTimers();
                this.syncWithOtherTabs(); // Also sync with other tabs periodically
            }, 5000);
        }
        
        // Add global storage listener if not already added
        if (!manager.storageListenerAdded) {
            window.addEventListener('storage', (e) => {
                if (e.key && e.key.startsWith('countdown-timer-') && e.newValue === null) {
                    // A timer was cleared in another tab
                    const timerId = e.key.replace('countdown-timer-', '');
                    this.clearBackgroundNotificationForTimer(timerId);
                }
            });
            manager.storageListenerAdded = true;
        }
    }

    private syncWithOtherTabs() {
        // Check if our timer should sync with localStorage (in case we missed storage events)
        // But only if we're NOT currently running a timer
        if (!this._isRunning) {
            const savedState = localStorage.getItem(this.layer_localStorageKey());
            if (savedState) {
                try {
                    const { completionTime, status } = JSON.parse(savedState);
                    if (status === 'running') {
                        const now = Date.now();
                        const remainingMs = completionTime - now;
                        if (remainingMs > 0) {
                            console.log('Periodic sync: Found running timer in localStorage for stopped timer, syncing...');
                            // Manually trigger state restoration without resetting everything
                            this._completionTime = completionTime;
                            this._remainingSeconds = Math.ceil(remainingMs / 1000);
                            this._isRunning = true;
                            
                            // Start local display updates
                            this._timer = window.setInterval(() => this.tick(), 1000);
                            this.updateDisplay();
                            this.scheduleBackgroundNotification(this._completionTime);
                            
                            console.log('Periodic sync: Timer restored, remaining:', this._remainingSeconds);
                        } else {
                            // Timer expired, clean up localStorage
                            console.log('Periodic sync: Found expired timer, cleaning up');
                            this.layer_localStorageRemove();
                        }
                    }
                } catch (error) {
                    console.error('Error during periodic sync:', error);
                }
            }
        }
    }

    private checkAllExpiredTimers() {
        // Check all localStorage timers and notify for expired ones
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && key.startsWith('countdown-timer-')) {
                try {
                    const data = JSON.parse(localStorage.getItem(key) || '{}');
                    if (data.status === 'running' && data.completionTime) {
                        const now = Date.now();
                        if (now >= data.completionTime) {
                            const timerId = key.replace('countdown-timer-', '');
                            this.handleTimerExpired(timerId);
                            localStorage.removeItem(key);
                        }
                    }
                } catch (error) {
                    console.error('Error checking timer:', key, error);
                }
            }
        }
    }

    private handleTimerExpired(timerId: string) {
        // Show notification for expired timer
        if ('Notification' in window && Notification.permission === 'granted') {
            new Notification('Timer Complete!', {
                body: `Timer ${timerId} has finished.`,
                tag: `timer-${timerId}`
            });
        }
        
        // If this is our timer, trigger completion
        if (timerId === this._timerId) {
            this._isRunning = false;
            if (this._timer) {
                window.clearInterval(this._timer);
                this._timer = undefined;
            }
            this._remainingSeconds = 0;
            this._completionTime = 0;
            this.updateDisplay();
            this.dispatchEvent(new CustomEvent('complete'));
        }
    }

    private clearBackgroundNotificationForTimer(timerId: string) {
        const manager = (window as any).__timerBackgroundManager;
        if (manager && manager.timers) {
            const timeoutId = manager.timers.get(timerId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                manager.timers.delete(timerId);
            }
        }
    }

    private scheduleBackgroundNotification(completionTime: number) {
        const delay = completionTime - Date.now();
        if (delay > 0) {
            const timeoutId = setTimeout(() => {
                if ('Notification' in window && Notification.permission === 'granted') {
                    new Notification('Timer Complete!', {
                        body: `Timer ${this._timerId} has finished.`,
                        tag: `timer-${this._timerId}`
                    });
                }
                // Clean up from background manager
                const manager = (window as any).__timerBackgroundManager;
                if (manager && manager.timers) {
                    manager.timers.delete(this._timerId);
                }
            }, delay);
            
            // Store in background manager for cleanup
            const manager = (window as any).__timerBackgroundManager;
            if (manager && manager.timers) {
                // Clear any existing timeout for this timer
                const existing = manager.timers.get(this._timerId);
                if (existing) {
                    clearTimeout(existing);
                }
                manager.timers.set(this._timerId, timeoutId);
            }
        }
    }

    private clearBackgroundNotification() {
        const manager = (window as any).__timerBackgroundManager;
        if (manager && manager.timers) {
            const timeoutId = manager.timers.get(this._timerId);
            if (timeoutId) {
                clearTimeout(timeoutId);
                manager.timers.delete(this._timerId);
            }
        }
    }
}

customElements.define('countdown-timer', CountdownTimerElement);