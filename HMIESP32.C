// main.c - Full ESP32-S3 MQTT UI over WSS with SPIFFS + LVGL UI + Sidebar Navigation
//
// This firmware runs on the ESP32-S3-LCD-EV-BOARD and provides a touchscreen HMI for the VPL system.
// - Connects to WiFi and MQTT broker (over secure WebSocket)
// - Uses LVGL for a modern, multi-tab touchscreen UI
// - Receives and displays logs, alerts, and commands from MQTT
// - Allows user to control the lift (UP/DOWN, mode switch) via MQTT
// - Supports language selection and basic settings
// - Uses SPIFFS for local file storage

#include <stdio.h> // Standard I/O functions
#include <string.h> // String manipulation functions
#include <dirent.h> // Directory operations for SPIFFS
#include "freertos/FreeRTOS.h" // FreeRTOS core
#include "freertos/task.h" // FreeRTOS task management
#include "freertos/semphr.h" // FreeRTOS semaphores for thread safety
#include "esp_log.h" // ESP-IDF logging macros
#include "esp_event.h" // ESP-IDF event loop
#include "esp_netif.h" // ESP-IDF network interface
#include "esp_wifi.h" // ESP-IDF WiFi driver
#include "esp_spiffs.h" // ESP-IDF SPIFFS filesystem
#include "esp_tls.h" // ESP-IDF TLS/SSL support
#include "mqtt_client.h" // ESP-IDF MQTT client
#include "nvs_flash.h" // ESP-IDF non-volatile storage
#include "bsp/esp-bsp.h" // Board support package for ESP32-S3-LCD-EV-BOARD
#include "lvgl.h" // LVGL graphics library for UI
#include "esp_sntp.h" // SNTP for time sync
#include "cJSON.h" // cJSON for JSON parsing

// ===== WiFi and MQTT Configuration =====
#define WIFI_SSID "Flugel" // WiFi network name
#define WIFI_PASS "dogecoin" // WiFi password
#define MQTT_URI        "wss://lb88002c.ala.us-east-1.emqxsl.com:8084/mqtt" // MQTT broker URI (WSS)
#define MQTT_USERNAME   "Carlos" // MQTT username
#define MQTT_PASSWORD   "mqtt2025" // MQTT password
#define MQTT_TOPIC      "usf/messages" // Main MQTT topic

