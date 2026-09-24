"""Gera os Frutos do Éden (26) como .glb, um por fruto.

Roda em modo headless (sem GUI):
    blender --background --python generate_frutos.py -- --out ../../public/models/frutos
    blender --background --python generate_frutos.py -- --only fruto-chamas --out <pasta>

Cada fruto nasce de um perfil revolucionado (torno) + uma espiral de
"diabo-fruta" + detalhes de assinatura (chamas, chifres, cristais, relógio...).
Reaproveita os materiais e primitivas de generate_tree.py.

Hierarquia exportada (por fruto):
    <id> (Empty, raiz)
      └── Fruit_Body   (corpo + detalhes; 3 materiais: corpo, brilho, detalhe)

Os ids batem com data/loja/catalogo.json (fruto-chamas, fruto-origem...).
"""

import bpy
import bmesh
import sys
import os
import math
import random
import argparse
from mathutils import Vector, Matrix

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import generate_tree as gt  # noqa: E402  (make_material, _cone_entre, _ico, _toro)

TAU = math.tau

# Perfis (raio, z) de baixo pra cima; raio 0 nas pontas = tampa fechada.
PERFIS = {
    "redonda": [(0, 0), (0.26, 0.03), (0.44, 0.18), (0.5, 0.42), (0.44, 0.68), (0.26, 0.88), (0, 0.93)],
    "pera": [(0, 0), (0.28, 0.03), (0.5, 0.16), (0.52, 0.34), (0.4, 0.58), (0.26, 0.8), (0.16, 0.98), (0, 1.02)],
    "gota": [(0, 0), (0.24, 0.04), (0.44, 0.2), (0.46, 0.42), (0.34, 0.66), (0.18, 0.9), (0.05, 1.12), (0, 1.18)],
    "achatada": [(0, 0), (0.3, 0.03), (0.6, 0.14), (0.68, 0.3), (0.56, 0.46), (0.28, 0.56), (0, 0.6)],
    "cabaca": [(0, 0), (0.28, 0.03), (0.46, 0.16), (0.44, 0.36), (0.22, 0.5), (0.3, 0.68), (0.36, 0.86), (0.2, 1.0), (0, 1.04)],
    "ampulheta": [(0, 0), (0.34, 0.02), (0.48, 0.14), (0.4, 0.34), (0.1, 0.52), (0.4, 0.7), (0.48, 0.9), (0.34, 1.02), (0, 1.04)],
    "cristal": [(0, 0), (0.42, 0.22), (0.5, 0.5), (0.42, 0.78), (0, 1.0)],
    "gorda": [(0, 0), (0.3, 0.03), (0.52, 0.18), (0.6, 0.42), (0.5, 0.7), (0.26, 0.9), (0, 0.95)],
}


def rgb(r, g, b):
    return tuple(gt.srgb_to_linear(c) for c in (r, g, b))


class Fruta:
    def __init__(self, spec, seed):
        self.spec = spec
        self.rng = random.Random(seed)
        self.perfil = PERFIS[spec["perfil"]]
        self.seg = spec.get("seg", 14)
        self.bm = bmesh.new()
        self.ztop = self.perfil[-1][1]
        self.zmid = self.ztop / 2

    # ── geometria de superfície ──
    def _rz(self, t):
        n = len(self.perfil) - 1
        x = max(0.0, min(1.0, t)) * n
        i = min(int(x), n - 1)
        f = x - i
        r0, z0 = self.perfil[i]
        r1, z1 = self.perfil[i + 1]
        return r0 + (r1 - r0) * f, z0 + (z1 - z0) * f, (r1 - r0), (z1 - z0)

    def surf(self, t, ang, k=1.0):
        r, z, _, _ = self._rz(t)
        return Vector((math.cos(ang) * r * k, math.sin(ang) * r * k, z))

    def normal(self, t, ang):
        r, z, dr, dz = self._rz(t)
        n = Vector((math.cos(ang) * dz, math.sin(ang) * dz, -dr))
        return n.normalized() if n.length > 1e-6 else Vector((math.cos(ang), math.sin(ang), 0))

    def raio(self, t):
        return self._rz(t)[0]

    # ── primitivas (reaproveitam generate_tree) ──
    def cone(self, a, b, r1, r2, seg=5, mat=1):
        gt._cone_entre(self.bm, Vector(a), Vector(b), r1, r2, seg=seg, mat=mat)

    def ico(self, pos, raio, esc=(1, 1, 1), dirv=(0, 0, 1), jit=0.1, mat=0):
        gt._ico(self.bm, Vector(pos), raio, esc, Vector(dirv), self.rng, jit, mat=mat)

    def toro(self, raio, esp, centro, normal=(0, 0, 1), mat=1, seg=32):
        rot = Vector(normal).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        gt._toro(self.bm, raio, esp, Matrix.Translation(centro) @ rot, mat=mat, seg=seg, lado=5)

    def prisma(self, base, direcao, r, comp, mat=2, ponta=0.35):
        """Cristal: coluna hexagonal com ponta facetada."""
        d = Vector(direcao).normalized()
        base = Vector(base)
        meio = base + d * comp * (1 - ponta)
        self.cone(base, meio, r, r, seg=6, mat=mat)
        self.cone(meio, base + d * comp, r, 0.0, seg=6, mat=mat)

    def linha(self, pts, esp, mat=1, seg=4):
        for a, b in zip(pts, pts[1:]):
            self.cone(a, b, esp, esp, seg=seg, mat=mat)

    def lingua(self, base, direcao, comp, r, mat=1, sway=0.3, passos=4):
        """Língua de fogo: cadeia de cones que afina e balança."""
        cur = Vector(base)
        d = Vector(direcao).normalized()
        rr = r
        for k in range(passos):
            nxt = cur + d * comp / passos
            self.cone(cur, nxt, rr, rr * 0.62 if k < passos - 1 else 0.0, seg=5, mat=mat)
            cur, rr = nxt, rr * 0.72
            d = (d + Vector((sway * self.rng.uniform(-1, 1), sway * self.rng.uniform(-1, 1), 0.15))).normalized()

    def arco(self, raio, esp, a0, a1, z, mat=1, passos=14):
        prev = None
        for i in range(passos + 1):
            a = a0 + (a1 - a0) * i / passos
            p = Vector((math.cos(a) * raio, math.sin(a) * raio, z))
            if prev is not None:
                self.cone(prev, p, esp, esp, seg=4, mat=mat)
            prev = p

    def cubo(self, centro, tam, rot=None, mat=2):
        sx, sy, sz = tam if isinstance(tam, (tuple, list)) else (tam, tam, tam)
        m = Matrix.Translation(Vector(centro)) @ (rot.to_4x4() if rot is not None else Matrix.Identity(4)) @ Matrix.Diagonal((sx, sy, sz, 1.0))
        n0 = len(self.bm.faces)
        bmesh.ops.create_cube(self.bm, size=1.0, matrix=m, calc_uvs=True)
        self.bm.faces.ensure_lookup_table()
        for f in self.bm.faces[n0:]:
            f.material_index = mat

    def disco(self, centro, raio, alt, normal=(0, 0, 1), mat=1, seg=24):
        rot = Vector(normal).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
        n0 = len(self.bm.faces)
        bmesh.ops.create_cone(self.bm, cap_ends=True, cap_tris=False, segments=seg, radius1=raio, radius2=raio,
                              depth=alt, matrix=Matrix.Translation(Vector(centro)) @ rot, calc_uvs=True)
        self.bm.faces.ensure_lookup_table()
        for f in self.bm.faces[n0:]:
            f.material_index = mat

    def rand_surf(self, t0=0.15, t1=0.85):
        return self.rng.uniform(t0, t1), self.rng.uniform(0, TAU)

    # ── corpo ──
    def lathe(self):
        bm, seg, perfil = self.bm, self.seg, self.perfil
        aneis = []
        jit = self.spec.get("jit", 0.0)
        for idx, (r, z) in enumerate(perfil):
            if r < 1e-6:
                aneis.append([bm.verts.new((0, 0, z))])
                continue
            linha = []
            for k in range(seg):
                a = TAU * k / seg
                d = 1 + self.rng.uniform(-jit, jit)
                linha.append(bm.verts.new((math.cos(a) * r * d, math.sin(a) * r * d, z + self.rng.uniform(-jit, jit) * 0.1)))
            aneis.append(linha)
        for i in range(len(aneis) - 1):
            A, B = aneis[i], aneis[i + 1]
            for k in range(seg):
                k2 = (k + 1) % seg
                if len(A) == 1:
                    bm.faces.new((A[0], B[k2], B[k]))
                elif len(B) == 1:
                    bm.faces.new((A[k], A[k2], B[0]))
                else:
                    bm.faces.new((A[k], A[k2], B[k2], B[k]))

    def duotom(self):
        """Faces da metade de cima passam para o material de detalhe."""
        for f in self.bm.faces:
            if f.calc_center_median().z > self.zmid:
                f.material_index = 2

    def espiral(self, voltas, fios, esp, mat=1, t0=0.08, t1=0.92, k=1.02, passos=52, fase=0.0):
        passos = max(passos, int(voltas * 28))  # poucos passos por volta fazem a corda cortar por dentro do corpo
        for f in range(fios):
            ph = fase + TAU * f / fios
            prev = None
            for j in range(passos + 1):
                t = t0 + (t1 - t0) * j / passos
                ang = ph + voltas * TAU * (t - t0) / (t1 - t0)
                p = self.surf(t, ang, k)
                if prev is not None:
                    self.cone(prev - (p - prev) * 0.15, p + (p - prev) * 0.15, esp, esp, seg=4, mat=mat)
                prev = p

    def espinhos(self, n, comp, r, t0=0.2, t1=0.85, mat=2, angs=None):
        for i in range(n):
            t = self.rng.uniform(t0, t1)
            ang = angs[i] if angs else self.rng.uniform(0, TAU)
            p = self.surf(t, ang, 0.97)
            nrm = self.normal(t, ang)
            self.cone(p, p + nrm * comp * self.rng.uniform(0.7, 1.2), r, 0.0, seg=4, mat=mat)

    def caule(self, alt=0.2, r=0.05, mat=2, folha=True):
        z = self.ztop - 0.06
        tilt = Vector((self.rng.uniform(-0.08, 0.08), self.rng.uniform(-0.08, 0.08), 0))
        topo = Vector((0, 0, z + alt)) + tilt
        self.cone(Vector((0, 0, z)), topo, r, r * 0.7, seg=5, mat=mat)
        if folha:
            self.ico(topo + Vector((0.12, 0, -0.04)), 0.11, (1.6, 0.6, 0.15), Vector((1, 0.3, 0.4)), 0.05, mat=mat)


