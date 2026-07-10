"""Gera uma árvore low-poly + globo de neve (dome de vidro) e exporta para .glb.

Roda em modo headless, sem GUI:
    blender --background --python generate_tree.py -- --slug aethel --color 201,162,39 --seed 1 --out ../../assets/3d/arvores/aethel.glb

Hierarquia exportada (nomes usados depois pelo Three.js para achar o dome e
animar a opacidade dele):
    <slug> (Empty, raiz)
      ├── Tree_Trunk
      ├── Tree_Foliage
      ├── Dome_Base
      └── Dome_Glass
"""

import bpy
import bmesh
import random
import sys
import math
import argparse


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", default="arvore")
    parser.add_argument("--color", default="120,185,130")
    parser.add_argument("--seed", type=int, default=1)
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials):
        for item in list(block):
            if item.users == 0:
                block.remove(item)


def srgb_to_linear(c):
    c = c / 255.0
    return c / 12.92 if c <= 0.04045 else ((c + 0.055) / 1.055) ** 2.4


def find_principled(mat):
    for node in mat.node_tree.nodes:
        if node.bl_idname == "ShaderNodeBsdfPrincipled":
            return node
    return None


def set_input(mat, names, value):
    principled = find_principled(mat)
    if not principled:
        return
    for name in names:
        socket = principled.inputs.get(name)
        if socket is not None:
            socket.default_value = value
            return


def make_material(name, rgb01, alpha=1.0, roughness=0.8, metallic=0.0, transmission=0.0):
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    mat.blend_method = "BLEND" if alpha < 1.0 else "OPAQUE"
    principled = find_principled(mat)
    set_input(mat, ["Base Color"], (*rgb01, alpha))
    set_input(mat, ["Alpha"], alpha)
    set_input(mat, ["Roughness"], roughness)
    set_input(mat, ["Metallic"], metallic)
    if transmission > 0:
        set_input(mat, ["Transmission Weight", "Transmission"], transmission)
        set_input(mat, ["IOR"], 1.45)
    return mat


def build_trunk(rng, height):
    bpy.ops.mesh.primitive_cone_add(
        vertices=7,
        radius1=0.14 + rng.uniform(-0.02, 0.02),
        radius2=0.07,
        depth=height,
        location=(0, 0, height / 2),
    )
    trunk = bpy.context.active_object
    trunk.name = "Tree_Trunk"
    trunk.data.materials.append(make_material("Tree_Bark", (0.28, 0.18, 0.11), roughness=0.95))
    return trunk


def build_foliage(rng, rgb01, base_z):
    blobs = []
    n = rng.randint(3, 5)
    center_radius = 0.22
    for i in range(n):
        angle = (i / n) * math.tau + rng.uniform(-0.3, 0.3)
        r = center_radius * rng.uniform(0.5, 1.0)
        x = math.cos(angle) * r
        y = math.sin(angle) * r
        z = base_z + rng.uniform(0.1, 0.45)
        radius = rng.uniform(0.28, 0.42)
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1, radius=radius, location=(x, y, z)
        )
        blobs.append(bpy.context.active_object)

    bpy.ops.object.select_all(action="DESELECT")
    for b in blobs:
        b.select_set(True)
    bpy.context.view_layer.objects.active = blobs[0]
    bpy.ops.object.join()
    foliage = bpy.context.active_object
    foliage.name = "Tree_Foliage"
    foliage.data.materials.append(make_material("Tree_Foliage_Mat", rgb01, roughness=0.85))
    return foliage


def build_dome(rng, canopy_top_z):
    dome_radius = canopy_top_z * 0.62 + 0.35

    bpy.ops.mesh.primitive_cylinder_add(
        vertices=24, radius=dome_radius, depth=0.08, location=(0, 0, -0.04)
    )
    base = bpy.context.active_object
    base.name = "Dome_Base"
    base.data.materials.append(make_material("Dome_Base_Mat", (0.35, 0.30, 0.24), roughness=0.6))

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=24, ring_count=14, radius=dome_radius, location=(0, 0, 0)
    )
    glass = bpy.context.active_object
    glass.name = "Dome_Glass"

    bm = bmesh.new()
    bm.from_mesh(glass.data)
    to_delete = [v for v in bm.verts if v.co.z < -0.001]
    bmesh.ops.delete(bm, geom=to_delete, context="VERTS")
    bm.to_mesh(glass.data)
    bm.free()
    glass.data.update()

    glass.data.materials.append(
        make_material(
            "Dome_Glass_Mat",
            (0.85, 0.92, 0.95),
            alpha=0.28,
            roughness=0.05,
            transmission=1.0,
        )
    )
    return base, glass


def main():
    args = parse_args()
    rng = random.Random(args.seed)
    rgb01 = tuple(srgb_to_linear(int(c)) for c in args.color.split(","))

    clear_scene()

    trunk_height = rng.uniform(0.9, 1.3)
    trunk = build_trunk(rng, trunk_height)
    foliage = build_foliage(rng, rgb01, trunk_height)
    base, glass = build_dome(rng, trunk_height + 0.6)

    root = bpy.data.objects.new(args.slug, None)
    bpy.context.collection.objects.link(root)
    for obj in (trunk, foliage, base, glass):
        obj.parent = root

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.export_scene.gltf(
        filepath=args.out,
        export_format="GLB",
        use_selection=False,
    )
    print(f"OK: exported {args.out}")


if __name__ == "__main__":
    main()
