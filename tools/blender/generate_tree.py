"""Gera uma árvore low-poly + globo de vidro (dome) e exporta para .glb.

Roda em modo headless, sem GUI:
    blender --background --python generate_tree.py -- --slug aethel --color 201,162,39 --seed 1 --out ../../public/models/trees/aethel.glb

Hierarquia exportada (nomes usados depois pelo Three.js para achar o dome e
animar a opacidade dele):
    <slug> (Empty, raiz)
      ├── Tree_Trunk
      ├── Tree_Foliage
      ├── Dome_Base
      └── Dome_Glass

--mode axis: variante especial pra A.X.I.S (o Fluxo tecnológico de Jota
Macedo, que subjugou a Árvore Parley/Keryx). Em vez do trio orgânico normal,
gera uma gaiola tecnológica em volta de uma Parley remanescente — pequena,
pálida e semitransparente (Tree_Trunk/Tree_Foliage continuam existindo, só
que minúsculos e fracos) —, com peças extras (Axis_Core, Axis_Rings,
Axis_Struts, Axis_Motes) e Dome_Base/Dome_Glass reaproveitados como
plataforma metálica angular e campo de contenção (em vez de ilha/vidro
orgânicos). Os nomes Dome_Base/Dome_Glass são mantidos mesmo nesse modo só
pra o Three.js (que procura "Dome_Glass" por nome pra animar opacidade e
medir o raio) continuar funcionando sem precisar de nenhum caso especial:
    blender --background --python generate_tree.py -- --mode axis --slug axis --out ../../public/models/trees/axis.glb

Notas de compatibilidade (Blender 5.1, node names em PT-BR neste ambiente):
  - Nós são buscados por `bl_idname` (não por nome de exibição, que vem
    traduzido — ex. "BSDF - Pré-fundamentado" em vez de "Principled BSDF").
  - Sockets do Principled BSDF usam identificadores estáveis em inglês,
    mas alguns foram renomeados no Blender 4.0+ (confirmado via sondagem
    direta nesta instalação + pesquisa): "Transmission" → "Transmission
    Weight", "Clearcoat" → "Coat Weight", "Clearcoat Roughness" →
    "Coat Roughness". "Noise Texture" gera saída "Factor" (não "Fac").
  - IMPORTANTE: um grafo procedural puro (Noise → Bump → Normal, sem
    nenhuma imagem envolvida) NÃO sobrevive à exportação glTF — o
    exportador só consegue serializar texturas baseadas em imagem
    (normalTexture). Por isso o relevo de casca/folhagem aqui é gerado
    como uma imagem de normal map via numpy (bpy.data.images.new +
    pixels.foreach_set), plugada por Image Texture → Normal Map →
    Principled.Normal — isso sim é exportado corretamente (confirmado
    inspecionando o .glb resultante).
  - Luzes (Key/Fill/Rim) são criadas na cena para referência/preview no
    próprio Blender, mas NÃO são exportadas — o app usa sua própria
    iluminação + environment map em Three.js (ver
    src/mundo/views/components/tree3d.js), então exportar luzes
    duplicaria/conflitaria com ela.
"""

import bpy
import random
import sys
import math
import argparse
import numpy as np
from mathutils import Vector, Quaternion, Matrix
import bmesh


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
    parser.add_argument("--mode", default="organica", choices=["organica", "axis"])
    parser.add_argument("--estilo", default="padrao", help="silhueta da arvore (ver ESTILOS); padrao = gerador original")
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