# ── decorações de assinatura ──

def d_fogo(F):
    # Casca carbonizada com veios de lava, coroa de fogo em camadas e brasas no ar.
    for _ in range(9):
        a = F.rng.uniform(0, TAU)
        pts = []
        for j in range(9):
            a += F.rng.uniform(-0.4, 0.4)
            pts.append(F.surf(0.92 - j * 0.09, a, 1.012))
        F.linha(pts, 0.017, mat=1)
        if F.rng.random() < 0.6:
            k = F.rng.randint(2, 6)
            ramo = [pts[k], pts[k] + Vector((F.rng.uniform(-0.12, 0.12), F.rng.uniform(-0.12, 0.12), -0.1))]
            F.linha(ramo, 0.011, mat=1)
    topo = F.ztop - 0.05
    for i in range(7):  # anel externo, vermelho e laranja
        a = TAU * i / 7 + 0.2
        b = Vector((math.cos(a) * 0.2, math.sin(a) * 0.2, topo))
        F.lingua(b, (math.cos(a) * 0.5, math.sin(a) * 0.5, 1), F.rng.uniform(0.5, 0.72), 0.13,
                 mat=(4 if i % 2 else 1), sway=0.5)
    for i in range(4):  # anel do meio
        a = TAU * i / 4 + 0.7
        b = Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, topo))
        F.lingua(b, (math.cos(a) * 0.25, math.sin(a) * 0.25, 1), F.rng.uniform(0.75, 0.95), 0.1, mat=1, sway=0.4)
    F.lingua(Vector((0, 0, topo)), (0.05, 0, 1), 1.1, 0.11, mat=3, sway=0.2, passos=5)
    for _ in range(14):  # brasas
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(0, 1.6)))
        v.x *= 0.7
        v.y *= 0.7
        F.ico(v + Vector((0, 0, 0.4)), F.rng.uniform(0.018, 0.04), mat=3, jit=0.0)
    for i in range(8):  # pedras em brasa no chão
        a = TAU * i / 8 + F.rng.uniform(-0.2, 0.2)
        F.ico(Vector((math.cos(a) * 0.62, math.sin(a) * 0.62, 0.04)), F.rng.uniform(0.05, 0.09), (1, 1, 0.7),
              (0, 0, 1), 0.2, mat=(1 if i % 2 else 2))


def d_tectonico(F):
    # Placas de terra levantadas, fissuras de magma, coroa de estalagmites e pedras em órbita.
    for row, t in enumerate((0.26, 0.5, 0.74)):
        n = 6 - row
        for i in range(n):
            a = TAU * i / n + row * 0.5 + F.rng.uniform(-0.1, 0.1)
            p = F.surf(t, a, 1.05)
            nrm = F.normal(t, a)
            F.ico(p, 0.27 - row * 0.03, (1.4, 1.1, 0.3), nrm, 0.13, mat=2)
    for i in range(5):  # fissuras entre as placas
        a = TAU * i / 5 + 0.3
        pts = [F.surf(0.95 - j * 0.15, a + F.rng.uniform(-0.22, 0.22), 1.075) for j in range(6)]
        F.linha(pts, 0.03, mat=1)
        for _ in range(2):
            k = F.rng.randint(1, 4)
            F.linha([pts[k], pts[k] + Vector((F.rng.uniform(-0.15, 0.15), F.rng.uniform(-0.15, 0.15), -0.06))], 0.017, mat=1)
    for i in range(6):  # coroa de estalagmites
        a = TAU * i / 6 + F.rng.uniform(-0.2, 0.2)
        r0 = 0.16 if i else 0.0
        F.prisma(Vector((math.cos(a) * r0, math.sin(a) * r0, F.ztop - 0.09)),
                 (math.cos(a) * 0.35, math.sin(a) * 0.35, 1), 0.085 if i else 0.11,
                 F.rng.uniform(0.32, 0.6) if i else 0.75, mat=3)
    for k, rr in enumerate((0.72, 0.9, 1.08)):  # ondas de choque quebradas
        a0 = F.rng.uniform(0, TAU)
        F.arco(rr, 0.016, a0, a0 + TAU * 0.62, 0.02, mat=1, passos=18)
        F.arco(rr, 0.016, a0 + TAU * 0.72, a0 + TAU * 0.95, 0.02, mat=1, passos=8)
    for i in range(10):  # pedras levitando
        a = TAU * i / 10 + F.rng.uniform(-0.2, 0.2)
        rr = F.rng.uniform(0.78, 1.0)
        F.ico(Vector((math.cos(a) * rr, math.sin(a) * rr, F.rng.uniform(0.2, 0.95))), F.rng.uniform(0.05, 0.11),
              (1.2, 1, 0.7), (F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-1, 1)), 0.15,
              mat=(1 if i % 5 == 0 else 3))


def _anel_raio(F, raio, tilt, giro, amp, n, esp, mat):
    M = Matrix.Rotation(math.radians(giro), 4, "Z") @ Matrix.Rotation(math.radians(tilt), 4, "X")
    centro = Vector((0, 0, F.zmid))
    pts = []
    for i in range(n):
        a = TAU * i / n
        r = raio + (amp if i % 2 else -amp) * F.rng.uniform(0.6, 1.2)
        pts.append(centro + M @ Vector((math.cos(a) * r, math.sin(a) * r, F.rng.uniform(-0.05, 0.05))))
    for i in range(n):
        F.cone(pts[i], pts[(i + 1) % n], esp, esp, seg=4, mat=mat)
    for i in range(0, n, 3):
        v = (pts[i] - centro).normalized()
        F.cone(pts[i], pts[i] + v * 0.18 + Vector((0, 0, F.rng.uniform(-0.1, 0.1))), esp * 0.75, 0.0, seg=4, mat=mat)


def d_tempestade(F):
    # Núcleo de tempestade preso em anéis de raio, coroa de relâmpagos e faíscas.
    _anel_raio(F, 0.86, 18, 0, 0.09, 22, 0.03, 3)
    _anel_raio(F, 0.7, -52, 70, 0.08, 18, 0.024, 1)
    for i in range(5):
        a = TAU * i / 5
        pts = [Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, F.ztop - 0.05))]
        d = Vector((math.cos(a) * 0.4, math.sin(a) * 0.4, 1))
        alt = 0.95 if i == 0 else F.rng.uniform(0.5, 0.75)
        for j in range(1, 5):
            off = (0.1 if j % 2 else -0.1)
            pts.append(pts[0] + d.normalized() * alt * j / 4 + Vector((-math.sin(a) * off, math.cos(a) * off, 0)))
        F.linha(pts, 0.032, mat=(3 if i == 0 else 1))
    for i in range(3):  # arcos descendo para o chão
        a = TAU * i / 3 + 0.5
        pts = [F.surf(0.12, a, 1.0)]
        for j in range(1, 4):
            off = (0.09 if j % 2 else -0.09)
            pts.append(Vector((math.cos(a) * (0.5 + 0.1 * j) - math.sin(a) * off, math.sin(a) * (0.5 + 0.1 * j) + math.cos(a) * off, 0.12 - j * 0.04)))
        F.linha(pts, 0.022, mat=1)
    for i in range(6):  # fendas luminosas no corpo
        t, a = F.rand_surf(0.25, 0.85)
        F.linha([F.surf(t, a, 1.01), F.surf(t - 0.06, a + 0.18, 1.01), F.surf(t - 0.12, a + 0.05, 1.01)], 0.02, mat=1)
    for _ in range(16):
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-0.2, 1.2))).normalized() * F.rng.uniform(0.85, 1.15)
        F.ico(v + Vector((0, 0, F.zmid)), F.rng.uniform(0.02, 0.04), mat=3, jit=0.0)


def d_geada(F):
    # Núcleo azul visto através do gelo, coroa e base de cristais, pingentes e um floco de neve.
    F.ico(Vector((0, 0, F.zmid)), 0.27, mat=3, jit=0.06)
    for i in range(8):
        a = TAU * i / 8 + 0.2
        F.prisma(Vector((math.cos(a) * 0.14, math.sin(a) * 0.14, F.ztop - 0.12)),
                 (math.cos(a) * 0.45, math.sin(a) * 0.45, 1), F.rng.uniform(0.06, 0.1),
                 F.rng.uniform(0.35, 0.8), mat=2)
    F.prisma(Vector((0, 0, F.ztop - 0.1)), (0.05, 0, 1), 0.11, 0.95, mat=2)
    for i in range(9):
        a = TAU * i / 9 + F.rng.uniform(-0.15, 0.15)
        F.prisma(Vector((math.cos(a) * 0.32, math.sin(a) * 0.32, 0.1)),
                 (math.cos(a) * 0.9, math.sin(a) * 0.9, 0.5), F.rng.uniform(0.05, 0.085),
                 F.rng.uniform(0.3, 0.6), mat=2)
    for _ in range(12):
        t, a = F.rand_surf(0.25, 0.5)
        p = F.surf(t, a, 0.98)
        F.cone(p, p + Vector((0, 0, -F.rng.uniform(0.22, 0.42))), 0.04, 0.0, seg=5, mat=2)
    # floco de neve inclinado em volta
    M = Matrix.Rotation(math.radians(35), 4, "X") @ Matrix.Rotation(math.radians(20), 4, "Z")
    c = Vector((0, 0, F.zmid))
    for i in range(6):
        a = TAU * i / 6
        fim = c + M @ Vector((math.cos(a) * 0.92, math.sin(a) * 0.92, 0))
        F.cone(c + M @ Vector((math.cos(a) * 0.55, math.sin(a) * 0.55, 0)), fim, 0.014, 0.014, seg=4, mat=1)
        for f in (0.75,):
            base = c + M @ Vector((math.cos(a) * 0.92 * f, math.sin(a) * 0.92 * f, 0))
            for lado in (-0.5, 0.5):
                b2 = c + M @ Vector((math.cos(a + lado) * 0.92 * (f + 0.1), math.sin(a + lado) * 0.92 * (f + 0.1), 0))
                F.cone(base, b2, 0.01, 0.01, seg=4, mat=1)
    for _ in range(12):
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-0.6, 1))).normalized() * F.rng.uniform(0.9, 1.2)
        F.ico(v + Vector((0, 0, F.zmid)), F.rng.uniform(0.015, 0.03), mat=1, jit=0.0)


