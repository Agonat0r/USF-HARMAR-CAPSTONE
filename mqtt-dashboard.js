// === Full script.js with Firestore logging, timestamps, translations, and MQTT handling ===
import { translations } from './translations.js';

// Initialize EmailJS
(function() {
    emailjs.init("elTkW2rygb9ah9aiU"); // Replace with your actual EmailJS public key
})();

// Global state and MQTT client
let loggedIn = false;
let currentLang = 'en';
let client = null;

// MQTT Configuration
const brokerConfig = {
    host: 'lb88002c.ala.us-east-1.emqxsl.com',
    port: 8084,
    path: '/mqtt',
    username: 'Carlos',
    password: 'mqtt2025',
    clientId: 'webClient_' + Math.random().toString(16).substr(2, 8)
};

/**
 * Initializes the MQTT client and sets up connection handlers
 */
function initializeMQTTClient() {
    // Connect to MQTT broker using MQTT.js
    client = mqtt.connect(`wss://${brokerConfig.host}:${brokerConfig.port}${brokerConfig.path}`, {
        username: brokerConfig.username,
        password: brokerConfig.password,
        clientId: brokerConfig.clientId,
        clean: true,
        rejectUnauthorized: false
    });

    // MQTT connection handling
    client.on('connect', () => {
        console.log('Connected to MQTT broker');
        logToTerminal('Connected to MQTT broker', 'success');
        
        // Update connection status indicator
        const statusIndicator = document.getElementById('mqttStatus');
        if (statusIndicator) {
            statusIndicator.textContent = t('connected');
            statusIndicator.className = 'status-indicator status-connected';
        }

        // Subscribe to all relevant topics
        const topics = [
            'usf/messages',
            'usf/logs/alerts',
            'usf/logs/general',
            'usf/logs/command',
            'usf/status',
            'usf/telemetry'
        ];
        
        topics.forEach(topic => {
            client.subscribe(topic, (err) => {
                if (err) {
                    console.error('Subscription error for ' + topic + ':', err);
                    logToTerminal('Failed to subscribe to ' + topic, 'error');
                } else {
                    console.log('Subscribed to ' + topic);
                    logToTerminal('Subscribed to ' + topic, 'info');
                }
            });
        });
    });

    client.on('error', (error) => {
        console.error('MQTT Error:', error);
        logToTerminal('MQTT Error: ' + error.message, 'error');
    });

    client.on('message', (topic, message) => {
        console.log('Received message on topic:', topic, 'Message:', message.toString());
        
        try {
            const payload = JSON.parse(message.toString());
            
            // Handle different message types
            if (topic === 'usf/logs/general') {
                // Handle messages from the general log topic
                logToTerminal(payload.message, payload.type || 'info');
            } else if (topic === 'usf/logs/command') {
                // Handle command log messages
                logToCommandTerminal(payload.message, payload.type || 'command');
            } else if (topic === 'usf/logs/alerts') {
                // Handle alert messages
                handleAlarm(payload);
            } else if (payload.type === 'red' || payload.type === 'amber' || payload.type === 'green') {
                // Handle alarms
                handleAlarm(payload);
            } else {
                // Default handling for other messages
                logToTerminal(payload.message || message.toString(), payload.type || 'info');
            }
        } catch (e) {
            // If message isn't JSON, display it as a plain message
            console.log('Received non-JSON message:', message.toString());
            if (topic === 'usf/logs/command') {
                logToCommandTerminal(message.toString(), 'command');
            } else {
                logToTerminal(message.toString(), 'info');
            }
        }
    });
}

/**
 * Initializes the application when the DOM is fully loaded.
 * Sets up event handlers, loads settings, applies UI customizations,
 * updates text translations, and initializes MQTT connection.
 */
document.addEventListener('DOMContentLoaded', () => {
  initializeEventHandlers();
  loadSettings();
  applySettings();
  updateAllText();
    initializeMQTTClient();
    loadPhoneSubscribers();

    // Add control button event listeners
    const controlButtons = document.querySelectorAll('.control-buttons button');
    controlButtons.forEach(button => {
        button.addEventListener('click', (e) => {
            e.preventDefault();
            const action = button.textContent.toLowerCase();
            switch(action) {
                case 'up':
                    startAction('up');
                    break;
                case 'down':
                    startAction('down');
                    break;
                case 'stop':
                    stopAction();
                    break;
                case 'apply brake':
                    applyBrake();
                    break;
                case 'release brake':
                    releaseBrake();
                    break;
            }
        });
    });
});

/**
 * Sets up all event handlers for the application.
 * Uses event delegation for data-action elements and
 * sets up terminal input handling if available.
 */
function initializeEventHandlers() {
  document.addEventListener('click', handleAction);
  document.addEventListener('change', handleAction);

  const terminalInput = document.getElementById('terminal-input');
  if (terminalInput) {
    terminalInput.addEventListener('keydown', sendCommand);
  }

  // Add handler for test email button
  const testEmailButton = document.querySelector('#testEmailBtn');
  if (testEmailButton) {
    testEmailButton.addEventListener('click', sendTestEmail);
  }

  // Add event listeners for control buttons
  document.querySelectorAll('.control-buttons .control-btn').forEach(button => {
    button.addEventListener('click', function() {
        if (!client || !client.connected) {
            showError('MQTT client is not connected. Please check your connection.');
            return;
        }

        const action = button.textContent.trim().toLowerCase();
        switch (action) {
            case 'up':
                startAction('up');
                break;
            case 'down':
                startAction('down');
                break;
            case 'stop':
                stopAction();
                break;
            case 'apply brake':
                applyBrake();
                break;
            case 'release brake':
                releaseBrake();
                break;
            default:
                console.error('Unknown control action:', action);
        }
    });
  });
}

/**
 * Handles all action events through event delegation.
 * Routes different actions to their appropriate handler functions.
 * @param {Event} event - The triggered event object
 */
