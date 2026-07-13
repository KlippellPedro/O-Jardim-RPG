"""Gera uma árvore low-poly + globo de vidro (dome) e exporta para .glb.

Roda em modo headless, sem GUI:
    blender --background --python generate_tree.py -- --slug aethel --color 201,162,39 --seed 1 --out ../../assets/3d/arvores/aethel.glb

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
    blender --background --python generate_tree.py -- --mode axis --slug axis --out ../../assets/3d/arvores/axis.glb

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
from mathutils import Vector


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
        dome_radius = 1.55 + rng.uniform(-0.05, 0.15)
        mats = criar_materiais_axis(rgb01)

        trunk_height = rng.uniform(0.32, 0.42)
        trunk = build_trunk(
            rng, trunk_height, args.seed,
            rgb01=RGB_PARLEY_DESBOTADA, alpha=0.55, radius_mult=0.55,
            tilt_deg=rng.uniform(9, 16),
        )
        foliage, _ = build_foliage(
            rng, RGB_PARLEY_DESBOTADA, trunk_height, args.seed,
            n_range=(1, 2), radius_range=(0.13, 0.19), center_radius=0.10, alpha=0.55,
        )
        platform = build_axis_platform(dome_radius, mats)
        core, ponta_core = build_axis_core(dome_radius, mats)
        rings = build_axis_rings(dome_radius, args.seed, mats)
        struts, topo_pts = build_axis_struts(dome_radius, args.seed, mats)
        motes = build_axis_motes(topo_pts + [ponta_core], mats)
        glass = build_axis_glass(dome_radius, mats)
        partes = [trunk, foliage, platform, core, rings, struts, motes, glass]
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