def d_relojoaria(F):
    # Ampulheta de vidro num chassi dourado, areia luminosa, engrenagens e aro de horas.
    for z in (-0.035, F.ztop + 0.035):
        F.cone(Vector((0, 0, z - 0.035)), Vector((0, 0, z + 0.035)), 0.56, 0.56, seg=16, mat=2)
        F.toro(0.56, 0.02, Vector((0, 0, z)), mat=2, seg=24)
    for i in range(3):
        a = math.radians(90 + 120 * i)
        p = Vector((math.cos(a) * 0.5, math.sin(a) * 0.5, 0))
        F.cone(p, p + Vector((0, 0, F.ztop)), 0.035, 0.035, seg=8, mat=2)
        F.ico(p + Vector((0, 0, F.ztop * 0.5)), 0.06, (1, 1, 0.6), (0, 0, 1), 0.0, mat=2)
    zw = F.zmid
    F.cone(Vector((0, 0, zw + 0.02)), Vector((0, 0, zw + 0.36)), 0.0, 0.3, seg=12, mat=1)   # areia de cima
    F.cone(Vector((0, 0, 0.05)), Vector((0, 0, 0.3)), 0.36, 0.0, seg=12, mat=1)             # montinho de baixo
    F.cone(Vector((0, 0, zw + 0.03)), Vector((0, 0, 0.3)), 0.014, 0.014, seg=4, mat=1)        # fio de areia
    # aro de engrenagem e aro de horas
    M1 = Matrix.Rotation(math.radians(24), 4, "X")
    F.toro(0.82, 0.02, Vector((0, 0, zw)), normal=(0, -0.4, 1), mat=2, seg=40)
    for i in range(20):
        a = TAU * i / 20
        pos = Vector((0, 0, zw)) + Matrix.Rotation(math.radians(24), 3, "X") @ Vector((math.cos(a) * 0.86, math.sin(a) * 0.86, 0))
        F.ico(pos, 0.035, (1, 0.7, 1), (math.cos(a), math.sin(a), 0), 0.0, mat=2)
    F.toro(0.66, 0.012, Vector((0, 0, zw)), normal=(0.3, 0.2, 1), mat=1, seg=40)
    for i in range(12):
        a = TAU * i / 12
        pos = Vector((0, 0, zw)) + Matrix.Rotation(math.radians(-16), 3, "Y") @ Vector((math.cos(a) * 0.66, math.sin(a) * 0.66, 0))
        F.ico(pos, 0.022, mat=1, jit=0.0)
    F.caule(alt=0.24, r=0.045, mat=2, folha=True)


# ── redesenho v4 (Místicos): mesma qualidade dos cinco primeiros ──

def d_dragao(F):
    # extras: 3 escama escura, 4 ouro, 5 olho
    for row, t in enumerate((0.14, 0.26, 0.38, 0.5, 0.62, 0.74)):
        n = 12 - row
        for i in range(n):
            a = TAU * i / n + row * 0.3
            F.ico(F.surf(t, a, 1.03), 0.13 - row * 0.006, (1.15, 1.0, 0.28), F.normal(t, a), 0.08, mat=(3 if (i + row) % 3 else 0))
    for lado in (-1, 1):  # chifres curvados para trás
        cur = Vector((lado * 0.15, 0.03, F.ztop - 0.06))
        d = Vector((lado * 0.45, 0.3, 1)).normalized()
        for k in range(6):
            nxt = cur + d * 0.14
            F.cone(cur, nxt, 0.075 * 0.8 ** k, 0.075 * 0.8 ** (k + 1), seg=6, mat=(4 if k == 5 else 2))
            cur = nxt
            d = (d + Vector((lado * 0.28, 0.3, -0.13))).normalized()
    for j in range(8):  # crista dorsal
        t = 0.86 - j * 0.09
        p = F.surf(t, math.pi / 2, 0.97)
        F.cone(p, p + F.normal(t, math.pi / 2) * (0.18 - j * 0.014), 0.045, 0.0, seg=4, mat=2)
    for lado in (-1, 1):  # asas pequenas
        o = F.surf(0.56, 0.0 if lado > 0 else math.pi, 1.0)
        pontas = [Vector((lado * 0.95, 0, 0.9)), Vector((lado * 1.05, 0, 0.62)), Vector((lado * 0.9, 0, 0.28))]
        for q in pontas:
            F.cone(o, q, 0.03, 0.008, seg=4, mat=2)
        for a, b in zip(pontas, pontas[1:]):
            F.ico((o + a + b) / 3, 0.28, (1.0, 0.04, 0.9), (0, 1, 0), 0.05, mat=3)
    cur = Vector((0.42, 0.34, 0.09))  # cauda em curva
    d = Vector((0.4, 0.75, 0.15)).normalized()
    for k in range(7):
        nxt = cur + d * 0.12
        F.cone(cur, nxt, 0.075 * 0.82 ** k, 0.075 * 0.82 ** (k + 1), seg=6, mat=3)
        cur = nxt
        d = (d + Vector((-0.5, 0.05, 0.22))).normalized()
    F.cone(cur, cur + d * 0.16, 0.06, 0.0, seg=4, mat=2)
    o = F.surf(0.6, 1.5 * math.pi, 1.0)  # olho de fenda
    F.ico(o + Vector((0, -0.02, 0)), 0.1, (0.55, 0.3, 1.5), (0, -1, 0), 0.0, mat=5)
    F.cone(o + Vector((0, -0.06, -0.14)), o + Vector((0, -0.06, 0.14)), 0.018, 0.018, seg=4, mat=3)


def d_gravidade_v4(F):
    # extras: 3 horizonte negro, 4 branco quente
    n = (0.18, 0.1, 1)
    for r, e, m in ((0.8, 0.012, 4), (0.88, 0.03, 1), (0.98, 0.02, 3), (1.08, 0.034, 1), (1.18, 0.014, 4)):
        F.toro(r, e, Vector((0, 0, F.zmid)), normal=n, mat=m, seg=56)
    for i in range(16):  # fluxo de detritos em espiral
        u = i / 15
        a = u * 2.6 * math.pi
        rr = 1.45 - u * 0.55
        pos = Vector((math.cos(a) * rr, math.sin(a) * rr, F.zmid + 0.1 - u * 0.05))
        tang = Vector((-math.sin(a), math.cos(a), 0))
        F.ico(pos, 0.07 - u * 0.035, (2.0, 0.6, 0.6), tang, 0.1, mat=(2 if i % 2 else 3))
    F.toro(0.64, 0.01, Vector((0, 0, F.zmid)), normal=(1, 0.2, 0), mat=4, seg=40)
    for k in range(8):  # riscos sendo puxados
        a = TAU * k / 8
        pts = []
        for j in range(6):
            u = j / 5
            aa = a + u * 1.6
            rr = 1.3 - u * 0.72
            pts.append(Vector((math.cos(aa) * rr, math.sin(aa) * rr, F.zmid + 0.55 * (1 - u) ** 2)))
        F.linha(pts, 0.009, mat=1)
    for i in range(9):  # pedrinhas que subiram
        a = TAU * i / 9 + F.rng.uniform(-0.3, 0.3)
        rr = F.rng.uniform(0.15, 0.6)
        F.ico(Vector((math.cos(a) * rr, math.sin(a) * rr, F.ztop + F.rng.uniform(0.18, 0.8))), F.rng.uniform(0.03, 0.06), mat=2, jit=0.2)


def d_luz_v4(F):
    # extras: 3 branco puro
    for i in range(22):
        z = 1 - 2 * (i + 0.5) / 22
        r = math.sqrt(1 - z * z)
        a = i * 2.39996
        v = Vector((math.cos(a) * r, math.sin(a) * r, z))
        longo = i % 2 == 0
        c = Vector((0, 0, F.zmid))
        F.cone(c + v * 0.55, c + v * (F.rng.uniform(1.0, 1.3) if longo else F.rng.uniform(0.7, 0.85)), 0.055 if longo else 0.04, 0.0, seg=4, mat=(3 if longo else 1))
    F.toro(0.42, 0.02, Vector((0, 0, F.ztop + 0.36)), mat=3, seg=40)
    for i in range(12):
        a = TAU * i / 12
        b = Vector((math.cos(a) * 0.42, math.sin(a) * 0.42, F.ztop + 0.36))
        F.cone(b, b + Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, 0.03)), 0.03, 0.0, seg=4, mat=1)
    for i in range(5):
        a = TAU * i / 5
        F.prisma(Vector((math.cos(a) * 0.1, math.sin(a) * 0.1, F.ztop - 0.05)), (math.cos(a) * 0.4, math.sin(a) * 0.4, 1),
                 0.055, F.rng.uniform(0.28, 0.5), mat=2)
    F.toro(0.78, 0.008, Vector((0, 0, F.zmid)), normal=(0, 1, 0.15), mat=1, seg=48)
    for _ in range(16):
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-0.6, 1))).normalized() * F.rng.uniform(0.7, 1.1)
        F.ico(v + Vector((0, 0, F.zmid)), F.rng.uniform(0.02, 0.04), mat=3, jit=0.0)


def d_sombra_v4(F):
    # extras: 3 obsidiana, 4 brilho violeta, 5 olho
    F.ico(Vector((0, 0, 0.015)), 0.95, (1, 1, 0.03), (0, 0, 1), 0.06, mat=3)
    for k in range(10):
        a = F.rng.uniform(0, TAU)
        pts = [Vector((math.cos(a) * 0.98, math.sin(a) * 0.98, 0.03)), Vector((math.cos(a) * 0.72, math.sin(a) * 0.72, 0.06))]
        tmax = F.rng.uniform(0.45, 0.85)
        for j in range(7):
            t = 0.04 + tmax * j / 6
            pts.append(F.surf(t, a + j * 0.22, 1.05))
        for j in range(len(pts) - 1):
            r = 0.04 * (1 - j / len(pts)) + 0.008
            F.cone(pts[j], pts[j + 1], r, r * 0.9, seg=4, mat=4)
        F.cone(pts[-1], pts[-1] + Vector((math.cos(a) * 0.08, math.sin(a) * 0.08, 0.1)), 0.012, 0.0, seg=4, mat=4)
    for i in range(6):
        a = TAU * i / 6 + 0.3
        base = Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, F.ztop - 0.05))
        F.prisma(base, (math.cos(a) * 0.35, math.sin(a) * 0.35, 1), 0.07, F.rng.uniform(0.35, 0.7), mat=3)
    for lado in (-1, 1):  # olhos em fenda
        a = 1.5 * math.pi + lado * 0.42
        o = F.surf(0.6, a, 1.0)
        F.ico(o, 0.075, (0.4, 0.2, 1.7), F.normal(0.6, a), 0.0, mat=5)
    for _ in range(9):
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(0.1, 1.2)))
        F.ico(v * 0.8 + Vector((0, 0, 0.2)), F.rng.uniform(0.03, 0.06), (1, 1, 1.6), (F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), 1), 0.15, mat=3)