// ===== Root CA Certificate for Secure MQTT Connection =====
// This certificate is used to verify the MQTT broker's identity.
static const char *ca_cert =
"-----BEGIN CERTIFICATE-----\n"
"MIIDrzCCApegAwIBAgIQCDvgVpBCRrGhdWrJWZHHSjANBgkqhkiG9w0BAQUFADBh\n"
"MQswCQYDVQQGEwJVUzEVMBMGA1UEChMMRGlnaUNlcnQgSW5jMRkwFwYDVQQLExB3\n"
"d3cuZGlnaWNlcnQuY29tMSAwHgYDVQQDExdEaWdpQ2VydCBHbG9iYWwgUm9vdCBD\n"
"QTAeFw0wNjExMTAwMDAwMDBaFw0zMTExMTAwMDAwMDBaMGExCzAJBgNVBAYTAlVT\n"
"MRUwEwYDVQQKEwxEaWdpQ2VydCBJbmMxGTAXBgNVBAsTEHd3dy5kaWdpY2VydC5j\n"
"b20xIDAeBgNVBAMTF0RpZ2lDZXJ0IEdsb2JhbCBSb290IENBMIIBIjANBgkqhkiG\n"
"9w0BAQEFAAOCAQ8AMIIBCgKCAQEA4jvhEXLeqKTTo1eqUKKPC3eQyaKl7hLOllsB\n"
"CSDMAZOnTjC3U/dDxGkAV53ijSLdhwZAAIEJzs4bg7/fzTtxRuLWZscFs3YnFo97\n"
"nh6Vfe63SKMI2tavegw5BmV/Sl0fvBf4q77uKNd0f3p4mVmFaG5cIzJLv07A6Fpt\n"
"43C/dxC//AH2hdmoRBBYMql1GNXRor5H4idq9Joz+EkIYIvUX7Q6hL+hqkpMfT7P\n"
"T19sdl6gSzeRntwi5m3OFBqOasv+zbMUZBfHWymeMr/y7vrTC0LUq7dBMtoM1O/4\n"
"gdW7jVg/tRvoSSiicNoxBN33shbyTApOB6jtSj1etX+jkMOvJwIDAQABo2MwYTAO\n"
"BgNVHQ8BAf8EBAMCAYYwDwYDVR0TAQH/BAUwAwEB/zAdBgNVHQ4EFgQUA95QNVbR\n"
"TLtm8KPiGxvDl7I90VUwHwYDVR0jBBgwFoAUA95QNVbRTLtm8KPiGxvDl7I90VUw\n"
"DQYJKoZIhvcNAQEFBQADggEBAMucN6pIExIK+t1EnE9SsPTfrgT1eXkIoyQY/Esr\n"
"hMAtudXH/vTBH1jLuG2cenTnmCmrEbXjcKChzUyImZOMkXDiqw8cvpOp/2PV5Adg\n"
"06O/nVsJ8dWO41P0jmP6P6fbtGbfYmbW0W5BjfIttep3Sp+dWOIrWcBAI+0tKIJF\n"
"PnlUkiaY4IBIqDfv8NZ5YBberOgOzW6sRBc4L0na4UU+Krk2U886UAb3LujEV0ls\n"
"YSEY1QSteDwsOoBrp+uvFRTp2InBuThs4pFsiv9kuXclVzDAGySj4dzp30d8tbQk\n"
"CAUw7C29C79Fv1C5qfPrmAESrciIxpg0X40KPMbp1ZWVbd4=\n"
"-----END CERTIFICATE-----\n";

// ===== Global Variables and UI Handles =====
static const char *TAG = "MQTT_UI"; // Tag for ESP-IDF logging

static lv_obj_t *label_status, *terminal; // UI objects for status label and terminal
static lv_obj_t *tabview; // LVGL tabview object
static lv_obj_t *tabs[5]; // Array of tab objects (Home, Logs, Controls, Settings, About)
static SemaphoreHandle_t term_mutex; // Mutex for thread-safe terminal updates
static esp_mqtt_client_handle_t mqtt_client = NULL; // MQTT client handle
static bool mqtt_connected = false; // MQTT connection status
static char term_buf[4096]; // Buffer for terminal output
static int term_pos = 0; // Current position in terminal buffer
static lv_obj_t *alert_terminal; // UI object for alerts-only terminal
static char alert_buf[4096]; // Buffer for alert messages
static int alert_pos = 0; // Current position in alert buffer
static bool elevator_mode = true;  // true = elevator mode, false = lift mode
static lv_obj_t *mode_switch; // UI object for mode switch
static lv_obj_t *mode_label; // UI object for mode label

// ===== Function Prototypes =====
void mqtt_start(); // Start MQTT client
void send_mqtt(const char *cmd); // Send a command over MQTT
void btn_up_press_cb(lv_event_t *e); // Callback for UP button press
void btn_up_release_cb(lv_event_t *e); // Callback for UP button release
void btn_down_press_cb(lv_event_t *e); // Callback for DOWN button press
void btn_down_release_cb(lv_event_t *e); // Callback for DOWN button release
void btn_up_click_cb(lv_event_t *e); // Callback for UP button click (elevator mode)
void btn_down_click_cb(lv_event_t *e); // Callback for DOWN button click (elevator mode)
void mode_switch_cb(lv_event_t *e); // Callback for mode switch toggle
void handle_mqtt_alert(const char* type, const char* message, const char* timestamp); // Handle incoming alert

int _write(int fd, const char *data, int size) {
    if (fd == 1 && term_mutex) {
        xSemaphoreTake(term_mutex, portMAX_DELAY);
        for (int i = 0; i < size && term_pos < sizeof(term_buf) - 1; i++) {
            term_buf[term_pos++] = data[i];
        }
        term_buf[term_pos] = '\0';
        xSemaphoreGive(term_mutex);
    }
    return size;
}