function handleAction(event) {
  const target = event.target;
  const action = target.getAttribute('data-action');
  if (!action) return;

  // Play click sound for all actions
  document.getElementById('click-sound')?.play().catch(err => console.log('Click sound not loaded yet'));

  switch (action) {
    case 'login':
      handleLogin(event);
      break;
    case 'switch-tab':
      handleTabSwitch(event);
      break;
    case 'clearTerminal':
      const targetId = target.getAttribute('data-target');
      clearTerminal(targetId);
      break;
    case 'export-log':
      const exportId = target.getAttribute('data-target');
      exportLog(exportId);
      break;
    case 'email-log':
      const emailId = target.getAttribute('data-target');
      showEmailModal(emailId);
      break;
    case 'send-email':
      sendLogEmail();
      break;
    case 'close-modal':
      closeEmailModal();
      break;
    case 'switch-language':
      switchLanguage(event);
      break;
    case 'apply-theme':
      applyTheme();
      break;
    case 'apply-font':
      applyFont();
      break;
    case 'apply-borders':
      applyBorders();
      break;
    case 'reset-customizations':
      resetCustomizations();
      break;
  }
}

// ✅ Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyAoRdVB4cu6FGVnCbssFl-uTzGWSYHF_7o",
  authDomain: "usf-harmar-mqtt-dashboar-3a6ed.firebaseapp.com",
  projectId: "usf-harmar-mqtt-dashboar-3a6ed",
  storageBucket: "usf-harmar-mqtt-dashboar-3a6ed.firebasestorage.app",
  messagingSenderId: "469430781334",
  appId: "1:469430781334:web:d1fd378dd95a8753d289b7",
  measurementId: "G-JR8BJYRZFW"
};

firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// Collections
const emailCollection = db.collection('emailSubscribers');
const alertsCollection = db.collection('alerts');
const phoneCollection = db.collection('phoneSubscribers');

// Function to save alert to Firebase
async function saveAlertToFirebase(type, message) {
    try {
        await alertsCollection.add({
            type: type,
            message: message,
            timestamp: firebase.firestore.FieldValue.serverTimestamp()
        });
        console.log('Alert saved to Firebase');
    } catch (error) {
        console.error('Error saving alert to Firebase:', error);
    }
}

// 🔒 Set Firebase rules in Firestore console for testing:
// rules_version = '2';
// service cloud.firestore {
//   match /databases/{database}/documents {
//     match /{document=**} {
//       allow read, write: if true;
//     }
//   }
// }

// === Customization Settings ===
const SETTINGS_KEY = 'usf_harmar_settings';
let currentSettings = {
  theme: 'default',
  font: 'default',
  showBorders: false,
  fontSize: 'normal',
  language: 'en'
};

/**
 * Translates a key into the current language.
 * Falls back to English if translation is not found.
 * @param {string} key - The translation key to look up
 * @returns {string} The translated text
 */
function t(key) {
  return translations[currentLang]?.[key] || translations.en[key] || key;
}

/**
 * Updates all text content in the UI to the current language.
 * Ensures every text element in the application is translated.
 */
function updateAllText() {
    const currentLang = localStorage.getItem('language') || 'en';
    const texts = translations[currentLang];

    // Update all elements with data-translate attribute
    document.querySelectorAll('[data-translate]').forEach(element => {
        const key = element.getAttribute('data-translate');
        if (texts[key]) {
            if (element.tagName === 'INPUT' && element.type === 'text') {
                element.placeholder = texts[key];
            } else if (element.tagName === 'SELECT') {
                Array.from(element.options).forEach(option => {
                    const optionKey = option.getAttribute('data-translate');
                    if (optionKey && texts[optionKey]) {
                        option.textContent = texts[optionKey];
                    }
                });
            } else {
                element.textContent = texts[key];
            }
        }
    });

    // Login screen
    updateElementText('login-title', 'loginTitle');
    updateElementPlaceholder('login-username', 'username');
    updateElementPlaceholder('login-password', 'password');
    updateElementText('[data-action="login"]', 'loginButton');

    // Navigation
    updateElementText('.nav-title', 'dashboard');
    
    // Status section
    updateElementText('#status-title', 'liftSystemStatus');
    updateElementText('#mqttStatus', translations[currentLang].notConnected);
    updateElementText('#lastUpdate', translations[currentLang].never);
    updateElementText('#vplState', translations[currentLang].unknown);

    // Terminal sections
    updateElementText('#general-title', 'generalConsole');
    updateElementText('#commands-title', 'commandConsole');
    updateElementText('#alerts-title', 'alertConsole');
    updateElementPlaceholder('#terminal-input', 'typeCommand');

    // Customization section
    updateElementText('#customization-title', 'customization');
    updateElementText('label[for="themeSelector"]', 'theme');
    updateElementText('label[for="fontSelector"]', 'font');
    updateElementText('label[for="borderToggle"]', 'showBorders');
    updateElementText('#resetCustomizations', 'reset');

    // Update all buttons
    document.querySelectorAll('[data-action="clearTerminal"]').forEach(btn => 
        btn.textContent = translations[currentLang].clearTerminal);
    document.querySelectorAll('[data-action="export-log"]').forEach(btn => 
        btn.textContent = translations[currentLang].exportLog);
    document.querySelectorAll('[data-action="email-log"]').forEach(btn => 
        btn.textContent = translations[currentLang].emailLog);

    // Update selectors
    updateSelector('themeSelector', {
        'default': 'themeDefault',
        'dark': 'themeDark',
        'usf': 'themeUsf'
    });

    updateSelector('fontSelector', {
        'default': 'fontDefault',
        'monospace': 'fontMonospace',
        'sans-serif': 'fontSansSerif'
    });

    // Update language selector
    const languageSelector = document.getElementById('languageSelector');
    if (languageSelector) {
        languageSelector.innerHTML = `
            <option value="en">English</option>
            <option value="es">Español</option>
            <option value="fr">Français</option>
            <option value="de">Deutsch</option>
        `;
        languageSelector.value = currentLang;
    }

    // Update initial terminal messages if empty
    updateInitialTerminalMessages();
}

/**
 * Helper function to update element text content
 */
function updateElementText(selector, key) {
    const element = typeof selector === 'string' ? 
        document.querySelector(selector) : selector;
    if (element && translations[currentLang]?.[key]) {
        element.textContent = translations[currentLang][key];
    }
}

/**
 * Helper function to update input placeholder text
 */
function updateElementPlaceholder(selector, key) {
    const element = typeof selector === 'string' ? 
        document.getElementById(selector) : selector;
    if (element && translations[currentLang]?.[key]) {
        element.placeholder = translations[currentLang][key];
    }
}

/**
 * Helper function to update select options
 */
function updateSelector(id, options) {
    const selector = document.getElementById(id);
    if (selector) {
        Object.entries(options).forEach(([value, key]) => {
            const option = selector.querySelector(`option[value="${value}"]`);
            if (option) {
                option.textContent = translations[currentLang][key];
            }
        });
    }
}

