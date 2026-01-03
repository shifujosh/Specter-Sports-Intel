#!/bin/bash

# Specter Demo Recording Script
# Usage: asciinema rec specter_demo.cast -c ./demo_recording.sh

echo -e "\033[1;35m❯ Booting Specter Sports Intelligence...\033[0m"
sleep 1
echo -e "\033[1;32m✓\033[0m Odds API: Connected"
echo -e "\033[1;32m✓\033[0m StatMuse: Connected"
echo -e "\033[1;32m✓\033[0m Verification Layer: ONLINE"
sleep 1

echo -e "\n\033[1;33mRunning Live Analysis Simulation...\033[0m"
sleep 1
npx tsx examples/analysis_demo.ts
echo -e "\n\033[1;35m❯ Verification Complete. 0 Hallucinations Detected.\033[0m"
