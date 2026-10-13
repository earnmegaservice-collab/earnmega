#!/bin/bash
npm run dev > dev_server.log 2>&1 &
echo $! > dev_server.pid