def d_fenix_v4(F):
    # extras: 3 ouro, 4 brasa, 5 pena vermelha
    for row, t in enumerate((0.2, 0.34, 0.48, 0.62, 0.76)):
        n = 11 - row
        for i in range(n):
            a = TAU * i / n + row * 0.35
            nrm = F.normal(t, a)
            F.ico(F.surf(t, a, 1.04), 0.17, (0.42, 0.12, 1.0), nrm + Vector((0, 0, -0.9)), 0.05, mat=(5, 3, 2)[(i + row) % 3])
    for lado in (-1, 1):  # asas em leque
        base = Vector((lado * 0.4, 0, F.zmid + 0.15))
        for i in range(8):
            ph = math.radians(8 + 13 * i)
            d = Vector((lado * math.cos(ph), 0.0, math.sin(ph)))
            comp = 0.5 + 0.055 * i
            F.cone(base, base + d * comp, 0.014, 0.006, seg=4, mat=3)
            F.ico(base + d * comp * 0.62, 0.2 + 0.012 * i, (0.26, 0.07, 1.0), d, 0.04, mat=(5, 4, 3)[i % 3])
    for k in range(3):  # cauda longa
        a = math.radians(70 + 20 * k)
        d = Vector((math.cos(a) * 0.35, 0.8, -0.45)).normalized()
        b = Vector((0, 0.3, 0.25))
        F.ico(b + d * 0.5, 0.42, (0.16, 0.05, 1.0), d, 0.03, mat=(3, 5, 4)[k])
        F.ico(b + d * 0.9, 0.05, mat=4, jit=0.0)
    for i in range(3):
        a = TAU * i / 3
        b = Vector((math.cos(a) * 0.09, math.sin(a) * 0.09, F.ztop - 0.04))
        F.lingua(b, (math.cos(a) * 0.3, math.sin(a) * 0.3, 1), 0.65 - 0.1 * i, 0.09, mat=(1, 4, 1)[i], sway=0.45)
    for _ in range(12):
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(0.2, 1.4)))
        F.ico(v * 0.9, F.rng.uniform(0.02, 0.04), mat=1, jit=0.0)


def d_colosso_v4(F):
    # extras: 3 brilho âmbar
    for t in (0.3, 0.52, 0.74):
        F.toro(F.raio(t) * 1.03, 0.028, Vector((0, 0, F._rz(t)[1])), mat=2, seg=10)
    for i in range(5):  # dedos de pedra segurando o fruto
        a = TAU * i / 5 + 0.3
        seg = [(0.7, 0.0), (0.72, 0.3), (0.62, 0.56), (0.4, 0.76)]
        pts = [Vector((math.cos(a) * r, math.sin(a) * r, z)) for r, z in seg]
        for j in range(3):
            F.cone(pts[j], pts[j + 1], 0.13 - j * 0.02, 0.115 - j * 0.02, seg=6, mat=2)
            F.ico(pts[j + 1], 0.13 - j * 0.02, (1, 1, 0.9), (0, 0, 1), 0.1, mat=2)
        F.cone(pts[3], pts[3] + Vector((-math.cos(a) * 0.12, -math.sin(a) * 0.12, 0.08)), 0.07, 0.0, seg=6, mat=2)
    for k in range(5):  # runas âmbar
        a = TAU * k / 5 + 1.0
        t = F.rng.uniform(0.4, 0.62)
        c = F.surf(t, a, 1.03)
        for _ in range(3):
            d = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-1, 1))) * 0.07
            F.cone(c, c + d, 0.012, 0.012, seg=4, mat=3)
    for i in range(3):
        a = TAU * i / 3 + 0.6
        prev = F.surf(0.92, a, 1.01)
        for j in range(1, 5):
            q = F.surf(0.92 - j * 0.16, a + F.rng.uniform(-0.15, 0.15), 1.02)
            F.cone(prev, q, 0.014, 0.014, seg=4, mat=3)
            prev = q
    for _ in range(10):
        a = F.rng.uniform(0, TAU)
        r = F.rng.uniform(0.95, 1.2)
        F.ico(Vector((math.cos(a) * r, math.sin(a) * r, 0.05)), F.rng.uniform(0.05, 0.11), (1, 1, 0.7), (0, 0, 1), 0.2, mat=2)


def d_quimera_v4(F):
    # extras: 3 escama verde, 4 pena azul
    for row, t in enumerate((0.22, 0.38, 0.54, 0.7)):
        for i in range(4):
            a = math.radians(8 + 27 * i + row * 6)
            F.ico(F.surf(t, a, 1.03), 0.13, (1.1, 1.0, 0.3), F.normal(t, a), 0.06, mat=3)
        for i in range(4):
            a = math.radians(128 + 27 * i + row * 6)
            F.ico(F.surf(t, a, 1.04), 0.17, (0.4, 0.12, 1.0), F.normal(t, a) + Vector((0, 0, -0.9)), 0.05, mat=4)
    for i in range(26):
        t = F.rng.uniform(0.2, 0.8)
        a = math.radians(248 + F.rng.uniform(0, 104))
        q = F.surf(t, a, 1.0)
        F.cone(q, q + F.normal(t, a) * 0.1 + Vector((0, 0, -0.1)), 0.02, 0.0, seg=3, mat=2)
    for lado in (-1, 1):  # chifres de carneiro
        c = Vector((lado * 0.22, 0.0, F.ztop - 0.05))
        for k in range(14):
            u = k / 13
            ang = u * 1.7 * math.pi
            q = c + Vector((lado * (0.22 * (1 - math.cos(ang))) * (1 - u * 0.2), -0.05 * u, 0.18 * math.sin(ang) + 0.05))
            F.ico(q, 0.055 * (1 - u * 0.7), mat=2, jit=0.0)
    for i in range(3):  # garras
        a = 1.5 * math.pi + (i - 1) * 0.45
        b = Vector((math.cos(a) * 0.5, math.sin(a) * 0.5, 0.06))
        d = Vector((math.cos(a), math.sin(a), 0.2))
        cur = b
        for k in range(3):
            nxt = cur + d * 0.06
            F.cone(cur, nxt, 0.04 - k * 0.011, 0.03 - k * 0.01, seg=5, mat=2)
            cur = nxt
            d = (d + Vector((0, 0, -0.45))).normalized()
    cur = Vector((0.5, 0.05, 0.1))  # cauda de serpente enrolando
    for k in range(22):
        u = k / 21
        a = 0.2 + u * 3.5
        rr = 0.6 + 0.05 * math.sin(u * 9)
        nxt = Vector((math.cos(a) * rr, math.sin(a) * rr, 0.1 + u * 0.55))
        F.cone(cur, nxt, 0.05 * (1 - u * 0.6), 0.05 * (1 - (u + 0.05) * 0.6), seg=5, mat=3)
        cur = nxt
    F.ico(cur + Vector((0, 0, 0.03)), 0.07, (1.2, 1, 0.8), (0, 0, 1), 0.05, mat=3)
    for a in (0.5, 2.2, 4.4):
        F.ico(F.surf(0.6, a, 1.02), 0.03, mat=1, jit=0.0)


def _portal(F, t, a, rr):
    p = F.surf(t, a, 1.0)
    n = F.normal(t, a)
    rot = n.to_track_quat("Z", "Y").to_matrix()
    F.toro(rr, 0.04, p + n * 0.03, normal=n, mat=2, seg=28)
    for k in range(8):
        ang = TAU * k / 8
        v = rot @ Vector((math.cos(ang) * rr, math.sin(ang) * rr, 0))
        F.cone(p + n * 0.03 + v, p + n * 0.03 + v * 1.0 + v.normalized() * 0.09, 0.03, 0.0, seg=4, mat=2)
    F.disco(p + n * 0.035, rr * 0.93, 0.02, n, mat=1)
    for arm in range(3):
        pts = []
        for j in range(9):
            u = j / 8
            th = arm * 2.09 + u * 4.2
            pts.append(p + n * 0.05 + rot @ Vector((math.cos(th) * u * rr * 0.85, math.sin(th) * u * rr * 0.85, 0)))
        F.linha(pts, 0.014, mat=3)


def d_portais_v4(F):
    # extras: 3 vazio escuro, 4 fenda clara
    _portal(F, 0.55, 0.0, 0.27)
    _portal(F, 0.42, math.pi, 0.21)
    _portal(F, 0.82, 2.2, 0.12)
    for _ in range(5):
        a = F.rng.uniform(0, TAU)
        pts = [F.surf(0.9, a, 1.01)]
        for j in range(1, 6):
            pts.append(F.surf(0.9 - j * 0.15, a + F.rng.uniform(-0.3, 0.3), 1.012))
        F.linha(pts, 0.012, mat=4)
    for i in range(9):
        u = i / 8
        a = u * 5.0
        rr = 1.0 - u * 0.35
        F.ico(Vector((math.cos(a) * rr, math.sin(a) * rr, 0.25 + u * 0.4)), 0.035, (1, 1, 1.4), (math.cos(a), math.sin(a), 0), 0.1, mat=2)


