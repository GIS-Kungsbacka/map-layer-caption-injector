# Map Layer Caption Injector

A Node.js tool that automatically injects captions and sublayer information from a layers configuration file into map configuration files. Perfect for mapping services, and any project that needs to synchronize layer metadata across different configuration files.

## Features

-  **Automatic Caption Injection**: Matches layer IDs between map and layers files and injects captions
-  **Nested Group Support**: Recursively processes nested group structures
-  **Sublayer Processing**: Handles complex layer groups with sublayers (e.g., road types)
-  **Smart Caption Logic**:
  - Uses `layersInfo` captions for groups with 2+ sublayers
  - Uses main object caption for single sublayers
  - Skips empty captions entirely
-  **Visual Tree Output**: Generates folder-style tree diagrams showing the layer structure
-  **Batch Processing**: Process multiple map:layers pairs in one command
-  **Flexible Input**: Supports WMS, WFS, Vector, and WFST layers

## Requirements

- Node.js 16+ (uses ES modules)
- No external dependencies
- The groups array config from the LayerSwitcher tools array in the map.json (get rid of everything else)

## Installation

```bash
git clone https://github.com/yourusername/map-layer-caption-injector.git
cd map-layer-caption-injector
```

## Usage

### Single File Processing

```bash
node inject-captions.mjs map.json layers.json output.json
```

This will:

- Read `map.json` and `layers.json`
- Inject captions from layers into the map
- Output the result to `output.json`
- Generate `output.tree.txt` with a visual tree structure

### Batch Processing

```bash
node inject-captions.mjs --batch map1.json:layers1.json map2.json:layers2.json --outdir ./output/
```

This will process multiple map:layers pairs and output files to the specified directory.

## Input File Structure

### Map File (`map.json`)

```json
{
  "groups": [
    {
      "id": "group1",
      "name": "Transportation",
      "layers": [
        {
          "id": "1",
          "drawOrder": 1000,
          "visibleAtStart": false,
          "infobox": ""
        }
      ],
      "groups": [
        {
          "id": "subgroup1",
          "name": "Roads",
          "layers": [...]
        }
      ]
    }
  ]
}
```

### Layers File (`layers.json`)

```json
{
  "wmslayers": [
    {
      "id": "1",
      "caption": "Wastewater Treatment Plants",
      "layers": ["Layer1", "Layer2"],
      "layersInfo": [
        {
          "id": "Layer1",
          "caption": "Highway"
        },
        {
          "id": "Layer2",
          "caption": "Motorway"
        }
      ]
    }
  ]
}
```

## Output

### JSON Output

The script injects captions and sublayer information:

```json
{
  "groups": [
    {
      "layers": [
        {
          "id": "1",
          "drawOrder": 1000,
          "visibleAtStart": false,
          "infobox": "",
          "caption": "Wastewater Treatment Plants",
          "layers": ["Highway", "Motorway"]
        }
      ]
    }
  ]
}
```

### Tree Output (`output.tree.txt`)

```
├── Transportation/
│   ├── Wastewater Treatment Plants
│   │   ├── Highway
│   │   └── Motorway
│   └── Roads/
│       ├── Primary Roads
│       └── Secondary Roads
```

## Caption Logic

The tool uses intelligent caption selection:

1. **Groups with 2+ sublayers**: Uses captions from `layersInfo` array
2. **Groups with 1 sublayer**: Uses the main object's `caption`
3. **Empty captions**: Completely skipped (not included in output)
4. **Duplicate captions**: Sublayer captions matching parent are filtered out

## Examples

### Basic Usage

```bash
# Process a single map file
node inject-captions.mjs my-map.json my-layers.json my-map-with-captions.json
```

### Batch Processing

```bash
# Process multiple maps
node inject-captions.mjs --batch \
  map1.json:layers1.json \
  map2.json:layers2.json \
  map3.json:layers3.json \
  --outdir ./processed/
```

### Output Directory

```bash
# Specify custom output directory
node inject-captions.mjs --batch map.json:layers.json --outdir ./output/
```

## File Structure

```
map-layer-caption-injector/
├── inject-captions.mjs    # Main script
├── example/
│   ├── map.json          # Example map file
│   └── layers.json       # Example layers file
└── output/               # Generated files
    ├── map.captions.json
    └── map.captions.tree.txt
```

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add some amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

Or just download the script file and use it locally

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

If you encounter any issues or have questions, please open an issue on GitHub.

---

**Made for the GIS community**