/**
 * Updates initial terminal messages if they're in their default state
 */
function updateInitialTerminalMessages() {
    const terminals = {
        messageLog: 'waitingMessages',
        'command-log': 'waitingCommands',
        'alert-log': 'waitingAlerts'
    };

    Object.entries(terminals).forEach(([id, key]) => {
        const terminal = document.getElementById(id);
        if (terminal && (
            terminal.textContent.includes('Waiting for') || 
            terminal.textContent.trim() === ''
        )) {
            terminal.textContent = translations[currentLang][key];
        }
    });
}

/**
 * Switches the application language and updates the UI.
 * Saves the new language preference to settings.
 */
function switchLanguage(event) {
  const lang = event.target.value;
  if (!translations[lang]) {
    console.error('Translation not found for language:', lang);
    return;
  }
  
  currentLang = lang;
  currentSettings.language = lang;
  saveSettings();
  updateAllText();
  showMessage(t('languageChanged'), 'success');
}

/**
 * Loads saved settings from localStorage and updates UI elements.
 * Includes null checks for all UI elements.
 */
function loadSettings() {
  const saved = localStorage.getItem(SETTINGS_KEY);
  if (saved) {
    currentSettings = { ...currentSettings, ...JSON.parse(saved) };
    
    const themeSelector = document.getElementById('theme-selector');
    const fontSelector = document.getElementById('font-selector');
    const borderToggle = document.getElementById('border-toggle');
    const languageSelector = document.getElementById('language-selector');

    if (themeSelector) themeSelector.value = currentSettings.theme;
    if (fontSelector) fontSelector.value = currentSettings.font;
    if (borderToggle) borderToggle.checked = currentSettings.showBorders;
    if (languageSelector) languageSelector.value = currentSettings.language;
    
    currentLang = currentSettings.language || 'en';
  }
}

/**
 * Saves current settings to localStorage.
 */
function saveSettings() {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(currentSettings));
}

/**
 * Applies all current settings to the UI.
 * Includes theme, font, and border settings.
 */
function applySettings() {
  applyTheme();
  applyFont();
  applyBorders();
}

/**
 * Applies the selected theme to the application.
 * Updates body classes and saves the setting.
 */
function applyTheme() {
  const themeSelector = document.getElementById('themeSelector');
  if (!themeSelector) return;
  
  const theme = themeSelector.value;
  console.log('Applying theme:', theme);
  
  // Remove all theme classes first
  document.body.classList.remove('theme-default', 'theme-dark', 'theme-usf');
  
  // Apply the selected theme class
  document.body.classList.add('theme-' + theme);
  
  // Update status cards background for better visibility in different themes
  const statusCards = document.querySelectorAll('.status-card, .telemetry-card');
  statusCards.forEach(card => {
    card.classList.remove('theme-default', 'theme-dark', 'theme-usf');
    card.classList.add('theme-' + theme);
  });
  
  currentSettings.theme = theme;
  saveSettings();
  
  // Show feedback message
  showMessage(t('themeChanged'), 'success');
}

/**
 * Applies the selected font to the application.
 * Updates body font-family and saves the setting.
 */
function applyFont() {
  const fontSelector = document.getElementById('fontSelector');
  if (!fontSelector) return;
  
  const font = fontSelector.value;
  const fontMap = {
    'default': "'Segoe UI', sans-serif",
    'monospace': "'Courier New', monospace",
    'sans-serif': "Arial, sans-serif"
  };
  
  document.body.style.fontFamily = fontMap[font] || fontMap.default;
  currentSettings.font = font;
  saveSettings();
}

/**
 * Toggles border visibility on UI elements.
 * Updates element classes and saves the setting.
 */
function applyBorders() {
  const borderToggle = document.getElementById('borderToggle');
  if (!borderToggle) return;
  
  const showBorders = borderToggle.checked;
  document.querySelectorAll('.status-section, .tools-panel, pre').forEach(el => {
    if (showBorders) {
      el.classList.add('bordered');
    } else {
      el.classList.remove('bordered');
    }
  });
  
  currentSettings.showBorders = showBorders;
  saveSettings();
}

/**
 * Resets all customization settings to their defaults.
 * Updates UI elements and saves the default settings.
 */
function resetCustomizations() {
  currentSettings = {
    theme: 'default',
    font: 'default',
    showBorders: false,
    fontSize: 'normal'
  };
  
  document.getElementById('theme-selector').value = 'default';
  document.getElementById('font-selector').value = 'default';
  document.getElementById('border-toggle').checked = false;
  
  applySettings();
  saveSettings();
}

/**
 * Clears the specified terminal with an animation effect.
 * @param {string} id - The ID of the terminal element to clear
 */
function clearTerminal(id) {
    const el = document.getElementById(id);
    if (!el) return;
    
    // Add fade-out animation
    el.style.transition = 'opacity 0.5s ease';
    el.style.opacity = '0';
    
    // After fade out, clear content and show feedback
    setTimeout(() => {
        el.textContent = '';
        
        // Create and add feedback message
        const feedback = document.createElement('div');
        feedback.className = 'log-entry info';
        feedback.innerHTML = `[${new Date().toLocaleTimeString()}] Terminal cleared`;
        
        // Reset opacity and add feedback
        el.style.opacity = '1';
        el.appendChild(feedback);
        
        // Scroll to show feedback
        el.scrollTop = el.scrollHeight;
    }, 500);
}

// Add styles for clear animation
document.head.querySelector('style').textContent += `
  .terminal {
    transition: opacity 0.5s ease;
  }
`;

// Terminal logging functions
function logToTerminal(message, type = 'info') {
const messageLog = document.getElementById('messageLog');
    if (!messageLog) {
        console.error('Message log element not found');
        return;
    }
    
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    messageLog.appendChild(logEntry);
    messageLog.scrollTop = messageLog.scrollHeight;
    
    // Also log to console for debugging
    console.log(`[${type}] ${message}`);
}

function logToCommandTerminal(message, type = 'command') {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.innerHTML = `[${timestamp}] ${message}`;
    commandLog.appendChild(logEntry);
    commandLog.scrollTop = commandLog.scrollHeight;
}

/**
 * Sends an email alert to all subscribed email addresses
 * @param {string} type - The type of alarm
 * @param {string} message - The alarm message
 */