def d_fios_v4(F):
    # extras: 3 madeira, 4 aço
    for z in (0.045, F.ztop - 0.045):
        F.disco(Vector((0, 0, z)), 0.56 if z < 0.5 else 0.42, 0.07, mat=2, seg=28)
    zb = F.ztop + 0.78
    F.cone(Vector((-0.4, 0, zb)), Vector((0.4, 0, zb)), 0.03, 0.03, seg=6, mat=3)
    F.cone(Vector((0, -0.22, zb)), Vector((0, 0.22, zb)), 0.03, 0.03, seg=6, mat=3)
    F.ico(Vector((0, 0, zb + 0.04)), 0.07, mat=3, jit=0.0)
    alvos = [(0.9, 0.3), (0.85, 2.1), (0.85, 4.0), (0.6, 1.2), (0.55, 3.3), (0.6, 5.2)]
    apoios = [(-0.4, 0), (0.4, 0), (0, -0.22), (0, 0.22), (-0.4, 0), (0.4, 0)]
    for (t, a), (ax, ay) in zip(alvos, apoios):
        F.cone(Vector((ax, ay, zb)), F.surf(t, a, 1.0), 0.008, 0.008, seg=4, mat=1)
    F.cone(Vector((-0.78, -0.02, F.zmid)), Vector((0.78, -0.02, F.zmid)), 0.02, 0.006, seg=6, mat=4)
    F.toro(0.045, 0.01, Vector((-0.78, -0.02, F.zmid)), normal=(0, 1, 0), mat=4, seg=12)
    cur = Vector((-0.78, -0.02, F.zmid))
    for k in range(7):
        nxt = cur + Vector((-0.05, -0.04 * math.sin(k), -0.06))
        F.cone(cur, nxt, 0.008, 0.008, seg=4, mat=1)
        cur = nxt


def d_instante_v4(F):
    # extras: 3 ouro, 4 marfim, 5 vidro
    R = F.raio(0.5)
    c = Vector((0, -R - 0.01, F.zmid))
    F.disco(c, 0.4, 0.03, (0, -1, 0), mat=4, seg=32)
    F.toro(0.42, 0.035, c + Vector((0, -0.02, 0)), normal=(0, -1, 0), mat=3, seg=32)
    F.toro(R * 1.02, 0.03, Vector((0, 0, F.zmid)), mat=3, seg=32)
    for i in range(12):
        a = TAU * i / 12
        q = c + Vector((math.cos(a) * 0.33, -0.03, math.sin(a) * 0.33))
        F.cone(q, q + Vector((math.cos(a) * 0.05, 0, math.sin(a) * 0.05)), 0.014, 0.014, seg=4, mat=3)
    F.cone(c + Vector((0, -0.03, 0)), c + Vector((0, -0.03, 0.3)), 0.02, 0.0, seg=4, mat=1)
    F.cone(c + Vector((0, -0.03, 0)), c + Vector((0.14, -0.03, 0.02)), 0.026, 0.0, seg=4, mat=1)
    F.ico(c + Vector((0, -0.05, 0)), 0.035, mat=3, jit=0.0)
    F.ico(c + Vector((0, -0.07, 0)), 0.4, (1, 1, 0.2), (0, -1, 0), 0.0, mat=5)
    F.cone(Vector((0, 0, F.ztop - 0.04)), Vector((0, 0, F.ztop + 0.12)), 0.075, 0.075, seg=10, mat=3)
    F.toro(0.11, 0.02, Vector((0, 0, F.ztop + 0.24)), normal=(1, 0, 0), mat=3, seg=20)
    for k in range(4):
        F.toro(0.05, 0.012, Vector((0.16 + 0.1 * k, 0, F.ztop + 0.24 - 0.04 * k)), normal=((1, 0, 0) if k % 2 else (0, 1, 0)), mat=3, seg=12)
    for i in range(9):
        a = TAU * i / 9 + F.rng.uniform(-0.2, 0.2)
        pos = c + Vector((math.cos(a) * 0.62, -0.3 + F.rng.uniform(-0.12, 0.12), math.sin(a) * 0.62))
        F.ico(pos, 0.06, (1.6, 0.25, 0.7), (math.cos(a), 0, math.sin(a)), 0.1, mat=5)
    for i in range(6):
        F.ico(Vector((F.rng.uniform(-0.9, 0.9), F.rng.uniform(-0.5, 0.5), F.rng.uniform(0.1, 1.0))), 0.022, mat=1, jit=0.0)


def d_espelho_v4(F):
    # extras: 3 moldura ouro, 4 fenda clara
    for _ in range(18):
        t, a = F.rand_surf(0.12, 0.9)
        nrm = F.normal(t, a)
        d = (nrm + Vector((F.rng.uniform(-0.35, 0.35), F.rng.uniform(-0.35, 0.35), F.rng.uniform(-0.2, 0.2)))).normalized()
        F.ico(F.surf(t, a, 1.03), F.rng.uniform(0.13, 0.22), (1.2, 1.0, 0.1), d, 0.16, mat=2)
    F.toro(0.98, 0.045, Vector((0, 0.5, F.zmid)), normal=(0, 1, 0), mat=3, seg=44)
    F.toro(0.86, 0.018, Vector((0, 0.5, F.zmid)), normal=(0, 1, 0), mat=3, seg=44)
    for k in range(10):
        a = TAU * k / 10
        q = Vector((math.cos(a) * 0.98, 0.5, F.zmid + math.sin(a) * 0.98))
        F.toro(0.07, 0.016, q, normal=(0, 1, 0), mat=3, seg=12)
        F.ico(q + Vector((math.cos(a) * 0.09, 0, math.sin(a) * 0.09)), 0.04, mat=3, jit=0.0)
    for i in range(4):
        a = TAU * i / 4 + 0.5
        pts = [F.surf(0.9, a, 1.03)]
        for j in range(1, 5):
            pts.append(F.surf(0.9 - j * 0.17, a + F.rng.uniform(-0.3, 0.3), 1.03))
        F.linha(pts, 0.013, mat=4)
    for _ in range(7):
        F.ico(Vector((F.rng.uniform(-0.9, 0.9), F.rng.uniform(-0.8, 0.3), F.rng.uniform(0.1, 1.1))), F.rng.uniform(0.05, 0.09),
              (1.3, 1, 0.12), (F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-1, 1)), 0.15, mat=2)


# ── redesenho v4 (Frutos dos Fluxos) ──

def d_origem_v4(F):
    # extras: 3 estame dourado, 4 folha, 5 orvalho
    for i in range(8):
        a = TAU * i / 8
        d = Vector((math.cos(a) * 0.85, math.sin(a) * 0.85, 0.5))
        b = Vector((math.cos(a) * 0.22, math.sin(a) * 0.22, F.ztop - 0.1))
        F.ico(b + d * 0.24, 0.27, (0.55, 0.14, 1.2), d, 0.04, mat=2)
    for i in range(8):
        a = TAU * i / 8 + 0.4
        d = Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 1.0))
        b = Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, F.ztop - 0.08))
        F.ico(b + d * 0.2, 0.19, (0.5, 0.14, 1.3), d, 0.04, mat=0)
    for i in range(14):
        a = TAU * i / 14 + F.rng.uniform(-0.2, 0.2)
        h = F.rng.uniform(0.32, 0.5)
        b = Vector((0, 0, F.ztop - 0.02))
        tip = b + Vector((math.cos(a) * 0.09, math.sin(a) * 0.09, h))
        F.cone(b, tip, 0.012, 0.008, seg=4, mat=3)
        F.ico(tip, 0.028, mat=3, jit=0.0)
    F.ico(Vector((0, 0, F.ztop + 0.02)), 0.13, mat=3, jit=0.05)
    base = Vector((0.75, -0.55, 0.0))  # broto no chão
    F.cone(base, base + Vector((0, 0, 0.3)), 0.02, 0.014, seg=5, mat=4)
    F.ico(base + Vector((0.08, 0, 0.3)), 0.09, (1.5, 0.7, 0.15), (1, 0, 0.5), 0.04, mat=4)
    F.ico(base + Vector((-0.08, 0, 0.26)), 0.08, (1.5, 0.7, 0.15), (-1, 0, 0.5), 0.04, mat=4)
    for _ in range(9):
        t, a = F.rand_surf(0.5, 0.9)
        F.ico(F.surf(t, a, 1.02), 0.03, mat=5, jit=0.0)
    for _ in range(12):
        v = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-0.3, 1.2)))
        F.ico(v * 0.85 + Vector((0, 0, 0.3)), 0.04, (1, 1, 0.3), (0, 0, 1), 0.1, mat=2)


def d_essencia_v4(F):
    # extras: 3 pupila
    R = F.raio(0.5)
    c = Vector((0, -R - 0.03, F.zmid))
    for r, m in ((0.36, 2), (0.29, 1), (0.22, 2)):
        F.toro(r, 0.022, c, normal=(0, -1, 0), mat=m, seg=32)
    F.disco(c + Vector((0, 0.01, 0)), 0.33, 0.03, (0, -1, 0), mat=1, seg=28)
    q = c + Vector((0, -0.03, 0))
    F.cone(q + Vector((0, 0, -0.17)), q, 0.0, 0.055, seg=6, mat=3)
    F.cone(q, q + Vector((0, 0, 0.17)), 0.055, 0.0, seg=6, mat=3)
    for i in range(12):
        a = TAU * i / 12
        w = c + Vector((math.cos(a) * 0.4, -0.02, math.sin(a) * 0.4))
        F.cone(w, w + Vector((math.cos(a) * 0.07, 0, math.sin(a) * 0.07)), 0.014, 0.0, seg=4, mat=1)
    F.ico(Vector((0, 0.05, F.zmid)), 0.2, mat=1, jit=0.06)
    for i in range(7):
        a = TAU * i / 7
        F.prisma(Vector((math.cos(a) * 0.12, math.sin(a) * 0.12, F.ztop - 0.1)), (math.cos(a) * 0.45, math.sin(a) * 0.45, 1),
                 F.rng.uniform(0.06, 0.09), F.rng.uniform(0.3, 0.6), mat=2)
    F.prisma(Vector((0, 0, F.ztop - 0.1)), (0.04, 0, 1), 0.1, 0.7, mat=2)
    for i in range(6):
        a = TAU * i / 6 + 0.2
        F.ico(Vector((math.cos(a) * 0.85, math.sin(a) * 0.85, F.zmid + F.rng.uniform(-0.3, 0.3))), 0.07, (1, 1, 1.5),
              (F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), 1), 0.1, mat=2)


