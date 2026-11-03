"""Mobília do construtor de mapas, feita aqui mesmo (nada de pacote de terceiros).

Cada peça é montada com formas simples (caixas, cilindros, esferas) e renderizada de cima,
com fundo transparente, sombra suave no chão e luz vindo do alto à esquerda. Uma unidade do
Blender é uma casa da grade; a imagem sai com 256 px por casa.

    blender --background --python gerar_mobilia.py -- --out <pasta-png> [--so mesa,cama]

Depois tools/mobilia_construtor.py converte para WebP em public/assets/construtor/mobilia e
grava o catálogo em src/data/construtor-mobilia.json. Use tools/blender/gerar_mobilia.ps1.
"""

import argparse
import json
import math
import os
import random
import sys

import bpy
from mathutils import Vector

PX_POR_CASA = 256
MARGEM = 0.16  # casas de folga em volta da peça (a sombra precisa de espaço)


# ------------------------------------------------------------------ cena

def limpar():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 48
    sc.cycles.use_denoising = True
    sc.render.film_transparent = True
    sc.render.image_settings.file_format = "PNG"
    sc.render.image_settings.color_mode = "RGBA"
    sc.view_settings.view_transform = "Standard"
    mundo = bpy.data.worlds.new("mundo")
    sc.world = mundo
    mundo.use_nodes = True
    fundo = mundo.node_tree.nodes["Background"]
    fundo.inputs[0].default_value = (0.6, 0.62, 0.7, 1)
    fundo.inputs[1].default_value = 0.32
    # Sol do alto à esquerda: dá volume e joga a sombra para baixo e à direita, como as paredes.
    sol = bpy.data.lights.new("sol", "SUN")
    sol.energy = 2.1
    # Ângulo grande: sombra macia. Inclinação pequena: a sombra fica curta e cabe na margem.
    sol.angle = math.radians(24)
    o = bpy.data.objects.new("sol", sol)
    sc.collection.objects.link(o)
    o.rotation_euler = (math.radians(14), math.radians(-12), math.radians(-20))
    # Chão invisível que só recebe a sombra.
    bpy.ops.mesh.primitive_plane_add(size=40, location=(0, 0, 0))
    chao = bpy.context.active_object
    chao.is_shadow_catcher = True
    return sc


def material(nome, cor, rugosidade=0.7, metal=0.0, ruido=0.0, escala_ruido=8.0, veio=False):
    """Principled com um pouco de ruído na cor (madeira ganha veio)."""
    m = bpy.data.materials.new(nome)
    m.use_nodes = True
    nos = m.node_tree.nodes
    ligar = m.node_tree.links.new
    bsdf = nos["Principled BSDF"]
    bsdf.inputs["Roughness"].default_value = rugosidade
    bsdf.inputs["Metallic"].default_value = metal
    base = (*cor, 1)
    if not ruido:
        bsdf.inputs["Base Color"].default_value = base
        return m
    mistura = nos.new("ShaderNodeMix")
    mistura.data_type = "RGBA"
    mistura.inputs[6].default_value = base
    escura = tuple(c * (1 - ruido) for c in cor)
    mistura.inputs[7].default_value = (*escura, 1)
    if veio:
        # Veio da madeira: faixas finas e compridas, um pouco tortas.
        textura = nos.new("ShaderNodeTexWave")
        textura.wave_type = "BANDS"
        textura.bands_direction = "X"
        textura.inputs["Scale"].default_value = escala_ruido * 2.5
        textura.inputs["Distortion"].default_value = 2.5
        textura.inputs["Detail"].default_value = 4
        textura.inputs["Detail Scale"].default_value = 3
    else:
        textura = nos.new("ShaderNodeTexNoise")
        textura.inputs["Scale"].default_value = escala_ruido
        textura.inputs["Detail"].default_value = 6
    ligar(textura.outputs["Fac"], mistura.inputs[0])
    ligar(mistura.outputs[2], bsdf.inputs["Base Color"])
    return m


