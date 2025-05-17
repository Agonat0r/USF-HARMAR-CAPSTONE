// Language translations for UI elements
export const translations = {
  en: {
    // Login
    loginTitle: "🔐 USF Harmar MQTT Login",
    username: "Username",
    password: "Password",
    loginButton: "Login",
    loginSuccess: "Login successful",
    loginError: "Login failed",
    invalidCredentials: "Invalid username or password",
    enterCredentials: "Please enter username and password",

    // Navigation
    dashboard: "VPL Monitoring Dashboard",
    status: "Status",
    general: "General",
    controls: "Controls",
    commands: "Commands",
    alerts: "Alerts",
    customization: "Customization",
    emailAlerts: "Email Alerts",

    // Status Panel
    connectionStatus: "Connection Status",
    notConnected: "Not Connected",
    connected: "Connected",
    lastUpdate: "Last Update",
    never: "Never",
    vplState: "VPL State",
    unknown: "Unknown",
    position: "Position",
    speed: "Speed",
    temperature: "Temperature",

    // Console
    generalConsole: "General Terminal",
    commandConsole: "Command Terminal",
    alertConsole: "Alert Terminal",
    clearTerminal: "Clear",
    exportLog: "Export",
    emailLog: "Email",
    waitingMessages: "Waiting for messages...",
    waitingCommands: "Waiting for commands...",
    waitingAlerts: "Waiting for alerts...",
    typeCommand: "Type a command and press Enter",

    // Customization
    theme: "Theme",
    themeDefault: "Default Theme",
    themeDark: "Dark Theme",
    themeUsf: "USF Theme",
    font: "Font",
    fontDefault: "Default Font",
    fontMonospace: "Monospace",
    fontSansSerif: "Sans Serif",
    showBorders: "Show Borders",
    reset: "Reset to Default",
    languageChanged: "Language changed successfully",
    themeChanged: "Theme changed successfully",

    // Email Alerts
    emailSettings: "Email Settings",
    enterEmail: "Enter email address",
    addEmail: "Add Email",
    remove: "Remove",
    invalidEmail: "Invalid email address",
    emailAdded: "Email added successfully",
    emailRemoved: "Email removed successfully",
    errorAddingEmail: "Error adding email",
    errorRemovingEmail: "Error removing email",
    errorLoadingEmails: "Error loading emails",
    sending: "Sending...",
    sendEmail: "Send Email",
    emailSent: "Email sent successfully",
    emailError: "Failed to send email",
    logExported: "Log exported successfully",

    // SMS Alerts
    smsSettings: "SMS Settings",
    enterPhone: "Enter phone number",
    addPhone: "Add Phone",
    invalidPhone: "Invalid phone number",
    phoneAdded: "Phone number added successfully",
    phoneRemoved: "Phone number removed successfully",
    errorAddingPhone: "Error adding phone number",
    errorRemovingPhone: "Error removing phone number",
    errorLoadingPhones: "Error loading phone numbers",
    sendingSMS: "Sending SMS...",
    smsSent: "SMS sent successfully",
    smsError: "Failed to send SMS",

    // Language
    language: "Language:",
    languageChanged: "Language updated",

    // Logs and Email
    logCleared: "Log cleared",

    // Connection Status
    subscribed: "🔔 Subscribed to topic: ",
    mqttError: "❌ MQTT Error: ",
    reconnecting: "🔁 Reconnecting...",

    phoneAlerts: "Phone Alerts",
    enterValidPhone: "Please enter a valid phone number",

    emailModalTitle: "Send Log via Email",
    emailPlaceholder: "Enter email address",
    sending: "Sending...",
    enterEmailAddress: "Please enter an email address",

    // --- NEW KEYS FOR FULL TRANSLATION COVERAGE ---
    // These keys ensure all data-translate attributes in index.html are covered in every language
    commandConsole: "Command Terminal",
    enterEmail: "Enter email address",
    enterPhone: "Enter phone number (e.g., +1234567890)",
    addEmail: "Add Email",
    addPhone: "Add Phone",
    sendTestEmail: "Send Test Email",
    sendTestSMS: "Send Test SMS",
    smsAlerts: "SMS Alerts"
  },
  de: {
    // Login
    loginTitle: "🔐 USF Harmar MQTT Anmeldung",
    username: "Benutzername",
    password: "Passwort",
    loginButton: "Anmelden",
    invalidCredentials: "❌ Ungültige Anmeldedaten",

    // Navigation
    dashboard: "VPL Überwachungs-Dashboard",
    status: "Status",
    general: "Allgemein",
    commands: "Befehle",
    alerts: "Warnungen",
    customization: "Anpassung",

    // Status Panel
    liftSystemStatus: "Aufzugsystem-Status",
    connectionStatus: "Verbindungsstatus",
    notConnected: "Nicht Verbunden",
    lastUpdate: "Letzte Aktualisierung",
    never: "Nie",
    vplState: "VPL-Zustand",
    unknown: "Unbekannt",
    position: "Position",
    speed: "Geschwindigkeit",
    temperature: "Temperatur",

    // Console
    generalConsole: "Allgemeines Terminal",
    terminal: "🖥️ Terminal",
    commandConsole: "Befehlsterminal",
    alertConsole: "Warnungskonsole",
    waitingMessages: "Warte auf Nachrichten...",
    terminalInitialized: "[Terminal initialisiert]",
    waitingCommands: "Warte auf Befehle...",
    waitingAlerts: "Warte auf Warnungen...",
    typeCommand: "Befehl eingeben...",

    // Customization
    theme: "Theme:",
    themeDefault: "Standard-Theme",
    themeDark: "Dunkles Theme",
    themeUsf: "USF-Theme",
    font: "Schriftart:",
    fontDefault: "Standard-Schriftart",
    fontMonospace: "Monospace",
    fontSansSerif: "Sans Serif",
    showBorders: "Ränder Anzeigen",
    reset: "Zurücksetzen",

    // Language
    language: "Sprache:",
    languageChanged: "Sprache aktualisiert",

    // Logs and Email
    clearTerminal: "Terminal Löschen",
    exportLog: "Log Exportieren",
    emailLog: "Per Email Senden",
    logExported: "Log erfolgreich exportiert",
    enterEmail: "E-Mail-Adresse eingeben",
    sendEmail: "Senden",
    cancel: "Abbrechen",
    emailSent: "Email erfolgreich gesendet",
    emailError: "Fehler beim Senden der Email",
    logCleared: "Log gelöscht",

    // Connection Status
    connected: "✅ Verbunden mit MQTT Broker",
    subscribed: "🔔 Abonniert Thema: ",
    mqttError: "❌ MQTT Fehler: ",
    reconnecting: "🔁 Verbinde neu...",

    emailModalTitle: "Log per E-Mail senden",
    emailPlaceholder: "E-Mail-Adresse eingeben",
    sending: "Senden...",
    invalidEmail: "Bitte geben Sie eine gültige E-Mail-Adresse ein",
    enterEmailAddress: "Bitte geben Sie eine E-Mail-Adresse ein",

    // --- NEUE SCHLÜSSEL FÜR VOLLE ÜBERSETZUNGSABDECKUNG ---
    commandConsole: "Befehlsterminal",
    enterEmail: "E-Mail-Adresse eingeben",
    enterPhone: "Telefonnummer eingeben (z.B. +491234567890)",
    addEmail: "E-Mail hinzufügen",
    addPhone: "Telefonnummer hinzufügen",
    sendTestEmail: "Test-E-Mail senden",
    sendTestSMS: "Test-SMS senden",
    smsAlerts: "SMS-Benachrichtigungen"
  },
  es: {
    // Login
    loginTitle: "🔐 USF Harmar MQTT Inicio de Sesión",
    username: "Usuario",
    password: "Contraseña",
    loginButton: "Iniciar Sesión",
    invalidCredentials: "❌ Credenciales inválidas",

    // Navigation
    dashboard: "Panel de Control VPL",
    status: "Estado",
    general: "General",
    commands: "Comandos",
    alerts: "Alertas",
    customization: "Personalización",

    // Status Panel
    liftSystemStatus: "Estado del Sistema de Elevación",
    connectionStatus: "Estado de Conexión",
    notConnected: "No Conectado",
    lastUpdate: "Última Actualización",
    never: "Nunca",
    vplState: "Estado VPL",
    unknown: "Desconocido",
    position: "Posición",
    speed: "Velocidad",
    temperature: "Temperatura",

    // Console
    generalConsole: "Terminal General",
    terminal: "🖥️ Terminal",
    commandConsole: "Terminal de Comandos",
    alertConsole: "Consola de Alertas",
    waitingMessages: "Esperando mensajes...",
    terminalInitialized: "[Terminal Inicializado]",
    waitingCommands: "Esperando comandos...",
    waitingAlerts: "Esperando alertas...",
    typeCommand: "Escriba un comando...",

    // Customization
    theme: "Tema:",
    themeDefault: "Tema Predeterminado",
    themeDark: "Tema Oscuro",
    themeUsf: "Tema USF",
    font: "Fuente:",
    fontDefault: "Fuente Predeterminada",
    fontMonospace: "Monoespaciada",
    fontSansSerif: "Sans Serif",
    showBorders: "Mostrar Bordes",
    reset: "Restablecer",

    // Language
    language: "Idioma:",
    languageChanged: "Idioma actualizado",

    // Logs and Email
    clearTerminal: "Limpiar Terminal",
    exportLog: "Exportar Registro",
    emailLog: "Enviar por Email",
    logExported: "Registro exportado exitosamente",
    enterEmail: "Ingrese dirección de email",
    sendEmail: "Enviar",
    cancel: "Cancelar",
    emailSent: "Email enviado exitosamente",
    emailError: "Error al enviar el email",
    logCleared: "Registro limpiado",

    // Connection Status
    connected: "✅ Conectado al broker MQTT",
    subscribed: "🔔 Suscrito al tema: ",
    mqttError: "❌ Error MQTT: ",
    reconnecting: "🔁 Reconectando...",

    phoneAlerts: "Alertas por Teléfono",
    enterPhone: "Ingrese número de teléfono",
    addPhone: "Agregar Teléfono",
    sendTestSMS: "Enviar SMS de Prueba",
    phoneAdded: "Número de teléfono agregado exitosamente",
    phoneRemoved: "Número de teléfono eliminado",
    errorAddingPhone: "Error al agregar número de teléfono",
    errorRemovingPhone: "Error al eliminar número de teléfono",
    errorLoadingPhones: "Error al cargar números de teléfono",
    enterValidPhone: "Por favor ingrese un número de teléfono válido",

    emailModalTitle: "Enviar Registro por Email",
    emailPlaceholder: "Ingrese dirección de email",
    sending: "Enviando...",
    invalidEmail: "Por favor ingrese un email válido",
    enterEmailAddress: "Por favor ingrese una dirección de email",

    // --- NUEVAS CLAVES PARA COBERTURA COMPLETA DE TRADUCCIÓN ---
    commandConsole: "Terminal de Comandos",
    enterEmail: "Ingrese dirección de email",
    enterPhone: "Ingrese número de teléfono (ej. +1234567890)",
    addEmail: "Agregar correo",
    addPhone: "Agregar teléfono",
    sendTestEmail: "Enviar correo de prueba",
    sendTestSMS: "Enviar SMS de prueba",
    smsAlerts: "Alertas SMS"
  },
  fr: {
    // Login
    loginTitle: "🔐 USF Harmar MQTT Connexion",
    username: "Nom d'utilisateur",
    password: "Mot de passe",
    loginButton: "Connexion",
    invalidCredentials: "❌ Identifiants invalides",

    // Navigation
    dashboard: "Tableau de Bord VPL",
    status: "État",
    general: "Général",
    commands: "Commandes",
    alerts: "Alertes",
    customization: "Personnalisation",

    // Status Panel
    liftSystemStatus: "État du Système d'Ascenseur",
    connectionStatus: "État de la Connexion",
    notConnected: "Non Connecté",
    lastUpdate: "Dernière Mise à Jour",
    never: "Jamais",
    vplState: "État VPL",
    unknown: "Inconnu",
    position: "Position",
    speed: "Vitesse",
    temperature: "Température",

    // Console
    generalConsole: "Terminal Général",
    terminal: "🖥️ Terminal",
    commandConsole: "Terminal de Commandes",
    alertConsole: "Console d'Alertes",
    waitingMessages: "En attente de messages...",
    terminalInitialized: "[Terminal Initialisé]",
    waitingCommands: "En attente de commandes...",
    waitingAlerts: "En attente d'alertes...",
    typeCommand: "Tapez une commande...",

    // Customization
    theme: "Thème:",
    themeDefault: "Thème par Défaut",
    themeDark: "Thème Sombre",
    themeUsf: "Thème USF",
    font: "Police:",
    fontDefault: "Police par Défaut",
    fontMonospace: "Monospace",
    fontSansSerif: "Sans Serif",
    showBorders: "Afficher les Bordures",
    reset: "Réinitialiser",

    // Language
    language: "Langue:",
    languageChanged: "Langue mise à jour",

    // Logs and Email
    clearTerminal: "Effacer Terminal",
    exportLog: "Exporter Journal",
    emailLog: "Envoyer par Email",
    logExported: "Journal exporté avec succès",
    enterEmail: "Entrez l'adresse email",
    sendEmail: "Envoyer",
    cancel: "Annuler",
    emailSent: "Email envoyé avec succès",
    emailError: "Erreur lors de l'envoi de l'email",
    logCleared: "Journal effacé",

    // Connection Status
    connected: "✅ Connecté au broker MQTT",
    subscribed: "🔔 Abonné au sujet: ",
    mqttError: "❌ Erreur MQTT: ",
    reconnecting: "🔁 Reconnexion...",

    emailModalTitle: "Envoyer le Journal par Email",
    emailPlaceholder: "Entrez l'adresse email",
    sending: "Envoi en cours...",
    invalidEmail: "Veuillez entrer une adresse email valide",
    enterEmailAddress: "Veuillez entrer une adresse email",

    // --- NOUVELLES CLÉS POUR UNE COUVERTURE DE TRADUCTION COMPLÈTE ---
    commandConsole: "Terminal de Commandes",
    enterEmail: "Entrez l'adresse e-mail",
    enterPhone: "Entrez le numéro de téléphone (ex. +1234567890)",
    addEmail: "Ajouter un e-mail",
    addPhone: "Ajouter un téléphone",
    sendTestEmail: "Envoyer un e-mail de test",
    sendTestSMS: "Envoyer un SMS de test",
    smsAlerts: "Alertes SMS"
  }
};

// Export the translations
export default translations; 