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
import bmesh
import sys
import math
import random
import argparse
import numpy as np
from mathutils import Vector, Matrix


# O app ainda amplia o modelo em 2.2x; 1.15 deixa o Banco bem maior que as Árvores.
ESCALA_MODELO = 1.15


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


# ── Banco Lunar v2: templo-cofre imponente ──
# Rocha lunar flutuante > plinto octogonal com escadaria > colunata neoclássica
# em volta de um tambor-cofre com a porta gigante > cúpula com nervuras e
# espigão coroado por uma lua crescente. Atrás, um arco de lua crescente
# enorme; nos cantos, quatro obeliscos guardiões; em volta, halos com moedas
# orbitando. Mantém os nomes de nós antigos (Moon_Rock_Base, Vault_*, Ledger_Motes).

def _bm_obj(bm, nome, mats):
    malha = bpy.data.meshes.new(nome)
    bm.to_mesh(malha)
    bm.free()
    obj = bpy.data.objects.new(nome, malha)
    bpy.context.collection.objects.link(obj)
    for m in mats:
        obj.data.materials.append(m)
    return obj


def _cone(bm, p1, p2, r1, r2, seg=6, mat=0):
    d = p2 - p1
    if d.length < 1e-6:
        return
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    n0 = len(bm.faces)
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2,
                          depth=d.length, matrix=Matrix.Translation((p1 + p2) / 2) @ rot, calc_uvs=True)
    bm.faces.ensure_lookup_table()
    for f in bm.faces[n0:]:
        f.material_index = mat


def _cil(bm, centro, raio, altura, seg=8, mat=0, raio2=None, matriz=None):
    n0 = len(bm.faces)
    m = Matrix.Translation(centro) if matriz is None else matriz
    bmesh.ops.create_cone(bm, cap_ends=True, cap_tris=False, segments=seg, radius1=raio,
                          radius2=raio if raio2 is None else raio2, depth=altura, matrix=m, calc_uvs=True)
    bm.faces.ensure_lookup_table()
    for f in bm.faces[n0:]:
        f.material_index = mat


def _caixa(bm, centro, sx, sy, sz, mat=0):
    n0 = len(bm.faces)
    bmesh.ops.create_cube(bm, size=1.0, matrix=Matrix.Translation(centro) @ Matrix.Diagonal((sx, sy, sz, 1.0)),
                          calc_uvs=True)
    bm.faces.ensure_lookup_table()
    for f in bm.faces[n0:]:
        f.material_index = mat


def _anel(bm, raio, esp, matriz, mat=0, seg=48, lado=6):
    linhas = []
    for i in range(seg):
        a = math.tau * i / seg
        c = Vector((math.cos(a) * raio, math.sin(a) * raio, 0))
        rad = c.normalized()
        linha = []
        for j in range(lado):
            b = math.tau * j / lado
            linha.append(bm.verts.new(matriz @ (c + rad * math.cos(b) * esp + Vector((0, 0, math.sin(b) * esp)))))
        linhas.append(linha)
    for i in range(seg):
        for j in range(lado):
            f = bm.faces.new((linhas[i][j], linhas[i][(j + 1) % lado],
                              linhas[(i + 1) % seg][(j + 1) % lado], linhas[(i + 1) % seg][j]))
            f.material_index = mat


def _poligono_cheio(bm, pts, esp, matriz, mat=0):
    """Extruda um polígono 2D (lista de (x, y)) em espessura `esp`, em z."""
    fr = [bm.verts.new(matriz @ Vector((x, y, esp / 2))) for x, y in pts]
    tr = [bm.verts.new(matriz @ Vector((x, y, -esp / 2))) for x, y in pts]
    faces = [bm.faces.new(fr), bm.faces.new(list(reversed(tr)))]
    n = len(pts)
    for i in range(n):
        faces.append(bm.faces.new((fr[i], tr[i], tr[(i + 1) % n], fr[(i + 1) % n])))
    for f in faces:
        f.material_index = mat