def mats():
    return {
        "madeira": material("madeira", (0.42, 0.24, 0.11), ruido=0.35, escala_ruido=4, veio=True),
        "madeira_escura": material("madeira_escura", (0.22, 0.12, 0.06), ruido=0.3, escala_ruido=4, veio=True),
        "madeira_clara": material("madeira_clara", (0.6, 0.42, 0.24), ruido=0.3, escala_ruido=4, veio=True),
        "ferro": material("ferro", (0.32, 0.33, 0.35), rugosidade=0.45, metal=0.85, ruido=0.25),
        "ouro": material("ouro", (0.85, 0.62, 0.22), rugosidade=0.3, metal=1.0),
        "pedra": material("pedra", (0.45, 0.45, 0.47), ruido=0.35, escala_ruido=6),
        "pedra_clara": material("pedra_clara", (0.72, 0.7, 0.66), ruido=0.25, escala_ruido=5),
        "tecido_vermelho": material("tecido_vermelho", (0.5, 0.08, 0.08), rugosidade=0.9, ruido=0.2, escala_ruido=30),
        "tecido_azul": material("tecido_azul", (0.1, 0.18, 0.42), rugosidade=0.9, ruido=0.2, escala_ruido=30),
        "tecido_verde": material("tecido_verde", (0.12, 0.3, 0.14), rugosidade=0.9, ruido=0.2, escala_ruido=30),
        "linho": material("linho", (0.82, 0.76, 0.62), rugosidade=0.95, ruido=0.12, escala_ruido=40),
        "palha": material("palha", (0.78, 0.62, 0.28), rugosidade=0.95, ruido=0.4, escala_ruido=60, veio=True),
        "folha": material("folha", (0.13, 0.34, 0.1), rugosidade=0.8, ruido=0.45, escala_ruido=10),
        "folha_escura": material("folha_escura", (0.06, 0.2, 0.08), rugosidade=0.8, ruido=0.4, escala_ruido=10),
        "fogo": material("fogo", (1.0, 0.45, 0.08), rugosidade=1.0),
        "brasa": material("brasa", (0.95, 0.25, 0.05), rugosidade=1.0),
        "agua": material("agua", (0.12, 0.3, 0.42), rugosidade=0.1),
        "osso": material("osso", (0.86, 0.82, 0.7), rugosidade=0.7, ruido=0.15, escala_ruido=20),
        "cogumelo": material("cogumelo", (0.7, 0.16, 0.12), rugosidade=0.6),
        "vidro": material("vidro", (0.35, 0.55, 0.45), rugosidade=0.15),
    }


def emitir(m, forca=6.0):
    """Faz o material brilhar (fogo, brasa)."""
    bsdf = m.node_tree.nodes["Principled BSDF"]
    bsdf.inputs["Emission Color"].default_value = bsdf.inputs["Base Color"].default_value
    bsdf.inputs["Emission Strength"].default_value = forca
    return m


# --------------------------------------------------------------- formas

def caixa(m, tam, loc, chanfro=0.02, giro=0.0):
    bpy.ops.mesh.primitive_cube_add(size=1, location=loc, rotation=(0, 0, giro))
    o = bpy.context.active_object
    o.scale = tam
    bpy.ops.object.transform_apply(scale=True)
    if chanfro:
        mod = o.modifiers.new("chanfro", "BEVEL")
        mod.width = chanfro
        mod.segments = 2
    o.data.materials.append(m)
    return o


def cilindro(m, raio, altura, loc, lados=32, giro=(0, 0, 0)):
    bpy.ops.mesh.primitive_cylinder_add(radius=raio, depth=altura, location=loc, vertices=lados, rotation=giro)
    o = bpy.context.active_object
    mod = o.modifiers.new("chanfro", "BEVEL")
    mod.width = min(0.02, raio * 0.2)
    mod.segments = 2
    o.data.materials.append(m)
    return o


def esfera(m, raio, loc, escala=(1, 1, 1)):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=raio, location=loc, segments=24, ring_count=12)
    o = bpy.context.active_object
    o.scale = escala
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o


def cone(m, raio1, raio2, altura, loc, lados=24):
    bpy.ops.mesh.primitive_cone_add(radius1=raio1, radius2=raio2, depth=altura, location=loc, vertices=lados)
    o = bpy.context.active_object
    o.data.materials.append(m)
    return o


def toro(m, raio, espessura, loc):
    bpy.ops.mesh.primitive_torus_add(major_radius=raio, minor_radius=espessura, location=loc)
    o = bpy.context.active_object
    o.data.materials.append(m)
    return o


