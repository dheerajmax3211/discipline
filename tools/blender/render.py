"""Render exercise loops from tools/frames.json onto the MPFB body.
usage: blender -b --python tools/blender/render.py -- <outdir> key1,key2,...   (keys omitted = all)
Needs tools/blender/body.blend (run build_body.py first)."""
import bpy, math, json, os, sys
from mathutils import Vector, Matrix
import numpy as np
HERE = os.path.dirname(os.path.abspath(__file__))
args = sys.argv[sys.argv.index('--') + 1:]
OUT = args[0]; DATA = json.load(open(os.path.join(HERE, '..', 'frames.json')))
KEYS = args[1].split(',') if len(args) > 1 and args[1] else list(DATA)
S = 0.0078; RES = 480

bpy.ops.wm.open_mainfile(filepath=os.path.join(HERE, 'body.blend'))
rig = bpy.data.objects['Human.rig']
mesh = [o for o in bpy.data.objects if o.type == 'MESH' and 'body' in [g.name for g in o.vertex_groups]][0]
sc = bpy.context.scene
bpy.context.view_layer.update()

def M(p): return Vector((0, -(p[0] - 160) * S, (236 - p[1]) * S))
def head(n): return rig.matrix_world @ rig.pose.bones[n].head
def tail(n): return rig.matrix_world @ rig.pose.bones[n].tail
def rot(n, axis, deg):
    pb = rig.pose.bones[n]; h = head(n)
    T = Matrix.Translation(h); R = Matrix.Rotation(math.radians(deg), 4, Vector(axis))
    pb.matrix = rig.matrix_world.inverted() @ (T @ R @ T.inverted()) @ rig.matrix_world @ pb.matrix
    bpy.context.view_layer.update()
def aim(n, target):
    v = (tail(n) - head(n)).normalized(); t = Vector(target).normalized()
    ax, ang = v.rotation_difference(t).to_axis_angle()
    if ang > 1e-4: rot(n, ax, math.degrees(ang))
def aim_to(n, end, target):
    # rotate bone n about its head so the vector n.head -> `end` joint head points along target (compensates split/twist bones)
    v = (head(end) - head(n)).normalized(); t = Vector(target).normalized()
    ax, ang = v.rotation_difference(t).to_axis_angle()
    if ang > 1e-4: rot(n, ax, math.degrees(ang))
def reset():
    rig.location = (0, 0, 0)
    for pb in rig.pose.bones:
        pb.rotation_mode = 'QUATERNION'; pb.rotation_quaternion = (1, 0, 0, 0); pb.location = (0, 0, 0)
    bpy.context.view_layer.update()

# ---------- rest-pose anatomy -> per-muscle vertex weights ----------
reset()
me = mesh.data; n = len(me.vertices)
co = np.empty(n * 3); me.shape_keys.reference_key.data.foreach_get('co', co); co = co.reshape(-1, 3).copy(); base = co.copy()
for k in me.shape_keys.key_blocks:
    if k.value and k is not me.shape_keys.reference_key:
        kc = np.empty(n * 3); k.data.foreach_get('co', kc); co += k.value * (kc.reshape(-1, 3) - base)
PEL = (head('upperleg01.L') + head('upperleg01.R')) / 2
NECK = head('neck01'); FRONT = Vector((0, -1, 0))
def blob(name, a, b, t0, t1, side, off, rl, rd, rz=None):
    """ellipsoid on segment a->b between t0..t1; side f/b/c offset by `off` metres; radii lateral/depth (axis radius from length)."""
    rl *= 1.35; rd *= 1.35
    ax = (b - a); L = ax.length; ax = ax / L
    c = a + (b - a) * ((t0 + t1) / 2) + (FRONT * off if side == 'f' else -FRONT * off if side == 'b' else Vector())
    lat = Vector((1, 0, 0)); lat = (lat - ax * lat.dot(ax)).normalized(); dep = ax.cross(lat)
    rz = rz or (t1 - t0) * L / 2 * 1.15
    d = co - np.array(c[:]); x = d @ np.array(lat[:]) / rl; y = d @ np.array(dep[:]) / rd; z = d @ np.array(ax[:]) / rz
    w = np.clip(1 - (x * x + y * y + z * z), 0, 1) ** 0.4
    old = np.array(me.attributes[name].data.foreach_get('value', np.empty(0))) if False else None
    a_ = me.attributes.get(name) or me.attributes.new(name, 'FLOAT', 'POINT')
    cur = np.empty(n); a_.data.foreach_get('value', cur); a_.data.foreach_set('value', np.maximum(cur, w))