async function sendAlarmEmail(type, message) {
    const emailList = document.querySelectorAll('#emailList .email-item span');
    if (emailList.length === 0) return; // No subscribers

    try {
        // Send email to all subscribed addresses
        for (const emailElement of emailList) {
            const email = emailElement.textContent;
            await emailjs.send(
                "service_lsa1r4i",
                "template_5usevip",
                {
                    to_email: email,
                    subject: `[${type.toUpperCase()} ALARM] VPL Monitoring Alert`,
                    message: message,
                    timestamp: new Date().toLocaleString()
                }
            );
        }
        showMessage('Alarm email alerts sent successfully', 'success');
    } catch (error) {
        console.error('Failed to send alarm email:', error);
        showMessage('Failed to send alarm email: ' + error.message, 'error');
    }
}

function handleAlarm(alarm) {
    const timestamp = new Date().toLocaleTimeString();
    const alarmEntry = document.createElement('div');
    alarmEntry.className = `alarm-entry ${alarm.type}`;
    
    // Create message span
    const messageSpan = document.createElement('span');
    messageSpan.textContent = `[${timestamp}] ${alarm.message}`;
    
    // Create delete button
    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-alert';
    deleteBtn.innerHTML = '×';
    deleteBtn.title = 'Delete this alert';
    deleteBtn.onclick = () => alarmEntry.remove();
    
    // Add elements to alarm entry
    alarmEntry.appendChild(messageSpan);
    alarmEntry.appendChild(deleteBtn);
    
    // Add to appropriate alarm section based on the type from ESP32
    const alarmType = alarm.type.toLowerCase();
    const sectionId = `${alarmType}Alarms`;
    const alarmContainer = document.getElementById(sectionId);
    
    if (alarmContainer) {
        // Check if header already exists
        let header = alarmContainer.querySelector('.alarm-header');
        if (!header) {
            header = document.createElement('div');
            header.className = 'alarm-header';
            
            const title = document.createElement('h3');
            title.textContent = `${alarm.type.charAt(0).toUpperCase() + alarm.type.slice(1)} Alarms`;
            
            const clearBtn = document.createElement('button');
            clearBtn.className = 'clear-alerts-btn';
            clearBtn.textContent = 'Clear All';
            clearBtn.onclick = () => {
                const entries = alarmContainer.querySelectorAll('.alarm-entry');
                entries.forEach(entry => entry.remove());
            };
            
            header.appendChild(title);
            header.appendChild(clearBtn);
            alarmContainer.insertBefore(header, alarmContainer.firstChild);
        }
        
        // Add the new alarm entry after the header
        const firstEntry = alarmContainer.querySelector('.alarm-entry');
        if (firstEntry) {
            alarmContainer.insertBefore(alarmEntry, firstEntry);
        } else {
        alarmContainer.appendChild(alarmEntry);
        }
        
        // Also log to general terminal
        logToTerminal(`[${alarm.type.toUpperCase()} ALARM] ${alarm.message}`, 'warning');
        
        // Send email alerts
        sendAlarmEmail(alarm.type, alarm.message);
    }
}

// Terminal input handling
terminalInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        const command = terminalInput.value.trim().toUpperCase();
        if (command) {
            // Log the command to the command terminal
            logToCommandTerminal(`> ${command}`, 'command');
            
            // Create command payload
            const payload = {
                type: 'command',
                message: command,
                timestamp: new Date().toISOString()
            };
            
            // Publish to both general and command topics
            client.publish('usf/messages', JSON.stringify(payload), { qos: 1 }, (err) => {
                if (err) {
                    console.error('Failed to publish command:', err);
                    logToCommandTerminal('Failed to send command', 'error');
                }
            });
            
            // Handle specific lift commands
            if (command === 'UP' || command === 'DOWN' || command === 'STOP') {
                const liftPayload = {
                    type: 'command',
                    message: `COMMAND:${command}`,
                    timestamp: new Date().toISOString()
                };
                
                // Send to motor control topic
                client.publish('usf/messages', JSON.stringify(liftPayload), { qos: 1 }, (err) => {
                    if (err) {
                        console.error('Failed to send lift command:', err);
                        logToCommandTerminal('Failed to send lift command', 'error');
                    }
                });
            }
            
            // Clear the input
            terminalInput.value = '';
        }
    }
});

// Add helper buttons for lift control
const terminalContainer = document.getElementById('command-log').parentElement;
const controlButtonsDiv = document.createElement('div');
controlButtonsDiv.className = 'terminal-controls';
controlButtonsDiv.innerHTML = `
    <button onclick="sendLiftCommand('UP')">UP</button>
    <button onclick="sendLiftCommand('DOWN')">DOWN</button>
    <button onclick="sendLiftCommand('STOP')">STOP</button>
`;
terminalContainer.insertBefore(controlButtonsDiv, terminalInput);

// Add styles for the control buttons
document.head.querySelector('style').textContent += `
    .terminal-controls {
        margin: 10px 0;
        display: flex;
        gap: 10px;
    }
    .terminal-controls button {
        padding: 5px 15px;
        background-color: #4CAF50;
        color: white;
        border: none;
        border-radius: 4px;
        cursor: pointer;
    }
    .terminal-controls button:hover {
        background-color: #45a049;
    }
`;

// Function to send lift commands
window.sendLiftCommand = function(command) {
    const payload = {
        type: 'command',
        message: `COMMAND:${command}`,
        timestamp: new Date().toISOString()
    };
    
    // Log the command
    logToCommandTerminal(`> ${command}`, 'command');
    
    // Send to motor control topic
    client.publish('usf/messages', JSON.stringify(payload), { qos: 1 }, (err) => {
        if (err) {
            console.error('Failed to send lift command:', err);
            logToCommandTerminal('Failed to send lift command', 'error');
        }
    });
};

// Clear log buttons
document.querySelectorAll('[data-action="clearTerminal"]').forEach(button => {
    button.addEventListener('click', () => {
        const targetId = button.getAttribute('data-target');
        const terminal = document.getElementById(targetId);
        if (terminal) {
            terminal.innerHTML = '';
        }
        // Also clear logs on the ESP32 backend
        fetch('/clearTerminal')
            .then(res => res.text())
            .then(msg => {
                showMessage(msg || 'Logs cleared', 'success');
            })
            .catch(() => {
                showMessage('Failed to clear logs on device', 'error');
            });
    });
});

