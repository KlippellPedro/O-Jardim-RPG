"""Gera o Banco Lunar — cofre cósmico multiversal do Soberano Amadheus Colona
— e exporta para .glb, no mesmo espírito de generate_tree.py (headless, sem
GUI, hierarquia de partes nomeadas pra o Three.js poder carregar o modelo
inteiro como <primitive>).

Roda em modo headless:
    blender --background --python generate_banco_lunar.py -- --seed 7 --out ../../public/models/props/banco-lunar.glb

Lore (ver Obsidian, "01 - Lore/Árvores/Gênese/Realidade 0/Dimensões/Padrão/
Banco Lunar/Amadheus Colona.md"): o Banco Lunar é a única instituição da
Realidade 0 que opera em todas as dimensões ao mesmo tempo — por isso o
design mistura uma rocha lunar literal (a única base física que ele tem) com
um cofre metálico verde (cor de Amadheus, "Soberano dos Cosmos") cercado por
um halo translúcido inclinado e pequenas fichas de dívida orbitando. Sem
tronco, sem folhagem: isso não é uma Árvore, é um cofre.

Hierarquia exportada:
    banco_lunar (Empty, raiz)
      ├── Moon_Rock_Base
      ├── Vault_Body
      ├── Vault_Door
      ├── Vault_Core
      ├── Vault_Ring
      ├── Vault_Spire
      └── Ledger_Motes

Notas de compatibilidade: mesmas do generate_tree.py (Blender 5.1, sockets
do Principled buscados em inglês por bl_idname, normal map gerado via numpy
porque um grafo procedural puro de Noise/Bump não sobrevive à exportação
glTF). Luzes de estúdio existem só pra preview no próprio Blender e não são
exportadas — o app usa sua própria iluminação em Three.js.
"""

import bpy
import sys
import math
import argparse
import numpy as np


def parse_args():
    argv = sys.argv
    if "--" in argv:
        argv = argv[argv.index("--") + 1:]
    else:
        argv = []
    parser = argparse.ArgumentParser()
    parser.add_argument("--slug", default="banco_lunar")
    parser.add_argument("--color", default="80,230,140")  # verde de Amadheus Colona
    parser.add_argument("--seed", type=int, default=7)
    parser.add_argument("--out", required=True)
    return parser.parse_args(argv)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for block in (bpy.data.meshes, bpy.data.materials, bpy.data.lights, bpy.data.images):
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


# ── Normal map procedural via numpy (mesma técnica do generate_tree.py) ──