def pedra_irregular(m, raio, loc, semente, achatar=0.6):
    bpy.ops.mesh.primitive_ico_sphere_add(radius=raio, subdivisions=3, location=loc)
    o = bpy.context.active_object
    sorte = random.Random(semente)
    for v in o.data.vertices:
        v.co *= 0.8 + sorte.random() * 0.4
    o.scale = (1 + sorte.random() * 0.3, 1 + sorte.random() * 0.2, achatar)
    bpy.ops.object.shade_smooth()
    o.data.materials.append(m)
    return o


# ---------------------------------------------------------------- peças
# Cada função monta a peça centrada na origem, apoiada no chão (z = 0). (largura, altura) é o
# tamanho que ela ocupa no mapa, em casas.

def p_mesa(M):
    caixa(M["madeira"], (1.9, 0.95, 0.08), (0, 0, 0.75))
    for x in (-0.85, 0.85):
        for y in (-0.38, 0.38):
            caixa(M["madeira_escura"], (0.08, 0.08, 0.72), (x, y, 0.36))
    cilindro(M["vidro"], 0.07, 0.25, (0.4, 0.1, 0.92))
    caixa(M["linho"], (0.3, 0.22, 0.02), (-0.4, -0.1, 0.8), chanfro=0.005)


def p_mesa_redonda(M):
    cilindro(M["madeira"], 0.7, 0.08, (0, 0, 0.75), lados=48)
    cilindro(M["madeira_escura"], 0.1, 0.72, (0, 0, 0.36))
    cilindro(M["ferro"], 0.12, 0.12, (0.25, 0.1, 0.85))


def p_cadeira(M):
    caixa(M["madeira"], (0.5, 0.5, 0.06), (0, 0, 0.45))
    caixa(M["madeira_escura"], (0.5, 0.07, 0.55), (0, 0.22, 0.75))
    for x in (-0.2, 0.2):
        for y in (-0.2, 0.2):
            caixa(M["madeira_escura"], (0.06, 0.06, 0.44), (x, y, 0.22))


def p_banco(M):
    caixa(M["madeira_clara"], (1.85, 0.4, 0.07), (0, 0, 0.45))
    for x in (-0.75, 0.75):
        caixa(M["madeira_escura"], (0.08, 0.34, 0.42), (x, 0, 0.21))


def p_cama(M):
    caixa(M["madeira_escura"], (0.95, 1.9, 0.35), (0, 0, 0.2))
    caixa(M["linho"], (0.85, 1.75, 0.12), (0, 0.02, 0.42), chanfro=0.05)
    caixa(M["tecido_vermelho"], (0.88, 1.15, 0.06), (0, 0.3, 0.5), chanfro=0.04)
    caixa(M["linho"], (0.6, 0.3, 0.12), (0, -0.7, 0.52), chanfro=0.06)
    caixa(M["madeira"], (0.95, 0.08, 0.7), (0, -0.92, 0.35))


def p_cama_palha(M):
    caixa(M["palha"], (0.9, 1.8, 0.18), (0, 0, 0.09), chanfro=0.08)
    caixa(M["linho"], (0.7, 0.9, 0.04), (0.05, 0.3, 0.2), chanfro=0.03, giro=0.08)


def p_bau(M):
    caixa(M["madeira"], (0.95, 0.6, 0.55), (0, 0, 0.28))
    for x in (-0.38, 0.38):
        caixa(M["ferro"], (0.06, 0.62, 0.57), (x, 0, 0.29), chanfro=0.01)
    caixa(M["ouro"], (0.12, 0.05, 0.12), (0, -0.31, 0.4), chanfro=0.01)


def p_estante(M):
    caixa(M["madeira_escura"], (1.9, 0.45, 1.6), (0, 0, 0.8))
    sorte = random.Random(4)
    cores = [M["tecido_vermelho"], M["tecido_azul"], M["tecido_verde"], M["linho"]]
    x = -0.85
    while x < 0.85:
        larg = 0.06 + sorte.random() * 0.06
        caixa(cores[sorte.randrange(4)], (larg, 0.3, 0.04), (x, -0.02, 1.62), chanfro=0.005)
        x += larg + 0.015


def p_armario(M):
    caixa(M["madeira"], (1.15, 0.55, 1.9), (0, 0, 0.95))
    caixa(M["madeira_escura"], (1.2, 0.6, 0.06), (0, 0, 1.92))


