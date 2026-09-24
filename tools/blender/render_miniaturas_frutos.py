"""Renderiza uma miniatura PNG (fundo transparente) de cada fruto .glb.

    blender --background --python render_miniaturas_frutos.py -- --glb ../../public/models/frutos --out <pasta-png>

Depois converta para webp com tools/miniaturas_frutos.py (recorte + 256px).
"""

import bpy
import sys
import os
import glob
import argparse
from mathutils import Vector


def montar_cena():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    w = bpy.data.worlds.new("w")
    sc.world = w
    w.use_nodes = True
    bg = w.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.35, 0.36, 0.45, 1)
    bg.inputs[1].default_value = 0.9

    def luz(loc, energia, cor=(1, 1, 1)):
        d = bpy.data.lights.new("l", "AREA")
        d.energy, d.size, d.color = energia, 5, cor
        o = bpy.data.objects.new("l", d)
        sc.collection.objects.link(o)
        o.location = loc
        o.rotation_euler = (Vector((0, 0, 0.5)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()

    luz((4, -5, 6), 700)
    luz((-6, -2, 2), 260, (0.8, 0.8, 1.0))
    luz((0, 6, 4), 380, (1.0, 0.92, 0.8))

    cam = bpy.data.cameras.new("c")
    cam.lens = 55
    co = bpy.data.objects.new("c", cam)
    sc.collection.objects.link(co)
    sc.camera = co
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = 512
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    return sc, co


def main():
    argv = sys.argv[sys.argv.index("--") + 1:]
    ap = argparse.ArgumentParser()
    ap.add_argument("--glb", required=True)
    ap.add_argument("--out", required=True)
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)

    for caminho in sorted(glob.glob(os.path.join(a.glb, "*.glb"))):
        nome = os.path.splitext(os.path.basename(caminho))[0]
        sc, cam = montar_cena()
        bpy.ops.import_scene.gltf(filepath=caminho)
        pts = [o.matrix_world @ Vector(c) for o in sc.objects if o.type == "MESH" for c in o.bound_box]
        mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
        mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
        centro, r = (mn + mx) / 2, (mx - mn).length / 2
        cam.location = centro + Vector((1, -1.15, 0.42)).normalized() * r * 3.1
        cam.rotation_euler = (centro - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(a.out, f"{nome}.png")
        bpy.ops.render.render(write_still=True)
        print(f"OK: {nome}")


if __name__ == "__main__":
    main()
