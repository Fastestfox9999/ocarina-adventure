from pathlib import Path
from io import BytesIO
from hashlib import sha256
def u(f):
    n=s=0
    while True:
        b=f.read(1)[0]; n|=(b&127)<<s
        if b<128:return n
        s+=7
def leb(n):
    return bytes([n]) if n<128 else bytes([(n&127)|128])+leb(n>>7)
def block(f):return f.read(u(f))
import sys
if len(sys.argv) != 3:
    sys.exit("Usage: python3 patch_engine.py upstream-soh.wasm modified-soh.wasm")
raw=Path(sys.argv[1]).read_bytes()
if sha256(raw).hexdigest() != "123f32ff7a81d9fc81bcb85b258d9b0cf0516dd0ca661373c9be2b9a03875a14":
    sys.exit("Expected the upstream gh-pages binary at commit 4c2bf5c2ce7d7f95a2a41b17da96c51dc5e09cf5.")
header=raw[:8]; f=BytesIO(raw[8:]); sections=[]; names={}
while b:=f.read(1):
    data=block(f); sections.append((b[0],data))
    if b==b'\0':
        g=BytesIO(data)
        if block(g)==b'name':
            while k:=g.read(1):
                h=BytesIO(block(g))
                if k==b'\1':
                    for _ in range(u(h)):
                        i=u(h);names[block(h).decode()]=i
sec=dict(sections)
im=BytesIO(sec[2]); num_imp=0
for _ in range(u(im)):
    module,field=block(im),block(im);kind=im.read(1); assert kind==b'\0'; u(im);num_imp+=1
code=BytesIO(sec[10]); bodies=[block(code) for _ in range(u(code))]
def vector(data, extra, n):
    f=BytesIO(data);return leb(u(f)+n)+f.read()+extra
gcount=u(BytesIO(sec[6]))
exports=[]
for n,label in [('RegisterAutosave()','registerAutosave'),('GameInteractor::IsSaveLoaded(bool)','gameLoaded'),('Autosave_PerformSave()','saveProgress'),('CVarSetInteger','setInt'),('CVarSetFloat','setFloat'),('CVarGetInteger','getInt'),('CVarGetFloat','getFloat')]:
    exports.append((label,0,names[n]))
for symbol, label in [('Item_Give', 'giveInventoryItem'),
                      ('ResourceMgr_GetResourceDataByNameHandlingMQ', 'promptTexture'),
                      ('Gfx_TextureCacheDelete', 'invalidatePromptTexture')]:
    exports.append((label, 0, names[symbol]))
# Run the same per-setting refresh hooks as the native settings menu.
string_type = 'std::__2::basic_string<char, std::__2::char_traits<char>, std::__2::allocator<char>>'
for symbol, label in [(string_type + '::basic_string[abi:nqe220108]<0>(char const*)', 'makeSettingName'),
                      ('ShipInit::Init(' + string_type + ' const&)', 'refreshSetting'),
                      (string_type + '::~basic_string()', 'destroySettingName')]:
    exports.append((label, 0, names[symbol]))
for k in range(2):
    exports.append((['dragX','dragY'][k],3,gcount+k))
# Locate the NTSC title's ordered-font indices from EnMag_DrawInner.
title_indices = bytes.fromhex('191b0e1c1c1c1d0a1b1d babcafbdbdbdbeabbcbe')
segments = BytesIO(sec[11])
addresses = []
for _ in range(u(segments)):
    assert u(segments) == 0 and segments.read(1) == b'\x41'
    base = u(segments)
    assert segments.read(1) == b'\x0b'
    payload = block(segments)
    index = payload.find(title_indices)
    if index >= 0:
        addresses.append(base + index + 15)
assert len(addresses) == 1
exports.append(('titleStartLetters', 3, gcount + 2))
# web_scene loads the live PlayState pointer before reading its scene number.
scene = BytesIO(bodies[names['web_scene']-num_imp])
assert scene.read(9) == bytes.fromhex('01 01 7f 02 40 41 00 28 02')
play_address = u(scene)
exports.append(('playStateAddress', 3, gcount + 3))
# ShowEscMenu loads the singleton from this static address.
menu=BytesIO(bodies[names['SohGui::ShowEscMenu()']-num_imp])
assert menu.read(5)==bytes.fromhex('00 41 00 28 02')
menu_address=u(menu)
exports.extend([('menuAddress',3,gcount+4),('menuVisible',0,names['Ship::GuiElement::IsVisible()']),('toggleMenu',0,names['Ship::GuiElement::ToggleVisibility()'])])
# Report eligible destination commands and accept a one-shot skip through their native branch.
exports.extend([('skipAvailable',3,gcount+5),('skipRequested',3,gcount+6)])
idx=names['Cutscene_Command_Terminator']-num_imp
branch=bytes.fromhex('20 06 20 07 72 41 01 71 45 0d 01')
assert bodies[idx].count(branch)==1
# This branch is reached only after the first 20 cutscene frames.
bodies[idx]=bodies[idx].replace(branch,b'\x41\x01\x24'+leb(gcount+5)+branch[:5]+b'\x23'+leb(gcount+6)+b'\x72\x41\x00\x24'+leb(gcount+6)+branch[5:])
sec[7]=vector(sec[7],b''.join(leb(len(n))+n.encode()+bytes([kind])+leb(idx) for n,kind,idx in exports),len(exports))
sec[6]=vector(sec[6],b'\x7d\x01\x43\0\0\0\0\x0b'*2 + b'\x7f\x00\x41' + leb(addresses[0]) + b'\x0b' + b'\x7f\x00\x41' + leb(play_address) + b'\x0b' + b'\x7f\x00\x41' + leb(menu_address) + b'\x0b'+b'\x7f\x01\x41\x00\x0b'*2,7)
# Add drag deltas to the native camera inputs. Camera_Free consumes them once per update.
idx=names['Mouse_HandleThirdPerson']-num_imp
body=bodies[idx]
assert body[:3]==bytes.fromhex('01047f')
def instruction_delta(param,global_id):
    return bytes([0x20,param,0x20,param,0x2a,2,0,0x23])+leb(global_id)+bytes([0x92,0x38,2,0])
bodies[idx]=body[:3]+instruction_delta(0,gcount)+instruction_delta(1,gcount+1)+body[3:]
idx=names['Camera_Free']-num_imp
assert bodies[idx][-1]==11
bodies[idx]=bodies[idx][:-1]+b''.join(bytes([0x43,0,0,0,0,0x24])+leb(gcount+k) for k in range(2))+b'\x0b'
sec[10]=leb(len(bodies))+b''.join(leb(len(b))+b for b in bodies)
out=Path(sys.argv[2])
out.write_bytes(header+b''.join(bytes([k])+leb(len(data))+data for k,orig in sections for data in [sec[k] if k else orig]))