def p_barril(M):
    cilindro(M["madeira"], 0.36, 0.85, (0, 0, 0.42))
    for z in (0.15, 0.7):
        toro(M["ferro"], 0.37, 0.025, (0, 0, z))
    cilindro(M["madeira_escura"], 0.33, 0.02, (0, 0, 0.86))


def p_barris(M):
    for (x, y) in ((-0.38, -0.22), (0.38, -0.22), (0, 0.42)):
        cilindro(M["madeira"], 0.36, 0.85, (x, y, 0.42))
        toro(M["ferro"], 0.37, 0.025, (x, y, 0.7))
        cilindro(M["madeira_escura"], 0.33, 0.02, (x, y, 0.86))


def p_caixote(M):
    caixa(M["madeira_clara"], (0.75, 0.75, 0.7), (0, 0, 0.35))
    caixa(M["madeira"], (0.1, 0.76, 0.02), (0, 0, 0.71), giro=0.78, chanfro=0.005)
    caixa(M["madeira"], (0.1, 0.76, 0.02), (0, 0, 0.71), giro=-0.78, chanfro=0.005)


def p_caixotes(M):
    caixa(M["madeira_clara"], (0.7, 0.7, 0.65), (-0.3, -0.25, 0.33))
    caixa(M["madeira"], (0.65, 0.65, 0.6), (0.38, 0.05, 0.3), giro=0.2)
    caixa(M["madeira_clara"], (0.55, 0.55, 0.5), (-0.15, -0.2, 0.9), giro=-0.15)


def p_tapete(M):
    caixa(M["tecido_vermelho"], (1.9, 1.3, 0.02), (0, 0, 0.01), chanfro=0.01)
    caixa(M["ouro"], (1.65, 1.05, 0.022), (0, 0, 0.011), chanfro=0.005)
    caixa(M["tecido_azul"], (1.55, 0.95, 0.024), (0, 0, 0.012), chanfro=0.005)


def p_tapete_redondo(M):
    cilindro(M["tecido_verde"], 0.78, 0.02, (0, 0, 0.01), lados=64)
    cilindro(M["linho"], 0.6, 0.022, (0, 0, 0.011), lados=64)
    cilindro(M["tecido_verde"], 0.35, 0.024, (0, 0, 0.012), lados=64)


def p_lareira(M):
    # Vista de cima: a chaminé fica atrás (encostada na parede) e a boca do fogo na frente.
    caixa(M["pedra"], (1.9, 0.42, 1.4), (0, 0.18, 0.7))
    caixa(M["pedra_clara"], (2.0, 0.46, 0.1), (0, 0.18, 1.42))
    caixa(M["pedra"], (1.5, 0.42, 0.06), (0, -0.22, 0.03))
    for x in (-0.65, 0.65):
        caixa(M["pedra"], (0.22, 0.4, 0.6), (x, -0.2, 0.3))
    caixa(M["madeira_escura"], (0.7, 0.18, 0.12), (0, -0.22, 0.12), chanfro=0.03, giro=0.2)
    esfera(emitir(M["fogo"]), 0.22, (0, -0.22, 0.2), escala=(1.6, 0.8, 0.7))


def p_caldeirao(M):
    esfera(M["ferro"], 0.42, (0, 0, 0.42), escala=(1, 1, 0.85))
    cilindro(M["vidro"], 0.34, 0.02, (0, 0, 0.72))
    toro(M["ferro"], 0.36, 0.03, (0, 0, 0.72))
    esfera(emitir(M["brasa"], 3), 0.25, (0, 0, 0.05), escala=(1.6, 1.6, 0.3))


def p_balcao(M):
    caixa(M["madeira_escura"], (2.9, 0.7, 1.05), (0, 0, 0.52))
    caixa(M["madeira"], (3.0, 0.78, 0.07), (0, 0, 1.08))
    for x in (-1.0, -0.6, 0.7):
        cilindro(M["vidro"], 0.07, 0.25, (x, 0.1, 1.24))
    cilindro(M["madeira_clara"], 0.12, 0.18, (0.2, -0.1, 1.2))