void sync_time() {
    ESP_LOGI(TAG, "⏰ Initializing SNTP...");
    esp_sntp_setoperatingmode(SNTP_OPMODE_POLL);
    esp_sntp_setservername(0, "pool.ntp.org");
    esp_sntp_init();
    time_t now = 0;
    struct tm timeinfo = { 0 };
    int retry = 0;
    const int retry_count = 10;
    while (timeinfo.tm_year < (2022 - 1900) && ++retry < retry_count) {
        vTaskDelay(2000 / portTICK_PERIOD_MS);
        time(&now);
        localtime_r(&now, &timeinfo);
    }
    if (timeinfo.tm_year >= (2022 - 1900)) {
        ESP_LOGI(TAG, "✅ Time synced: %s", asctime(&timeinfo));
    } else {
        ESP_LOGW(TAG, "⚠️ Failed to sync time!");
    }
}

void spiffs_init() {
    esp_vfs_spiffs_conf_t conf = {
        .base_path = "/spiffs",
        .max_files = 3,
        .format_if_mount_failed = false
    };
    esp_err_t ret = esp_vfs_spiffs_register(&conf);
    if (ret != ESP_OK) {
        ESP_LOGE(TAG, "SPIFFS mount failed (%s)", esp_err_to_name(ret));
    } else {
        ESP_LOGI(TAG, "SPIFFS mounted successfully");
    }
}

void wifi_event_handler(void* arg, esp_event_base_t base, int32_t id, void* data) {
    if (base == WIFI_EVENT && id == WIFI_EVENT_STA_START) {
        esp_wifi_connect();
    } else if (base == WIFI_EVENT && id == WIFI_EVENT_STA_DISCONNECTED) {
        mqtt_connected = false;
        lv_label_set_text(label_status, "Wi-Fi Disconnected");
        esp_wifi_connect();
    } else if (base == IP_EVENT && id == IP_EVENT_STA_GOT_IP) {
        ip_event_got_ip_t* event = (ip_event_got_ip_t*) data;
        lv_label_set_text(label_status, "Wi-Fi Connected. Starting MQTT...");
        mqtt_start();
    }
}

void wifi_init() {
    esp_netif_init();
    esp_event_loop_create_default();
    esp_netif_create_default_wifi_sta();
    esp_event_handler_register(WIFI_EVENT, ESP_EVENT_ANY_ID, &wifi_event_handler, NULL);
    esp_event_handler_register(IP_EVENT, IP_EVENT_STA_GOT_IP, &wifi_event_handler, NULL);
    wifi_init_config_t cfg = WIFI_INIT_CONFIG_DEFAULT();
    esp_wifi_init(&cfg);
    wifi_config_t wifi_config = {
        .sta = {
            .ssid = WIFI_SSID,
            .password = WIFI_PASS,
            .threshold.authmode = WIFI_AUTH_WPA2_PSK,
            .pmf_cfg = {.capable = true, .required = false}
        },
    };
    esp_wifi_set_mode(WIFI_MODE_STA);
    esp_wifi_set_config(WIFI_IF_STA, &wifi_config);
    esp_wifi_start();
}

void handle_mqtt_alert(const char* type, const char* message, const char* timestamp) {
    if (!alert_terminal) return;

    // Format the alert message
    char alert_msg[512];
    snprintf(alert_msg, sizeof(alert_msg), "[%s] %s: %s\n", timestamp, type, message);

    // Add to alert buffer
    xSemaphoreTake(term_mutex, portMAX_DELAY);
    int len = strlen(alert_msg);
    if (alert_pos + len < sizeof(alert_buf)) {
        memcpy(alert_buf + alert_pos, alert_msg, len);
        alert_pos += len;
        alert_buf[alert_pos] = '\0';
    }
    xSemaphoreGive(term_mutex);

    // Update the LVGL terminal
    lv_textarea_set_text(alert_terminal, alert_buf);
    lv_obj_scroll_to_y(alert_terminal, LV_COORD_MAX, LV_ANIM_OFF);
}