def _ruido_fractal(tam, escala, seed, oitavas=3):
    rng = np.random.default_rng(seed)
    altura = np.zeros((tam, tam), dtype=np.float64)
    freq = max(2, int(escala))
    amp = 1.0
    amp_total = 0.0
    for _ in range(oitavas):
        grid_n = max(2, tam // freq)
        grid = rng.random((grid_n, grid_n))
        reps = tam // grid_n + 1
        upsampled = np.kron(grid, np.ones((reps, reps)))[:tam, :tam]
        altura += upsampled * amp
        amp_total += amp
        freq = max(2, freq // 2)
        amp *= 0.5
    return altura / amp_total


def _normal_map_pixels(tam, escala, seed, forca):
    altura = _ruido_fractal(tam, escala, seed)
    dx = (np.roll(altura, -1, axis=1) - np.roll(altura, 1, axis=1)) * forca
    dy = (np.roll(altura, -1, axis=0) - np.roll(altura, 1, axis=0)) * forca
    nx, ny, nz = -dx, -dy, np.ones_like(altura)
    comprimento = np.sqrt(nx ** 2 + ny ** 2 + nz ** 2)
    nx, ny, nz = nx / comprimento, ny / comprimento, nz / comprimento
    r = nx * 0.5 + 0.5
    g = ny * 0.5 + 0.5
    b = nz * 0.5 + 0.5
    a = np.ones_like(altura)
    return np.stack([r, g, b, a], axis=-1).astype(np.float32).ravel()


def get_normal_map_image(nome, escala, seed, forca, tam=256):
    img = bpy.data.images.new(nome, width=tam, height=tam, alpha=True)
    img.colorspace_settings.name = "Non-Color"
    img.pixels.foreach_set(_normal_map_pixels(tam, escala, seed, forca))
    img.pack()
    return img


def add_bump_texture(mat, nome_textura, seed, escala=8.0, forca=0.4):
    principled = find_principled(mat)
    if not principled:
        return
    nodes = mat.node_tree.nodes
    links = mat.node_tree.links
    img = get_normal_map_image(nome_textura, escala, seed, forca=2.2)
    tex_node = nodes.new("ShaderNodeTexImage")
    tex_node.image = img
    normal_map_node = nodes.new("ShaderNodeNormalMap")
    normal_map_node.inputs["Strength"].default_value = forca
    links.new(tex_node.outputs["Color"], normal_map_node.inputs["Color"])
    links.new(normal_map_node.outputs["Normal"], principled.inputs["Normal"])


def make_material(
    name, rgb01, alpha=1.0, roughness=0.8, metallic=0.0,
    transmission=0.0, coat=0.0, bump=None, emissao=None,
):
    """`bump`, se fornecido: {"seed": int, "escala": float, "forca": float}.
    `emissao`, se fornecido: {"cor01": (r,g,b) opcional (padrão = rgb01),
    "forca": float}."""
    mat = bpy.data.materials.new(name)
    if mat.node_tree is None:
        mat.use_nodes = True
    mat.blend_method = "BLEND" if alpha < 1.0 else "OPAQUE"
    set_input(mat, ["Base Color"], (*rgb01, alpha))
    set_input(mat, ["Alpha"], alpha)
    set_input(mat, ["Roughness"], roughness)
    set_input(mat, ["Metallic"], metallic)
    if transmission > 0:
        set_input(mat, ["Transmission Weight", "Transmission"], transmission)
        set_input(mat, ["IOR"], 1.45)
    if coat > 0:
        set_input(mat, ["Coat Weight", "Clearcoat"], coat)
        set_input(mat, ["Coat Roughness", "Clearcoat Roughness"], 0.03)
    if bump:
        add_bump_texture(mat, f"{name}_Normal", **bump)
    if emissao:
        cor_emissao = emissao.get("cor01", rgb01)
        set_input(mat, ["Emission Color", "Emission"], (*cor_emissao, 1.0))
        set_input(mat, ["Emission Strength"], emissao.get("forca", 1.0))
    return mat


def build_moon_rock(seed, radius=0.55):
    """Fragmento de rocha lunar flutuante — a única base física do Banco
    Lunar, literal no nome. Icosfera achatada e irregular via Displace
    (Voronoi pras crateras + Clouds pra silhueta quebrada), cinza-pálida e
    sem grama (ao contrário da ilha das Árvores — isso aqui é rocha morta,
    não solo vivo). Retorna (objeto, topo_z aproximado)."""
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=3, radius=radius, location=(0, 0, 0))
    rock = bpy.context.active_object
    rock.name = "Moon_Rock_Base"
    rock.scale.z = 0.55  # achata em disco, não bola perfeita

    tex_crateras = bpy.data.textures.new(f"Rock_Crateras_{seed}", type="VORONOI")
    tex_crateras.noise_scale = 0.5
    disp_crateras = rock.modifiers.new("Rock_Displace_Crateras", type="DISPLACE")
    disp_crateras.texture = tex_crateras
    disp_crateras.mid_level = 0.55
    disp_crateras.strength = radius * 0.18

    tex_silhueta = bpy.data.textures.new(f"Rock_Silhueta_{seed}", type="CLOUDS")
    tex_silhueta.noise_scale = 0.8
    disp_silhueta = rock.modifiers.new("Rock_Displace_Silhueta", type="DISPLACE")
    disp_silhueta.texture = tex_silhueta
    disp_silhueta.mid_level = 0.5
    disp_silhueta.strength = radius * 0.12

    for poly in rock.data.polygons:
        poly.use_smooth = True

    rock.data.materials.append(make_material(
        "Moon_Rock_Mat", (0.62, 0.62, 0.58), roughness=0.92,
        bump={"seed": seed, "escala": 18.0, "forca": 0.4},
    ))
    return rock, radius * rock.scale.z


def build_vault_body(seed, mats, rock_top_z):
    """Corpo do cofre — prisma hexagonal metálico pousado na rocha.
    Retorna (objeto, topo_z)."""
    raio = 0.42
    altura = 0.62
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=raio, depth=altura,
        location=(0, 0, rock_top_z + altura / 2),
    )
    body = bpy.context.active_object
    body.name = "Vault_Body"
    body.data.materials.append(mats["metal_escuro"])
    for poly in body.data.polygons:
        poly.use_smooth = False
    return body, rock_top_z + altura