def d_comunicacao_v4(F):
    # extras: 3 pena branca
    for i, t in enumerate((0.16, 0.3, 0.44, 0.58, 0.72)):
        F.toro(F.raio(t) * 1.04, 0.012, Vector((0, 0, F._rz(t)[1])), mat=2, seg=30)
    for fita in range(2):
        for k in range(30):
            u = k / 29
            t = 0.14 + 0.66 * u
            a = fita * math.pi + u * 3.2 * math.pi
            c = F.surf(t, a, 1.12)
            nrm = F.normal(t, a)
            rot = nrm.to_track_quat("Z", "Y").to_matrix()
            F.cubo(c, (0.06, 0.028, 0.045), rot, mat=(1 if k % 3 else 2))
    F.cone(Vector((0, 0, F.ztop - 0.05)), Vector((0.16, 0, F.ztop + 0.8)), 0.02, 0.012, seg=5, mat=2)
    for i in range(11):
        u = 0.25 + i * 0.065
        q = Vector((0.16 * u / 0.8 * 0.8, 0, F.ztop - 0.05 + 0.85 * u))
        for lado in (-1, 1):
            F.ico(q + Vector((0, lado * 0.09, 0)), 0.15 - i * 0.008, (0.15, 0.6, 1.0), (0.1, lado * 0.9, 0.7), 0.04, mat=3)
    for a, r in ((0.0, 0.5), (2.4, 0.4), (4.0, 0.45)):
        F.toro(0.16, 0.01, Vector((math.cos(a) * 0.95, math.sin(a) * 0.95, F.zmid + r - 0.3)), normal=(math.cos(a), math.sin(a), 0), mat=1, seg=20)
        F.toro(0.26, 0.01, Vector((math.cos(a) * 1.05, math.sin(a) * 1.05, F.zmid + r - 0.3)), normal=(math.cos(a), math.sin(a), 0), mat=1, seg=20)


def d_vitalidade_v4(F):
    # extras: 3 vinha, 4 flor, 5 raiz, 6 botão
    for k in range(6):
        a = TAU * k / 6 + 0.3
        cur = Vector((math.cos(a) * 0.35, math.sin(a) * 0.35, 0.09))
        d = Vector((math.cos(a), math.sin(a), -0.2)).normalized()
        for j in range(5):
            nxt = cur + d * 0.13
            F.cone(cur, nxt, 0.06 * 0.78 ** j, 0.06 * 0.78 ** (j + 1), seg=5, mat=5)
            cur = nxt
            d = (d + Vector((-math.sin(a) * 0.4, math.cos(a) * 0.4, -0.05))).normalized()
    for v in range(2):
        prev = None
        for k in range(46):
            u = k / 45
            t = 0.12 + 0.7 * u
            a = v * math.pi + u * 3.0 * math.pi
            q = F.surf(t, a, 1.05)
            if prev is not None:
                F.cone(prev, q, 0.024, 0.024, seg=4, mat=3)
            if k % 7 == 3:
                nrm = F.normal(t, a)
                F.ico(q + nrm * 0.1, 0.09, (0.4, 1.0, 0.1), nrm, 0.05, mat=(3 if k % 2 else 2))
            if k % 15 == 8:
                F.ico(q + F.normal(t, a) * 0.05, 0.04, mat=6, jit=0.05)
            prev = q
    for i in range(7):
        a = TAU * i / 7
        d = Vector((math.cos(a) * 0.9, math.sin(a) * 0.9, 0.5))
        F.ico(Vector((math.cos(a) * 0.13, math.sin(a) * 0.13, F.ztop - 0.05)) + d * 0.22, 0.24, (0.4, 1.0, 0.1), d, 0.05, mat=2)
    for i in range(6):
        a = TAU * i / 6
        F.ico(Vector((math.cos(a) * 0.07, math.sin(a) * 0.07, F.ztop + 0.12)), 0.1, (0.5, 1.0, 0.2), (math.cos(a) * 0.6, math.sin(a) * 0.6, 1), 0.03, mat=4)
    F.ico(Vector((0, 0, F.ztop + 0.14)), 0.06, mat=6, jit=0.0)
    for a, r in ((0.6, 0.85), (2.8, 0.75), (4.5, 0.9)):
        b = Vector((math.cos(a) * r, math.sin(a) * r, 0.02))
        F.cone(b, b + Vector((0, 0, 0.12)), 0.03, 0.025, seg=6, mat=2)
        F.ico(b + Vector((0, 0, 0.14)), 0.09, (1.2, 1.2, 0.5), (0, 0, 1), 0.05, mat=4)
    for i in range(6):
        t, a = F.rand_surf(0.2, 0.85)
        F.linha([F.surf(t, a, 1.02), F.surf(t - 0.1, a + 0.15, 1.02), F.surf(t - 0.2, a + 0.05, 1.02)], 0.012, mat=1)


def d_inconstancia_v4(F):
    # extras: 3 marfim, 4 pinta, 5 ouro, 6 laranja claro
    for k in range(3):
        t, a = F.rand_surf(0.3, 0.75)
        F.ico(F.surf(t, a, 0.82), F.rng.uniform(0.22, 0.3), jit=0.15, mat=(6 if k % 2 else 2))
    F.espiral(1.4, 2, 0.02, mat=1, fase=1.0, t0=0.1, t1=0.7)

    def dado(pos, tam):
        rot = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-1, 1))).normalized().to_track_quat("Z", "Y").to_matrix()
        F.cubo(pos, tam, rot, mat=3)
        faces = [((0, 0, 1), [(0, 0)]), ((1, 0, 0), [(-0.25, -0.25), (0.25, 0.25)]),
                 ((0, 1, 0), [(-0.28, -0.28), (0, 0), (0.28, 0.28)])]
        for n, marcas in faces:
            n = Vector(n)
            u = n.cross(Vector((0, 0, 1)) if abs(n.z) < 0.9 else Vector((1, 0, 0))).normalized()
            w = n.cross(u)
            for a, b in marcas:
                loc = (n * 0.5 + u * a + w * b) * tam
                F.ico(pos + rot @ loc, tam * 0.075, (1, 1, 0.6), rot @ n, 0.0, mat=4)

    for pos, tam in ((Vector((0.78, -0.35, 0.55)), 0.2), (Vector((-0.7, -0.5, 0.75)), 0.17), (Vector((0.15, 0.85, 0.35)), 0.19)):
        dado(pos, tam)
    for k in range(3):
        rot = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), 1)).normalized().to_track_quat("Z", "Y").to_matrix()
        F.disco(Vector((F.rng.uniform(-0.8, 0.8), F.rng.uniform(-0.8, 0.8), F.rng.uniform(0.9, 1.3))), 0.09, 0.02, rot @ Vector((0, 0, 1)), mat=5, seg=16)
    for i in range(20):
        a0 = TAU * i / 20
        F.arco(0.95, 0.03, a0, a0 + TAU / 20 * 0.85, F.zmid - 0.1, mat=(1 if i % 2 else 4), passos=3)
    for i in range(20):
        a = TAU * i / 20 + TAU / 40
        b = Vector((math.cos(a) * 0.95, math.sin(a) * 0.95, F.zmid - 0.1))
        F.cone(b, b + Vector((0, 0, 0.08)), 0.02, 0.0, seg=4, mat=5)


def d_fisico_v4(F):
    # extras: 3 placa escura
    for row, t in enumerate((0.15, 0.29, 0.43, 0.57, 0.71, 0.83)):
        n = 11 - row
        for i in range(n):
            a = TAU * i / n + row * 0.27
            nrm = F.normal(t, a)
            F.ico(F.surf(t, a, 1.04), 0.19 - row * 0.008, (1.25, 1.0, 0.3), nrm + Vector((0, 0, -0.3)), 0.1, mat=(2 if (i + row) % 2 else 3))
        F.toro(F.raio(t + 0.06) * 1.01, 0.012, Vector((0, 0, F._rz(t + 0.06)[1])), mat=1, seg=14)
    F.cone(Vector((0, 0, -0.06)), Vector((0, 0, 0.02)), 0.82, 0.74, seg=12, mat=2)
    for i in range(6):
        a = TAU * i / 6 + 0.2
        F.prisma(Vector((math.cos(a) * 0.14, math.sin(a) * 0.14, F.ztop - 0.1)), (math.cos(a) * 0.3, math.sin(a) * 0.3, 1),
                 0.08, F.rng.uniform(0.3, 0.5), mat=2)
    F.prisma(Vector((0, 0, F.ztop - 0.1)), (0, 0, 1), 0.1, 0.55, mat=2)
    for i in range(5):
        a = TAU * i / 5
        pos = Vector((math.cos(a) * 0.78, math.sin(a) * 0.78, 0.06))
        F.ico(pos, 0.08, (1.3, 1.0, 0.8), (0, 0, 1), 0.2, mat=3)


def d_espaco_v4(F):
    # extras: 3 estrela
    faces = [f for f in F.bm.faces if len(f.verts) == 4
             and min(v.co.z for v in f.verts) < 0.5 < max(v.co.z for v in f.verts)
             and max(v.co.z for v in f.verts) - min(v.co.z for v in f.verts) > 0.15]
    bmesh.ops.delete(F.bm, geom=faces, context="FACES_ONLY")
    for v in F.bm.verts:
        if v.co.z > 0.5:
            v.co.z += 0.16
    F.disco(Vector((0, 0, 0.58)), 0.44, 0.03, mat=3, seg=24)
    F.toro(0.5, 0.012, Vector((0, 0, 0.58)), mat=1, seg=28)
    Rz = Matrix.Rotation(math.radians(35), 3, "Z") @ Matrix.Rotation(math.radians(24), 3, "X")
    c = Vector((0, 0, F.zmid + 0.08))
    S = 0.72
    cantos = [c + Rz @ Vector((x * S, y * S, z * S)) for x in (-1, 1) for y in (-1, 1) for z in (-1, 1)]
    for i, a in enumerate(cantos):
        for j, b in enumerate(cantos):
            if i < j and bin(i ^ j).count("1") == 1:
                F.cone(a, b, 0.011, 0.011, seg=4, mat=1)
    for q in cantos:
        F.ico(q, 0.04, mat=3, jit=0.0)
    for k in range(6):
        F.ico(Vector((F.rng.uniform(-0.6, 0.6), F.rng.uniform(-0.6, 0.6), F.rng.uniform(0.0, 1.2))), 0.06, (1, 1, 1.6),
              (F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), 1), 0.1, mat=1)