void mqtt_event_handler(void *handler_args, esp_event_base_t base, int32_t event_id, void *event_data) {
    esp_mqtt_event_handle_t event = event_data;
    switch (event_id) {
        case MQTT_EVENT_CONNECTED:
            mqtt_connected = true;
            esp_mqtt_client_subscribe(mqtt_client, MQTT_TOPIC, 0);
            esp_mqtt_client_subscribe(mqtt_client, "usf/logs/command", 0);  // Add command topic
            esp_mqtt_client_subscribe(mqtt_client, "usf/logs/alerts", 0);   // Add alerts topic
            lv_label_set_text(label_status, "MQTT Connected!");
            break;

        case MQTT_EVENT_DATA: {
            // Null terminate the data for safe string operations
            char *data = strndup(event->data, event->data_len);
            cJSON *root = cJSON_Parse(data);
            
            if (root) {
                cJSON *type = cJSON_GetObjectItem(root, "type");
                cJSON *message = cJSON_GetObjectItem(root, "message");
                cJSON *timestamp = cJSON_GetObjectItem(root, "timestamp");
                
                if (type && message && timestamp) {
                    char formatted_msg[512];
                    
                    // Format based on message type
                    if (strcmp(type->valuestring, "command") == 0) {
                        snprintf(formatted_msg, sizeof(formatted_msg), 
                                "[%s] COMMAND: %s\n", 
                                timestamp->valuestring, 
                                message->valuestring);
                    }
                    else if (strstr("red amber green", type->valuestring)) {
                        snprintf(formatted_msg, sizeof(formatted_msg), 
                                "[%s] ALERT (%s): %s\n", 
                                timestamp->valuestring, 
                                type->valuestring, 
                                message->valuestring);
                    }
                    
                    // Add to terminal
                    xSemaphoreTake(term_mutex, portMAX_DELAY);
                    if (term_pos + strlen(formatted_msg) < sizeof(term_buf)) {
                        strcpy(term_buf + term_pos, formatted_msg);
                        term_pos += strlen(formatted_msg);
                    }
                    xSemaphoreGive(term_mutex);
                    
                    // Also update alert terminal for alerts
                    if (strstr("red amber green", type->valuestring)) {
                        handle_mqtt_alert(type->valuestring, message->valuestring, timestamp->valuestring);
                    }
                }
                cJSON_Delete(root);
            }
            free(data);
            break;
        }

        case MQTT_EVENT_DISCONNECTED:
            mqtt_connected = false;
            lv_label_set_text(label_status, "MQTT Disconnected");
            break;

        case MQTT_EVENT_ERROR:
            lv_label_set_text(label_status, "MQTT Error");
            break;
    }
}

void mqtt_start() {
    esp_mqtt_client_config_t mqtt_cfg = {
        .broker.address.uri = MQTT_URI,
        .broker.verification.certificate = (const char *)ca_cert,
        .credentials.username = MQTT_USERNAME,
        .credentials.authentication.password = MQTT_PASSWORD,
    };
    mqtt_client = esp_mqtt_client_init(&mqtt_cfg);
    esp_mqtt_client_register_event(mqtt_client, ESP_EVENT_ANY_ID, mqtt_event_handler, NULL);
    esp_mqtt_client_start(mqtt_client);
}

void btn_up_press_cb(lv_event_t *e) {
    if (!elevator_mode) {
        send_mqtt("COMMAND:UP");
    }
}

void btn_up_release_cb(lv_event_t *e) {
    if (!elevator_mode) {
        send_mqtt("COMMAND:STOP");
    }
}

void btn_down_press_cb(lv_event_t *e) {
    if (!elevator_mode) {
        send_mqtt("COMMAND:DOWN");
    }
}

void btn_down_release_cb(lv_event_t *e) {
    if (!elevator_mode) {
        send_mqtt("COMMAND:STOP");
    }
}

