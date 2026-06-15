# ECHO (Electronic Cognitive Holographic Origin)

## About the Project
Echo is a premium, local-first desktop assistant interface designed to act as the primary visual control center for the OpenJarvis framework. Styled with a sophisticated gray-themed liquid glassmorphic aesthetic, the dashboard provides realtime system telemetry monitoring, streaming conversational intelligence interfaces, operational safety control toggles, dynamic network mapping frames, and custom canvas-based particle orb animations that shift visually based on system execution states.

## Architecture & Framework Connections
The front-end is engineered using modular vanilla JavaScript components driven by a centralized reactive state machine layer. The system orchestrator monitors connections to the local OpenJarvis server engine via automated telemetry polling. If the local backend server is unreachable or offline, Echo gracefully transitions into an isolated, local simulation engine ("Demo Mode"), enabling full visualization of animation states, chat responses, and layout rendering independent of local hosting networks.

## Launch Instructions

1. Prepare Your Desktop Directory
Ensure you are currently targeting your project root inside your Terminal application:
cd ~/Desktop/echo

2. Boot the Local Server Matrix
Initialize the lightweight background node runner to host your asset files locally:
npm start

3. Access the Active Interface
Open your web browser of choice and target the active local server execution port:
http://localhost:3000

## Functional Directory Mapping
* index.html — The core UI layout structure and DOM element entry grid.
* server.js — Active local HTTP hosting manager and custom MIME-type router.
* package.json — Startup configurations, scripts, and basic app declarations.
* src/styles/ — Cohesive aesthetic design assets, styling variables, and frosted glass element configurations.
* src/js/main.js — Core system orchestrator, global lifecycle state controller, and backend client bridge.
* src/js/components/ — Modularized individual interface elements (HUD telemetry, terminal log consoles, voice engines).
EOF
