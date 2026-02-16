const fs = require('fs');
const path = require('path');
const vm = require('vm');

// Mock DOM and Browser Environment
const mockDom = {
    listeners: {},
    elements: {},
    addEventListener: (event, callback) => {
        if (!mockDom.listeners[event]) mockDom.listeners[event] = [];
        mockDom.listeners[event].push(callback);
    },
    trigger: (event, data) => {
        if (mockDom.listeners[event]) {
            mockDom.listeners[event].forEach(cb => cb(data));
        }
    },
    getElementById: (id) => {
        if (!mockDom.elements[id]) {
            mockDom.elements[id] = {
                value: '',
                textContent: '',
                checked: false,
                classList: {
                    add: () => { },
                    remove: () => { },
                    contains: () => false
                },
                addEventListener: (event, callback) => {
                    if (!mockDom.elements[id].listeners) mockDom.elements[id].listeners = {};
                    if (!mockDom.elements[id].listeners[event]) mockDom.elements[id].listeners[event] = [];
                    mockDom.elements[id].listeners[event].push(callback);
                },
                trigger: (event, e) => {
                    if (mockDom.elements[id].listeners && mockDom.elements[id].listeners[event]) {
                        mockDom.elements[id].listeners[event].forEach(cb => cb(e));
                    }
                },
                disabled: false,
                innerHTML: '',
                focus: () => { },
                reset: () => { }
            };
        }
        return mockDom.elements[id];
    },
    createElement: (tag) => ({ innerHTML: '', textContent: '' })
};

// Global mocks
const mockWindow = {
    auth: {
        requireAuth: async () => ({ user: { id: 'test-user' } }),
        getUser: async () => ({ id: 'test-user', user_metadata: { name: 'Test User' } })
    },
    supabaseClient: {
        from: (table) => ({
            select: () => ({
                eq: (col, val) => {
                    // MOCK RESPONSE FOR DUPLICATE CHECK
                    if (table === 'blind_cuts' && col === 'valid_date') {
                        if (val === '2026-02-16') {
                            return Promise.resolve({ data: [{ id: 1 }], error: null }); // Duplicate exists
                        } else {
                            return Promise.resolve({ data: [], error: null }); // No duplicate
                        }
                    }
                    return Promise.resolve({ data: [], error: null });
                }
            }),
            insert: (data) => {
                console.log(`INSERT into ${table}:`, data);
                return Promise.resolve({ error: null });
            }
        })
    },
    removeExpense: () => { }
};

// Alert mock
let alertCalls = [];
const mockAlert = (msg) => {
    console.log('ALERT:', msg);
    alertCalls.push(msg);
};

// Setup Context
const context = vm.createContext({
    document: mockDom,
    window: mockWindow,
    alert: mockAlert,
    console: console,
    Intl: Intl,
    setTimeout: setTimeout,
    setInterval: setInterval
});

// Read and Run Script
const scriptPath = path.join(__dirname, '../js/receptionist.js');
const scriptCode = fs.readFileSync(scriptPath, 'utf8');

console.log('--- Starting verification test ---');

try {
    vm.runInContext(scriptCode, context);

    // Trigger DOMContentLoaded
    mockDom.trigger('DOMContentLoaded', {});

    // Need to wait for async operations in DOMContentLoaded?
    // The event listener is async, but we can't easily await it from outside without modifying the code.
    // However, the event listeners for buttons will be attached synchronously after the await auth.

    // We need to wait a bit for the async requireAuth to resolve and listeners to attach.
    setTimeout(async () => {
        console.log('--- Simulating User Interaction ---');

        // Setup Form Inputs
        const cashInput = mockDom.getElementById('cash-income');
        const voucherInput = mockDom.getElementById('voucher-income');
        const cutDateInput = mockDom.getElementById('cut-date');
        const form = mockDom.getElementById('daily-record-form');

        cashInput.value = '1000';
        voucherInput.value = '500';

        // TEST 1: Duplicate Date
        console.log('\nTEST 1: Duplicate Date (2026-02-16)');
        cutDateInput.value = '2026-02-16';
        alertCalls = [];

        // Trigger Submit
        // We need to find the submit handler. It's attached to the form.
        // The mockDom.getElementById returns the same object, so we can trigger it.
        await new Promise(resolve => {
            // We need to wrap the trigger in a way that handles the async callback
            // Implementation detail: my mock doesn't handle async listeners nicely.
            // But since we are inside a timeout, we can simulate it.

            // Let's call the listener directly if possible, or assume it works.
            // Actually, I can just call the listener from the mock.
            const listeners = form.listeners['submit'];
            if (listeners && listeners.length > 0) {
                // Assuming the last one is the one we want or the only one.
                // The handler is async (e) => { ... }
                listeners[0]({ preventDefault: () => { } }).then(() => {
                    resolve();
                });
            } else {
                console.error('No submit listener found!');
                resolve();
            }
        });

        if (alertCalls.some(msg => msg.includes('Ya existe un corte'))) {
            console.log('✅ PASS: Alert shown for duplicate date.');
        } else {
            console.error('❌ FAIL: No alert for duplicate date.');
        }

        // TEST 2: New Date
        console.log('\nTEST 2: New Date (2026-02-17)');
        cutDateInput.value = '2026-02-17';
        alertCalls = [];

        await new Promise(resolve => {
            const listeners = form.listeners['submit'];
            if (listeners) {
                listeners[0]({ preventDefault: () => { } }).then(() => {
                    resolve();
                });
            }
        });

        if (alertCalls.length === 0) {
            console.log('✅ PASS: No alert for new date (Submission proceeded).');
        } else {
            console.error('❌ FAIL: Alert shown for new date:', alertCalls);
        }

    }, 1000);

} catch (e) {
    console.error('Runtime Error:', e);
}
