# cmake_file_for_HMI.cmake
# CMake build script for HMI firmware (ESP-IDF)
# - Collects source files for LVGL demos, UI printer, and tuner
# - Registers required ESP-IDF components

# Collect LVGL demo sources
set(LV_DEMO_DIR ../managed_components/lvgl__lvgl/demos)
file(GLOB_RECURSE LV_DEMOS_SOURCES ${LV_DEMO_DIR}/*.c)

# Collect UI printer sources
set(UI_PRINTER_DIR ./ui_printer)
file(GLOB_RECURSE UI_PRINTER_SOURCES ${UI_PRINTER_DIR}/*.c)

# Collect UI tuner sources
set(UI_TUNER_DIR ./ui_tuner)
file(GLOB_RECURSE UI_TUNER_SOURCES ${UI_TUNER_DIR}/*.c)

# Register the component with ESP-IDF
idf_component_register(
    SRCS
        "main.c"
        ${LV_DEMOS_SOURCES}
        ${UI_PRINTER_SOURCES}
        ${UI_TUNER_SOURCES}
    INCLUDE_DIRS
        "."
        ${LV_DEMO_DIR}
        ${UI_PRINTER_DIR}/include
        ${UI_TUNER_DIR}/include
    PRIV_REQUIRES
        esp_timer
        esp_netif 
        esp_event
        nvs_flash 
        esp_wifi
        lvgl
        esp32_s3_lcd_ev_board
        mqtt
        spiffs  
	esp_lcd
	PRIV_REQUIRES driver esp_wifi json
	PRIV_REQUIRES json
)

# Set compiler options for warnings and LVGL include behavior
target_compile_options(${COMPONENT_LIB} PRIVATE -Wno-unused-variable -Wno-format -DLV_LVGL_H_INCLUDE_SIMPLE)



