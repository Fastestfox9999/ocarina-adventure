// The game draws its HUD in 240 vertical units, anchored to the viewport's right edge.
function createHudButtons({canvas, engine, canInteract, keyLabel, keyEvent}) {
  const layer = document.createElement('div');
  layer.id = 'hud-controls';
  layer.setAttribute('aria-label','Game actions');
  layer.setAttribute('role','group');
  document.body.append(layer);
  // Centers from z_parameter.c and z64interface.h; alpha fields from the pinned web build.
  const icons = [
    ['KeyC','B · Attack',175.5,32,29,0x1ac08],
    ['KeyX','A · Action',208.5,32,29,0x1ac06],
    ['ArrowLeft','C left',240.5,31.5,26,0x1ac0a],
    ['ArrowDown','C down',262.5,47.5,26,0x1ac0c],
    ['ArrowRight','C right',284.5,31.5,26,0x1ac0e],
    ['ArrowUp','C up · Navi',262,24,16,0x1ac10],
    ['Space','Start · Return',144,28,24,0x1ac1e]
  ];
  const pressed = new Map();
  function up(code) {
    const t = pressed.get(code);
    if (!t) return;
    clearTimeout(t.timer); pressed.delete(code);
    keyEvent('keyup',code);
  }
  function down(code) {
    if (pressed.has(code)) up(code);
    keyEvent('keydown',code);
    pressed.set(code,{time:performance.now()});
  }
  function finish(code) {
    const state=pressed.get(code);
    if (!state) return;
    clearTimeout(state.timer);
    // SDL samples held buttons on game updates; a quick click must span one update.
    state.timer=setTimeout(()=>up(code),Math.max(0,100-(performance.now()-state.time)));
  }
  const buttons=icons.map(([code,name,x,y,size])=>{
    const button=document.createElement('button');
    button.type='button';button.dataset.action=code;button.hidden=true;
    button.style.right='calc(var(--hud-unit) * '+(320-x-size/2)+')';
    button.style.top='calc(var(--hud-unit) * '+(y-size/2)+')';
    button.style.width=button.style.height='calc(var(--hud-unit) * '+size+')';
    button.onpointerdown=e=>{
      if(e.button!==0 || !canInteract()) return;
      e.preventDefault();button.setPointerCapture(e.pointerId);canvas.focus();down(code);
    };
    button.onpointerup=()=>finish(code);
    button.onpointercancel=()=>up(code);
    button.onlostpointercapture=()=>finish(code);
    button.onclick=e=>{if(e.detail===0 && canInteract()){down(code);finish(code)}};
    layer.append(button); return button;
  });
  function refresh() {
    const api=engine();
    const play=canInteract() && api?.gameLoaded(1) && HEAPU32[api.playStateAddress.value>>>2];
    layer.hidden=!play;
    if(!play) return;
    const word=offset=>HEAPU16[(play+offset)>>>1];
    const paused=word(0x1b31c) || word(0x1b31e);
    icons.forEach(([code,name,x,y,size,alpha],i)=>{
      const button=buttons[i];
      button.hidden=!word(alpha) || (code==='Space' && !paused) || (code==='ArrowUp' && (paused || !word(0x1abb8)));
      const label=name+' · '+keyLabel(code);
      if(button.dataset.hint!==label){
        button.dataset.hint=label;button.setAttribute('aria-label',label);
      }
    });
  }
  function resize() {
    const r=canvas.getBoundingClientRect();
    Object.assign(layer.style,{left:r.left+'px',top:r.top+'px',width:r.width+'px',height:r.height+'px'});
    layer.style.setProperty('--hud-unit',r.height/240+'px');
  }
  new ResizeObserver(resize).observe(canvas);resize();refresh();
  setInterval(refresh,100);
  return {refresh, release:()=>{for(const code of pressed.keys())up(code)}};
}