def p_vaso(M):
    esfera(M["pedra_clara"], 0.22, (0, 0, 0.25), escala=(1, 1, 1.2))
    cilindro(M["pedra_clara"], 0.12, 0.15, (0, 0, 0.55))


def p_saco(M):
    esfera(M["linho"], 0.28, (0, 0, 0.25), escala=(1, 0.9, 0.9))
    cone(M["linho"], 0.12, 0.05, 0.18, (0, 0.05, 0.55))


def p_mesa_trabalho(M):
    caixa(M["madeira_clara"], (1.9, 0.9, 0.1), (0, 0, 0.8))
    for x in (-0.85, 0.85):
        for y in (-0.36, 0.36):
            caixa(M["madeira"], (0.1, 0.1, 0.78), (x, y, 0.39))
    caixa(M["ferro"], (0.5, 0.15, 0.06), (-0.4, 0.1, 0.88), chanfro=0.01, giro=0.3)
    cilindro(M["madeira"], 0.05, 0.5, (0.4, -0.15, 0.88), giro=(0, math.pi / 2, 0.4))


def p_altar(M):
    caixa(M["pedra_clara"], (1.9, 0.95, 0.95), (0, 0, 0.48))
    caixa(M["tecido_vermelho"], (1.0, 0.98, 0.02), (0, 0, 0.97), chanfro=0.005)
    for x in (-0.7, 0.7):
        cilindro(M["ouro"], 0.06, 0.25, (x, 0.15, 1.1))
        esfera(emitir(M["fogo"], 4), 0.05, (x, 0.15, 1.27))


def p_estatua(M):
    cilindro(M["pedra"], 0.45, 0.3, (0, 0, 0.15), lados=8)
    esfera(M["pedra_clara"], 0.25, (0, 0, 0.85), escala=(1.2, 0.8, 1.6))
    esfera(M["pedra_clara"], 0.13, (0, 0, 1.4))
    for x in (-0.3, 0.3):
        esfera(M["pedra_clara"], 0.08, (x, 0.05, 1.05), escala=(1, 1, 2))


def p_coluna(M):
    caixa(M["pedra"], (0.9, 0.9, 0.2), (0, 0, 0.1))
    cilindro(M["pedra_clara"], 0.32, 2.5, (0, 0, 1.4), lados=16)
    caixa(M["pedra"], (0.85, 0.85, 0.18), (0, 0, 2.7))


def p_coluna_quebrada(M):
    caixa(M["pedra"], (0.9, 0.9, 0.2), (0, 0, 0.1))
    cilindro(M["pedra_clara"], 0.32, 0.6, (0, 0, 0.5), lados=16)
    cilindro(M["pedra_clara"], 0.3, 0.9, (0.35, -0.2, 0.25), lados=16, giro=(math.pi / 2, 0, 0.6))


def p_trono(M):
    caixa(M["pedra"], (1.15, 1.0, 0.25), (0, 0.05, 0.12))
    caixa(M["madeira_escura"], (0.85, 0.7, 0.5), (0, 0.05, 0.5))
    caixa(M["tecido_vermelho"], (0.7, 0.55, 0.08), (0, 0, 0.78), chanfro=0.03)
    caixa(M["madeira_escura"], (0.95, 0.15, 1.4), (0, 0.4, 1.0))
    caixa(M["ouro"], (0.3, 0.17, 0.3), (0, 0.4, 1.75), chanfro=0.04)


def p_braseiro(M):
    cilindro(M["ferro"], 0.38, 0.12, (0, 0, 0.7))
    for ang in range(3):
        a = ang * 2 * math.pi / 3
        caixa(M["ferro"], (0.05, 0.05, 0.7), (math.cos(a) * 0.25, math.sin(a) * 0.25, 0.35))
    esfera(emitir(M["brasa"], 5), 0.3, (0, 0, 0.8), escala=(1, 1, 0.4))
    esfera(emitir(M["fogo"], 8), 0.15, (0, 0, 0.95), escala=(1, 1, 1.4))


def p_tocha_parede(M):
    caixa(M["ferro"], (0.25, 0.08, 0.1), (0, 0.08, 1.5))
    cilindro(M["madeira"], 0.04, 0.4, (0, 0, 1.6), giro=(-0.4, 0, 0))
    esfera(emitir(M["fogo"], 10), 0.08, (0, -0.07, 1.82), escala=(1, 1, 1.5))