def _lua(bm, R, r, dx, esp, matriz, mat=0, n=44):
    x = (R * R - r * r + dx * dx) / (2 * dx)
    y = math.sqrt(R * R - x * x)
    a0 = math.atan2(y, x)
    b0 = math.atan2(y, x - dx)
    ext = [(R * math.cos(a0 + (math.tau - 2 * a0) * k / (n - 1)),
            R * math.sin(a0 + (math.tau - 2 * a0) * k / (n - 1))) for k in range(n)]
    ini = math.tau - b0
    inn = [(dx + r * math.cos(ini + (b0 - ini) * k / (n - 1)),
            r * math.sin(ini + (b0 - ini) * k / (n - 1))) for k in range(1, n - 1)]
    _poligono_cheio(bm, ext + inn, esp, matriz, mat)


def _prisma_tri(bm, y0, prof, meia_larg, z0, alt, mat=0):
    pts = [(-meia_larg, z0), (meia_larg, z0), (0, z0 + alt)]
    fr = [bm.verts.new((x, y0, z)) for x, z in pts]
    tr = [bm.verts.new((x, y0 + prof, z)) for x, z in pts]
    faces = [bm.faces.new(fr), bm.faces.new(list(reversed(tr)))]
    for i in range(3):
        faces.append(bm.faces.new((fr[i], fr[(i + 1) % 3], tr[(i + 1) % 3], tr[i])))
    for f in faces:
        f.material_index = mat


def _coluna(bm, x, y, z0, alt, r):
    _cil(bm, Vector((x, y, z0 + 0.02)), r * 1.45, 0.04, seg=8, mat=0)
    _cil(bm, Vector((x, y, z0 + 0.04 + (alt - 0.14) / 2)), r, alt - 0.14, seg=8, mat=0, raio2=r * 0.86)
    _cil(bm, Vector((x, y, z0 + alt - 0.055)), r * 1.25, 0.05, seg=8, mat=0)
    _caixa(bm, Vector((x, y, z0 + alt - 0.015)), r * 3.0, r * 3.0, 0.03, mat=0)