sides = {'L': 'L', 'R': 'R'}
def muscle(mid):
    nm = 'm_' + mid
    if nm in me.attributes: return nm
    me.attributes.new(nm, 'FLOAT', 'POINT')
    if mid == 'chest': blob(nm, PEL, NECK, .58, .95, 'f', .09, .2, .07)
    elif mid == 'abs': blob(nm, PEL, NECK, .08, .55, 'f', .09, .1, .06)
    elif mid == 'lower_back': blob(nm, PEL, NECK, .02, .4, 'b', .08, .12, .06)
    elif mid == 'lats': blob(nm, PEL, NECK, .35, .85, 'b', .07, .2, .07)
    elif mid == 'traps': blob(nm, PEL, NECK, .85, 1.05, 'b', .06, .16, .07)
    elif mid == 'neck': blob(nm, PEL, NECK + (NECK - PEL) * .25, .9, 1.1, 'c', 0, .07, .07)
    elif mid == 'glutes': blob(nm, PEL, PEL + Vector((0, 0, -.1)), 0, 1, 'b', .08, .2, .09, .1)
    for s in 'LR':
        sh, el, wr = head(f'upperarm01.{s}'), head(f'lowerarm01.{s}'), head(f'wrist.{s}')
        hp, kn, an = head(f'upperleg01.{s}'), head(f'lowerleg01.{s}'), head(f'foot.{s}')
        if mid == 'delts': blob(nm, sh + Vector((0, 0, .03)), el, -.12, .4, 'c', 0, .075, .075)
        elif mid == 'rear_delts': blob(nm, sh + Vector((0, 0, .03)), el, -.12, .4, 'b', .03, .06, .045)
        elif mid == 'biceps': blob(nm, sh, el, .18, .78, 'f', .035, .045, .035)
        elif mid == 'triceps': blob(nm, sh, el, .15, .82, 'b', .035, .045, .035)
        elif mid == 'forearms': blob(nm, el, wr, .08, .72, 'c', 0, .05, .05)
        elif mid == 'quads': blob(nm, hp, kn, .1, .88, 'f', .05, .075, .05)
        elif mid == 'hamstrings': blob(nm, hp, kn, .1, .88, 'b', .05, .075, .05)
        elif mid == 'hip_flexors': blob(nm, hp, kn, 0, .38, 'f', .05, .07, .045)
        elif mid == 'calves': blob(nm, kn, an, .08, .62, 'b', .04, .06, .045)
    return nm
shorts = me.attributes.new('shorts', 'FLOAT', 'POINT')
blob('shorts', PEL + Vector((0, 0, .1)), PEL + Vector((0, 0, -.05)), 0, 1, 'c', 0, .21, .15, .16)
for s in 'LR': blob('shorts', head(f'upperleg01.{s}'), head(f'lowerleg01.{s}'), -.05, .42, 'c', 0, .11, .11)

