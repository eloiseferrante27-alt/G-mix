# Usage Directory

This directory contains utility scripts and tools that are not part of the main frontend or backend applications.

## Contents

- `extract_source_maps.py` - Python script for extracting TypeScript source code from Next.js source maps

## Scripts

### extract_source_maps.py

This script extracts TypeScript/JavaScript source code from Next.js source map files. It was used to recover the frontend source code from the `.next/static/chunks` directory.

Usage:
```bash
python extract_source_maps.py
```

The script:
1. Scans the `.next/static/chunks` directory for source map files
2. Parses the source map JSON
3. Reconstructs the original source code
4. Saves the recovered files to the `frontend/src` directory