// Handle Login
function handleLogin(event) {
    if (!event) {
        console.error('Login event is undefined');
        return;
    }
    event.preventDefault();
    
    const usernameInput = document.getElementById('login-username');
    const passwordInput = document.getElementById('login-password');
    
    if (!usernameInput || !passwordInput) {
        console.error('Login form elements not found');
        showMessage(t('loginError'), 'error');
        return;
    }

    const username = usernameInput.value.trim();
    const password = passwordInput.value.trim();

    if (!username || !password) {
        showMessage(t('enterCredentials'), 'error');
        return;
    }

    if (username === 'admin' && password === 'admin') {
        loggedIn = true;
        const loginContainer = document.querySelector('.login-container');
        const mainApp = document.getElementById('main-app');
        
        if (!loginContainer || !mainApp) {
            console.error('Required DOM elements not found');
            return;
        }

        loginContainer.classList.add('hidden');
        mainApp.classList.remove('hidden');
        
        // Clear the form
        usernameInput.value = '';
        passwordInput.value = '';
        
        // Show success message
        showMessage(t('loginSuccess'), 'success');
    } else {
        loggedIn = false;
        showMessage(t('invalidCredentials'), 'error');
    }
}

// Handle Tab Switching
function handleTabSwitch(event) {
    const selectedTab = event.target.value;
    const tabContents = document.querySelectorAll('.tab-content');
    
    // First verify we have both the selected value and tab contents
    if (!selectedTab || !tabContents.length) {
        console.error('Tab switching error: Missing elements');
        return;
    }

    // Log for debugging
    console.log('Switching to tab:', selectedTab);

    // Show selected tab content and hide others
    tabContents.forEach(content => {
        if (content.id === selectedTab + '-tab') {
            content.classList.remove('hidden');
            console.log('Showing tab:', content.id);
        } else {
            content.classList.add('hidden');
            console.log('Hiding tab:', content.id);
        }
    });
}

// Send Command
function sendCommand(event) {
    if (event.key === 'Enter' && !event.shiftKey) {
        event.preventDefault();
        const command = terminalInput.value.trim();
        
        if (command) {
            const payload = {
                type: 'command',
                data: { command: command }
            };
            
            client.publish(topic, JSON.stringify(payload), (err) => {
                if (err) {
                    logToCommandTerminal('Error sending command: ' + err.message, 'error');
                } else {
                    logToCommandTerminal('Command sent: ' + command, 'success');
                }
            });
            
            terminalInput.value = '';
        }
    }
}

// Update Status Data
function updateStatusData(data) {
    const statusGrid = document.querySelector('.status-grid');
    if (!statusGrid) return;

    // Clear existing status cards
    statusGrid.innerHTML = '';

    // Create new status cards
    Object.entries(data).forEach(([key, value]) => {
        const card = document.createElement('div');
        card.className = 'status-card';
        card.innerHTML = `
            <h3>${key}</h3>
            <p>${value}</p>
        `;
        statusGrid.appendChild(card);
    });
}

// Update Telemetry Data
function updateTelemetryData(data) {
    const telemetryGrid = document.querySelector('.telemetry-grid');
    if (!telemetryGrid) return;

    // Clear existing telemetry cards
    telemetryGrid.innerHTML = '';

    // Create new telemetry cards
    Object.entries(data).forEach(([key, value]) => {
        const card = document.createElement('div');
        card.className = 'telemetry-card';
        card.innerHTML = `
            <h3>${key}</h3>
            <p>${typeof value === 'object' ? JSON.stringify(value) : value}</p>
        `;
        telemetryGrid.appendChild(card);
    });
}

// Add CSS for alarm styling
const style = document.createElement('style');
style.textContent = `
  .alarm-entry {
    padding: 8px;
    margin: 4px 0;
    border-radius: 4px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .alarm-entry.red {
    background-color: rgba(255, 0, 0, 0.1);
    border-left: 4px solid red;
  }
  .alarm-entry.amber {
    background-color: rgba(255, 165, 0, 0.1);
    border-left: 4px solid orange;
  }
  .alarm-entry.green {
    background-color: rgba(0, 255, 0, 0.1);
    border-left: 4px solid green;
  }
  .alarm-entry .delete-alert {
    background: none;
    border: none;
    color: #666;
    cursor: pointer;
    padding: 4px 8px;
    font-size: 16px;
    opacity: 0.6;
    transition: opacity 0.2s;
  }
  .alarm-entry .delete-alert:hover {
    opacity: 1;
  }
  .alarm-section {
    margin-bottom: 20px;
  }
  .alarm-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 10px;
  }
  .clear-alerts-btn {
    background-color: #f44336;
    color: white;
    border: none;
    padding: 5px 10px;
    border-radius: 4px;
    cursor: pointer;
    font-size: 12px;
    transition: background-color 0.2s;
  }
  .clear-alerts-btn:hover {
    background-color: #d32f2f;
  }
`;
document.head.appendChild(style);

// Add translations for email management
const emailTranslations = {
    en: {
        emailSettings: 'Email Settings',
        enterEmail: 'Enter email address',
        addEmail: 'Add Email',
        remove: 'Remove',
        invalidEmail: 'Invalid email address',
        emailAdded: 'Email added successfully',
        emailRemoved: 'Email removed successfully',
        errorAddingEmail: 'Error adding email',
        errorRemovingEmail: 'Error removing email',
        errorLoadingEmails: 'Error loading emails'
    },
    de: {
        emailSettings: 'E-Mail-Einstellungen',
        enterEmail: 'E-Mail-Adresse eingeben',
        addEmail: 'E-Mail hinzufügen',
        remove: 'Entfernen',
        invalidEmail: 'Ungültige E-Mail-Adresse',
        emailAdded: 'E-Mail erfolgreich hinzugefügt',
        emailRemoved: 'E-Mail erfolgreich entfernt',
        errorAddingEmail: 'Fehler beim Hinzufügen der E-Mail',
        errorRemovingEmail: 'Fehler beim Entfernen der E-Mail',
        errorLoadingEmails: 'Fehler beim Laden der E-Mails'
    }
};

// Update translations object
Object.keys(translations).forEach(lang => {
    translations[lang] = { ...translations[lang], ...emailTranslations[lang] };
});