void btn_up_click_cb(lv_event_t *e) {
    if (elevator_mode) {
        send_mqtt("COMMAND:UP");
    }
}

void btn_down_click_cb(lv_event_t *e) {
    if (elevator_mode) {
        send_mqtt("COMMAND:DOWN");
    }
}

void mode_switch_cb(lv_event_t *e) {
    lv_obj_t *sw = lv_event_get_target(e);
    elevator_mode = lv_obj_has_state(sw, LV_STATE_CHECKED);
    lv_label_set_text(mode_label, elevator_mode ? "Elevator Mode" : "Lift Mode");
}

void send_mqtt(const char *cmd) {
    if (mqtt_connected) {
        // Create JSON object for the command
        cJSON *root = cJSON_CreateObject();
        cJSON_AddStringToObject(root, "type", "command");
        cJSON_AddStringToObject(root, "message", cmd);
        
        // Get current time for timestamp
        time_t now;
        struct tm timeinfo;
        time(&now);
        localtime_r(&now, &timeinfo);
        char timestamp[64];
        strftime(timestamp, sizeof(timestamp), "%Y-%m-%dT%H:%M:%S", &timeinfo);
        cJSON_AddStringToObject(root, "timestamp", timestamp);
        
        // Convert to string
        char *json_str = cJSON_Print(root);
        
        // Publish to both general and command topics
        esp_mqtt_client_publish(mqtt_client, MQTT_TOPIC, json_str, 0, 1, 0);
        esp_mqtt_client_publish(mqtt_client, "usf/logs/command", json_str, 0, 1, 0);  // Send to command console
        
        lv_label_set_text_fmt(label_status, "Sent: %s", cmd);
        
        // Cleanup
        free(json_str);
        cJSON_Delete(root);
    } else {
        lv_label_set_text(label_status, "MQTT Not Connected");
    }
}

void terminal_task(void *arg) {
    while (1) {
        vTaskDelay(pdMS_TO_TICKS(200));
        xSemaphoreTake(term_mutex, portMAX_DELAY);
        if (term_pos > 0) {
            lv_textarea_add_text(terminal, term_buf);
            lv_textarea_set_cursor_pos(terminal, LV_TEXTAREA_CURSOR_LAST);
            term_pos = 0;
        }
        xSemaphoreGive(term_mutex);
    }
}

void switch_tab_cb(lv_event_t *e) {
    int id = (int)lv_event_get_user_data(e);
    lv_tabview_set_act(tabview, id, LV_ANIM_ON);
}

void create_sidebar_tabs(lv_obj_t *parent) {
    static const char *tab_names[] = { "Home", "Logs", "Controls", "Settings", "About" };
    for (int i = 0; i < 5; i++) {
        lv_obj_t *btn = lv_btn_create(parent);
        lv_obj_set_size(btn, 100, 50);
        lv_obj_align(btn, LV_ALIGN_TOP_LEFT, 5, 20 + i * 60);
        lv_obj_add_event_cb(btn, switch_tab_cb, LV_EVENT_CLICKED, (void*)(intptr_t)i);
        lv_obj_t *lbl = lv_label_create(btn);
        lv_label_set_text(lbl, tab_names[i]);
        lv_obj_center(lbl);
    }
}