def p_candelabro(M):
    cilindro(M["ouro"], 0.22, 0.04, (0, 0, 0.02))
    cilindro(M["ouro"], 0.03, 1.2, (0, 0, 0.6))
    for ang in range(5):
        a = ang * 2 * math.pi / 5
        x, y = math.cos(a) * 0.25, math.sin(a) * 0.25
        cilindro(M["linho"], 0.035, 0.12, (x, y, 1.25))
        esfera(emitir(M["fogo"], 8), 0.03, (x, y, 1.34))


def p_escada(M):
    degraus = 8
    for i in range(degraus):
        y = -0.9 + i * (1.8 / degraus)
        caixa(M["pedra"], (0.95, 1.8 / degraus, 0.12 * (degraus - i)), (0, y + 0.9 / degraus, 0.06 * (degraus - i)), chanfro=0.01)


def p_alcapao(M):
    caixa(M["madeira"], (0.9, 0.9, 0.04), (0, 0, 0.02))
    for y in (-0.25, 0.25):
        caixa(M["ferro"], (0.92, 0.06, 0.045), (0, y, 0.022), chanfro=0.005)
    toro(M["ferro"], 0.07, 0.015, (0.3, 0, 0.05))


def p_poco(M):
    # Anel de pedra com a água à vista no meio.
    for z in (0.15, 0.38, 0.6):
        toro(M["pedra"], 0.56, 0.13, (0, 0, z))
    cilindro(M["agua"], 0.46, 0.02, (0, 0, 0.55), lados=32)
    for x in (-0.6, 0.6):
        caixa(M["madeira_escura"], (0.08, 0.08, 1.3), (x, 0, 0.65))
    # Sem telhado: de cima, o que conta é a água e o sarilho com a corda.
    caixa(M["madeira_escura"], (1.3, 0.1, 0.1), (0, 0, 1.3))
    cilindro(M["madeira"], 0.06, 0.9, (0, 0, 1.3), giro=(0, math.pi / 2, 0))
    cilindro(M["linho"], 0.015, 0.8, (0, 0, 0.9))


def p_bigorna(M):
    caixa(M["madeira_escura"], (0.45, 0.45, 0.4), (0, 0, 0.2))
    caixa(M["ferro"], (0.65, 0.25, 0.2), (0, 0, 0.5), chanfro=0.03)
    cone(M["ferro"], 0.12, 0.01, 0.3, (0.45, 0, 0.55))


def p_carroca(M):
    caixa(M["madeira"], (1.9, 1.15, 0.12), (0, 0, 0.7))
    for x in (-0.94, 0.94):
        caixa(M["madeira_escura"], (0.05, 1.15, 0.3), (x, 0, 0.85))
    for y in (-0.56, 0.56):
        caixa(M["madeira_escura"], (1.9, 0.05, 0.3), (0, y, 0.85))
    for x in (-0.6, 0.6):
        for y in (-0.62, 0.62):
            cilindro(M["madeira_escura"], 0.35, 0.08, (x, y, 0.35), giro=(math.pi / 2, 0, 0))
    caixa(M["madeira_escura"], (0.5, 0.06, 0.06), (1.2, 0, 0.5))
    esfera(M["palha"], 0.3, (-0.3, 0.1, 0.85), escala=(1.6, 1.2, 0.5))


def p_arvore(M):
    cilindro(M["madeira_escura"], 0.18, 1.2, (0, 0, 0.6))
    sorte = random.Random(11)
    for i in range(7):
        a = i * 2 * math.pi / 7
        r = 0.55 + sorte.random() * 0.25
        esfera(M["folha"] if i % 2 else M["folha_escura"], 0.55 + sorte.random() * 0.2, (math.cos(a) * r * 0.8, math.sin(a) * r * 0.8, 1.6 + sorte.random() * 0.3))
    esfera(M["folha"], 0.75, (0, 0, 2.0))


def p_pinheiro(M):
    cilindro(M["madeira_escura"], 0.12, 0.6, (0, 0, 0.3))
    for i, (raio, z) in enumerate(((0.95, 0.9), (0.75, 1.5), (0.52, 2.05), (0.3, 2.5))):
        cone(M["folha_escura"] if i % 2 else M["folha"], raio, 0.02, 0.8, (0, 0, z), lados=10)


