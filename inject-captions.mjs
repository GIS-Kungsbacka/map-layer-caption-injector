import fs from "node:fs";

function buildLayerMetaMap(
  wmslayers = [],
  wfslayers = [],
  vectorlayers = [],
  wfstlayers = []
) {
  const map = new Map();
  for (const wmsLayer of wmslayers) {
    if (!wmsLayer || typeof wmsLayer !== "object" || !("id" in wmsLayer))
      continue;

    const meta = { caption: wmsLayer.caption };

    // Only use layersInfo captions if there are 2 or more values in the layers array
    if (
      Array.isArray(wmsLayer.layers) &&
      wmsLayer.layers.length >= 2 &&
      Array.isArray(wmsLayer.layersInfo)
    ) {
      const idToInfo = new Map();
      for (const li of wmsLayer.layersInfo) {
        if (li && typeof li === "object" && "id" in li) {
          idToInfo.set(li.id, li);
        }
      }
      const sublayerCaptions = [];
      for (const subId of wmsLayer.layers) {
        const info = idToInfo.get(subId);
        if (
          info &&
          typeof info.caption === "string" &&
          info.caption.trim() !== ""
        ) {
          sublayerCaptions.push(info.caption);
        }
        // Skip sublayers with empty captions entirely
      }
      if (sublayerCaptions.length > 0) {
        meta.sublayerCaptions = sublayerCaptions;
      }
    }
    for (const l of wfslayers) {
      if (l && typeof l === "object" && "id" in l) {
        map.set(l.id, { caption: l.caption });
      }
    }
    for (const l of vectorlayers) {
      if (l && typeof l === "object" && "id" in l) {
        map.set(l.id, { caption: l.caption });
      }
    }
    for (const l of wfstlayers) {
      if (l && typeof l === "object" && "id" in l) {
        map.set(l.id, { caption: l.caption });
      }
    }

    map.set(wmsLayer.id, meta);
  }
  return map;
}

function injectIntoGroup(group, layerMetaById) {
  if (Array.isArray(group.layers)) {
    for (const layer of group.layers) {
      const lid = layer?.id;
      if (lid && layerMetaById.has(lid)) {
        const meta = layerMetaById.get(lid);
        const desiredCaption = meta?.caption;
        const desiredSublayers = Array.isArray(meta?.sublayerCaptions)
          ? meta.sublayerCaptions
          : undefined;
        if (layer && typeof layer === "object") {
          const keys = Object.keys(layer);
          const hasInfobox = keys.includes("infobox");
          const newLayer = {};

          // Rebuild object to control key order and place caption after infobox.
          for (const key of keys) {
            if (key === "caption") {
              // Skip original caption; we'll insert it in the desired position
              continue;
            }
            if (key === "layers") {
              // If a leaf layer happens to have its own 'layers' prop, keep it, but we'll still
              // insert our sublayer captions right after the caption if applicable.
            }
            newLayer[key] = layer[key];
            if (key === "infobox" && hasInfobox) {
              if (typeof desiredCaption !== "undefined") {
                newLayer.caption = desiredCaption;
              }
              if (desiredSublayers) {
                newLayer.layers = desiredSublayers;
              }
            }
          }

          // If there was no infobox key, append caption at the end
          if (!hasInfobox) {
            if (typeof desiredCaption !== "undefined") {
              newLayer.caption = desiredCaption;
            }
            if (desiredSublayers) {
              newLayer.layers = desiredSublayers;
            }
          }

          // Mutate original layer object to preserve references
          for (const k of Object.keys(layer)) delete layer[k];
          for (const [k, v] of Object.entries(newLayer)) layer[k] = v;
        }
      }
    }
  }
  if (Array.isArray(group.groups)) {
    for (const sg of group.groups) {
      injectIntoGroup(sg, layerMetaById);
    }
  }
}

