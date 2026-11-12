// Redraw prompt textures in the engine's resource cache, including text already on screen.
function updateKeyPrompts(engine, bindings) {
  const arrows = {ArrowUp:'↑', ArrowDown:'↓', ArrowLeft:'←', ArrowRight:'→'};
  const symbols = {BracketLeft:'[', BracketRight:']', Comma:',', Period:'.', Slash:'/', Semicolon:';', Quote:"'", Minus:'-', Equal:'='};
  function key(action) {
    const code = bindings[action];
    return arrows[code] || symbols[code] || ({ShiftLeft:'L⇧',ShiftRight:'R⇧'})[code] || code.replace(/^Key|^Digit/, '');
  }
  function texture(path, width, height, format, draw) {
    const pathPtr = Module.allocateUTF8(path);
    let target;
    try { target = engine.promptTexture(pathPtr); } finally { Module._free(pathPtr); }
    if (!target) return;
    const surface = document.createElement('canvas');
    surface.width = width; surface.height = height;
    const ctx = surface.getContext('2d');
    ctx.fillStyle = 'white'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    function label(text, x=width/2, y=height/2, w=width, h=height) {
      ctx.font = 'bold '+Math.min(15,h)+'px Arial, sans-serif';
      ctx.fillText(text, x, y+0.5, w);
    }
    draw(label);
    const rgba = ctx.getImageData(0,0,width,height).data;
    const bytes = new Uint8Array(format==='I4' ? width*height/2 : width*height);
    for (let i=0; i<width*height; i++) {
      const alpha = Math.round(rgba[4*i+3]/17);
      if (format==='I4') bytes[i>>1] |= alpha << (i%2===0 ? 4 : 0);
      else bytes[i] = 0xf0 | alpha;
    }
    HEAPU8.set(bytes,target);
    engine.invalidatePromptTexture(target);
  }
  const group = (up,left,down,right) => label => {
    if(up) label(key(up),8,4,8,9);
    label(key(left),3,11,6,9); label(key(down),8,11,6,9); label(key(right),13,11,6,9);
  };
  const itemKeys = group(null,'ArrowLeft','ArrowDown','ArrowRight');
  const movement = group('KeyW','KeyA','KeyS','KeyD');
  const glyphs = [
    ['9FButtonA','KeyX'],['A0ButtonB','KeyC'],['A1ButtonC',itemKeys],
    ['A2ButtonL','KeyE'],['A3ButtonR','KeyR'],['A4ButtonZ','KeyZ'],
    ['A5ButtonCUp','ArrowUp'],['A6ButtonCDown','ArrowDown'],['A7ButtonCLeft','ArrowLeft'],
    ['A8ButtonCRight','ArrowRight'],['A9ZTargetSign','KeyZ'],['AAControlStick',movement]
  ];
  for (const [suffix, action] of glyphs) {
    const draw = typeof action==='string' ? label=>label(key(action)) : action;
    for (const prefix of ['textures/nes_font_static/gMsgChar','textures/kanji/gMsgKanji83'])
      texture(prefix+suffix+'Tex',16,16,'I4',draw);
  }
  texture('textures/nes_font_static/gMsgChar7FBlankTex',16,16,'I4',label=>label(key('Space')));
  for (const language of ['ENG','JPN']) {
    texture('textures/title_static/gFileSelControls'+language+'Tex',144,16,'IA8',
      label=>label(key('KeyX')+' · Decide     '+key('KeyC')+' · Cancel'));
    texture('textures/title_static/gFileSelLTargeting'+language+'Tex',64,16,'IA8',
      label=>label(key('KeyZ')+' Targeting'));
  }
  for (const [button,action] of [['A','KeyX'],['B','KeyC']])
    texture('textures/icon_item_static/g'+button+'BtnSymbolTex',24,16,'IA8',label=>label(key(action)));
  texture('textures/icon_item_static/gCBtnSymbolsTex',48,16,'IA8',label=>{
    ['ArrowLeft','ArrowDown','ArrowRight'].forEach((action,i)=>label(key(action),8+16*i,8,16));
  });
  for (const [button,action] of [['A','KeyX'],['CUp','ArrowUp'],['CDown','ArrowDown'],['CLeft','ArrowLeft'],['CRight','ArrowRight']])
    texture('textures/parameter_static/gOcarinaBtnIcon'+button+'Tex',16,16,'IA8',label=>label(key(action)));

  // The title draws five individual characters from the NTSC file-name font.
  const titleNames = {ShiftLeft:'LSHFT',ShiftRight:'RSHFT',BracketLeft:'LBRKT',BracketRight:'RBRKT',
    Comma:'COMMA',Period:'DOT',Slash:'SLASH',Semicolon:'SEMI',Quote:'QUOTE',Minus:'MINUS',Equal:'EQUAL'};
  const title = (titleNames[bindings.Space] || bindings.Space.replace(/^Key|^Digit|^Arrow/,'')).toUpperCase().padEnd(5);
  HEAPU8.set(Array.from(title,c=>c===' ' ? 223 : /[0-9]/.test(c) ? Number(c) : 171+c.charCodeAt(0)-65),engine.titleStartLetters.value);
}