def d_vazio_v4(F):
    # extras: 3 moldura
    for _ in range(3):
        t0, a0 = F.rand_surf(0.3, 0.85)
        pts = []
        for j in range(6):
            pts.append(F.surf(min(0.95, max(0.08, t0 + F.rng.uniform(-0.12, 0.12))), a0 + F.rng.uniform(-0.5, 0.5), 1.012))
        F.linha(pts, 0.006, mat=1)
        for q in pts:
            F.ico(q, 0.022, mat=1, jit=0.0)
    for _ in range(38):
        t, a = F.rand_surf(0.06, 0.94)
        F.ico(F.surf(t, a, 1.01), F.rng.uniform(0.01, 0.024), mat=1, jit=0)
    a = 1.5 * math.pi
    c = F.surf(0.42, a, 1.0)
    rot = Matrix.Identity(3)
    F.cubo(c + Vector((0, -0.02, 0.02)), (0.24, 0.03, 0.4), rot, mat=1)
    for lado in (-1, 1):
        F.cubo(c + Vector((lado * 0.15, -0.03, 0.02)), (0.05, 0.05, 0.42), rot, mat=3)
    F.cubo(c + Vector((0, -0.03, 0.24)), (0.34, 0.05, 0.05), rot, mat=3)
    for k in range(5):
        u = math.pi * k / 4
        q = c + Vector((math.cos(u) * 0.14, -0.03, 0.24 + math.sin(u) * 0.07))
        F.ico(q, 0.03, mat=3, jit=0.0)
    for k in range(3):
        F.cubo(c + Vector((0, -0.05 - 0.05 * k, -0.2 - 0.02 * k)), (0.3 - 0.04 * k, 0.05, 0.03), rot, mat=3)
    F.toro(0.78, 0.008, Vector((0, 0, F.zmid)), normal=(0.2, 0.3, 1), mat=1, seg=44)
    for i in range(3):  # estrelas de quatro pontas
        pos = Vector((math.cos(i * 2.2 + 0.5) * 1.0, math.sin(i * 2.2 + 0.5) * 1.0, F.rng.uniform(0.3, 1.1)))
        for ax in ((1, 0, 0), (0, 0, 1)):
            v = Vector(ax) * 0.1
            F.cone(pos - v, pos, 0.0, 0.018, seg=4, mat=1)
            F.cone(pos, pos + v, 0.018, 0.0, seg=4, mat=1)


def d_fim_v4(F):
    # extras: 3 tinta preta, 4 papel
    F.cone(Vector((0, 0, F.ztop - 0.12)), Vector((0.14, 0, F.ztop + 0.85)), 0.022, 0.01, seg=5, mat=3)
    for i in range(10):
        u = 0.2 + i * 0.07
        q = Vector((0.14 * u / 0.85 * 0.85, 0, F.ztop - 0.12 + 0.97 * u))
        for lado in (-1, 1):
            F.ico(q + Vector((0, lado * 0.08, 0)), 0.14 - i * 0.008, (0.14, 0.6, 1.0), (0.1, lado * 0.9, 0.7), 0.04, mat=3)
    F.ico(Vector((0.03, 0, F.ztop - 0.12)), 0.03, mat=1, jit=0.0)
    F.ico(Vector((0.05, 0, F.ztop + 1.2)), 0.15, mat=3, jit=0.03)
    F.toro(0.24, 0.012, Vector((0.05, 0, F.ztop + 1.2)), normal=(0.3, 0, 1), mat=1, seg=28)
    F.ico(Vector((0, 0, 0.012)), 0.7, (1, 1, 0.03), (0, 0, 1), 0.08, mat=1)
    for _ in range(7):
        t, a = F.rand_surf(0.1, 0.35)
        p = F.surf(t, a, 0.98)
        F.cone(p, p + Vector((0, 0, -F.rng.uniform(0.25, 0.45))), 0.05, 0.0, seg=4, mat=1)
    for row, t in enumerate((0.4, 0.52, 0.64)):
        for k in range(15):
            a = TAU * k / 15 + row * 0.2
            q = F.surf(t, a, 1.02)
            rot = F.normal(t, a).to_track_quat("Z", "Y").to_matrix()
            F.cubo(q, (F.rng.uniform(0.03, 0.06), 0.012, 0.014), rot, mat=3)
    for i in range(5):
        a = TAU * i / 5 + 0.4
        pos = Vector((math.cos(a) * 0.95, math.sin(a) * 0.95, F.rng.uniform(0.3, 1.0)))
        rot = Vector((F.rng.uniform(-1, 1), F.rng.uniform(-1, 1), F.rng.uniform(-1, 1))).normalized().to_track_quat("Z", "Y").to_matrix()
        F.cubo(pos, (0.3, 0.006, 0.4), rot, mat=4)
        for ln in range(4):
            F.cubo(pos + rot @ Vector((0, 0.01, 0.13 - 0.085 * ln)), (0.2, 0.004, 0.012), rot, mat=3)
    F.espinhos(7, 0.14, 0.04, 0.3, 0.85, mat=2)


def d_tecnologia_v4(F):
    # extras: 3 chip escuro
    for _ in range(8):
        t, a = F.rand_surf(0.2, 0.9)
        pts = [F.surf(t, a, 1.012)]
        for j in range(8):
            if j % 2:
                t = max(0.06, min(0.94, t + F.rng.choice((-1, 1)) * 0.11))
            else:
                a += F.rng.choice((-1, 1)) * 0.35
            pts.append(F.surf(t, a, 1.012))
        F.linha(pts, 0.009, mat=1)
        for q in pts[::2]:
            F.ico(q, 0.022, mat=1, jit=0.0)
    for k, (w, z) in enumerate(((0.44, 0.0), (0.32, 0.075), (0.22, 0.15))):
        F.cubo(Vector((0, 0, F.ztop - 0.04 + z)), (w, w, 0.06), None, mat=3)
        for i in range(7):
            q = -w / 2 + w * i / 6
            for lado in (-1, 1):
                F.cubo(Vector((q, lado * (w / 2 + 0.012), F.ztop - 0.04 + z)), (0.02, 0.03, 0.02), None, mat=2)
                F.cubo(Vector((lado * (w / 2 + 0.012), q, F.ztop - 0.04 + z)), (0.03, 0.02, 0.02), None, mat=2)
    F.cone(Vector((0, 0, F.ztop + 0.16)), Vector((0, 0, F.ztop + 0.6)), 0.03, 0.012, seg=6, mat=2)
    F.ico(Vector((0, 0, F.ztop + 0.64)), 0.05, mat=1, jit=0.0)
    for i in range(3):
        a0 = TAU * i / 3
        F.arco(0.86, 0.015, a0, a0 + TAU / 3 * 0.75, F.zmid + 0.1, mat=1, passos=10)
    for i in range(5):
        a = TAU * i / 5
        pos = Vector((math.cos(a) * 0.86, math.sin(a) * 0.86, F.zmid + 0.1 + (0.15 if i % 2 else -0.12)))
        F.ico(pos, 0.07, (1.2, 1.2, 0.7), (0, 0, 1), 0.0, mat=3)
        F.ico(pos + Vector((math.cos(a) * 0.05, math.sin(a) * 0.05, 0.02)), 0.022, mat=1, jit=0.0)
    for i in range(7):
        a = TAU * i / 7 + 0.3
        pos = Vector((math.cos(a) * 0.98, math.sin(a) * 0.98, F.rng.uniform(0.2, 1.0)))
        F.cone(pos - Vector((0, 0, 0.008)), pos + Vector((0, 0, 0.008)), 0.07, 0.07, seg=6, mat=2)


DECOR = {n[2:]: f for n, f in globals().items() if n.startswith("d_")}