def build_vault_door(z_centro, mats):
    """Porta do cofre — disco frontal com aros concêntricos luminosos, tipo
    fechadura de combinação multiversal."""
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=32, radius=0.30, depth=0.06,
        location=(0, -0.44, z_centro), rotation=(math.radians(90), 0, 0),
    )
    door = bpy.context.active_object
    door.name = "Vault_Door"
    door.data.materials.append(mats["metal_borda"])
    for poly in door.data.polygons:
        poly.use_smooth = True

    partes = [door]
    for raio_frac in (0.85, 0.55, 0.25):
        bpy.ops.mesh.primitive_torus_add(
            major_radius=0.30 * raio_frac, minor_radius=0.012,
            location=(0, -0.475, z_centro), rotation=(math.radians(90), 0, 0),
            major_segments=24, minor_segments=8,
        )
        anel = bpy.context.active_object
        anel.data.materials.append(mats["neon"])
        partes.append(anel)

    bpy.ops.object.select_all(action="DESELECT")
    for p in partes:
        p.select_set(True)
    bpy.context.view_layer.objects.active = partes[0]
    bpy.ops.object.join()
    grupo = bpy.context.active_object
    grupo.name = "Vault_Door"
    return grupo


def build_vault_core(z_base, mats):
    """Núcleo luminoso flutuando sobre o cofre — o "valor" abstrato que o
    Banco Lunar guarda, mais luz que objeto. Retorna (objeto, z_centro)."""
    z_centro = z_base + 0.35
    bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=2, radius=0.16, location=(0, 0, z_centro))
    core = bpy.context.active_object
    core.name = "Vault_Core"
    for poly in core.data.polygons:
        poly.use_smooth = True
    core.data.materials.append(mats["neon_puro"])
    return core, z_centro


def build_vault_ring(z_centro, mats):
    """Halo translúcido inclinado em volta do cofre — a "Conexão
    Multiversal Ativa" da ficha da Loja, feita anel."""
    bpy.ops.mesh.primitive_torus_add(
        major_radius=0.85, minor_radius=0.03,
        location=(0, 0, z_centro), rotation=(math.radians(72), 0, math.radians(15)),
        major_segments=48, minor_segments=12,
    )
    ring = bpy.context.active_object
    ring.name = "Vault_Ring"
    for poly in ring.data.polygons:
        poly.use_smooth = True
    ring.data.materials.append(mats["halo"])
    return ring


def build_ledger_motes(z_centro, seed, mats, n=6):
    """Pequenas fichas/moedas luminosas orbitando no plano do anel —
    representam a dívida que Amadheus Colona administra em todas as
    dimensões ao mesmo tempo."""
    off = (seed * 41) % 360
    inclinacao = math.radians(72)
    motes = []
    for i in range(n):
        ang = math.radians(off) + math.tau * i / n
        x = math.cos(ang) * 0.85
        y = math.sin(ang) * 0.85 * math.cos(inclinacao)
        z = z_centro + math.sin(ang) * 0.85 * math.sin(inclinacao)
        bpy.ops.mesh.primitive_cylinder_add(vertices=6, radius=0.035, depth=0.012, location=(x, y, z))
        motes.append(bpy.context.active_object)

    bpy.ops.object.select_all(action="DESELECT")
    for m in motes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = motes[0]
    bpy.ops.object.join()
    grupo = bpy.context.active_object
    grupo.name = "Ledger_Motes"
    grupo.data.materials.append(mats["neon_puro"])
    return grupo


