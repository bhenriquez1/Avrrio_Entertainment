import json
import math
import sys

import bpy


def material(name, rgba):
    item = bpy.data.materials.new(name=name)
    item.diffuse_color = rgba
    return item


def add_object(spec):
    kind = spec.get("kind", "cube")
    location = spec.get("location", [0, 0, 0])
    if kind == "sphere":
        bpy.ops.mesh.primitive_uv_sphere_add(location=location)
    elif kind == "cylinder":
        bpy.ops.mesh.primitive_cylinder_add(location=location)
    elif kind == "cone":
        bpy.ops.mesh.primitive_cone_add(location=location)
    elif kind == "text":
        bpy.ops.object.text_add(location=location, rotation=(math.radians(75), 0, 0))
        bpy.context.object.data.body = spec.get("text") or spec.get("name", "Avrrio")
        bpy.context.object.data.align_x = "CENTER"
    else:
        bpy.ops.mesh.primitive_cube_add(location=location)
    obj = bpy.context.object
    obj.name = spec.get("name", "Object")
    obj.scale = spec.get("scale", [1, 1, 1])
    obj.data.materials.append(material(f"{obj.name}-material", spec.get("color", [0.2, 0.4, 0.8, 1])))


args = sys.argv[sys.argv.index("--") + 1:]
spec_path, output_path = args
with open(spec_path, "r", encoding="utf-8") as file:
    scene_spec = json.load(file)

bpy.ops.object.select_all(action="SELECT")
bpy.ops.object.delete(use_global=False)

objects = scene_spec.get("objects") or [
    {"kind": "cube", "name": scene_spec.get("title", "Avrrio Scene"), "location": [0, 0, 0]},
]
for item in objects:
    add_object(item)

bpy.ops.mesh.primitive_plane_add(size=30, location=(0, 0, -1.05))
floor = bpy.context.object
floor.data.materials.append(material("Floor", (0.035, 0.04, 0.055, 1)))

bpy.ops.object.light_add(type="AREA", location=(4, -4, 7))
bpy.context.object.data.energy = 1100
bpy.context.object.data.size = 5
bpy.ops.object.light_add(type="AREA", location=(-4, 1, 4))
bpy.context.object.data.energy = 650
bpy.context.object.data.color = (0.28, 0.46, 1.0)

bpy.ops.object.camera_add(location=(8, -10, 7), rotation=(math.radians(67), 0, math.radians(38)))
camera = bpy.context.object
bpy.context.scene.camera = camera

scene = bpy.context.scene
scene.render.engine = "BLENDER_EEVEE"
scene.render.resolution_x = scene_spec.get("width", 1280)
scene.render.resolution_y = scene_spec.get("height", 720)
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = "PNG"
scene.render.filepath = output_path
scene.world.color = (0.008, 0.01, 0.018)
bpy.ops.render.render(write_still=True)