void update_language_cb(lv_event_t *e) {
    lv_obj_t *dropdown = lv_event_get_target(e);
    uint16_t selected = lv_dropdown_get_selected(dropdown);
    static const char *translations[][5] = {
        {"Home", "Logs", "Controls", "Settings", "About"},
        {"主页", "日志", "控制", "设置", "关于"},
        {"मुखपृष्ठ", "लॉग्स", "नियंत्रण", "सेटिंग्स", "जानकारी"},
        {"Inicio", "Registros", "Controles", "Configuración", "Acerca de"},
        {"Accueil", "Journaux", "Commandes", "Paramètres", "À propos"},
        {"الصفحة الرئيسية", "السجلات", "عناصر التحكم", "الإعدادات", "حول"},
        {"হোম", "লগস", "নিয়ন্ত্রণ", "সেটিংস", "সম্বন্ধে"},
        {"Главная", "Журналы", "Управление", "Настройки", "О программе"},
        {"Início", "Registos", "Controles", "Configurações", "Sobre"},
        {"ہوم", "لاگز", "کنٹرولز", "ترتیبات", "کے بارے میں"},
    };
    for (int i = 0; i < 5; i++) {
        lv_obj_t *btn = lv_obj_get_child(lv_scr_act(), i);
        if (btn && lv_obj_get_class(btn) == &lv_btn_class) {
            lv_obj_t *label = lv_obj_get_child(btn, 0);
            lv_label_set_text(label, translations[selected][i]);
        }
    }
}