def construir_banco(seed, rgb_neon01):
    rng = random.Random(seed)
    m_rocha = make_material("Moon_Rock_Mat", (0.60, 0.61, 0.58), roughness=0.92,
                            bump={"seed": seed, "escala": 18.0, "forca": 0.5})
    m_pedra = make_material("Bank_Pedra", (0.80, 0.84, 0.81), roughness=0.38, metallic=0.05,
                            bump={"seed": seed + 5, "escala": 30.0, "forca": 0.15})
    m_escuro = make_material("Vault_Metal_Escuro", (0.05, 0.075, 0.06), roughness=0.38, metallic=0.85)
    m_prata = make_material("Vault_Metal_Borda", (0.55, 0.62, 0.58), roughness=0.22, metallic=0.95)
    m_neon = make_material("Vault_Neon", rgb_neon01, roughness=0.3, metallic=0.4, emissao={"forca": 2.4})
    m_neon_p = make_material("Vault_Neon_Puro", rgb_neon01, roughness=0.2, metallic=0.3, emissao={"forca": 3.5})
    m_lua = make_material("Bank_Lua", (0.55, 0.95, 0.72), roughness=0.3, metallic=0.1, emissao={"forca": 1.8})
    m_halo = make_material("Vault_Halo", rgb_neon01, alpha=0.32, roughness=0.05, transmission=0.85, coat=0.4)

    # ── Rocha lunar: platô liso em cima, ponta afunilada por baixo ──
    RR, Z_ROCHA = 1.3, 0.2
    rb = bmesh.new()
    bmesh.ops.create_icosphere(rb, subdivisions=4, radius=RR, calc_uvs=True)
    for v in rb.verts:
        if v.co.z > Z_ROCHA:
            v.co.z = Z_ROCHA
        elif v.co.z < 0:
            t = min(1.0, -v.co.z / RR)
            v.co.x *= 1 - 0.55 * t
            v.co.y *= 1 - 0.55 * t
            v.co.z *= 1.15
    rocha = _bm_obj(rb, "Moon_Rock_Base", [m_rocha])
    tex_c = bpy.data.textures.new(f"Rock_Crateras_{seed}", type="VORONOI")
    tex_c.noise_scale = 0.55
    d1 = rocha.modifiers.new("Rock_Displace_Crateras", type="DISPLACE")
    d1.texture, d1.mid_level, d1.strength = tex_c, 0.55, 0.16
    tex_s = bpy.data.textures.new(f"Rock_Silhueta_{seed}", type="CLOUDS")
    tex_s.noise_scale = 0.9
    d2 = rocha.modifiers.new("Rock_Displace_Silhueta", type="DISPLACE")
    d2.texture, d2.mid_level, d2.strength = tex_s, 0.5, 0.14
    for p in rocha.data.polygons:
        p.use_smooth = True

    # ── Plinto octogonal em 3 degraus + escadaria frontal ──
    pl = bmesh.new()
    z = Z_ROCHA
    for raio in (1.05, 0.95, 0.85):
        _cil(pl, Vector((0, 0, z + 0.035)), raio, 0.07, seg=8, mat=0,
             matriz=Matrix.Translation((0, 0, z + 0.035)) @ Matrix.Rotation(math.radians(22.5), 4, "Z"))
        z += 0.07
        vs = [Vector((math.cos(math.radians(22.5 + 45 * i)) * raio * 1.005,
                      math.sin(math.radians(22.5 + 45 * i)) * raio * 1.005, z + 0.004)) for i in range(8)]
        for i in range(8):
            _cone(pl, vs[i], vs[(i + 1) % 8], 0.009, 0.009, seg=4, mat=1)
    Z_PL = z  # topo do plinto
    for i in range(4):
        _caixa(pl, Vector((0, -1.0 - 0.13 * (3 - i), Z_ROCHA + 0.0525 * (i + 1) / 2)),
               0.85 - 0.08 * i, 0.15, 0.0525 * (i + 1) + 0.002, mat=0)
    plinto = _bm_obj(pl, "Bank_Plinth", [m_pedra, m_neon])

    # ── Tambor-cofre + cúpula ──
    bo = bmesh.new()
    R_TAM, H_TAM = 0.6, 0.95
    _cil(bo, Vector((0, 0, Z_PL + H_TAM / 2)), R_TAM, H_TAM, seg=32, mat=0)
    Z_TOPO_TAM = Z_PL + H_TAM
    for zz in (Z_PL + 0.05, Z_TOPO_TAM - 0.03):
        _anel(bo, R_TAM + 0.01, 0.022, Matrix.Translation((0, 0, zz)), mat=2, seg=40)
    for i in range(16):  # frisos verticais luminosos no tambor
        a = math.tau * i / 16
        if abs(math.sin(a) + 1) < 0.35:
            continue  # deixa a frente livre pra porta
        p = Vector((math.cos(a) * (R_TAM + 0.006), math.sin(a) * (R_TAM + 0.006), 0))
        _cone(bo, p + Vector((0, 0, Z_PL + 0.15)), p + Vector((0, 0, Z_TOPO_TAM - 0.12)), 0.008, 0.008, seg=4, mat=1)
    R_DOMO = 0.66
    v0 = len(bo.verts)
    bmesh.ops.create_uvsphere(bo, u_segments=32, v_segments=16, radius=R_DOMO,
                              matrix=Matrix.Translation((0, 0, Z_TOPO_TAM)), calc_uvs=True)
    bo.verts.ensure_lookup_table()
    bmesh.ops.delete(bo, geom=[v for v in bo.verts[v0:] if v.co.z < Z_TOPO_TAM - 1e-4], context="VERTS")
    for i in range(8):  # nervuras da cúpula
        th = math.tau * i / 8
        pts = [Vector((math.cos(th) * R_DOMO * 1.012 * math.sin(f), math.sin(th) * R_DOMO * 1.012 * math.sin(f),
                       Z_TOPO_TAM + R_DOMO * 1.012 * math.cos(f))) for f in (math.radians(88), math.radians(66),
                                                                              math.radians(44), math.radians(22), math.radians(6))]
        for a, b in zip(pts, pts[1:]):
            _cone(bo, a, b, 0.011, 0.011, seg=4, mat=1)
    Z_TOPO_DOMO = Z_TOPO_TAM + R_DOMO
    _cil(bo, Vector((0, 0, Z_TOPO_DOMO + 0.05)), 0.09, 0.1, seg=12, mat=2, raio2=0.06)  # lanterna
    corpo = _bm_obj(bo, "Vault_Body", [m_escuro, m_neon, m_prata])

    # ── Porta gigante do cofre ──
    Y_PORTA = -(R_TAM + 0.045)
    Z_PORTA = Z_PL + 0.5
    M_PORTA = Matrix.Rotation(math.radians(90), 4, "X")
    dr = bmesh.new()
    _cil(dr, None, 0.37, 0.09, seg=48, mat=0, matriz=Matrix.Translation((0, -R_TAM - 0.02, Z_PORTA)) @ M_PORTA)
    _anel(dr, 0.37, 0.025, Matrix.Translation((0, Y_PORTA - 0.03, Z_PORTA)) @ M_PORTA, mat=0, seg=48)
    for rf in (0.28, 0.2, 0.12):
        _anel(dr, rf, 0.011, Matrix.Translation((0, Y_PORTA - 0.055, Z_PORTA)) @ M_PORTA, mat=1, seg=40)
    for i in range(6):  # raios do volante
        a = math.tau * i / 6
        c = Vector((0, Y_PORTA - 0.06, Z_PORTA))
        _cone(dr, c, c + Vector((math.cos(a) * 0.33, 0, math.sin(a) * 0.33)), 0.014, 0.014, seg=4, mat=0)
    _cil(dr, None, 0.06, 0.06, seg=16, mat=1, matriz=Matrix.Translation((0, Y_PORTA - 0.075, Z_PORTA)) @ M_PORTA)
    porta = _bm_obj(dr, "Vault_Door", [m_prata, m_neon_p])

    # ── Colunata neoclássica + entablamento + frontão ──
    co = bmesh.new()
    R_COL, H_COL = 0.8, 0.9
    tops = []
    for i in range(12):
        ang = math.radians(15 + 30 * i)
        x, y = math.cos(ang) * R_COL, math.sin(ang) * R_COL
        tops.append(Vector((x, y, Z_PL + H_COL)))
        if abs(math.degrees(ang) - 255) < 20 or abs(math.degrees(ang) - 285) < 20:
            continue  # vão do pórtico, à frente da porta
        _coluna(co, x, y, Z_PL, H_COL, 0.055)
    for i in range(12):  # arquitrave em anel
        _cone(co, tops[i] + Vector((0, 0, 0.03)), tops[(i + 1) % 12] + Vector((0, 0, 0.03)), 0.05, 0.05, seg=4, mat=0)
        _cone(co, tops[i] + Vector((0, 0, 0.09)), tops[(i + 1) % 12] + Vector((0, 0, 0.09)), 0.028, 0.028, seg=4, mat=1)
    _prisma_tri(co, -R_COL - 0.06, 0.12, 0.42, Z_PL + H_COL + 0.09, 0.24, mat=0)
    _prisma_tri(co, -R_COL - 0.075, 0.03, 0.34, Z_PL + H_COL + 0.11, 0.19, mat=1)
    colunata = _bm_obj(co, "Bank_Colonnade", [m_pedra, m_neon])

    # ── Espigão + lua crescente coroando a cúpula ──
    sp = bmesh.new()
    z_s = Z_TOPO_DOMO + 0.1
    _cone(sp, Vector((0, 0, z_s)), Vector((0, 0, z_s + 0.4)), 0.035, 0.0, seg=6, mat=0)
    _lua(sp, 0.16, 0.13, 0.055, 0.028,
         Matrix.Translation((0, 0, z_s + 0.3)) @ Matrix(((0, 1, 0, 0), (0, 0, 1, 0), (1, 0, 0, 0), (0, 0, 0, 1))), mat=1)
    espigao = _bm_obj(sp, "Vault_Spire", [m_prata, m_neon_p])

    # ── Arco de lua crescente gigante atrás do templo ──
    la = bmesh.new()
    RA = 1.35
    _lua(la, RA, RA * 0.84, RA * 0.30, 0.16,
         Matrix.Translation((0, 0.62, Z_ROCHA + 0.85)) @ Matrix(((0, 1, 0, 0), (0, 0, -1, 0), (-1, 0, 0, 0), (0, 0, 0, 1))),
         mat=0, n=56)
    arco = _bm_obj(la, "Bank_Crescent", [m_lua])

    # ── Quatro obeliscos guardiões ──
    ob = bmesh.new()
    for k in range(4):
        a = math.radians(45 + 90 * k)
        x, y = math.cos(a) * 1.0, math.sin(a) * 1.0
        _caixa(ob, Vector((x, y, Z_ROCHA + 0.06)), 0.2, 0.2, 0.12, mat=0)
        _cone(ob, Vector((x, y, Z_ROCHA + 0.12)), Vector((x, y, Z_ROCHA + 0.98)), 0.075, 0.048, seg=4, mat=0)
        _cone(ob, Vector((x, y, Z_ROCHA + 0.98)), Vector((x, y, Z_ROCHA + 1.16)), 0.048, 0.0, seg=4, mat=1)
        _anel(ob, 0.062, 0.01, Matrix.Translation((x, y, Z_ROCHA + 0.7)), mat=1, seg=16, lado=4)
    obelisco = _bm_obj(ob, "Bank_Obelisks", [m_pedra, m_neon_p])

    # ── Núcleo aceso na lanterna ──
    nb = bmesh.new()
    bmesh.ops.create_icosphere(nb, subdivisions=2, radius=0.075,
                               matrix=Matrix.Translation((0, 0, Z_TOPO_DOMO + 0.13)), calc_uvs=True)
    nucleo = _bm_obj(nb, "Vault_Core", [m_neon_p])

    # ── Halos translúcidos + moedas orbitando ──
    hb = bmesh.new()
    Z_HALO = Z_ROCHA + 1.35
    inclin = [(1.55, 68, 12), (1.38, -58, 100)]
    for raio, tilt, giro in inclin:
        M = Matrix.Translation((0, 0, Z_HALO)) @ Matrix.Rotation(math.radians(giro), 4, "Z") @ Matrix.Rotation(math.radians(tilt), 4, "X")
        _anel(hb, raio, 0.022, M, mat=0, seg=72, lado=8)
    halo = _bm_obj(hb, "Vault_Ring", [m_halo])

    mb = bmesh.new()
    off = rng.uniform(0, math.tau)
    for raio, tilt, giro in inclin:
        M = Matrix.Translation((0, 0, Z_HALO)) @ Matrix.Rotation(math.radians(giro), 4, "Z") @ Matrix.Rotation(math.radians(tilt), 4, "X")
        for i in range(9):
            a = off + math.tau * i / 9
            p = M @ Vector((math.cos(a) * raio, math.sin(a) * raio, 0))
            rad = (M.to_3x3() @ Vector((math.cos(a), math.sin(a), 0))).normalized()
            _cil(mb, None, 0.05, 0.016, seg=6, mat=0,
                 matriz=Matrix.Translation(p) @ rad.to_track_quat("Z", "Y").to_matrix().to_4x4())
    moedas = _bm_obj(mb, "Ledger_Motes", [m_neon_p])

    return [rocha, plinto, corpo, porta, colunata, espigao, arco, obelisco, nucleo, halo, moedas]


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

    partes = construir_banco(args.seed, rgb_neon01)

    build_studio_lights()

    root = bpy.data.objects.new(args.slug, None)
    root.scale = (ESCALA_MODELO,) * 3
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