def material(prim, sec):
    m = bpy.data.materials.new('skin'); m.use_nodes = True; nt = m.node_tree; nt.nodes.clear()
    out = nt.nodes.new('ShaderNodeOutputMaterial'); bs = nt.nodes.new('ShaderNodeBsdfPrincipled')
    bs.inputs['Roughness'].default_value = .5; nt.links.new(bs.outputs[0], out.inputs[0])
    prev = None
    def mix(col, attr, a_default=None, step=False):
        nonlocal prev
        at = nt.nodes.new('ShaderNodeAttribute'); at.attribute_name = attr
        mx = nt.nodes.new('ShaderNodeMix'); mx.data_type = 'RGBA'; mx.inputs[7].default_value = col
        src = at.outputs['Fac']
        if step:
            g = nt.nodes.new('ShaderNodeMath'); g.operation = 'GREATER_THAN'; g.inputs[1].default_value = .3
            nt.links.new(src, g.inputs[0]); src = g.outputs[0]
        bo = nt.nodes.new('ShaderNodeMath'); bo.operation = 'MULTIPLY'; bo.use_clamp = True; bo.inputs[1].default_value = 1.0 if step else 2.5
        nt.links.new(src, bo.inputs[0]); nt.links.new(bo.outputs[0], mx.inputs[0])
        if prev: nt.links.new(prev.outputs[2], mx.inputs[6])
        else: mx.inputs[6].default_value = (.62, .42, .33, 1)
        prev = mx
    mix((.05, .08, .16, 1), 'shorts', step=True)
    for mid in sec: mix((.95, .6, .08, 1), muscle(mid))
    for mid in prim: mix((.92, .04, .04, 1), muscle(mid))
    nt.links.new(prev.outputs[2], bs.inputs['Base Color'])
    me.materials.clear(); me.materials.append(m)
    return m

# ---------- stage ----------
try: sc.render.engine = 'BLENDER_EEVEE'
except TypeError: sc.render.engine = 'BLENDER_EEVEE_NEXT'
try: sc.eevee.taa_render_samples = 24
except Exception: pass
w = bpy.data.worlds.new('w'); w.use_nodes = True; w.node_tree.nodes['Background'].inputs[0].default_value = (.012, .017, .025, 1); sc.world = w
sc.view_settings.view_transform = 'Standard'; sc.render.resolution_x = sc.render.resolution_y = RES
cam = bpy.data.objects.new('cam', bpy.data.cameras.new('cam')); sc.collection.objects.link(cam); sc.camera = cam
cam.data.type = 'ORTHO'
AZ, EL = math.radians(32), math.radians(12)
for loc, e in (((-3, -3, 3), 260), ((-3, 3, 2), 120), ((3, -1, 2.5), 160)):
    l = bpy.data.objects.new('l', bpy.data.lights.new('l', 'AREA')); l.data.energy = e; l.data.size = 3; l.location = loc; l.data.use_shadow = (e == 260)
    l.rotation_euler = (Vector((0, 0, .9)) - Vector(loc)).to_track_quat('-Z', 'Y').to_euler(); sc.collection.objects.link(l)
def solid(col, rough=.6):
    m = bpy.data.materials.new('p'); m.use_nodes = True; b = m.node_tree.nodes['Principled BSDF']
    b.inputs['Base Color'].default_value = col; b.inputs['Roughness'].default_value = rough; return m
FLOOR = solid((.2, .25, .32, 1), .9); PROP = solid((.17, .2, .25, 1), .7); METAL = solid((.45, .48, .52, 1), .35); BAND = solid((1, .8, .05, 1))
bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -0.0)); fl = bpy.context.object; fl.data.materials.append(FLOOR)
made = []
def box(c, size, mat):
    bpy.ops.mesh.primitive_cube_add(location=c); o = bpy.context.object; o.scale = (size[0] / 2, size[1] / 2, size[2] / 2); o.data.materials.append(mat); made.append(o); return o
def cyl(a, b, r, mat, x=0):
    a = Vector(a); b = Vector(b); d = b - a
    if d.length < 1e-4: return
    bpy.ops.mesh.primitive_cylinder_add(radius=r, depth=d.length, location=(a + b) / 2)
    o = bpy.context.object; o.rotation_euler = Vector((0, 0, 1)).rotation_difference(d.normalized()).to_euler()
    o.data.materials.append(mat); made.append(o); return o
