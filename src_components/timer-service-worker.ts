// @ts-nocheck
// Timer Service Worker

// Basic Timer Service Worker
const CACHE_NAME = 'timer-cache-v1';

// Cache static assets
self.addEventListener('install', (event) => {
    console.log('Timer service worker installed');
    event.waitUntil(self.skipWaiting());
});

self.addEventListener('activate', (event) => {
    console.log('Timer service worker activated');
    // Clear any existing timers
    TIMER_STORE.forEach((timer, timerId) => {
        stopTimer(timerId);
    });
    
    // Clear any existing caches
    event.waitUntil(
        caches.keys().then(cacheNames => {
            return Promise.all(
                cacheNames.map(cacheName => {
                    return caches.delete(cacheName);
                })
            );
        })
    );
});

// Timer store to track all active timers
const TIMER_STORE = new Map<string, {
    intervalId: number;
    completionTime: number;
    notified: boolean;
}>();

// Listen for messages from the main thread
self.addEventListener('message', (event) => {
    const { type, timerId } = event.data;
    console.log('Service worker received message:', type, 'for timer:', timerId);

    switch (type) {
        case 'START_TIMER': {
            const { duration, completionTime } = event.data;
            startTimer(timerId, duration, completionTime);
            break;
        }
        case 'STOP_TIMER': {
            stopTimer(timerId);
            break;
        }
        case 'CHECK_TIMER': {
            const timer = TIMER_STORE.get(timerId);
            if (timer) {
                event.source?.postMessage({
                    type: 'TIMER_STATUS',
                    timerId,
                    isRunning: true,
                    completionTime: timer.completionTime
                });
            }
            break;
        }
    }
});

function startTimer(timerId: string, duration: number, completionTime: number) {
    // Clear existing timer if any
    stopTimer(timerId);

    console.log('Starting service worker timer:', timerId);
    
    const timer = {
        intervalId: self.setInterval(() => checkTimer(timerId), 1000),
        completionTime,
        notified: false
    };
    
    TIMER_STORE.set(timerId, timer);
}

function stopTimer(timerId: string) {
    console.log('Stopping service worker timer:', timerId);
    const timer = TIMER_STORE.get(timerId);
    if (timer) {
        self.clearInterval(timer.intervalId);
        TIMER_STORE.delete(timerId);
        
        // If no more timers, unregister the service worker
        if (TIMER_STORE.size === 0) {
            console.log('No more active timers, unregistering service worker');
            self.registration.unregister();
        }
    }
}

function checkTimer(timerId: string) {
    const timer = TIMER_STORE.get(timerId);
    if (!timer) return;

    const now = Date.now();
    if (now >= timer.completionTime && !timer.notified) {
        timer.notified = true;
        self.registration.showNotification('Timer Complete!', {
            body: 'Your countdown timer has finished.',
            tag: `timer-${timerId}`,  // Prevent duplicate notifications
            renotify: true
        });
        stopTimer(timerId);
    }
}

// Background sync registration
self.addEventListener('sync', function(event) {
    if (event.tag === 'timer-sync') {
        event.waitUntil(
            // Sync timer state when back online
            getTimerState().then(function(timerData) {
                if (timerData) {
                    self.clients.matchAll().then(function(clients) {
                        clients.forEach(function(client) {
                            client.postMessage({
                                type: 'TIMER_SYNC',
                                payload: timerData
                            });
                        });
                    });
                }
            })
        );
    }
});

// Timer State Manager Module
console.log('Timer State Manager Module loading...');

const TIMER_STORE_DB = 'timer-store';

// Initialize the database when the script loads
console.log('Creating IndexedDB connection...');
const dbInitPromise = openDB();

// Helper function to save timer state
async function saveTimerState(timerData) {
    console.log('Attempting to save timer state:', timerData);
    try {
        const db = await dbInitPromise;
        console.log('Got DB connection for save');
        const tx = db.transaction(TIMER_STORE_DB, 'readwrite');
        const store = tx.objectStore(TIMER_STORE_DB);
        await store.put(timerData, timerData.timerId || 'current');
        await tx.complete;
        console.log('Timer state saved successfully:', timerData);
    } catch (error) {
        console.error('Failed to save timer state:', error);
        throw error;
    }
}

// Helper function to get timer state
async function getTimerState() {
    console.log('Attempting to get timer state');
    try {
        const db = await dbInitPromise;
        console.log('Got DB connection for get');
        const tx = db.transaction(TIMER_STORE_DB, 'readonly');
        const store = tx.objectStore(TIMER_STORE_DB);
        const state = await store.get('current');
        console.log('Retrieved timer state:', state);
        return state;
    } catch (error) {
        console.error('Failed to get timer state:', error);
        throw error;
    }
}

// Helper function to open IndexedDB
function openDB() {
    console.log('Opening IndexedDB...');
    return new Promise(function(resolve, reject) {
        const request = indexedDB.open('TimerDB', 1);
        
        request.onerror = function() { 
            console.error('Failed to open timer database:', request.error);
            reject(request.error); 
        };
        
        request.onsuccess = function() { 
            console.log('Timer database opened successfully');
            resolve(request.result); 
        };
        
        request.onupgradeneeded = function(event) {
            console.log('Creating/upgrading timer database');
            const db = event.target.result;
            if (!db.objectStoreNames.contains(TIMER_STORE_DB)) {
                console.log('Creating timer store');
                db.createObjectStore(TIMER_STORE_DB);
            }
        };
    });
}

// To register this service worker in your `index.html` or main JavaScript file:
/*
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/service-worker.js') // Path to your compiled service worker file
            .then(registration => {
                console.log('Service Worker registered with scope:', registration.scope);
            })
            .catch(error => {
                console.error('Service Worker registration failed:', error);
            });
    });
}
*/

// Export functions for use in the timer component
console.log('Exporting TimerStateManager to window...');
window.TimerStateManager = {
    saveTimerState: saveTimerState,
    getTimerState: getTimerState
};

// Initialize database when script loads
console.log('Initializing timer state manager...');
dbInitPromise
    .then(() => {
        console.log('Timer state manager initialized successfully');
    })
    .catch(error => {
        console.error('Failed to initialize timer state manager:', error);
    });
