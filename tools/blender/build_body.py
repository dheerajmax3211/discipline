import bpy, math
from bl_ext.blender_org.mpfb.services.humanservice import HumanService
from bl_ext.blender_org.mpfb.services.targetservice import TargetService
from bl_ext.blender_org.mpfb.entities.objectproperties import HumanObjectProperties
bpy.ops.wm.read_factory_settings(use_empty=True)
h = HumanService.create_human(mask_helpers=True, detailed_helpers=True, extra_vertex_groups=True, feet_on_ground=True, scale=0.1)
for k,v in {"gender":1.0,"age":0.5,"muscle":1.0,"weight":0.5,"proportions":0.6,"height":0.6,"asian":0.15,"caucasian":0.7,"african":0.15}.items():
    HumanObjectProperties.set_value(k, v, entity_reference=h)
TargetService.reapply_macro_details(h)
bpy.context.view_layer.objects.active=h; h.select_set(True); bpy.context.view_layer.update()
HumanService.add_builtin_rig(h, "default_no_toes", import_weights=True)
rig = h.parent
bpy.ops.wm.save_as_mainfile(filepath=__import__("os").path.join(__import__("os").path.dirname(__file__),"body.blend"))