def ball(c, r, mat):
    bpy.ops.mesh.primitive_uv_sphere_add(radius=r, location=c); o = bpy.context.object; o.data.materials.append(mat); made.append(o)
def prune():
    for o in made: bpy.data.objects.remove(o)
    made.clear()
def props(d, fr):
    for p in d['props']:
        if 'r' in p:
            x, y, ww, hh = p['r']; c = M((x + ww / 2, y + hh / 2)); box(c, (.5, ww * S, hh * S), PROP)
        else:
            x1, y1, x2, y2 = p['l'][:4]; th = (p['l'][4] if len(p['l']) > 4 else 3) * S / 2
            cyl(M((x1, y1)), M((x2, y2)), max(th, .012), PROP)
    wr, wl = head('wrist.R'), head('wrist.L'); h = d['held']
    if h == 'db2':
        for w_ in (wr, wl): cyl(w_ + Vector((-.07, 0, 0)), w_ + Vector((.07, 0, 0)), .012, METAL); ball(w_ + Vector((-.08, 0, 0)), .045, METAL); ball(w_ + Vector((.08, 0, 0)), .045, METAL)
    elif h == 'db1':
        cyl(wr + Vector((-.07, 0, 0)), wr + Vector((.07, 0, 0)), .012, METAL); ball(wr + Vector((-.08, 0, 0)), .05, METAL); ball(wr + Vector((.08, 0, 0)), .05, METAL)
    elif h == 'bar': cyl(wr + Vector((-.5, 0, 0)), wr + Vector((.5, 0, 0)), .014, METAL)
    elif h == 'wheel': ball(Vector((wr.x, wr.y, .085)), .085, PROP)
    if d['band']:
        a = d['band']; a = M(fr['far']['hand']) if a == 'hands' else M([160, 235]) if a == 'foot' else M(a)
        cyl(a, wr, .008, BAND)

def pose(fr):
    reset()
    pel = M(fr['pel']); rig.location = pel - PEL
    bpy.context.view_layer.update()
    aim_to('spine05', 'neck01', M(fr['sh']) - M(fr['pel']))
    aim('head', M(fr['head']) - M(fr['sh']))
    for lim, s in (('near', 'R'), ('far', 'L')):
        j = fr[lim]
        aim_to(f'upperarm01.{s}', f'lowerarm01.{s}', M(j['elbow']) - M(fr['sh'])); aim_to(f'lowerarm01.{s}', f'wrist.{s}', M(j['hand']) - M(j['elbow']))
        aim_to(f'upperleg01.{s}', f'lowerleg01.{s}', M(j['knee']) - M(fr['pel'])); aim_to(f'lowerleg01.{s}', f'foot.{s}', M(j['ankle']) - M(j['knee']))
        a = math.radians(fr['ft']); aim(f'foot.{s}', Vector((0, -math.cos(a), -math.sin(a))))

for key in KEYS:
    d = DATA[key]; od = os.path.join(OUT, key); os.makedirs(od, exist_ok=True)
    material(d['p'] or [], d['s'] or [])
    x0, y0, side = d['vb'][0], d['vb'][1], d['vb'][2]
    c = M((x0 + side / 2, y0 + side / 2)); dv = Vector((-math.cos(AZ) * math.cos(EL), -math.sin(AZ) * math.cos(EL), math.sin(EL)))
    cam.location = c + dv * 8; cam.rotation_euler = (-dv).to_track_quat('-Z', 'Y').to_euler(); cam.data.ortho_scale = side * S * 1.08
    for i, fr in enumerate(d["frames"]):
        if os.environ.get("ONLY") and str(i) not in os.environ["ONLY"].split(","): continue
        pose(fr); props(d, fr)
        sc.render.filepath = os.path.join(od, f'{i:02d}.png'); bpy.ops.render.render(write_still=True); prune()
    print('DONE', key, flush=True)
