cmake_minimum_required(VERSION 3.10)
project(soulcare LANGUAGES CXX)

set(BINARY_NAME "soulcare")

cmake_policy(SET CMP0063 NEW)

set(CMAKE_INSTALL_PREFIX "${CMAKE_BINARY_DIR}/install")

set(FLUTTER_MANAGED_DIR "${CMAKE_CURRENT_SOURCE_DIR}/flutter")

include("${FLUTTER_MANAGED_DIR}/generated_plugins.cmake" OPTIONAL)