def p_arbusto(M):
    sorte = random.Random(5)
    for i in range(5):
        a = i * 2 * math.pi / 5
        esfera(M["folha"] if i % 2 else M["folha_escura"], 0.28 + sorte.random() * 0.08, (math.cos(a) * 0.2, math.sin(a) * 0.2, 0.3))
    esfera(M["folha"], 0.32, (0, 0, 0.45))


def p_pedra(M):
    pedra_irregular(M["pedra"], 0.42, (0, 0, 0.18), 3)


def p_pedras(M):
    pedra_irregular(M["pedra"], 0.38, (-0.25, -0.15, 0.15), 1)
    pedra_irregular(M["pedra_clara"], 0.25, (0.35, 0.1, 0.1), 2)
    pedra_irregular(M["pedra"], 0.2, (-0.05, 0.4, 0.08), 7)


def p_tronco(M):
    cilindro(M["madeira_escura"], 0.26, 1.8, (0, 0, 0.26), giro=(0, math.pi / 2, 0))
    cilindro(M["madeira_clara"], 0.24, 0.02, (0.9, 0, 0.26), giro=(0, math.pi / 2, 0))
    esfera(M["folha"], 0.12, (0.2, 0.18, 0.45), escala=(1.4, 1, 0.5))


def p_toco(M):
    cilindro(M["madeira_escura"], 0.3, 0.35, (0, 0, 0.17))
    cilindro(M["madeira_clara"], 0.27, 0.02, (0, 0, 0.35))


def p_cogumelos(M):
    for (x, y, r) in ((-0.15, -0.1, 0.16), (0.18, 0.05, 0.12), (0.0, 0.22, 0.09)):
        cilindro(M["linho"], r * 0.3, r * 1.4, (x, y, r * 0.7))
        esfera(M["cogumelo"], r, (x, y, r * 1.4), escala=(1, 1, 0.55))


def p_entulho(M):
    sorte = random.Random(9)
    for i in range(9):
        caixa(M["pedra"] if i % 2 else M["pedra_clara"], (0.15 + sorte.random() * 0.25, 0.12 + sorte.random() * 0.2, 0.1 + sorte.random() * 0.15),
              ((sorte.random() - 0.5) * 1.0, (sorte.random() - 0.5) * 1.0, 0.08), giro=sorte.random() * 3)


def p_ossos(M):
    esfera(M["osso"], 0.14, (0.15, 0.2, 0.12), escala=(1, 1.2, 0.9))
    for (x, y, g) in ((-0.15, -0.1, 0.4), (0.1, -0.25, -0.9), (-0.3, 0.2, 1.7)):
        cilindro(M["osso"], 0.035, 0.45, (x, y, 0.05), giro=(math.pi / 2, 0, g))