# ── Normal map procedural via numpy (gerado em memória, não via bake) ──
# Um grafo de nós puramente procedural (Noise → Bump) não sobrevive à
# exportação glTF por não ter pixels reais por trás. Gerar a imagem direto
# com numpy evita depender do bake do Cycles (frágil em modo headless) e
# ainda assim produz um normalTexture de verdade no .glb exportado.

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
    "forca": float} — usado nas peças neon da A.X.I.S (ver --mode axis)."""
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


def build_trunk(rng, height, seed, rgb01=(0.28, 0.18, 0.11), alpha=1.0, radius_mult=1.0, tilt_deg=0.0):
    bpy.ops.mesh.primitive_cone_add(
        vertices=7,
        radius1=(0.14 + rng.uniform(-0.02, 0.02)) * radius_mult,
        radius2=0.07 * radius_mult,
        depth=height,
        location=(0, 0, height / 2),
    )
    trunk = bpy.context.active_object
    trunk.name = "Tree_Trunk"
    if tilt_deg:
        trunk.rotation_euler = (math.radians(tilt_deg), 0, rng.uniform(0, math.tau))
    trunk.data.materials.append(make_material(
        "Tree_Bark", rgb01, alpha=alpha, roughness=0.95,
        bump={"seed": seed, "escala": 22.0, "forca": 0.55},
    ))
    return trunk


def build_foliage(rng, rgb01, base_z, seed, n_range=(3, 5), radius_range=(0.28, 0.42), center_radius=0.22, alpha=1.0):
    """Retorna (objeto_folhagem, alcance_maximo) — alcance_maximo é a
    distância da origem (centro do futuro dome) até o ponto mais distante
    de qualquer blob de folhagem, usada pra dimensionar o dome com
    segurança sem superdimensionar."""
    blobs = []
    reaches = []
    n = rng.randint(*n_range)
    for i in range(n):
        angle = (i / n) * math.tau + rng.uniform(-0.3, 0.3)
        r = center_radius * rng.uniform(0.5, 1.0)
        x = math.cos(angle) * r
        y = math.sin(angle) * r
        z = base_z + rng.uniform(0.1, 0.45)
        radius = rng.uniform(*radius_range)
        bpy.ops.mesh.primitive_ico_sphere_add(
            subdivisions=1, radius=radius, location=(x, y, z)
        )
        blobs.append(bpy.context.active_object)
        reaches.append(math.sqrt(x * x + y * y + z * z) + radius)

    bpy.ops.object.select_all(action="DESELECT")
    for b in blobs:
        b.select_set(True)
    bpy.context.view_layer.objects.active = blobs[0]
    bpy.ops.object.join()
    foliage = bpy.context.active_object
    foliage.name = "Tree_Foliage"
    foliage.data.materials.append(make_material(
        "Tree_Foliage_Mat", rgb01, alpha=alpha, roughness=0.5,
        bump={"seed": seed + 100, "escala": 34.0, "forca": 0.3},
    ))
    return foliage, max(reaches)


def build_dome(alcance_arvore, seed):
    """Globo de vidro — esfera completa (sem cortar a base), com folga
    suficiente pra conter a árvore inteira (tronco + folhagem). A base é
    uma ilha/rocha flutuante de verdade: afunila de forma irregular até
    quase o fundo da esfera (preenche a metade inferior, em vez de deixar
    ela vazia atrás de um disquinho fino), com relevo de rocha via
    Displace (Clouds pra silhueta irregular + Voronoi pras rachaduras/
    saliências finas) — grama no topo, terra escura nas laterais/fundo."""
    dome_radius = alcance_arvore * 1.18 + 0.3
    # Subsurf encolhe a malha nas bordas/ponta (Catmull-Clark puxa pra
    # dentro em cantos vivos) — valores calibrados empiricamente (ver
    # scratchpad/check_containment.py) pra depois da subdivisão a ilha
    # realmente preencher a metade inferior da esfera, com folga segura.
    altura_ilha = dome_radius * 1.9
    raio_topo = dome_radius * 1.05
    raio_base = dome_radius * 0.15

    bpy.ops.mesh.primitive_cone_add(
        vertices=32, radius1=raio_base, radius2=raio_topo, depth=altura_ilha,
        location=(0, 0, -altura_ilha / 2),
    )
    base = bpy.context.active_object
    base.name = "Dome_Base"

    grama_mat = make_material(
        "Dome_Base_Grama", (0.16, 0.32, 0.12), roughness=0.85,
        bump={"seed": seed + 200, "escala": 20.0, "forca": 0.35},
    )
    terra_mat = make_material(
        "Dome_Base_Terra", (0.12, 0.08, 0.05), roughness=0.95,
        bump={"seed": seed + 300, "escala": 14.0, "forca": 0.5},
    )
    base.data.materials.append(grama_mat)  # index 0 — topo
    base.data.materials.append(terra_mat)  # index 1 — laterais + fundo

    # Material por face ANTES dos modifiers — Subsurf/Displace preservam o
    # material_index das faces originais nas subfaces que criam.
    for poly in base.data.polygons:
        poly.material_index = 0 if poly.normal.z > 0.5 else 1

    # Densidade extra pro relevo de rocha ter onde aparecer (um cone de 32
    # lados sem isso teria poucos vértices pro Displace mover de forma
    # convincente).
    subsurf_ilha = base.modifiers.new("Ilha_Subsurf", type="SUBSURF")
    subsurf_ilha.levels = 2
    subsurf_ilha.render_levels = 2

    # Passe 1 — irregularidade grande: quebra a silhueta de cone perfeito
    # (bulge/reentrância amplos, tipo rocha entortada).
    tex_nuvem = bpy.data.textures.new(f"Ilha_Nuvem_{seed}", type="CLOUDS")
    tex_nuvem.noise_scale = 0.9
    tex_nuvem.noise_depth = 2
    disp_nuvem = base.modifiers.new("Ilha_Displace_Nuvem", type="DISPLACE")
    disp_nuvem.texture = tex_nuvem
    disp_nuvem.mid_level = 0.5
    disp_nuvem.strength = dome_radius * 0.22

    # Passe 2 — relevo fino de rocha: saliências e ranhuras (rachaduras
    # tipo célula do Voronoi), escala menor que o passe 1.
    tex_rocha = bpy.data.textures.new(f"Ilha_Rocha_{seed}", type="VORONOI")
    tex_rocha.noise_scale = 0.35
    disp_rocha = base.modifiers.new("Ilha_Displace_Rocha", type="DISPLACE")
    disp_rocha.texture = tex_rocha
    disp_rocha.mid_level = 0.5
    disp_rocha.strength = dome_radius * 0.12

    for poly in base.data.polygons:
        poly.use_smooth = True

    # Trava de segurança: altura e raio da ilha interagem de um jeito difícil
    # de prever à mão (o Displace empurra ao longo da normal, e um cone mais
    # alto/íngreme tem normais mais "deitadas" — mais horizontais —, então a
    # MESMA força de deslocamento empurra mais no raio conforme a ilha fica
    # mais alta). Em vez de adivinhar constantes que funcionem pra todas as
    # sementes, mede a malha já com os modifiers aplicados e reescala se
    # ultrapassar o raio seguro — garante que nunca fura o vidro, qualquer
    # que seja o ruído sorteado.
    bpy.context.view_layer.update()
    depsgraph = bpy.context.evaluated_depsgraph_get()
    base_eval = base.evaluated_get(depsgraph)
    matriz_mundo = base.matrix_world.copy()
    # matrix_world @ v.co converte de espaço local do objeto (a origem do
    # cone fica no meio da ilha, não no centro do dome) pra espaço do
    # mundo — é a distância até o centro do vidro que importa aqui, não
    # a distância até a origem local do objeto.
    raio_real = max((matriz_mundo @ v.co).length for v in base_eval.data.vertices)
    raio_seguro = dome_radius * 0.92
    if raio_real > raio_seguro:
        fator = raio_seguro / raio_real
        base.scale = (fator, fator, fator)
        # A origem do objeto fica no meio da ilha (não no topo) — sem essa
        # correção, reescalar em volta da origem puxaria o topo (onde a
        # árvore fica de pé) pra baixo de z=0.
        base.location.z = -fator * (altura_ilha / 2)

    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=32, ring_count=18, radius=dome_radius, location=(0, 0, 0)
    )
    glass = bpy.context.active_object
    glass.name = "Dome_Glass"

    # Esfera completa e perfeitamente redonda — shade smooth + Subdivision
    # Surface, sem cortar nenhum hemisfério (a base opaca abaixo já cobre
    # visualmente a calota inferior).
    for poly in glass.data.polygons:
        poly.use_smooth = True
    subsurf = glass.modifiers.new("Smooth_Sphere", type="SUBSURF")
    subsurf.levels = 2
    subsurf.render_levels = 2

    glass.data.materials.append(
        make_material(
            "Dome_Glass_Mat",
            (0.85, 0.92, 0.95),
            alpha=0.28,
            roughness=0.0,
            transmission=1.0,
            coat=0.5,
        )
    )
    return base, glass


# ── --mode axis: gaiola tecnológica da A.X.I.S sobre a Parley remanescente ──
# Em vez do trio orgânico (tronco/folhagem/ilha/vidro), esta variante monta
# uma estrutura artificial angular em volta de uma Parley encolhida e
# semitransparente — ver docstring do módulo pro raciocínio narrativo.

RGB_PARLEY_DESBOTADA = tuple(srgb_to_linear(c) for c in (150, 158, 170))


def criar_materiais_axis(cor_neon01):
    return {
        "metal_escuro": make_material(
            "Axis_Metal_Escuro", (0.045, 0.05, 0.07), roughness=0.35, metallic=0.9,
        ),
        "metal_neon": make_material(
            "Axis_Metal_Neon", (0.05, 0.055, 0.08), roughness=0.3, metallic=0.85,
            emissao={"cor01": cor_neon01, "forca": 1.6},
        ),
        "neon_puro": make_material(
            "Axis_Neon_Puro", cor_neon01, roughness=0.2, metallic=0.4,
            emissao={"forca": 3.5},
        ),
        "campo_contencao": make_material(
            "Axis_Campo_Contencao", cor_neon01, alpha=0.12, roughness=0.05,
            transmission=0.9,
        ),
    }


def criar_viga(p1, p2, espessura):
    """Caixa fina orientada entre dois pontos do mundo — usada pelo
    vigamento (Axis_Struts) que enjaula a Parley remanescente."""
    p1v, p2v = Vector(p1), Vector(p2)
    direcao = p2v - p1v
    comprimento = direcao.length
    centro = (p1v + p2v) / 2
    bpy.ops.mesh.primitive_cube_add(size=1, location=centro)
    viga = bpy.context.active_object
    viga.scale = (espessura, espessura, comprimento)
    eixo_z = Vector((0, 0, 1))
    viga.rotation_euler = eixo_z.rotation_difference(direcao.normalized()).to_euler()
    return viga


def hex_pontos(n, raio, z, offset_deg=0.0):
    return [
        Vector((
            math.cos(math.tau * i / n + math.radians(offset_deg)) * raio,
            math.sin(math.tau * i / n + math.radians(offset_deg)) * raio,
            z,
        ))
        for i in range(n)
    ]


def build_axis_platform(dome_radius, mats):
    """Plataforma/doca metálica angular — substitui a ilha de rocha e grama
    das Árvores orgânicas (build_dome). Prisma hexagonal baixo, plano."""
    raio = dome_radius * 0.62
    altura = dome_radius * 0.34
    bpy.ops.mesh.primitive_cylinder_add(
        vertices=6, radius=raio, depth=altura, location=(0, 0, -altura / 2)
    )
    plataforma = bpy.context.active_object
    plataforma.name = "Dome_Base"
    plataforma.data.materials.append(mats["metal_escuro"])
    for poly in plataforma.data.polygons:
        poly.use_smooth = False
    return plataforma


def build_axis_core(dome_radius, mats):
    """Espinho/antena central que fura a plataforma por baixo e o campo de
    contenção por cima — ao contrário dos domes orgânicos (que contêm a
    árvore inteira com folga), a estrutura da A.X.I.S rompe a própria
    contenção que ela impõe."""
    R = dome_radius
    z0 = -0.30 * R
    z_topo = 1.55 * R
    comprimento_total = z_topo - z0
    segmentos_frac = [
        (0.00, 0.22, 0.085, 0.070),
        (0.22, 0.45, 0.070, 0.050),
        (0.45, 0.68, 0.050, 0.032),
        (0.68, 0.86, 0.032, 0.016),
        (0.86, 1.00, 0.016, 0.000),
    ]
    segs = []
    for f0, f1, r0, r1 in segmentos_frac:
        seg_z0 = z0 + f0 * comprimento_total
        seg_z1 = z0 + f1 * comprimento_total
        bpy.ops.mesh.primitive_cone_add(
            vertices=6, radius1=r0 * R, radius2=r1 * R,
            depth=seg_z1 - seg_z0, location=(0, 0, (seg_z0 + seg_z1) / 2),
        )
        segs.append(bpy.context.active_object)

    bpy.ops.object.select_all(action="DESELECT")
    for s in segs:
        s.select_set(True)
    bpy.context.view_layer.objects.active = segs[0]
    bpy.ops.object.join()
    core = bpy.context.active_object
    core.name = "Axis_Core"
    core.data.materials.append(mats["metal_escuro"])
    return core, Vector((0, 0, z_topo))


def build_axis_rings(dome_radius, seed, mats):
    """Anéis inclinados tipo giroscópio/orrery em volta do núcleo, mais um
    aro na borda da plataforma — a "malha artificial" que intercepta e
    isola a Árvore, mencionada na ficha da A.X.I.S."""
    R = dome_radius
    off = (seed * 37) % 360
    especificacoes = [
        (0.97, 0.03, 4, off, 0.020, "neon_puro"),        # aro da plataforma
        (0.85, 0.22, 14, off + 20, 0.022, "metal_neon"),  # anel grande, dentro do campo
        (0.65, 0.62, -22, off + 95, 0.020, "metal_neon"), # anel médio, inclinado
        (0.30, 1.35, 8, off + 150, 0.014, "neon_puro"),   # colar apertado no bico exposto
    ]
    aneis = []
    for raio_frac, z_frac, tx, tz, esp_frac, mat_key in especificacoes:
        bpy.ops.mesh.primitive_torus_add(
            major_radius=raio_frac * R, minor_radius=esp_frac * R,
            location=(0, 0, z_frac * R), major_segments=28, minor_segments=10,
        )
        anel = bpy.context.active_object
        anel.rotation_euler = (math.radians(tx), 0, math.radians(tz))
        anel.data.materials.append(mats[mat_key])
        aneis.append(anel)

    bpy.ops.object.select_all(action="DESELECT")
    for a in aneis:
        a.select_set(True)
    bpy.context.view_layer.objects.active = aneis[0]
    bpy.ops.object.join()
    rings = bpy.context.active_object
    rings.name = "Axis_Rings"
    return rings


def build_axis_struts(dome_radius, seed, mats):
    """Vigamento hexagonal levemente torcido, tipo gaiola de pássaro —
    prende a Parley remanescente por dentro, convergindo pro núcleo."""
    R = dome_radius
    off = (seed * 37) % 360
    base_pts = hex_pontos(6, 0.72 * R, 0.05 * R, offset_deg=off)
    topo_pts = hex_pontos(6, 0.26 * R, 1.05 * R, offset_deg=off + 28)
    vigas = [criar_viga(base_pts[i], topo_pts[i], 0.018 * R) for i in range(6)]
    for v in vigas:
        v.data.materials.append(mats["metal_escuro"])

    bpy.ops.object.select_all(action="DESELECT")
    for v in vigas:
        v.select_set(True)
    bpy.context.view_layer.objects.active = vigas[0]
    bpy.ops.object.join()
    struts = bpy.context.active_object
    struts.name = "Axis_Struts"
    return struts, topo_pts


def build_axis_motes(pontos, mats):
    """Pequenos nós sensores luminosos nos vértices da gaiola e na ponta do
    núcleo — detalhe de "malha de vigilância" (a A.X.I.S intercepta e
    filtra comunicação, ver Estrutura do Jardim)."""
    motes = []
    for p in pontos:
        bpy.ops.mesh.primitive_ico_sphere_add(subdivisions=1, radius=0.035, location=p)
        motes.append(bpy.context.active_object)

    bpy.ops.object.select_all(action="DESELECT")
    for m in motes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = motes[0]
    bpy.ops.object.join()
    grupo = bpy.context.active_object
    grupo.name = "Axis_Motes"
    grupo.data.materials.append(mats["neon_puro"])
    return grupo


def build_axis_glass(dome_radius, mats):
    """Campo de contenção — substitui o globo de vidro orgânico. Facetado
    de propósito (sem Subsurf/shade smooth), pra ler como um campo de força
    poligonal, não como vidro bonito de estufa."""
    bpy.ops.mesh.primitive_uv_sphere_add(
        segments=20, ring_count=10, radius=dome_radius, location=(0, 0, 0)
    )
    glass = bpy.context.active_object
    glass.name = "Dome_Glass"
    glass.data.materials.append(mats["campo_contencao"])
    return glass


# ── Silhuetas próprias por Árvore (--estilo) ──
# Galhos ramificados de verdade (recursivos, com torção e gravidade) em vez de
# um tronco reto com blobs. Tudo é gerado com bmesh em UMA malha de tronco e
# UMA de folhagem, então a hierarquia exportada é a mesma de sempre
# (Tree_Trunk, Tree_Foliage, Dome_Base, Dome_Glass).
# Cada estilo é só dados; `extras` adiciona a assinatura visual da Árvore.
# Materiais da folhagem: índice 0 = folha, índice 1 = brilho (emissivo).

ESTILOS = {
    # Gênese: copa larga de cerejeira, pétalas flutuando.
    "genese": dict(h=1.25, r=0.15, torcao=0.18, prof=3, filhos=3, abertura=44, encolhe=0.72,
                   grav=0.35, comp=0.55, folhas=2, folha_r=0.30, folha_esc=(1, 1, 0.8), jitter=0.20,
                   brilho=0.0, tronco=(0.30, 0.19, 0.14), extras=[("petalas", 16)]),
    # Éon: tronco antigo, retorcido e grosso; anéis de tempo dourados.
    "eon": dict(h=1.0, r=0.24, torcao=0.55, prof=3, filhos=2, abertura=58, encolhe=0.74,
                grav=0.15, comp=0.55, folhas=2, folha_r=0.26, folha_esc=(1, 1, 0.7), jitter=0.25,
                brilho=0.0, tronco=(0.20, 0.15, 0.10), extras=[("aneis", 2)], raizes=5),
    # Alétheia: esguia, folhas em cristais dourados que brilham.
    "aletheia": dict(h=1.4, r=0.11, torcao=0.10, prof=3, filhos=3, abertura=34, encolhe=0.74,
                     grav=0.45, comp=0.5, folhas=4, folha_r=0.26, folha_esc=(0.34, 0.34, 1.4), jitter=0.06,
                     brilho=1.3, tronco=(0.34, 0.27, 0.14), orienta=True, extras=[]),
    # Anima: exuberante, viva, com raízes e flores.
    "anima": dict(h=1.15, r=0.17, torcao=0.20, prof=3, filhos=3, abertura=46, encolhe=0.72,
                  grav=0.30, comp=0.5, folhas=3, folha_r=0.24, folha_esc=(1, 1, 0.85), jitter=0.22,
                  brilho=0.0, tronco=(0.26, 0.18, 0.10), extras=[("petalas", 12)], raizes=5),
    # Baluarte: baixa, larga e maciça; copa achatada como muralha.
    "baluarte": dict(h=0.75, r=0.32, torcao=0.05, prof=2, filhos=3, abertura=70, encolhe=0.7,
                     grav=-0.05, comp=0.5, folhas=3, folha_r=0.36, folha_esc=(1.25, 1.25, 0.5), jitter=0.10,
                     brilho=0.0, tronco=(0.22, 0.17, 0.12), extras=[], raizes=7),
    # Matriz: copa partida em fragmentos que orbitam um núcleo aceso.
    "matriz": dict(h=1.2, r=0.13, torcao=0.30, prof=3, filhos=2, abertura=50, encolhe=0.7,
                   grav=0.3, comp=0.5, folhas=1, folha_r=0.26, folha_esc=(1, 1, 1), jitter=0.28,
                   brilho=0.25, tronco=(0.16, 0.11, 0.22), espalha=0.32,
                   extras=[("nucleo", 1), ("fragmentos", 9), ("aneis", 1)]),
    # Vórtice: tronco em espiral e a copa é fogo, não folha.
    "vortice": dict(h=1.1, r=0.14, torcao=0.75, prof=2, filhos=3, abertura=38, encolhe=0.7,
                    grav=0.7, comp=0.55, folhas=0, folha_r=0.2, folha_esc=(1, 1, 1), jitter=0.1,
                    brilho=1.6, tronco=(0.12, 0.07, 0.05), extras=[("chamas", 1)]),
    # O Vazio: galhos secos e negros, cacos flutuando.
    "vazio": dict(h=1.3, r=0.13, torcao=0.35, prof=4, filhos=2, abertura=52, encolhe=0.74,
                  grav=0.1, comp=0.6, folhas=0, folha_r=0.2, folha_esc=(1, 1, 1), jitter=0.1,
                  brilho=0.0, tronco=(0.20, 0.17, 0.26), extras=[("cacos", 14)]),
    # Limiar: chorona, fios carmesim pendendo dos galhos.
    "limiar": dict(h=1.2, r=0.15, torcao=0.25, prof=3, filhos=3, abertura=52, encolhe=0.72,
                   grav=-0.45, comp=0.55, folhas=1, folha_r=0.18, folha_esc=(1, 1, 1.3), jitter=0.2,
                   brilho=0.25, tronco=(0.12, 0.05, 0.06), extras=[("fios", 3)]),
    # Parley: pálida e rala, o que sobrou.
    "parley": dict(h=1.15, r=0.11, torcao=0.30, prof=3, filhos=2, abertura=48, encolhe=0.72,
                   grav=-0.1, comp=0.5, folhas=1, folha_r=0.16, folha_esc=(1, 1, 0.9), jitter=0.2,
                   brilho=0.0, tronco=(0.34, 0.35, 0.38), extras=[("petalas", 6)]),
}


def _cone_entre(bm, p1, p2, r1, r2, seg=6, mat=0):
    d = p2 - p1
    comp = d.length
    if comp < 1e-5:
        return
    rot = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_matrix().to_4x4()
    n0 = len(bm.faces)
    bmesh.ops.create_cone(
        bm, cap_ends=True, cap_tris=False, segments=seg, radius1=r1, radius2=r2,
        depth=comp, matrix=Matrix.Translation((p1 + p2) / 2) @ rot, calc_uvs=True,
    )
    bm.faces.ensure_lookup_table()
    for f in bm.faces[n0:]:
        f.material_index = mat


def _ico(bm, pos, raio, escala, direcao, rng, jitter, mat=0):
    """Icosfera achatada/esticada e amassada. `direcao`: eixo Z da peça."""
    rot = Vector((0, 0, 1)).rotation_difference(Vector(direcao).normalized()).to_matrix().to_4x4()
    rot = rot @ Matrix.Rotation(rng.uniform(0, math.tau), 4, "Z")
    esc = Matrix.Diagonal((escala[0], escala[1], escala[2], 1.0))
    n0 = len(bm.faces)
    v0 = len(bm.verts)
    bmesh.ops.create_icosphere(
        bm, subdivisions=1, radius=raio, matrix=Matrix.Translation(pos) @ rot @ esc, calc_uvs=True,
    )
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    for v in bm.verts[v0:]:
        v.co += Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1))) * raio * jitter
    for f in bm.faces[n0:]:
        f.material_index = mat


def _toro(bm, raio, espessura, matriz, mat=0, seg=36, lado=6):
    anel = []
    for i in range(seg):
        a = math.tau * i / seg
        centro = Vector((math.cos(a) * raio, math.sin(a) * raio, 0))
        radial = centro.normalized()
        linha = []
        for j in range(lado):
            b = math.tau * j / lado
            p = centro + radial * math.cos(b) * espessura + Vector((0, 0, math.sin(b) * espessura))
            linha.append(bm.verts.new(matriz @ p))
        anel.append(linha)
    for i in range(seg):
        for j in range(lado):
            f = bm.faces.new((anel[i][j], anel[i][(j + 1) % lado],
                              anel[(i + 1) % seg][(j + 1) % lado], anel[(i + 1) % seg][j]))
            f.material_index = mat


def _rodar(d, eixo, ang):
    return Quaternion(eixo, ang) @ d


def _crescer(tronco_bm, p, d, comp, r, prof, est, rng, pontas):
    p2 = p + d * comp
    _cone_entre(tronco_bm, p, p2, r, r * 0.62, seg=6)
    if prof == 0:
        pontas.append((p2, d))
        return
    n = est["filhos"]
    base_az = rng.uniform(0, math.tau)
    perp = d.orthogonal().normalized()
    for i in range(n):
        az = base_az + math.tau * i / n + rng.uniform(-0.35, 0.35)
        eixo = _rodar(perp, d, az)
        ab = math.radians(est["abertura"] * rng.uniform(0.75, 1.15))
        nd = _rodar(d, eixo, ab)
        nd = (nd + Vector((0, 0, est["grav"] * 0.6))).normalized()
        _crescer(tronco_bm, p2, nd, comp * est["encolhe"] * rng.uniform(0.9, 1.1),
                 r * 0.62, prof - 1, est, rng, pontas)


def build_tree_styled(estilo, rng, rgb01, seed, sobrescreve=None, alfa=1.0):
    """Retorna (tronco, folhagem, alcance) com a silhueta do estilo."""
    est = dict(ESTILOS[estilo])
    est.update(sobrescreve or {})
    est["comp"] *= 1.4
    est["h"] *= 0.85
    est["folha_r"] *= 1.3
    est["r"] *= 1.15
    tb = bmesh.new()   # tronco + galhos
    fb = bmesh.new()   # folhas + extras

    # Tronco: cadeia de segmentos com torção.
    p = Vector((0, 0, 0))
    nseg = 4
    fase = rng.uniform(0, math.tau)
    dir_atual = Vector((0, 0, 1))
    for i in range(nseg):
        a = fase + i * 1.9
        d = Vector((math.cos(a) * est["torcao"], math.sin(a) * est["torcao"], 1.0)).normalized()
        d = (d + dir_atual * 0.4).normalized()
        comp = est["h"] / nseg
        rr = est["r"] * (1 - 0.13 * i)
        _cone_entre(tb, p, p + d * comp, rr, rr * 0.87, seg=7)
        p = p + d * comp
        dir_atual = d
    topo = p

    for k in range(est.get("raizes", 0)):
        a = math.tau * k / est["raizes"] + rng.uniform(-0.2, 0.2)
        fora = Vector((math.cos(a), math.sin(a), 0))
        _cone_entre(tb, Vector((0, 0, est["h"] * 0.22)) + fora * est["r"] * 0.3,
                    fora * est["r"] * 3.0 + Vector((0, 0, -0.02)), est["r"] * 0.55, est["r"] * 0.12, seg=5)

    pontas = []
    _crescer(tb, topo, dir_atual, est["comp"], est["r"] * 0.7, est["prof"], est, rng, pontas)

    # Folhas nas pontas.
    for pos, d in pontas:
        for _ in range(est["folhas"]):
            off = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.3, 1))) * est.get("espalha", 0.18)
            direcao = d if est.get("orienta") else Vector((rng.uniform(-.3, .3), rng.uniform(-.3, .3), 1))
            _ico(fb, pos + off, est["folha_r"] * rng.uniform(0.75, 1.1), est["folha_esc"], direcao,
                 rng, est["jitter"], mat=0)

    ex = dict(est["extras"])
    topo_copa = max([pt[0].z for pt in pontas] + [topo.z])
    centro_copa = Vector((0, 0, (topo.z + topo_copa) / 2 + 0.1))
    raio_copa = max([(pt[0] - centro_copa).length for pt in pontas] + [0.5])

    if "petalas" in ex:
        for _ in range(ex["petalas"]):
            dirv = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-0.6, 0.8))).normalized()
            _ico(fb, centro_copa + dirv * raio_copa * rng.uniform(0.7, 1.15), 0.05,
                 (1, 1, 0.3), dirv, rng, 0.1, mat=1)
    if "nucleo" in ex:
        _ico(fb, centro_copa, 0.17, (1, 1, 1), Vector((0, 0, 1)), rng, 0.05, mat=1)
    if "fragmentos" in ex:
        for i in range(ex["fragmentos"]):
            a = math.tau * i / ex["fragmentos"] + rng.uniform(-0.2, 0.2)
            rr = raio_copa * rng.uniform(1.0, 1.3)
            pos = centro_copa + Vector((math.cos(a) * rr, math.sin(a) * rr, rng.uniform(-0.45, 0.5)))
            _ico(fb, pos, rng.uniform(0.07, 0.14), (1, 1, 1.6), (pos - centro_copa), rng, 0.15,
                 mat=1 if i % 2 else 0)
    if "aneis" in ex:
        for i in range(ex["aneis"]):
            tilt = Matrix.Rotation(math.radians(rng.uniform(15, 40)) * (1 if i % 2 else -1), 4, "X") @ \
                Matrix.Rotation(math.radians(70 * i), 4, "Z")
            _toro(fb, raio_copa * (1.05 + 0.22 * i), 0.018, Matrix.Translation(centro_copa) @ tilt, mat=1)
    if "chamas" in ex:
        for pos, d in pontas:
            for _ in range(2):
                dv = (d + Vector((rng.uniform(-.4, .4), rng.uniform(-.4, .4), 1.1))).normalized()
                _cone_entre(fb, pos, pos + dv * rng.uniform(0.6, 1.0), 0.16, 0.0, seg=5, mat=1)
    if "cacos" in ex:
        for i in range(ex["cacos"]):
            a = math.tau * i / ex["cacos"] + rng.uniform(-0.3, 0.3)
            rr = raio_copa * rng.uniform(0.8, 1.3)
            pos = centro_copa + Vector((math.cos(a) * rr, math.sin(a) * rr, rng.uniform(-0.6, 0.6)))
            _ico(fb, pos, rng.uniform(0.05, 0.11), (0.6, 0.6, 1.8),
                 (rng.uniform(-1, 1), rng.uniform(-1, 1), rng.uniform(-1, 1)), rng, 0.1,
                 mat=1)
    if "fios" in ex:
        for pos, d in pontas:
            for _ in range(ex["fios"]):
                off = Vector((rng.uniform(-1, 1), rng.uniform(-1, 1), 0)) * 0.12
                _cone_entre(fb, pos + off, pos + off + Vector((0, 0, -rng.uniform(0.55, 0.95))),
                            0.03, 0.005, seg=4, mat=1)

    def fazer_objeto(bm, nome):
        malha = bpy.data.meshes.new(nome)
        bm.to_mesh(malha)
        bm.free()
        obj = bpy.data.objects.new(nome, malha)
        bpy.context.collection.objects.link(obj)
        return obj

    tronco = fazer_objeto(tb, "Tree_Trunk")
    folhagem = fazer_objeto(fb, "Tree_Foliage")

    tronco.data.materials.append(make_material(
        "Tree_Bark", est["tronco"], alpha=alfa, roughness=0.95,
        bump={"seed": seed, "escala": 22.0, "forca": 0.55},
    ))
    folhagem.data.materials.append(make_material(
        "Tree_Foliage_Mat", rgb01, alpha=alfa, roughness=0.5,
        bump={"seed": seed + 100, "escala": 34.0, "forca": 0.3},
        emissao={"forca": est["brilho"]} if est["brilho"] > 0 else None,
    ))
    folhagem.data.materials.append(make_material(
        "Tree_Glow_Mat", rgb01, roughness=0.3, emissao={"forca": max(0.9, est["brilho"] * 1.4)},
    ))

    alcance = 0.0
    for obj in (tronco, folhagem):
        for v in obj.data.vertices:
            alcance = max(alcance, v.co.length)
    return tronco, folhagem, alcance, pontas


# ── A.X.I.S v2: a Parley presa numa gaiola-servidor ──
# A Parley (pálida, semitransparente) fica bem visível de pé numa plataforma
# hexagonal em camadas; uma gaiola de nervuras + anéis a envolve e cabos de
# neon saem da gaiola e se cravam nos galhos e no tronco — a tecnologia
# parasitando a árvore. Nomes de nós mantidos (Dome_Base/Dome_Glass etc.).

def _bm_objeto(bm, nome):
    malha = bpy.data.meshes.new(nome)
    bm.to_mesh(malha)
    bm.free()
    obj = bpy.data.objects.new(nome, malha)
    bpy.context.collection.objects.link(obj)
    return obj


def _ponto_esfera(R, theta, phi):
    return Vector((R * math.sin(phi) * math.cos(theta), R * math.sin(phi) * math.sin(theta), R * math.cos(phi)))


def _cabo(bm, a, b, esp, sag, mat=0):
    meio = (a + b) / 2 + Vector((0, 0, -sag))
    _cone_entre(bm, a, meio, esp, esp * 0.8, seg=4, mat=mat)
    _cone_entre(bm, meio, b, esp * 0.8, esp * 0.6, seg=4, mat=mat)


def build_axis_v2(rng, seed, rgb01):
    mats = criar_materiais_axis(rgb01)
    trunk, foliage, alcance, pontas = build_tree_styled(
        "parley", rng, RGB_PARLEY_DESBOTADA, seed,
        sobrescreve=dict(h=1.35, comp=0.55, folha_r=0.2, torcao=0.35, prof=3, r=0.13),
        alfa=0.72,
    )
    R = max(alcance * 1.12, 1.6)

    # Plataforma em camadas + circuitos + ponta de servidor por baixo.
    pb = bmesh.new()
    alt = R * 0.16
    raio = R * 0.66
    bmesh.ops.create_cone(pb, cap_ends=True, segments=6, radius1=raio, radius2=raio, depth=alt,
                          matrix=Matrix.Translation((0, 0, -alt / 2)), calc_uvs=True)
    bmesh.ops.create_cone(pb, cap_ends=True, segments=6, radius1=raio * 0.84, radius2=raio * 0.84, depth=alt * 0.7,
                          matrix=Matrix.Translation((0, 0, -alt - alt * 0.35)), calc_uvs=True)
    bmesh.ops.create_cone(pb, cap_ends=True, segments=6, radius1=R * 0.05, radius2=raio * 0.7, depth=R * 0.95,
                          matrix=Matrix.Translation((0, 0, -alt * 1.7 - R * 0.475)), calc_uvs=True)
    cantos = hex_pontos(6, raio * 0.99, 0.012)
    for i in range(6):
        _cone_entre(pb, cantos[i], cantos[(i + 1) % 6], 0.016, 0.016, seg=4, mat=1)
    for i in range(6):
        ang = math.tau * (i + 0.5) / 6
        f = Vector((math.cos(ang), math.sin(ang), 0.012))
        ini, meio, fim = f * raio * 0.16, f * raio * 0.55, f * raio * 0.95
        _cone_entre(pb, ini, meio, 0.012, 0.012, seg=4, mat=1)
        lado = Vector((-math.sin(ang), math.cos(ang), 0)) * raio * 0.13
        _cone_entre(pb, meio, meio + lado + f * raio * 0.15, 0.010, 0.010, seg=4, mat=1)
        _cone_entre(pb, meio + lado + f * raio * 0.15, fim + lado, 0.010, 0.010, seg=4, mat=1)
    plataforma = _bm_objeto(pb, "Dome_Base")
    plataforma.data.materials.append(mats["metal_escuro"])
    plataforma.data.materials.append(mats["neon_puro"])

    # Gaiola: 6 nervuras em arco + 3 anéis hexagonais, aberta no topo.
    sb = bmesh.new()
    off = rng.uniform(0, math.tau)
    fis = [math.radians(90), math.radians(66), math.radians(42), math.radians(20)]
    for i in range(6):
        th = off + math.tau * i / 6
        pts = [_ponto_esfera(R * 0.98, th, f) for f in fis]
        for a, b in zip(pts, pts[1:]):
            _cone_entre(sb, a, b, 0.032 * R, 0.028 * R, seg=4, mat=0)
    for f in fis[:3]:
        pts = [_ponto_esfera(R * 0.98, off + math.tau * i / 6, f) for i in range(6)]
        for i in range(6):
            _cone_entre(sb, pts[i], pts[(i + 1) % 6], 0.02 * R, 0.02 * R, seg=4, mat=1)
    struts = _bm_objeto(sb, "Axis_Struts")
    struts.data.materials.append(mats["metal_escuro"])
    struts.data.materials.append(mats["metal_neon"])

    # Cabos de neon cravados nos galhos e no tronco (parasitismo).
    cb = bmesh.new()
    alvos = [pt[0] for pt in pontas]
    rng.shuffle(alvos)
    alvos = alvos[:9]
    verts_tronco = sorted((v.co.copy() for v in trunk.data.vertices), key=lambda v: v.z)
    alvos += [verts_tronco[int(len(verts_tronco) * k)] for k in (0.15, 0.35, 0.55)]
    for alvo in alvos:
        az = math.atan2(alvo.y, alvo.x) + rng.uniform(-0.15, 0.15)
        phi = math.radians(66 if alvo.z > R * 0.35 else 90)
        a = _ponto_esfera(R * 0.97, az, phi)
        a.z = max(a.z, 0.05)
        _cabo(cb, a, alvo, 0.007 * R + 0.004, rng.uniform(0.05, 0.15), mat=0)
    cabos = _bm_objeto(cb, "Axis_Cables")
    cabos.data.materials.append(mats["neon_puro"])

    # Agulha/antena no ápice, saindo da gaiola.
    ab = bmesh.new()
    z_ap = R * math.cos(math.radians(20))
    r_ap = R * 0.98 * math.sin(math.radians(20))
    colar = [Vector((math.cos(off + math.tau * i / 6) * r_ap, math.sin(off + math.tau * i / 6) * r_ap, z_ap)) for i in range(6)]
    for i in range(6):
        _cone_entre(ab, colar[i], colar[(i + 1) % 6], 0.024 * R, 0.024 * R, seg=4, mat=1)
        _cone_entre(ab, colar[i], Vector((0, 0, z_ap + R * 0.14)), 0.02 * R, 0.014 * R, seg=4, mat=0)
    _cone_entre(ab, Vector((0, 0, z_ap + R * 0.1)), Vector((0, 0, z_ap + R * 0.62)), 0.05 * R, 0.0, seg=6, mat=0)
    core = _bm_objeto(ab, "Axis_Core")
    core.data.materials.append(mats["metal_escuro"])
    core.data.materials.append(mats["metal_neon"])

    # Anéis orbitais de varredura.
    rb = bmesh.new()
    _toro(rb, R * 1.02, 0.018 * R, Matrix.Translation((0, 0, 0.03)), mat=0, seg=48)
    _toro(rb, R * 0.86, 0.016 * R, Matrix.Translation((0, 0, R * 0.42)) @ Matrix.Rotation(math.radians(16), 4, "X"), mat=0, seg=48)
    _toro(rb, R * 0.6, 0.014 * R, Matrix.Translation((0, 0, R * 0.9)) @ Matrix.Rotation(math.radians(-22), 4, "Y"), mat=0, seg=48)
    aneis = _bm_objeto(rb, "Axis_Rings")
    aneis.data.materials.append(mats["neon_puro"])

    # Nós de dados: ponta de cada galho capturado + topo da antena.
    mb = bmesh.new()
    for pt in [pt[0] for pt in pontas][:10] + [Vector((0, 0, z_ap + R * 0.62))]:
        _ico(mb, pt, 0.045, (1, 1, 1), Vector((0, 0, 1)), rng, 0.0, mat=0)
    motes = _bm_objeto(mb, "Axis_Motes")
    motes.data.materials.append(mats["neon_puro"])

    glass = build_axis_glass(R, mats)
    return [trunk, foliage, plataforma, struts, cabos, core, aneis, motes, glass]


def build_studio_lights():
    """Key (forte, frontal) + Fill (mais fraca, lateral) + Rim (traseira,
    contraluz) — só pra preview/render dentro do próprio Blender. Não
    fazem parte da seleção exportada (ver `main`), porque o app já tem
    sua própria iluminação em Three.js (incluindo um environment map,
    necessário pro clearcoat/transmission do vidro aparecerem — luzes
    diretas sozinhas não bastam pra isso)."""
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
    rng = random.Random(args.seed)
    rgb01 = tuple(srgb_to_linear(int(c)) for c in args.color.split(","))

    clear_scene()

    if args.mode == "axis":
        partes = build_axis_v2(rng, args.seed, rgb01)
    elif args.estilo != "padrao":
        trunk, foliage, alcance_arvore, _ = build_tree_styled(args.estilo, rng, rgb01, args.seed)
        base, glass = build_dome(alcance_arvore, args.seed)
        partes = [trunk, foliage, base, glass]
    else:
        trunk_height = rng.uniform(0.9, 1.3)
        trunk = build_trunk(rng, trunk_height, args.seed)
        foliage, alcance_arvore = build_foliage(rng, rgb01, trunk_height, args.seed)
        base, glass = build_dome(alcance_arvore, args.seed)
        partes = [trunk, foliage, base, glass]

    build_studio_lights()

    root = bpy.data.objects.new(args.slug, None)
    bpy.context.collection.objects.link(root)
    for obj in partes:
        obj.parent = root

    # Exporta só a árvore + o dome — as luzes de estúdio ficam de fora
    # (existem só pra preview dentro do Blender).
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
