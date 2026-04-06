#!/usr/bin/env python
"""
Startup script that sets Windows event loop policy and configures uvicorn properly.
Run with: python run_server.py [port]
"""

import asyncio
import sys

# Set the event loop policy BEFORE importing uvicorn
if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())

import uvicorn

if __name__ == "__main__":
    port = int(sys.argv[1]) if len(sys.argv) > 1 else 8001
    
    # Create config with WindowsSelectorEventLoop factory
    config = uvicorn.Config(
        "app:app",
        host="127.0.0.1",
        port=port,
        reload=False,
        loop="selector" if sys.platform == "win32" else "auto",
    )
    server = uvicorn.Server(config)
    asyncio.run(server.serve())