#: id: (nome, categoria, largura, altura, função)
PECAS = {
    "mesa": ("Mesa", "Móveis", 2, 1, p_mesa),
    "mesa-redonda": ("Mesa redonda", "Móveis", 1.5, 1.5, p_mesa_redonda),
    "cadeira": ("Cadeira", "Móveis", 0.6, 0.6, p_cadeira),
    "banco": ("Banco", "Móveis", 2, 0.5, p_banco),
    "cama": ("Cama", "Móveis", 1, 2, p_cama),
    "cama-de-palha": ("Cama de palha", "Móveis", 1, 2, p_cama_palha),
    "bau": ("Baú", "Móveis", 1, 0.7, p_bau),
    "estante": ("Estante", "Móveis", 2, 0.5, p_estante),
    "armario": ("Armário", "Móveis", 1.2, 0.6, p_armario),
    "barril": ("Barril", "Depósito", 0.8, 0.8, p_barril),
    "barris": ("Barris", "Depósito", 1.6, 1.5, p_barris),
    "caixote": ("Caixote", "Depósito", 0.8, 0.8, p_caixote),
    "caixotes": ("Caixotes", "Depósito", 1.5, 1.3, p_caixotes),
    "saco": ("Saco", "Depósito", 0.6, 0.6, p_saco),
    "vaso": ("Vaso", "Depósito", 0.5, 0.5, p_vaso),
    "tapete": ("Tapete", "Casa e taverna", 2, 1.4, p_tapete),
    "tapete-redondo": ("Tapete redondo", "Casa e taverna", 1.6, 1.6, p_tapete_redondo),
    "lareira": ("Lareira", "Casa e taverna", 2, 0.8, p_lareira),
    "caldeirao": ("Caldeirão", "Casa e taverna", 1, 1, p_caldeirao),
    "balcao": ("Balcão", "Casa e taverna", 3, 0.8, p_balcao),
    "mesa-de-trabalho": ("Mesa de trabalho", "Ofícios", 2, 1, p_mesa_trabalho),
    "bigorna": ("Bigorna", "Ofícios", 1, 0.5, p_bigorna),
    "carroca": ("Carroça", "Ofícios", 3, 1.4, p_carroca),
    "altar": ("Altar", "Templo e salão", 2, 1, p_altar),
    "estatua": ("Estátua", "Templo e salão", 1, 1, p_estatua),
    "coluna": ("Coluna", "Templo e salão", 1, 1, p_coluna),
    "coluna-quebrada": ("Coluna quebrada", "Templo e salão", 1.5, 1, p_coluna_quebrada),
    "trono": ("Trono", "Templo e salão", 1.2, 1.1, p_trono),
    "candelabro": ("Candelabro", "Luz", 0.6, 0.6, p_candelabro),
    "braseiro": ("Braseiro", "Luz", 0.9, 0.9, p_braseiro),
    "tocha-de-parede": ("Tocha de parede", "Luz", 0.5, 0.4, p_tocha_parede),
    "escada": ("Escada", "Passagem", 1, 2, p_escada),
    "alcapao": ("Alçapão", "Passagem", 1, 1, p_alcapao),
    "poco": ("Poço", "Passagem", 1.4, 1.4, p_poco),
    "arvore": ("Árvore", "Natureza", 2.4, 2.4, p_arvore),
    "pinheiro": ("Pinheiro", "Natureza", 2, 2, p_pinheiro),
    "arbusto": ("Arbusto", "Natureza", 1, 1, p_arbusto),
    "pedra": ("Pedra", "Natureza", 1, 1, p_pedra),
    "pedras": ("Pedras", "Natureza", 1.4, 1.3, p_pedras),
    "tronco": ("Tronco caído", "Natureza", 2, 0.6, p_tronco),
    "toco": ("Toco", "Natureza", 0.7, 0.7, p_toco),
    "cogumelos": ("Cogumelos", "Natureza", 0.7, 0.7, p_cogumelos),
    "entulho": ("Entulho", "Ruínas", 1.4, 1.4, p_entulho),
    "ossos": ("Ossos", "Ruínas", 1, 1, p_ossos),
}


def renderizar(peca_id, saida):
    nome, categoria, largura, altura, montar = PECAS[peca_id]
    sc = limpar()
    montar(mats())
    camera = bpy.data.cameras.new("cam")
    camera.type = "ORTHO"
    lado_x = largura + MARGEM * 2
    lado_y = altura + MARGEM * 2
    camera.ortho_scale = max(lado_x, lado_y)
    camera.clip_end = 100
    co = bpy.data.objects.new("cam", camera)
    sc.collection.objects.link(co)
    sc.camera = co
    co.location = (0, 0, 20)
    co.rotation_euler = (0, 0, 0)
    sc.render.resolution_x = round(lado_x * PX_POR_CASA)
    sc.render.resolution_y = round(lado_y * PX_POR_CASA)
    # A câmera ortográfica usa o lado maior: a imagem sai com a proporção da peça.
    sc.render.pixel_aspect_x = sc.render.pixel_aspect_y = 1
    sc.render.filepath = os.path.join(saida, f"{peca_id}.png")
    bpy.ops.render.render(write_still=True)
    return {"id": peca_id, "nome": nome, "categoria": categoria, "largura": largura, "altura": altura, "margem": MARGEM}


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--so", default="")
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    ids = [i for i in a.so.split(",") if i] or list(PECAS)
    catalogo = []
    for peca_id in ids:
        catalogo.append(renderizar(peca_id, a.out))
        print(f"OK: {peca_id}")
    with open(os.path.join(a.out, "catalogo.json"), "w", encoding="utf-8") as arquivo:
        json.dump(catalogo, arquivo, ensure_ascii=False, indent=2)


if __name__ == "__main__":
    main()