// Make email functions globally accessible
window.addEmailSubscriber = async function() {
  const emailInput = document.getElementById('email-input');
  const email = emailInput.value.trim();
  
  if (!email || !validateEmail(email)) {
    showMessage(t('invalidEmail'), 'error');
    return;
  }

  try {
    await emailCollection.add({
      email: email,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    });
    
    emailInput.value = '';
    showMessage(t('emailAdded'), 'success');
    loadEmailSubscribers();
  } catch (error) {
    console.error('Error adding email:', error);
    showMessage(t('errorAddingEmail'), 'error');
  }
}

window.removeEmailSubscriber = async function(docId) {
  try {
    await emailCollection.doc(docId).delete();
    showMessage(t('emailRemoved'), 'success');
    loadEmailSubscribers();
  } catch (error) {
    console.error('Error removing email:', error);
    showMessage(t('errorRemovingEmail'), 'error');
  }
}

// Update the email tab creation to use event delegation instead of inline onclick
document.addEventListener('DOMContentLoaded', () => {
  const tabSelector = document.getElementById('tab-selector');
  if (tabSelector) {
    const emailOption = document.createElement('option');
    emailOption.value = 'email-settings';
    emailOption.textContent = t('emailSettings');
    tabSelector.appendChild(emailOption);
  }

  // Add email settings tab content
  const mainApp = document.getElementById('main-app');
  if (mainApp) {
    const emailTab = document.createElement('div');
    emailTab.id = 'email-settings-tab';
    emailTab.className = 'tab-content hidden';
    emailTab.innerHTML = `
      <h3>${t('emailSettings')}</h3>
      <div class="email-form">
        <input type="email" id="email-input" placeholder="${t('enterEmail')}">
        <button id="add-email-btn" data-action="add-email">${t('addEmail')}</button>
      </div>
      <div id="email-list" class="email-list"></div>
    `;
    mainApp.appendChild(emailTab);

    // Add event listener for the add email button
    const addEmailBtn = emailTab.querySelector('#add-email-btn');
    if (addEmailBtn) {
      addEmailBtn.addEventListener('click', window.addEmailSubscriber);
    }
  }

  // Load existing email subscribers
  loadEmailSubscribers();
});

// Update loadEmailSubscribers to use event delegation instead of inline onclick
async function loadEmailSubscribers() {
  const emailList = document.getElementById('email-list');
  if (!emailList) return;

  try {
    const snapshot = await emailCollection.get();
    emailList.innerHTML = '';
    
    snapshot.forEach(doc => {
      const div = document.createElement('div');
      div.className = 'email-item';
      const docId = doc.id;
      div.innerHTML = `
        <span>${doc.data().email}</span>
        <button data-docid="${docId}" data-action="remove-email">${t('remove')}</button>
      `;
      emailList.appendChild(div);
    });

    // Add event listeners for remove buttons using event delegation
    emailList.addEventListener('click', (e) => {
      const removeBtn = e.target.closest('[data-action="remove-email"]');
      if (removeBtn) {
        const docId = removeBtn.dataset.docid;
        window.removeEmailSubscriber(docId);
      }
    });
  } catch (error) {
    console.error('Error loading emails:', error);
    showMessage(t('errorLoadingEmails'), 'error');
  }
}

/**
 * Shows the email modal for sending logs
 * @param {string} targetId - The ID of the log to email
 */
function showEmailModal(targetId) {
    const modal = document.getElementById('emailModal');
    if (!modal) return;
    
    modal.classList.remove('hidden');
    modal.dataset.targetLog = targetId;
    
    // Clear any previous input
    const emailInput = document.getElementById('emailInput');
    if (emailInput) {
        emailInput.value = '';
    }
}

/**
 * Closes the email modal
 */
function closeEmailModal() {
    const modal = document.getElementById('emailModal');
    modal.classList.add('hidden');
    document.getElementById('emailInput').value = '';
}

/**
 * Sends the log content via email using EmailJS
 */
async function sendLogEmail() {
    const modal = document.getElementById('emailModal');
    const targetId = modal.dataset.targetLog;
    const emailInput = document.getElementById('emailInput');
    const terminal = document.getElementById(targetId);
    const submitButton = document.querySelector('[data-action="send-email"]');
    
    if (!terminal || !emailInput || !emailInput.value) {
        showMessage('Please enter an email address', 'error');
        return;
    }

    if (!emailInput.value.includes('@')) {
        showMessage('Please enter a valid email address', 'error');
        return;
    }

    try {
        // Disable submit button and show loading state
        if (submitButton) {
            submitButton.disabled = true;
            submitButton.textContent = t('sending');
        }

        // Send email using EmailJS
        await emailjs.send(
            "service_lsa1r4i", 
            "template_5usevip",
            {
                to_email: emailInput.value,
                from_name: "MQTT Dashboard",
                subject: `Log Export - ${targetId}`,
                message: terminal.innerText,
                timestamp: new Date().toLocaleString(),
                reply_to: emailInput.value
            }
        );
        
        showMessage('Email sent successfully', 'success');
        closeEmailModal();
    } catch (error) {
        console.error('Email error:', error);
        showMessage('Failed to send email: ' + error.message, 'error');
    } finally {
        // Re-enable submit button and restore text
        if (submitButton) {
            submitButton.disabled = false;
            submitButton.textContent = t('sendEmail');
        }
    }
}

/**
 * Shows a temporary message to the user
 * @param {string} message - The message to show
 * @param {string} type - The type of message ('success' or 'error')
 */
function showMessage(message, type = 'success') {
    const messageDiv = document.createElement('div');
    messageDiv.className = `${type}-message`;
    messageDiv.textContent = message;
    document.body.appendChild(messageDiv);
    
    setTimeout(() => {
        messageDiv.remove();
    }, 3000);
}

// Update the exportLog function:

function exportLog(targetId) {
    const terminal = document.getElementById(targetId);
    if (!terminal) return;

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `${targetId}-${timestamp}.log`;
    const logContent = terminal.innerText;
    
    const blob = new Blob([logContent], { type: 'text/plain' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    window.URL.revokeObjectURL(url);
    document.body.removeChild(a);
    
    showMessage(t('logExported'), 'success');
}

// Add event listener for language changes
document.getElementById('languageSelector').addEventListener('change', switchLanguage);

// Call updateAllText on page load
document.addEventListener('DOMContentLoaded', function() {
    const savedLang = localStorage.getItem('language') || 'en';
    document.getElementById('languageSelector').value = savedLang;
    updateAllText();
});

/**
 * Sends a test email to verify email alert configuration
 */
async function sendTestEmail() {
    const emailList = document.querySelectorAll('#emailList .email-item span');
    if (emailList.length === 0) {
        showMessage('Please add at least one email address first', 'error');
        return;
    }

    try {
        // Disable the test button while sending
        const testButton = document.querySelector('#testEmailBtn');
        if (testButton) {
            testButton.disabled = true;
            testButton.textContent = 'Sending...';
        }

        // Send test email to all subscribed addresses
        for (const emailElement of emailList) {
            const email = emailElement.textContent;
            await emailjs.send(
                "service_lsa1r4i",
                "template_5usevip",
                {
                    to_email: email,
                    subject: "Test Alert from VPL Monitoring System",
                    message: "This is a test alert from your VPL Monitoring System. If you received this, your email alerts are working correctly.",
                    timestamp: new Date().toLocaleString()
                }
            );
        }

        showMessage('Test email sent successfully!', 'success');
    } catch (error) {
        console.error('Failed to send test email:', error);
        showMessage('Failed to send test email: ' + error.message, 'error');
    } finally {
        // Re-enable the test button
        const testButton = document.querySelector('#testEmailBtn');
        if (testButton) {
            testButton.disabled = false;
            testButton.textContent = 'Send Test Email';
        }
    }
}

// Carrier email-to-SMS gateway mappings
const carrierGateways = {
    'verizon': 'vtext.com',
    'att': 'txt.att.net',
    'tmobile': 'tmomail.net',
    'sprint': 'messaging.sprintpcs.com',
    'boost': 'sms.myboostmobile.com',
    'cricket': 'sms.cricketwireless.net',
    'uscellular': 'email.uscc.net',
    'metro': 'mymetropcs.com',
};

/**
 * Sends an SMS alert using email-to-SMS gateways
 * @param {string} type - The type of alarm (red, amber, green)
 * @param {string} message - The alarm message
 */
async function sendSmsAlert(type, message) {
    if (!smsAlertEnabled.checked) return;
    
    const alertTypeEnabled = document.getElementById(`${type}AlertEnabled`).checked;
    if (!alertTypeEnabled) return;

    const phones = Array.from(phoneList.querySelectorAll('.phone-text'))
        .map(span => span.textContent);
    
    if (phones.length === 0) return;

    try {
        // For each phone number, try to send via email-to-SMS gateway
        for (const phone of phones) {
            // Get carrier selection for this phone (default to first carrier if not set)
            const carrierSelect = document.querySelector(`[data-phone="${phone}"]`);
            const carrier = carrierSelect ? carrierSelect.value : Object.keys(carrierGateways)[0];
            
            if (!carrier || !carrierGateways[carrier]) {
                console.warn(`No valid carrier selected for ${phone}`);
                continue;
            }

            // Format phone number (remove '+1' if present and any non-digit characters)
            const formattedPhone = phone.replace(/^\+1/, '').replace(/\D/g, '');
            
            // Construct email-to-SMS address
            const smsEmail = `${formattedPhone}@${carrierGateways[carrier]}`;

            // Send via EmailJS
            await emailjs.send(
                'service_lsa1r4i',  // Your EmailJS service ID
                'template_5usevip', // Your EmailJS template ID
                {
                    to_email: smsEmail,
                    alert_type: type.toUpperCase(),
                    alert_message: message.substring(0, 160), // SMS length limit
                    timestamp: new Date().toLocaleString()
                }
            );
        }
        console.log('SMS alerts sent successfully via email gateway');
    } catch (error) {
        console.error('Failed to send SMS alert:', error);
    }
}

// Add carrier selection UI when adding a phone number
function addPhoneToList(phone) {
  const phoneItem = document.createElement('div');
  phoneItem.className = 'phone-item';
  
  const phoneText = document.createElement('span');
  phoneText.className = 'phone-text';
  phoneText.textContent = phone;
  
  // Get the selected carrier from the dropdown
  const carrierSelect = document.createElement('select');
  carrierSelect.className = 'carrier-select';
  carrierSelect.setAttribute('data-phone', phone);
  
  // Add carrier options
  Object.entries(carrierGateways).forEach(([carrier, domain]) => {
    const option = document.createElement('option');
    option.value = carrier;
    option.textContent = carrier.charAt(0).toUpperCase() + carrier.slice(1);
    carrierSelect.appendChild(option);
  });
  
  // Set initial carrier from the input dropdown
  const initialCarrier = document.getElementById('carrierSelect').value;
  carrierSelect.value = initialCarrier;
  
  const deleteBtn = document.createElement('button');
  deleteBtn.className = 'delete-btn';
  deleteBtn.innerHTML = '&times;';
  deleteBtn.onclick = () => {
    phoneItem.remove();
    savePhoneData();
  };
  
  phoneItem.appendChild(phoneText);
  phoneItem.appendChild(carrierSelect);
  phoneItem.appendChild(deleteBtn);
  phoneList.appendChild(phoneItem);
  
  // Save phone data including carrier
  savePhoneData();
  
  // Save carrier selection when changed
  carrierSelect.addEventListener('change', savePhoneData);
}

// Function to save both phone numbers and their carriers
function savePhoneData() {
  const phones = [];
  const carrierSelections = {};
  
  document.querySelectorAll('.phone-item').forEach(item => {
    const phone = item.querySelector('.phone-text').textContent;
    const carrier = item.querySelector('.carrier-select').value;
    phones.push(phone);
    carrierSelections[phone] = carrier;
  });
  
  localStorage.setItem('phones', JSON.stringify(phones));
  localStorage.setItem('carrierSelections', JSON.stringify(carrierSelections));
}

// Add phone button click handler
document.getElementById('addPhoneBtn').addEventListener('click', () => {
  const phoneInput = document.getElementById('phoneInput');
  const phone = phoneInput.value.trim();
  const validationMsg = document.getElementById('phoneValidationMsg');
  
  if (!phone) {
    validationMsg.textContent = 'Please enter a phone number';
    validationMsg.style.color = '#ff4444';
    return;
  }
  
  // Check if phone number already exists
  const existingPhones = Array.from(document.querySelectorAll('.phone-text'))
    .map(span => span.textContent);
  if (existingPhones.includes(phone)) {
    validationMsg.textContent = 'This phone number is already in the list';
    validationMsg.style.color = '#ff4444';
    return;
  }
  
  addPhoneToList(phone);
  phoneInput.value = '';
  validationMsg.textContent = 'Phone number added successfully';
  validationMsg.style.color = '#4CAF50';
  setTimeout(() => {
    validationMsg.textContent = '';
  }, 3000);
});

/**
 * Loads phone subscribers from Firestore and updates the UI
 */
async function loadPhoneSubscribers() {
    const phoneList = document.getElementById('phoneList');
    if (!phoneList) return;

    try {
        const snapshot = await phoneCollection.get();
        phoneList.innerHTML = '';
        
        snapshot.forEach(doc => {
            const div = document.createElement('div');
            div.className = 'phone-item';
            const docId = doc.id;
            div.innerHTML = `
                <span>${doc.data().phone}</span>
                <button data-docid="${docId}" data-action="remove-phone">${t('remove')}</button>
            `;
            phoneList.appendChild(div);
        });

        // Add event listeners for remove buttons using event delegation
        phoneList.addEventListener('click', (e) => {
            const removeBtn = e.target.closest('[data-action="remove-phone"]');
            if (removeBtn) {
                const docId = removeBtn.dataset.docid;
                removePhoneSubscriber(docId);
            }
        });
    } catch (error) {
        console.error('Error loading phone numbers:', error);
        showMessage(t('errorLoadingPhones'), 'error');
    }
}

/**
 * Adds a new phone subscriber to Firestore
 */
async function addPhoneSubscriber() {
    const phoneInput = document.getElementById('phoneInput');
    const phone = phoneInput.value.trim();
    
    if (!phone) {
        showMessage(t('enterValidPhone'), 'error');
        return;
    }

    try {
        await phoneCollection.add({
            phone: phone,
            createdAt: new Date()
        });
        
        phoneInput.value = '';
        await loadPhoneSubscribers();
        showMessage(t('phoneAdded'), 'success');
    } catch (error) {
        console.error('Error adding phone:', error);
        showMessage(t('errorAddingPhone'), 'error');
    }
}

/**
 * Removes a phone subscriber from Firestore
 * @param {string} docId - The Firestore document ID
 */
async function removePhoneSubscriber(docId) {
    try {
        await phoneCollection.doc(docId).delete();
        await loadPhoneSubscribers();
        showMessage(t('phoneRemoved'), 'success');
    } catch (error) {
        console.error('Error removing phone:', error);
        showMessage(t('errorRemovingPhone'), 'error');
    }
}

/**
 * Logs a message to the control terminal with proper styling
 * @param {string} message - The message to log
 * @param {string} type - The type of log ('info', 'error', 'command')
 */
function logToControlTerminal(message, type = 'info') {
    const controlTerminal = document.getElementById('controlTerminal');
    if (!controlTerminal) {
        console.error('Control terminal element not found');
        return;
    }

    const timestamp = new Date().toLocaleTimeString();
    const logEntry = document.createElement('div');
    logEntry.className = `log-entry ${type}`;
    logEntry.textContent = `[${timestamp}] ${message}`;
    
    controlTerminal.appendChild(logEntry);
    controlTerminal.scrollTop = controlTerminal.scrollHeight;
}

// Update the control functions to use the new log types
function startAction(direction) {
    if (!client || !client.connected) {
        showError('Cannot send command: MQTT client is not connected');
        return;
    }
    
    const topic = 'usf/logs/command';
    const message = direction.toLowerCase();
    client.publish(topic, message);
    
    // Log the action to the control terminal
    const controlTerminal = document.getElementById('controlTerminal');
    if (controlTerminal) {
        appendToTerminal(controlTerminal, `Movement command sent: ${direction.toUpperCase()}`, 'command');
    }
}

function stopAction() {
    if (!client || !client.connected) {
        showError('Cannot send command: MQTT client is not connected');
        return;
    }
    
    const topic = 'usf/logs/command';
    client.publish(topic, 'stop');
    
    // Log the action to the control terminal
    const controlTerminal = document.getElementById('controlTerminal');
    if (controlTerminal) {
        appendToTerminal(controlTerminal, 'Movement STOPPED', 'command');
    }
}

function applyBrake() {
    if (!client || !client.connected) {
        showError('Cannot send command: MQTT client is not connected');
        return;
    }
    
    const topic = 'usf/logs/command';
    client.publish(topic, 'brake');
    
    // Log the action to the control terminal
    const controlTerminal = document.getElementById('controlTerminal');
    if (controlTerminal) {
        appendToTerminal(controlTerminal, 'Brake APPLIED', 'command');
    }
}

function releaseBrake() {
    if (!client || !client.connected) {
        showError('Cannot send command: MQTT client is not connected');
        return;
    }
    
    const topic = 'usf/logs/command';
    client.publish(topic, 'release');
    
    // Log the action to the control terminal
    const controlTerminal = document.getElementById('controlTerminal');
    if (controlTerminal) {
        appendToTerminal(controlTerminal, 'Brake RELEASED', 'command');
    }
}

// Add styles for control buttons
document.head.querySelector('style').textContent += `
    .control-buttons {
        display: flex;
        flex-direction: column;
        gap: 15px;
        max-width: 300px;
        margin: 20px auto;
    }
    
    .control-btn {
        padding: 15px 30px;
        font-size: 18px;
        font-weight: bold;
        border: none;
        border-radius: 8px;
        cursor: pointer;
        transition: all 0.3s ease;
        background-color: #4CAF50;
        color: white;
        text-transform: uppercase;
    }
    
    .control-btn:hover {
        transform: scale(1.05);
        background-color: #45a049;
    }
    
    .control-btn:active {
        transform: scale(0.95);
    }
    
    .control-btn:disabled {
        background-color: #cccccc;
        cursor: not-allowed;
    }
    
    /* Specific button colors */
    .control-btn:nth-child(1) { background-color: #2196F3; } /* UP */
    .control-btn:nth-child(2) { background-color: #f44336; } /* STOP */
    .control-btn:nth-child(3) { background-color: #2196F3; } /* DOWN */
    .control-btn:nth-child(4) { background-color: #ff9800; } /* BRAKE */
    .control-btn:nth-child(5) { background-color: #4CAF50; } /* RELEASE */
    
    .control-btn:nth-child(1):hover { background-color: #1976D2; }
    .control-btn:nth-child(2):hover { background-color: #d32f2f; }
    .control-btn:nth-child(3):hover { background-color: #1976D2; }
    .control-btn:nth-child(4):hover { background-color: #f57c00; }
    .control-btn:nth-child(5):hover { background-color: #388E3C; }
`;