# ── catálogo dos 26 frutos ──
# corpo/brilho/detalhe em RGB 0-255. `emis`: brilho do corpo. `alfa`: transparência.
FRUTOS = {
    # Místicos
    "fruto-chamas": dict(perfil="redonda", seg=12, jit=0.05, corpo=(46, 26, 22), brilho=(255, 124, 32), detalhe=(120, 38, 26),
                         rough=0.9, mats_extra=[dict(cor=(255, 230, 130), emis=5.0), dict(cor=(214, 52, 24), emis=2.8)],
                         decor=["fogo"], caule=False),
    "fruto-dragao": dict(perfil="pera", seg=12, jit=0.03, corpo=(38, 108, 72), brilho=(255, 140, 40), detalhe=(158, 66, 46),
                         rough=0.55, mats_extra=[dict(cor=(22, 72, 50), rough=0.6), dict(cor=(232, 196, 112), metal=0.85, rough=0.3),
                                                 dict(cor=(255, 176, 40), emis=4.0)],
                         decor=["dragao"], caule=False),
    "fruto-tremor": dict(perfil="gorda", seg=9, jit=0.06, corpo=(70, 54, 42), brilho=(255, 150, 40), detalhe=(150, 122, 94),
                         rough=0.95, mats_extra=[dict(cor=(58, 46, 38), rough=0.95)], decor=["tectonico"], caule=False),
    "fruto-gravidade": dict(perfil="achatada", seg=16, corpo=(44, 24, 82), brilho=(176, 124, 255), detalhe=(214, 204, 255),
                            emis=0.1, rough=0.35, mats_extra=[dict(cor=(8, 4, 16), rough=0.2), dict(cor=(255, 240, 255), emis=4.5)],
                            decor=["gravidade_v4"], caule=False),
    "fruto-trovao": dict(perfil="redonda", seg=12, corpo=(36, 44, 78), brilho=(255, 232, 80), detalhe=(255, 240, 120),
                         emis=0.0, rough=0.4, mats_extra=[dict(cor=(215, 235, 255), emis=6.0)], decor=["tempestade"], caule=False),
    "fruto-gelo": dict(perfil="cristal", seg=6, jit=0.03, corpo=(150, 215, 240), brilho=(210, 250, 255), detalhe=(196, 238, 255),
                       alfa=0.72, rough=0.05, alfa_detalhe=0.85, mats_extra=[dict(cor=(80, 170, 240), emis=1.6)],
                       decor=["geada"], caule=False),
    "fruto-luz": dict(perfil="redonda", seg=12, corpo=(255, 246, 214), brilho=(255, 214, 110), detalhe=(255, 232, 160), emis=1.6,
                      rough=0.3, mats_extra=[dict(cor=(255, 255, 245), emis=8.0)], espiral=(2.0, 3, 0.018),
                      decor=["luz_v4"], caule=False),
    "fruto-sombra": dict(perfil="gota", seg=12, corpo=(18, 14, 28), brilho=(140, 84, 230), detalhe=(60, 40, 92), rough=0.45,
                         mats_extra=[dict(cor=(28, 20, 48), rough=0.12, metal=0.7), dict(cor=(150, 92, 240), emis=3.4),
                                     dict(cor=(255, 100, 190), emis=6.0)],
                         decor=["sombra_v4"], caule=False),
    "fruto-fenix": dict(perfil="pera", seg=12, corpo=(236, 124, 40), brilho=(255, 208, 100), detalhe=(220, 62, 32), emis=0.3,
                        rough=0.5, mats_extra=[dict(cor=(255, 210, 100), emis=1.8), dict(cor=(255, 98, 40), emis=2.8),
                                               dict(cor=(200, 40, 30), emis=0.6)],
                        decor=["fenix_v4"], caule=False),
    "fruto-colosso": dict(perfil="gorda", seg=8, jit=0.03, corpo=(96, 104, 118), brilho=(255, 190, 90), detalhe=(72, 78, 90),
                          rough=0.95, mats_extra=[dict(cor=(255, 190, 90), emis=3.2)], decor=["colosso_v4"]),
    "fruto-quimera": dict(perfil="redonda", seg=12, jit=0.04, corpo=(150, 62, 72), brilho=(255, 226, 90), detalhe=(230, 212, 172),
                          mats_extra=[dict(cor=(72, 136, 86), rough=0.45), dict(cor=(58, 152, 192), rough=0.4)],
                          decor=["quimera_v4"], caule=False),
    "fruto-portais": dict(perfil="redonda", seg=14, corpo=(18, 30, 70), brilho=(96, 168, 255), detalhe=(176, 134, 255), emis=0.1,
                          espiral=(2.4, 2, 0.016), mats_extra=[dict(cor=(6, 8, 22)), dict(cor=(196, 244, 255), emis=5.0)],
                          decor=["portais_v4"]),
    "fruto-fios": dict(perfil="cabaca", seg=16, corpo=(236, 226, 206), brilho=(255, 250, 240), detalhe=(198, 150, 96), rough=0.9,
                       espiral=(5.0, 3, 0.012), mats_extra=[dict(cor=(120, 84, 52), rough=0.8), dict(cor=(216, 222, 232), metal=1.0, rough=0.2)],
                       decor=["fios_v4"], caule=False),
    "fruto-instante": dict(perfil="redonda", seg=16, corpo=(32, 112, 124), brilho=(140, 244, 238), detalhe=(230, 200, 120), emis=0.1,
                           rough=0.3, mats_extra=[dict(cor=(226, 186, 94), metal=0.9, rough=0.25), dict(cor=(238, 232, 216)),
                                                  dict(cor=(190, 236, 236), alfa=0.4, rough=0.02)],
                           decor=["instante_v4"], caule=False),
    "fruto-espelho": dict(perfil="cristal", seg=8, corpo=(205, 210, 222), brilho=(255, 255, 255), detalhe=(226, 234, 248),
                          metal=1.0, rough=0.04, mats_extra=[dict(cor=(214, 176, 84), metal=0.9, rough=0.3), dict(cor=(204, 232, 255), emis=4.5)],
                          decor=["espelho_v4"], caule=False),
    # Frutos dos Fluxos
    "fruto-origem": dict(perfil="redonda", seg=14, corpo=(214, 120, 156), brilho=(255, 200, 220), detalhe=(244, 176, 204), emis=0.12,
                         rough=0.5, espiral=(1.6, 2, 0.016),
                         mats_extra=[dict(cor=(255, 232, 150), emis=3.4), dict(cor=(124, 198, 116)),
                                     dict(cor=(220, 242, 255), alfa=0.6, rough=0.05, emis=0.3)],
                         decor=["origem_v4"], caule=False),
    "fruto-essencia": dict(perfil="cristal", seg=6, jit=0.03, corpo=(222, 190, 70), brilho=(255, 235, 130), detalhe=(248, 218, 104),
                           alfa=0.7, rough=0.1, alfa_detalhe=0.85, mats_extra=[dict(cor=(14, 10, 4), rough=0.2)],
                           decor=["essencia_v4"], caule=False),
    "fruto-comunicacao": dict(perfil="gorda", seg=16, corpo=(192, 198, 208), brilho=(235, 242, 255), detalhe=(214, 220, 232), metal=0.85,
                              rough=0.22, mats_extra=[dict(cor=(246, 247, 252), rough=0.6)], decor=["comunicacao_v4"], caule=False),
    "fruto-vitalidade": dict(perfil="gorda", seg=14, corpo=(80, 165, 85), brilho=(170, 244, 156), detalhe=(126, 200, 100), emis=0.06,
                             rough=0.55, mats_extra=[dict(cor=(50, 120, 58)), dict(cor=(242, 150, 190)), dict(cor=(98, 66, 44), rough=0.9),
                                                     dict(cor=(250, 222, 110))],
                             decor=["vitalidade_v4"], caule=False),
    "fruto-inconstancia": dict(perfil="redonda", seg=11, jit=0.07, corpo=(222, 114, 42), brilho=(255, 200, 90), detalhe=(190, 74, 30),
                               emis=0.15, mats_extra=[dict(cor=(242, 234, 216)), dict(cor=(150, 30, 24)),
                                                      dict(cor=(232, 190, 84), metal=0.9, rough=0.25), dict(cor=(255, 176, 84))],
                               decor=["inconstancia_v4"]),
    "fruto-fisico": dict(perfil="gorda", seg=12, corpo=(116, 82, 52), brilho=(240, 190, 110), detalhe=(178, 150, 112), rough=0.85,
                         mats_extra=[dict(cor=(92, 64, 42), rough=0.9)], decor=["fisico_v4"], caule=False),
    "fruto-espaco": dict(perfil="redonda", seg=14, corpo=(132, 84, 188), brilho=(200, 150, 255), detalhe=(90, 60, 150), emis=0.15,
                         espiral=(2.0, 2, 0.016), mats_extra=[dict(cor=(240, 226, 255), emis=4.5)], decor=["espaco_v4"], caule=False),
    "fruto-tempo": dict(perfil="ampulheta", corpo=(240, 214, 150), brilho=(255, 205, 90), detalhe=(214, 168, 70), alfa=0.45,
                        rough=0.05, alfa_detalhe=1.0, detalhe_metal=0.9, detalhe_rough=0.3, decor=["relojoaria"], caule=False),
    "fruto-vazio": dict(perfil="redonda", seg=14, corpo=(12, 10, 18), brilho=(236, 236, 255), detalhe=(80, 70, 110), rough=0.35,
                        mats_extra=[dict(cor=(120, 108, 156), metal=0.6, rough=0.3)], decor=["vazio_v4"], caule=False),
    "fruto-fim": dict(perfil="gota", seg=12, corpo=(134, 28, 48), brilho=(255, 70, 100), detalhe=(58, 12, 24), emis=0.2,
                      mats_extra=[dict(cor=(18, 10, 14), rough=0.2), dict(cor=(238, 226, 198))], decor=["fim_v4"], caule=False),
    "fruto-tecnologia": dict(perfil="cristal", seg=6, corpo=(30, 40, 60), brilho=(53, 216, 236), detalhe=(96, 116, 146),
                             metal=0.9, rough=0.3, mats_extra=[dict(cor=(26, 30, 42), metal=0.8, rough=0.35)],
                             decor=["tecnologia_v4"], caule=False),
}


def construir(fid, seed):
    spec = FRUTOS[fid]
    F = Fruta(spec, seed)
    F.lathe()
    if spec.get("duotom"):
        F.duotom()
    if spec.get("espiral"):
        v, n, e = spec["espiral"]
        F.espiral(v, n, e, mat=1)
    for nome in spec.get("decor", []):
        DECOR[nome](F)
    if spec.get("caule", True):
        F.caule()

    malha = bpy.data.meshes.new("Fruit_Body")
    F.bm.to_mesh(malha)
    F.bm.free()
    obj = bpy.data.objects.new("Fruit_Body", malha)
    bpy.context.collection.objects.link(obj)

    alfa = spec.get("alfa", 1.0)
    corpo = rgb(*spec["corpo"])
    brilho = rgb(*spec["brilho"])
    det = rgb(*spec["detalhe"])
    obj.data.materials.append(gt.make_material(
        f"{fid}_corpo", corpo, alpha=alfa, roughness=spec.get("rough", 0.55), metallic=spec.get("metal", 0.0),
        bump={"seed": seed, "escala": 24.0, "forca": 0.35},
        emissao={"cor01": brilho, "forca": spec["emis"]} if spec.get("emis") else None,
    ))
    obj.data.materials.append(gt.make_material(f"{fid}_brilho", brilho, roughness=0.3, emissao={"forca": 3.0}))
    obj.data.materials.append(gt.make_material(
        f"{fid}_detalhe", det, alpha=spec.get("alfa_detalhe", 0.9 if alfa < 1 else 1.0), roughness=spec.get("detalhe_rough", spec.get("rough", 0.55)),
        metallic=spec.get("detalhe_metal", spec.get("metal", 0.0) * 0.7),
    ))
    for i, extra in enumerate(spec.get("mats_extra", [])):
        obj.data.materials.append(gt.make_material(
            f"{fid}_extra{i}", rgb(*extra["cor"]), alpha=extra.get("alfa", 1.0), roughness=extra.get("rough", 0.35),
            metallic=extra.get("metal", 0.0),
            emissao={"forca": extra["emis"]} if extra.get("emis") else None,
        ))
    return obj


def exportar(fid, seed, saida):
    gt.clear_scene()
    obj = construir(fid, seed)
    root = bpy.data.objects.new(fid, None)
    bpy.context.collection.objects.link(root)
    obj.parent = root
    bpy.ops.object.select_all(action="DESELECT")
    for o in (root, obj):
        o.select_set(True)
    bpy.context.view_layer.objects.active = root
    caminho = os.path.join(saida, f"{fid}.glb")
    bpy.ops.export_scene.gltf(filepath=caminho, export_format="GLB", use_selection=True, export_apply=True)
    print(f"OK: {caminho}")


def main():
    argv = sys.argv[sys.argv.index("--") + 1:] if "--" in sys.argv else []
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    ap.add_argument("--only", default="")
    ap.add_argument("--seed", type=int, default=3)
    a = ap.parse_args(argv)
    os.makedirs(a.out, exist_ok=True)
    ids = [a.only] if a.only else list(FRUTOS)
    for i, fid in enumerate(ids):
        exportar(fid, a.seed + i, a.out)


if __name__ == "__main__":
    main()