function buildTreeLines(groupsRoot) {
  const lines = [];

  function pushGroup(group, prefix, isLast = false) {
    const groupName =
      typeof group.name === "string"
        ? group.name
        : String(group.id ?? "(unnamed group)");

    const connector = isLast ? "└── " : "├── ";
    lines.push(`${prefix}${connector}${groupName}/`);

    const newPrefix = prefix + (isLast ? "    " : "│   ");

    if (Array.isArray(group.layers)) {
      for (let i = 0; i < group.layers.length; i++) {
        const layer = group.layers[i];
        const layerCaption =
          typeof layer.caption === "string" && layer.caption.length > 0
            ? layer.caption
            : String(layer.id ?? "(unnamed layer)");

        const isLastLayer =
          i === group.layers.length - 1 &&
          (!Array.isArray(group.groups) || group.groups.length === 0);
        const layerConnector = isLastLayer ? "└── " : "├── ";
        lines.push(`${newPrefix}${layerConnector}${layerCaption}`);

        if (Array.isArray(layer.layers) && layer.layers.length > 0) {
          const subPrefix = newPrefix + (isLastLayer ? "    " : "│   ");
          // Filter out sublayers with empty captions
          const filteredSublayers = layer.layers.filter((sub) => {
            const subStr = String(sub).trim();
            return subStr !== "" && subStr !== layerCaption;
          });

          for (let j = 0; j < filteredSublayers.length; j++) {
            const sub = filteredSublayers[j];
            const isLastSub = j === filteredSublayers.length - 1;
            const subConnector = isLastSub ? "└── " : "├── ";
            lines.push(`${subPrefix}${subConnector}${String(sub)}`);
          }
        }
      }
    }

    if (Array.isArray(group.groups)) {
      for (let i = 0; i < group.groups.length; i++) {
        const child = group.groups[i];
        const isLastChild = i === group.groups.length - 1;
        pushGroup(child, newPrefix, isLastChild);
      }
    }
  }

  for (let i = 0; i < groupsRoot.length; i++) {
    const g = groupsRoot[i];
    const isLast = i === groupsRoot.length - 1;
    pushGroup(g, "", isLast);
  }
  return lines;
}

function processOne(mapPath, layersPath, outPath) {
  const data1 = JSON.parse(fs.readFileSync(mapPath, "utf8"));
  const data2 = JSON.parse(fs.readFileSync(layersPath, "utf8"));

  const layerMetaById = buildLayerMetaMap(
    data2.wmslayers,
    data2.wfslayers,
    data2.vectorlayers,
    data2.wfstlayers
  );
  const groups = Array.isArray(data1.groups) ? data1.groups : [];

  for (const g of groups) injectIntoGroup(g, layerMetaById);

  fs.writeFileSync(outPath, JSON.stringify(data1, null, 2), "utf8");
  console.log(`Wrote ${outPath}`);

  // Also emit a simple tree text file next to the JSON output
  try {
    const treePath = outPath.replace(/\.json$/i, ".tree.txt");
    const treeLines = buildTreeLines(groups);
    fs.writeFileSync(treePath, treeLines.join("\n"), "utf8");
    console.log(`Wrote ${treePath}`);
  } catch (err) {
    console.warn("Failed to write tree file:", err?.message ?? err);
  }
}

function main(argv) {
  // Modes:
  // 1) Single: node inject-captions.mjs <map.json> <layers.json> <output.json>
  // 2) Batch:  node inject-captions.mjs --batch <map:layers> [<map:layers> ...] [--outdir out]

  if (argv.length >= 2 && argv[0] === "--batch") {
    const pairs = [];
    let outDir = "";
    for (let i = 1; i < argv.length; i++) {
      const token = argv[i];
      if (token === "--outdir") {
        outDir = argv[i + 1] || "";
        i++;
        continue;
      }
      if (typeof token === "string" && token.includes(":")) {
        const [mapPath, layersPath] = token.split(":");
        if (mapPath && layersPath) pairs.push({ mapPath, layersPath });
      }
    }

    if (pairs.length === 0) {
      console.error(
        "No pairs provided. Example: --batch map_1.json:layers.json map_2.json:layers2.json"
      );
      process.exit(1);
    }

    for (const { mapPath, layersPath } of pairs) {
      const baseName = mapPath
        .replace(/\\/g, "/")
        .split("/")
        .pop()
        .replace(/\.json$/i, "");
      const outputDir =
        outDir && outDir.length > 0
          ? outDir
          : mapPath.substring(0, mapPath.lastIndexOf("/") + 1) || "";
      const outPath =
        (outputDir
          ? outputDir.endsWith("/") || outputDir.endsWith("\\")
            ? outputDir
            : outputDir + "/"
          : "") + `${baseName}.captions.json`;
      processOne(mapPath, layersPath, outPath);
    }
    return;
  }

  if (argv.length !== 3) {
    console.error(
      "Usage: \n  node inject-captions.mjs <map.json> <layers.json> <output.json>\n  node inject-captions.mjs --batch <map:layers> [<map:layers> ...] [--outdir outdir]"
    );
    process.exit(1);
  }

  const [file1, file2, out] = argv;
  processOne(file1, file2, out);
}

main(process.argv.slice(2));