void ui_init() {
    tabview = lv_tabview_create(lv_scr_act(), LV_DIR_RIGHT, 120);
    lv_obj_set_size(tabview, LV_HOR_RES, LV_VER_RES);
    for (int i = 0; i < 5; i++) {
        tabs[i] = lv_tabview_add_tab(tabview, "");
    }

    create_sidebar_tabs(lv_scr_act());

    // Status label shown at the top of the Home tab
    label_status = lv_label_create(tabs[0]);
    lv_label_set_text(label_status, "Status: Initializing...");
    lv_obj_align(label_status, LV_ALIGN_TOP_MID, 40, 10);

    // Modify terminal creation for better visibility
    terminal = lv_textarea_create(tabs[1]);
    lv_obj_set_size(terminal, LV_HOR_RES - 140, (LV_VER_RES - 40) / 2);
    lv_obj_align(terminal, LV_ALIGN_TOP_MID, 20, 10);
    lv_textarea_set_cursor_click_pos(terminal, false);
    // Remove password mode and enable text display
    lv_obj_clear_flag(terminal, LV_OBJ_FLAG_CLICKABLE);
    lv_textarea_set_text(terminal, "=== Command and Alert Terminal ===\n");
    lv_textarea_set_placeholder_text(terminal, "Waiting for messages...");
    
    // Style the terminal
    lv_obj_set_style_bg_color(terminal, lv_color_hex(0x000000), LV_PART_MAIN);
    lv_obj_set_style_text_color(terminal, lv_color_hex(0x00FF00), LV_PART_MAIN);
    lv_obj_set_style_border_color(terminal, lv_color_hex(0x404040), LV_PART_MAIN);
    lv_obj_set_style_border_width(terminal, 2, LV_PART_MAIN);

    // Create alert terminal below the main terminal
    alert_terminal = lv_textarea_create(tabs[1]);
    lv_obj_set_size(alert_terminal, LV_HOR_RES - 140, (LV_VER_RES - 40) / 2);
    lv_obj_align_to(alert_terminal, terminal, LV_ALIGN_OUT_BOTTOM_MID, 0, 10);
    lv_textarea_set_cursor_click_pos(alert_terminal, false);
    lv_obj_clear_flag(alert_terminal, LV_OBJ_FLAG_CLICKABLE);
    lv_textarea_set_text(alert_terminal, "=== Alerts Only Terminal ===\n");
    lv_textarea_set_placeholder_text(alert_terminal, "Waiting for alerts...");
    
    // Style the alert terminal
    lv_obj_set_style_bg_color(alert_terminal, lv_color_hex(0x000000), LV_PART_MAIN);
    lv_obj_set_style_text_color(alert_terminal, lv_color_hex(0xFF0000), LV_PART_MAIN);
    lv_obj_set_style_border_color(alert_terminal, lv_color_hex(0x404040), LV_PART_MAIN);
    lv_obj_set_style_border_width(alert_terminal, 2, LV_PART_MAIN);

    // Add mode switch and label in the Controls tab
    mode_label = lv_label_create(tabs[2]);
    lv_label_set_text(mode_label, "Elevator Mode");
    lv_obj_align(mode_label, LV_ALIGN_TOP_MID, 0, 10);

    mode_switch = lv_switch_create(tabs[2]);
    lv_obj_add_state(mode_switch, LV_STATE_CHECKED);
    lv_obj_align_to(mode_switch, mode_label, LV_ALIGN_OUT_BOTTOM_MID, 0, 10);
    lv_obj_add_event_cb(mode_switch, mode_switch_cb, LV_EVENT_VALUE_CHANGED, NULL);

    // Create UP button with multiple event handlers
    lv_obj_t *btn_up = lv_btn_create(tabs[2]);
    lv_obj_set_size(btn_up, 100, 60);
    lv_obj_align(btn_up, LV_ALIGN_TOP_MID, 40, 80);
    lv_obj_t *up_lbl = lv_label_create(btn_up);
    lv_label_set_text(up_lbl, "UP");
    lv_obj_center(up_lbl);
    
    // Add all event handlers for UP button
    lv_obj_add_event_cb(btn_up, btn_up_click_cb, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(btn_up, btn_up_press_cb, LV_EVENT_PRESSED, NULL);
    lv_obj_add_event_cb(btn_up, btn_up_release_cb, LV_EVENT_RELEASED, NULL);

    // Create DOWN button with multiple event handlers
    lv_obj_t *btn_down = lv_btn_create(tabs[2]);
    lv_obj_set_size(btn_down, 100, 60);
    lv_obj_align(btn_down, LV_ALIGN_BOTTOM_MID, 40, -40);
    lv_obj_t *down_lbl = lv_label_create(btn_down);
    lv_label_set_text(down_lbl, "DOWN");
    lv_obj_center(down_lbl);
    
    // Add all event handlers for DOWN button
    lv_obj_add_event_cb(btn_down, btn_down_click_cb, LV_EVENT_CLICKED, NULL);
    lv_obj_add_event_cb(btn_down, btn_down_press_cb, LV_EVENT_PRESSED, NULL);
    lv_obj_add_event_cb(btn_down, btn_down_release_cb, LV_EVENT_RELEASED, NULL);

    // Label in Settings tab for introducing language selection
    lv_obj_t *settings_label = lv_label_create(tabs[3]);
    lv_label_set_text(settings_label, "Select Language:");
    lv_obj_align(settings_label, LV_ALIGN_TOP_MID, 0, 20);

    static const char *languages[] = {
        "English", "Mandarin", "Hindi", "Spanish", "French",
        "Arabic", "Bengali", "Russian", "Portuguese", "Urdu"
    };
    // Dropdown for language selection in Settings tab
    lv_obj_t *dd = lv_dropdown_create(tabs[3]);
    lv_dropdown_set_options(dd, "English\n"
                            "Mandarin\n"
                            "Hindi\n"
                            "Spanish\n"
                            "French\n"
                            "Arabic\n"
                            "Bengali\n"
                            "Russian\n"
                            "Portuguese\n"
                            "Urdu");
    lv_obj_set_width(dd, 160);
    lv_obj_align(dd, LV_ALIGN_TOP_MID, 0, 60);

    lv_obj_add_event_cb(dd, update_language_cb, LV_EVENT_VALUE_CHANGED, NULL);
    // Label in About tab describing the app purpose
    lv_obj_t *about_label = lv_label_create(tabs[4]);
    lv_label_set_text(about_label, "This application showcases MQTT + UI on ESP32-S3.");
    lv_obj_align(about_label, LV_ALIGN_CENTER, 0, 0);
}

void app_main(void) {
    ESP_LOGI(TAG, "Starting MQTT UI...");
    ESP_ERROR_CHECK(nvs_flash_init());
    bsp_display_start();
    bsp_display_backlight_on();
    ui_init();
    term_mutex = xSemaphoreCreateMutex();
    spiffs_init();
    wifi_init();
    sync_time();
    xTaskCreate(terminal_task, "term", 4096, NULL, 5, NULL);
    while (1) {
        lv_timer_handler();
        vTaskDelay(pdMS_TO_TICKS(10));
    }
}
