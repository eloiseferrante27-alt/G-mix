import json
import os
from pathlib import Path

# Directory containing source maps
source_maps_dir = Path('apps/web/.next/dev/server/chunks/ssr')
output_dir = Path('frontend_recovered')
output_dir.mkdir(exist_ok=True)

extracted_files = {}

# Find all .map files
for map_file in source_maps_dir.rglob('*.map'):
    try:
        with open(map_file, 'r', encoding='utf-8') as f:
            data = json.load(f)
        
        # Check if it has sections with embedded sources
        if 'sections' in data:
            for section in data['sections']:
                if 'map' in section and 'sources' in section['map'] and 'sourcesContent' in section['map']:
                    sources = section['map']['sources']
                    contents = section['map']['sourcesContent']
                    
                    for source_path, content in zip(sources, contents):
                        if content and source_path:
                            # Extract the relative path from the file:// URL
                            if source_path.startswith('file:///'):
                                source_path = source_path[8:]
                            
                            # Only keep files from our project
                            if 'G-MIX_Program' in source_path and 'node_modules' not in source_path:
                                # Extract the path after 'apps/web/'
                                if 'apps/web/' in source_path:
                                    rel_path = source_path.split('apps/web/')[1]
                                    # Skip non-file paths (proxies, internal files, etc.)
                                    if rel_path.endswith('.ts') or rel_path.endswith('.tsx') or rel_path.endswith('.js'):
                                        # Clean up any URL encoding
                                        rel_path = rel_path.split('?')[0].split('%20')[0]
                                        if rel_path not in extracted_files:
                                            extracted_files[rel_path] = content
                                            print(f'Found: {rel_path}')
    except Exception as e:
        print(f'Error processing {map_file}: {e}')

# Write extracted files
for rel_path, content in extracted_files.items():
    output_path = output_dir / rel_path
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write(content)
    print(f'Written: {output_path}')

print(f'\nTotal files extracted: {len(extracted_files)}')