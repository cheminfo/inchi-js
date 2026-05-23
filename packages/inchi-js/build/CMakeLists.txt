# Build configuration for the InChI WebAssembly module.
#
# Adapted from:
#   https://github.com/IUPAC-InChI/InChI-Web-Demo/blob/main/inchi/INCHI_WEB/CMakeLists.txt
# Copyright (c) IUPAC-InChI. MIT-licensed.

cmake_minimum_required(VERSION 3.15)
project(InchiWeb C)

add_definitions(-D_GNU_SOURCE)

set(INCHI_OUTPUT_NAME "inchi" CACHE STRING "Output filename (without extension)")
set(MODULE_NAME "inchiModule" CACHE STRING "Emscripten module export name")
set(INCHI_SOURCE_ROOT "${CMAKE_CURRENT_SOURCE_DIR}/../../../vendor/inchi/INCHI-1-SRC" CACHE PATH "InChI C source root")

set(P_BASE "${INCHI_SOURCE_ROOT}/INCHI_BASE/src")
set(P_API "${INCHI_SOURCE_ROOT}/INCHI_API/libinchi/src")

file(GLOB BASE_SOURCES "${P_BASE}/*.c")
file(GLOB API_SOURCES "${P_API}/*.c")
set(MAIN_SOURCE "${CMAKE_CURRENT_SOURCE_DIR}/inchi_web.c")

add_executable(${INCHI_OUTPUT_NAME} ${MAIN_SOURCE} ${BASE_SOURCES} ${API_SOURCES})

target_include_directories(${INCHI_OUTPUT_NAME} PRIVATE ${P_BASE} ${P_API})
target_compile_definitions(${INCHI_OUTPUT_NAME} PRIVATE
    COMPILE_ANSI_ONLY
    TARGET_EXE_STANDALONE
    TARGET_API_LIB
)

target_compile_options(${INCHI_OUTPUT_NAME} PRIVATE -std=gnu99 -O3)

if(EMSCRIPTEN)
    set(EXPORTED_FUNCTIONS "_inchi_from_molfile,_inchikey_from_inchi,_molfile_from_inchi,_molfile_from_auxinfo,_structure_from_inchi,_malloc,_free")
    set(EXPORTED_RUNTIME_METHODS "ccall,cwrap,UTF8ToString,stringToUTF8,lengthBytesUTF8")

    target_link_options(${INCHI_OUTPUT_NAME} PRIVATE
        "-sEXPORTED_FUNCTIONS=${EXPORTED_FUNCTIONS}"
        "-sEXPORTED_RUNTIME_METHODS=${EXPORTED_RUNTIME_METHODS}"
        "-sEXPORT_NAME='${MODULE_NAME}'"
        "-sMODULARIZE"
        "-sENVIRONMENT=web"
        "-sSTACK_SIZE=2097152"
        "-sALLOW_MEMORY_GROWTH=1"
        "-O3"
    )

    set_target_properties(${INCHI_OUTPUT_NAME} PROPERTIES SUFFIX ".js")
endif()