def build_vault_spire(z_base, mats):
    """Antena/espinho central acima do núcleo — a linha que conecta o
    cofre a "todas as dimensões ao mesmo tempo"."""
    altura = 0.9
    bpy.ops.mesh.primitive_cone_add(
        vertices=6, radius1=0.05, radius2=0.0, depth=altura,
        location=(0, 0, z_base + altura / 2),
    )
    spire = bpy.context.active_object
    spire.name = "Vault_Spire"
    spire.data.materials.append(mats["metal_borda"])
    for poly in spire.data.polygons:
        poly.use_smooth = False
    return spire


def build_studio_lights():
    key_data = bpy.data.lights.new("Key_Light", type="AREA")
    key_data.energy = 400
    key_data.size = 1.5
    key = bpy.data.objects.new("Key_Light", key_data)
    key.location = (2.2, -2.6, 3.0)
    key.rotation_euler = (math.radians(55), 0, math.radians(35))
    bpy.context.collection.objects.link(key)

    fill_data = bpy.data.lights.new("Fill_Light", type="AREA")
    fill_data.energy = 120
    fill_data.size = 2.0
    fill = bpy.data.objects.new("Fill_Light", fill_data)
    fill.location = (-2.6, -1.2, 1.6)
    fill.rotation_euler = (math.radians(70), 0, math.radians(-50))
    bpy.context.collection.objects.link(fill)

    rim_data = bpy.data.lights.new("Rim_Light", type="AREA")
    rim_data.energy = 250
    rim_data.size = 1.0
    rim = bpy.data.objects.new("Rim_Light", rim_data)
    rim.location = (0.3, 2.8, 2.2)
    rim.rotation_euler = (math.radians(-110), 0, math.radians(10))
    bpy.context.collection.objects.link(rim)

    return [key, fill, rim]


def main():
    args = parse_args()
    rgb_neon01 = tuple(srgb_to_linear(int(c)) for c in args.color.split(","))

    clear_scene()

    mats = {
        "metal_escuro": make_material("Vault_Metal_Escuro", (0.05, 0.07, 0.06), roughness=0.4, metallic=0.85),
        "metal_borda": make_material("Vault_Metal_Borda", (0.35, 0.42, 0.38), roughness=0.25, metallic=0.9),
        "neon": make_material("Vault_Neon", rgb_neon01, roughness=0.3, metallic=0.4, emissao={"forca": 2.4}),
        "neon_puro": make_material("Vault_Neon_Puro", rgb_neon01, roughness=0.2, metallic=0.3, emissao={"forca": 3.5}),
        "halo": make_material("Vault_Halo", rgb_neon01, alpha=0.32, roughness=0.05, transmission=0.85, coat=0.4),
    }

    rock, rock_top_z = build_moon_rock(args.seed)
    body, body_top_z = build_vault_body(args.seed, mats, rock_top_z)
    door = build_vault_door(rock_top_z + 0.31, mats)
    core, core_z = build_vault_core(body_top_z, mats)
    ring = build_vault_ring(core_z, mats)
    motes = build_ledger_motes(core_z, args.seed, mats)
    spire = build_vault_spire(core_z, mats)

    build_studio_lights()

    partes = [rock, body, door, core, ring, motes, spire]
    root = bpy.data.objects.new(args.slug, None)
    bpy.context.collection.objects.link(root)
    for obj in partes:
        obj.parent = root

    # Exporta só o cofre — as luzes de estúdio ficam de fora (existem só
    # pra preview dentro do Blender; o app usa sua própria iluminação em
    # Three.js).
    bpy.ops.object.select_all(action="DESELECT")
    for obj in (root, *partes):
        obj.select_set(True)
    bpy.context.view_layer.objects.active = root

    bpy.ops.export_scene.gltf(
        filepath=args.out,
        export_format="GLB",
        use_selection=True,
        export_apply=True,
    )
    print(f"OK: exported {args.out}")


if __name__ == "__main__":
    main()
