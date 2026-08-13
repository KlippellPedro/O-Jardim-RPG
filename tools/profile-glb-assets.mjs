import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const modelsRoot = path.join(projectRoot, 'public', 'models');

async function listGlbs(directory) {
  const entries = await readdir(directory, { withFileTypes: true });
  const nested = await Promise.all(entries.map((entry) => {
    const absolute = path.join(directory, entry.name);
    return entry.isDirectory() ? listGlbs(absolute) : (entry.name.endsWith('.glb') ? [absolute] : []);
  }));
  return nested.flat().sort();
}

function parseGlb(buffer, file) {
  if (buffer.toString('ascii', 0, 4) !== 'glTF') throw new Error(`${file}: cabeçalho GLB inválido`);
  const declaredLength = buffer.readUInt32LE(8);
  if (declaredLength !== buffer.length) throw new Error(`${file}: tamanho declarado difere do arquivo`);

  let json;
  let binary = Buffer.alloc(0);
  for (let offset = 12; offset + 8 <= buffer.length;) {
    const length = buffer.readUInt32LE(offset);
    const type = buffer.readUInt32LE(offset + 4);
    const chunk = buffer.subarray(offset + 8, offset + 8 + length);
    if (type === 0x4e4f534a) json = JSON.parse(chunk.toString('utf8').replace(/\0+$/u, '').trim());
    if (type === 0x004e4942) binary = chunk;
    offset += 8 + length;
  }
  if (!json) throw new Error(`${file}: chunk JSON ausente`);
  return { json, binary };
}

function primitiveTriangles(primitive, accessors) {
  const accessorIndex = primitive.indices ?? primitive.attributes?.POSITION;
  const count = accessors?.[accessorIndex]?.count ?? 0;
  const mode = primitive.mode ?? 4;
  if (mode === 4) return Math.floor(count / 3);
  if (mode === 5 || mode === 6) return Math.max(0, count - 2);
  return 0;
}

function imageDimensions(bytes) {
  if (bytes.length >= 24 && bytes.toString('ascii', 1, 4) === 'PNG') {
    return [bytes.readUInt32BE(16), bytes.readUInt32BE(20)];
  }
  if (bytes.length >= 10 && bytes[0] === 0xff && bytes[1] === 0xd8) {
    for (let offset = 2; offset + 9 < bytes.length;) {
      if (bytes[offset] !== 0xff) { offset += 1; continue; }
      const marker = bytes[offset + 1];
      if ([0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7, 0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf].includes(marker)) {
        return [bytes.readUInt16BE(offset + 7), bytes.readUInt16BE(offset + 5)];
      }
      if (marker === 0xd8 || marker === 0xd9) { offset += 2; continue; }
      const length = bytes.readUInt16BE(offset + 2);
      if (length < 2) break;
      offset += length + 2;
    }
  }
  return null;
}

function profile(file, buffer) {
  const { json, binary } = parseGlb(buffer, file);
  const meshes = json.meshes ?? [];
  const nodes = json.nodes ?? [];
  const meshInstances = new Map();
  for (const node of nodes) {
    if (Number.isInteger(node.mesh)) meshInstances.set(node.mesh, (meshInstances.get(node.mesh) ?? 0) + 1);
  }

  let uniqueTriangles = 0;
  let renderedTriangles = 0;
  let renderedPrimitives = 0;
  const usedMaterials = new Set();
  meshes.forEach((mesh, meshIndex) => {
    const instances = meshInstances.get(meshIndex) ?? 0;
    for (const primitive of mesh.primitives ?? []) {
      const triangles = primitiveTriangles(primitive, json.accessors);
      uniqueTriangles += triangles;
      renderedTriangles += triangles * instances;
      renderedPrimitives += instances;
      if (Number.isInteger(primitive.material)) usedMaterials.add(primitive.material);
    }
  });

  const images = (json.images ?? []).map((image) => {
    const view = json.bufferViews?.[image.bufferView];
    if (!view) return { bytes: 0, dimensions: null, mime: image.mimeType ?? 'external' };
    const start = view.byteOffset ?? 0;
    const bytes = binary.subarray(start, start + view.byteLength);
    return { bytes: bytes.length, dimensions: imageDimensions(bytes), mime: image.mimeType ?? 'unknown' };
  });
  const materialProfiles = (json.materials ?? []).map((material) => ({
    name: material.name ?? '',
    alphaMode: material.alphaMode ?? 'OPAQUE',
    baseColor: material.pbrMetallicRoughness?.baseColorFactor ?? [1, 1, 1, 1],
    metallic: material.pbrMetallicRoughness?.metallicFactor ?? 1,
    roughness: material.pbrMetallicRoughness?.roughnessFactor ?? 1,
    doubleSided: Boolean(material.doubleSided),
    transmission: material.extensions?.KHR_materials_transmission?.transmissionFactor ?? 0,
    unlit: Boolean(material.extensions?.KHR_materials_unlit),
  }));

  return {
    file: path.relative(projectRoot, file).replaceAll('\\', '/'),
    bytes: buffer.length,
    meshes: meshes.length,
    meshInstances: [...meshInstances.values()].reduce((sum, count) => sum + count, 0),
    primitives: meshes.reduce((sum, mesh) => sum + (mesh.primitives?.length ?? 0), 0),
    renderedPrimitives,
    uniqueTriangles,
    renderedTriangles,
    materials: json.materials?.length ?? 0,
    usedMaterials: usedMaterials.size,
    transmissiveMaterials: materialProfiles.filter((material) => material.transmission > 0).length,
    blendedMaterials: materialProfiles.filter((material) => material.alphaMode === 'BLEND').length,
    doubleSidedMaterials: materialProfiles.filter((material) => material.doubleSided).length,
    materialProfiles,
    textures: json.textures?.length ?? 0,
    images,
    imageBytes: images.reduce((sum, image) => sum + image.bytes, 0),
    animations: json.animations?.length ?? 0,
    skins: json.skins?.length ?? 0,
    extensionsUsed: json.extensionsUsed ?? [],
  };
}

const files = await listGlbs(modelsRoot);
const profiles = [];
for (const file of files) profiles.push(profile(file, await readFile(file)));

const totals = profiles.reduce((total, item) => ({
  bytes: total.bytes + item.bytes,
  renderedPrimitives: total.renderedPrimitives + item.renderedPrimitives,
  uniqueTriangles: total.uniqueTriangles + item.uniqueTriangles,
  renderedTriangles: total.renderedTriangles + item.renderedTriangles,
  materials: total.materials + item.materials,
  textures: total.textures + item.textures,
  imageBytes: total.imageBytes + item.imageBytes,
  animations: total.animations + item.animations,
}), { bytes: 0, renderedPrimitives: 0, uniqueTriangles: 0, renderedTriangles: 0, materials: 0, textures: 0, imageBytes: 0, animations: 0 });

console.log(JSON.stringify({ profiles, totals }, null, 2));
