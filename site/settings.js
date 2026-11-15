(() => {
  const canvas = document.querySelector('#canvas');
  const actions = {KeyW:'Move up',KeyA:'Move left',KeyS:'Move down',KeyD:'Move right',KeyX:'A · Action',KeyC:'B · Sword',KeyZ:'Z · Target',KeyE:'L shoulder',KeyR:'R · Shield',Space:'Quest / items',ArrowUp:'C up',ArrowDown:'C down',ArrowLeft:'C left',ArrowRight:'C right',KeyT:'D-pad up',KeyG:'D-pad down',KeyF:'D-pad left',KeyH:'D-pad right'};
  const storageKey = 'ocarina.adventure.settings.v1';
  let prefs = {};
  try { prefs = JSON.parse(localStorage.getItem(storageKey)) || {}; } catch {}
  const defaults={KeyW:'KeyW',KeyA:'KeyA',KeyS:'KeyS',KeyD:'KeyD',KeyX:'KeyE',KeyC:'KeyF',KeyZ:'ShiftLeft',KeyE:'KeyU',KeyR:'KeyQ',Space:'Tab',ArrowUp:'ArrowUp',ArrowDown:'ArrowDown',ArrowLeft:'ArrowLeft',ArrowRight:'ArrowRight',KeyT:'KeyI',KeyG:'KeyG',KeyF:'KeyJ',KeyH:'KeyL'};
  const bindings=Object.fromEntries(Object.keys(actions).map(k=>[k,prefs.keys?.[k]||defaults[k]]));
  if(!prefs.questTab){bindings.Space='Tab';for(const k of Object.keys(bindings))if(k!=='Space'&&['Tab','Space'].includes(bindings[k]))bindings[k]=defaults[k];prefs.questTab=true;}

  const reserved=new Set(['KeyM','KeyK','Space']);
  for(const action of Object.keys(bindings)){
    if(reserved.has(bindings[action]))bindings[action]=[action,...'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map(c=>'Key'+c)].find(code=>!reserved.has(code)&&!Object.values(bindings).includes(code));
  }
  if(!prefs.pauseShortcutM){prefs.pauseWhenHidden=true;prefs.pauseShortcutM=true;try{localStorage.setItem(storageKey,JSON.stringify({...prefs,keys:bindings}))}catch{}}
  const speeds=[0.25,0.5,0.75,1,1.25,1.5,2,3];
  let sensitivity=speeds.includes(prefs.mouseSpeed)?prefs.mouseSpeed:1;
  let cameraMode = prefs.cameraMode || (prefs.camera === false ? 'off' : 'move');
  canvas.classList.toggle('free-look',cameraMode==='move');
  const fps = [20,30,60].includes(prefs.fps) ? prefs.fps : 30;
  window.gamePixelScale=1;
  const resolution=[0.5,0.75,1,1.5,2].includes(prefs.scale)?prefs.scale:1;
  window._devCvars+=',gSettings.InternalResolution:'+resolution+',gSettings.AdvancedResolution.Enabled:0,gEnhancements.PauseMenuAnimatedLink:0';
  window.useReloaded=prefs.texturePack!=='classic';
  window._devCvars += ',gSettings.AltAssets:1';
  window._devCvars += ',gSettings.FreeLook.Enabled:1,gSettings.AutoCaptureMouse:0,gSettings.EnableMouse:0,gEnhancements.Autosave:1,gEnhancements.RememberSaveLocation:1,gSettings.InterpolationFPS:'+fps;
  const distanceSetting='gSettings.FreeLook.MaxCameraDistance';
  let wheelDistance=null;
  if(Number.isInteger(prefs.cameraDistance)&&prefs.cameraDistance>=100&&prefs.cameraDistance<=900){
    window._devCvars+=','+distanceSetting+':'+prefs.cameraDistance;
  }
  const engine = () => window._rtReady && typeof wasmExports !== 'undefined' ? wasmExports : null;
  function integer(name,value) {
    const p = Module.allocateUTF8(name);
    try { engine().setInt(p,value); } finally { Module._free(p); }
  }
  const open = document.createElement('button');
  open.id = 'open-settings'; open.textContent = 'Pause · M';
  const panel = document.createElement('dialog');
  panel.className = 'adventure'; panel.setAttribute('aria-labelledby','adventure-title');
  panel.innerHTML = `<header><h2 id="adventure-title">Paused</h2><button id="close-panel" aria-label="Resume game">Resume <kbd>M</kbd></button></header>
  <nav aria-label="Settings sections"></nav><section></section><footer role="status" aria-live="polite"></footer>`;
  document.body.append(open,panel);
  const content = panel.querySelector('section'), status = panel.querySelector('footer');
  // The web port applies boot CVars after some enhancement hooks are initialized.
  const options = createAdventureOptions({engine,prefs,persist,keyLabel:code=>pretty(bindings[code])});
  let promptsReady = false;
  const autosaveSetup = setInterval(() => {
    if (!engine() || !document.getElementById('overlay').classList.contains('hidden')) return;
    engine().registerAutosave();
    const resName=Module.allocateUTF8('gSettings.InternalResolution');try{engine().setFloat(resName,resolution)}finally{Module._free(resName)};
    options.restore();
    for(const [id] of visuals)if(typeof prefs.visuals?.[id]==='boolean')options.set('gEnhancements.'+id,Number(prefs.visuals[id]));
    if(prefs.skipAllCutscenes)setCutsceneSkips(true);
    promptsReady = true;
    updateKeyPrompts(engine(), bindings);
    clearInterval(autosaveSetup);
    if(panel.open) showTab(tab);
  }, 300);
  const buttons = ['Controls','Graphics','Saves','Cheats','Quality of life'];
  const icons={'Controls':'controls','Graphics':'graphics','Saves':'saves','Cheats':'cheats','Quality of life':'quality','Game menu':'game'};
  const visuals=[['DisableLOD','Keep distant models detailed'],['WidescreenActorCulling','Show actors at widescreen edges'],['DisableKokiriDrawDistance','Keep distant Kokiri visible'],['NewDrops','Show dropped items in 3D'],['ToTMedallionsColors','Color the Temple of Time medallions']];
  const held = new Map(), forwarded = new WeakSet();
  let listening = null, tab = 'Controls', drag = null, expiry, busy = false;
  function persist() {
    try { localStorage.setItem(storageKey,JSON.stringify({...prefs,keys:bindings})); }
    catch { status.textContent='Browser storage is unavailable. Settings apply for this session.'; }
  }
  const pretty = code => code.replace(/^Key|^Digit/,'').replace(/^Arrow/,'Arrow ');
  function updateKeyboardHelp() {
    const help = document.querySelector('#keyboard-help');
    if (help) help.textContent = pretty(bindings.KeyX)+' · Confirm     '+pretty(bindings.KeyC)+' · Back     '+pretty(bindings.Space)+' · Quest / items     Space · Jump     M · Pause';
  }
  // The upstream loading overlay follows the game scripts in the document.
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded',updateKeyboardHelp);
  else updateKeyboardHelp();
  function showTab(name) {
    tab=name; listening=null; status.textContent='';content.scrollTop=0;
    for (const b of panel.querySelectorAll('nav button')) b.setAttribute('aria-pressed',b.dataset.tab===tab);
    if (tab==='Controls') {
      content.innerHTML='<label>Mouse camera <select id="camera-mode"><option value="drag">Hold right-click</option><option value="move">Move mouse freely</option><option value="off">Off</option></select></label><p>Scroll up to zoom in or down to zoom out. In free-look, click the game to capture the mouse. Press Escape to release it, then hover or click the top buttons.</p><h3>Keybindings</h3><p>Select a binding and press a key. Escape cancels.</p>';
      const camera = content.querySelector('#camera-mode');
      camera.value = cameraMode;
      camera.onchange = () => {
        endDrag();
        prefs.cameraMode = cameraMode = camera.value;
        canvas.classList.toggle('free-look',cameraMode==='move');
        persist();
      };
      const cameraOptions=document.createElement('div');
      cameraOptions.innerHTML='<label>Mouse sensitivity <select></select></label><label>Invert vertical look <input type="checkbox"></label><label>Pause when switching tabs <input type="checkbox"></label>';
      content.querySelector('h3').before(cameraOptions);
      const speed=cameraOptions.querySelector('select'),[invert,autoPause]=cameraOptions.querySelectorAll('input');
      for(const value of speeds)speed.add(new Option(value+'×',value));
      speed.value=sensitivity;
      speed.onchange=()=>{sensitivity=prefs.mouseSpeed=Number(speed.value);persist()};
      invert.checked=!!prefs.invertMouseY;
      invert.onchange=()=>{prefs.invertMouseY=invert.checked;persist()};
      autoPause.checked=prefs.pauseWhenHidden!==false;
      autoPause.onchange=()=>{prefs.pauseWhenHidden=autoPause.checked;persist()};
      const group=document.createElement('details');
      group.innerHTML='<summary>C buttons and D-pad</summary>';
      Object.entries(actions).forEach(([code,label],i)=>{
        const row=document.createElement('div'),btn=document.createElement('button');
        row.className='row'; row.append(label,btn); btn.dataset.bind=code;
        btn.setAttribute('aria-label','Rebind '+label); btn.textContent=pretty(bindings[code]);
        btn.onclick=()=>{listening=code;status.textContent='Press a new key for '+label+'.'};
        (i<10?content:group).append(row);
      }); content.append(group);
    } else if(tab==='Graphics') {
      content.innerHTML='<h3>Graphics</h3><label>Frame rate target <select id="fps"><option value="20">20 FPS</option><option value="30">30 FPS</option><option value="60">60 FPS</option></select></label><label>Render resolution <select id="scale"><option value="0.5">50%</option><option value="0.75">75%</option><option value="1">100%</option><option value="1.5">150%</option><option value="2">200%</option></select></label><p>Lower values reduce graphics work. Resolution changes apply immediately.</p>';
      const packRow=document.createElement('label'),pack=document.createElement('select');
      packRow.append('Texture pack',pack);
      pack.add(new Option('OoT Reloaded · browser edition','reloaded'));pack.add(new Option('Classic clean-room','classic'));
      pack.value=prefs.texturePack||'reloaded';pack.onchange=()=>{prefs.texturePack=pack.value;persist();status.textContent='Texture pack saved. Save your game and reload to apply.'};
      content.prepend(packRow);
      for(const [id,title] of visuals){
        const row=document.createElement('label'),toggle=document.createElement('input');
        toggle.type='checkbox';toggle.disabled=!promptsReady;
        toggle.checked=promptsReady&&!!options.read('gEnhancements.'+id,0);
        toggle.onchange=()=>{options.set('gEnhancements.'+id,Number(toggle.checked));(prefs.visuals??={})[id]=toggle.checked;persist()};
        row.append(title,toggle);content.append(row);
      }
      const rate=content.querySelector('#fps'),scale=content.querySelector('#scale');
      rate.value=prefs.fps||fps;scale.value=prefs.scale||1;
      rate.onchange=()=>{prefs.fps=Number(rate.value);if(engine())integer('gSettings.InterpolationFPS',prefs.fps);persist()};
      scale.onchange=()=>{prefs.scale=Number(scale.value);const ptr=Module.allocateUTF8('gSettings.InternalResolution');try{engine().setFloat(ptr,prefs.scale)}finally{Module._free(ptr)}persist();status.textContent='Render resolution updated.'};
    } else if(tab==='Saves') {
      content.innerHTML='<h3>Save progress</h3><p>Save your current file during play. Reopen the same file to resume at the saved entrance. Dungeons use their usual restart points.</p><button id="save-now">Save now</button><p>Automatic saves run about every three minutes during ordinary play. Saves stay in this browser on this address.</p>';
      content.querySelector('button').onclick=save;
      if(promptsReady){
        const slots=[1,2,3,4,5].filter(slot=>FS.analyzePath('/Save/file'+slot+'.sav').exists);
        if(slots.length){
          const select=document.createElement('select');select.setAttribute('aria-label','Backup file');
          slots.forEach(n=>select.add(new Option('File '+n,n)));
          const download=document.createElement('button');download.textContent='Download backup';
          download.onclick=()=>{
            const name='file'+select.value+'.sav',url=URL.createObjectURL(new Blob([FS.readFile('/Save/'+name)]));
            const link=document.createElement('a');link.href=url;link.download=name;link.click();
            setTimeout(()=>URL.revokeObjectURL(url),3000);status.textContent='Downloaded the last saved version of File '+select.value+'.';
          };
          const row=document.createElement('div');row.className='row';row.append(select,download);content.append(row);
        }
        addSaveSlots(content,status,save);
        addSaveImport(content,status,slots);
      }
    } else {
      options.draw(tab==='Cheats',content,status,promptsReady);
      if(tab==='Quality of life'){
        const row=document.createElement('label'),toggle=document.createElement('input');
        toggle.type='checkbox';toggle.checked=!!prefs.skipAllCutscenes;toggle.disabled=!promptsReady;
        toggle.onchange=()=>{prefs.skipAllCutscenes=toggle.checked;setCutsceneSkips(toggle.checked);persist()};
        row.append('Automatically skip supported cutscenes',toggle);content.prepend(row);
      }
    }
  }
  for(const name of buttons){const b=document.createElement('button');b.textContent=name;b.dataset.tab=name;b.onclick=()=>showTab(name);panel.querySelector('nav').append(b)}
  // The engine invokes syncfs as part of its synchronous web save. Observe that exact write.
  async function save(){
    if(busy)return;
    if(!engine()?.gameLoaded(0)){status.textContent='Open a named game file first.';return}
    busy=true;status.textContent='Saving…';
    try {
      const original=FS.syncfs,originalRename=FS.rename;let pending,savedPath;
      FS.rename=function(from,to){const result=originalRename.call(FS,from,to);const match=String(to).match(/(?:^|\/)file([1-3])\.sav$/);if(match)savedPath='/Save/file'+match[1]+'.sav';return result};
      FS.syncfs=function(populate,callback){
        pending=new Promise((resolve,reject)=>original.call(FS,populate,err=>{callback?.(err);err?reject(err):resolve()}));return pending;
      };
      try {engine().saveProgress()} finally {FS.syncfs=original;FS.rename=originalRename}
      if(!pending)throw Error('No file was written.');
      await pending;status.textContent='Progress saved in this browser.';return savedPath;
    }catch(e){status.textContent='Save failed. '+(e.message||e)}finally{busy=false}
  }
  function keyEvent(type,code,repeat=false){
    const key=code.startsWith('Key')?code.slice(3).toLowerCase():code==='Space'?' ':code;
    const num=code.startsWith('Key')?code.charCodeAt(3):({ArrowUp:38,ArrowDown:40,ArrowLeft:37,ArrowRight:39,Space:32})[code];
    const e=new KeyboardEvent(type,{key,code,keyCode:num,which:num,bubbles:true,cancelable:true,repeat});forwarded.add(e);canvas.dispatchEvent(e);
  }
  function release(){
    for(const code of held.values())keyEvent('keyup',code);
    held.clear();hud.release();releaseCamera();endDrag();
  }
  const nativeTabs=document.createElement('nav');
  nativeTabs.className='native-adventure-tabs';nativeTabs.hidden=true;
  nativeTabs.setAttribute('aria-label','Adventure settings');
  const menuPtr=()=>engine()?.menuAddress?HEAPU32[engine().menuAddress.value>>>2]:0;
  function nativeVisible(){const ptr=menuPtr();return !!ptr&&!!engine().menuVisible(ptr)}
  function setNative(value){const ptr=menuPtr();if(ptr&&nativeVisible()!==value)engine().toggleMenu(ptr)}
  function syncMenu(){const visible=nativeVisible();nativeTabs.hidden=!visible||panel.open;open.hidden=visible||panel.open}
  for(const name of buttons){const b=document.createElement('button');b.textContent=name;b.onclick=()=>{tab=name;openPanel();syncMenu()};nativeTabs.append(b)}
  document.body.append(nativeTabs);
  setInterval(syncMenu,150);
  const back=document.createElement('button');back.textContent='Game menu';back.onclick=()=>{panel.close();setNative(true);syncMenu();canvas.focus()};back.textContent='Engine settings';back.id='engine-settings';panel.querySelector('header').append(back);
  for(const button of panel.querySelectorAll('nav button')){
    const icon=document.createElement('img');icon.src='pause-icons/'+icons[button.textContent]+'.png';icon.alt='';button.prepend(icon);
  }
  function enterMenu(){if(document.querySelector('.file-chooser[open]'))return;openPanel();syncMenu()}
  const skip=document.createElement('button');
  skip.id='skip-cutscene';skip.textContent='Skip cutscene · K';skip.hidden=true;document.body.append(skip);
  let skipSeen=0,skipChain=false,skipIdleSince=0;
  const skipSettings=['Story','OnePoint','QuickBossDeaths','Entrances','BossIntro','Intro','LearnSong'];
  function setCutsceneSkips(value){
    for(const name of skipSettings)options.set('gEnhancements.TimeSavers.SkipCutscene.'+name,value?1:(prefs.skipAllCutscenes?1:0));
  }
  function requestSkip(){
    if(skip.hidden||panel.open||nativeVisible()||performance.now()-skipSeen>350)return;
    skipChain=true;skipIdleSince=0;setCutsceneSkips(true);
    engine().skipRequested.value=1;
  }
  skip.onclick=requestSkip;
  setInterval(()=>{
    const api=engine();if(!api)return;
    if(skipChain&&!panel.open&&!nativeVisible()){
      const play=api.gameLoaded(1)&&HEAPU32[api.playStateAddress.value>>>2];
      if(!play||api.gameplayPaused()||api.playerInCutscene(play)){if(play)api.skipRequested.value=1;skipIdleSince=0}
      else if(!skipIdleSince)skipIdleSince=performance.now();
      else if(performance.now()-skipIdleSince>1800){skipChain=false;api.skipRequested.value=0;setCutsceneSkips(false)}
    }
    if(api.skipAvailable.value){skipSeen=performance.now();api.skipAvailable.value=0}
    skip.hidden=!skipSeen||performance.now()-skipSeen>350||panel.open||nativeVisible()||!api.gameLoaded(0);
  },60);
  const menuFrame = () => !panel.open;
  function openPanel(){if(panel.open)return;release();setNative(false);if(typeof MainLoop!=='undefined'&&!MainLoop.preMainLoop.includes(menuFrame))MainLoop.preMainLoop.push(menuFrame);panel.showModal();showTab(tab)}
  function closePanel(){if(busy||window.saveSlotBusy)return;if(panel.open)panel.close();setNative(false);syncMenu();canvas.focus();captureCamera()}
  open.onclick=enterMenu;panel.querySelector('#close-panel').onclick=closePanel;
  panel.oncancel=e=>{e.preventDefault();closePanel()};
  for(const type of ['keydown','keyup']){
    window.addEventListener(type,e=>{
      if(forwarded.has(e)||document.querySelector('.file-chooser[open]'))return;
      const down=type==='keydown';
      if(e.code==='Space'&&!panel.open&&!nativeVisible()&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        e.preventDefault();e.stopImmediatePropagation();
        if(down&&!e.repeat){
          if(engine()?.gameLoaded(1)){jump()}
          else keyEvent('keydown','Space');
        }else if(!down)keyEvent('keyup','Space');
        return;
      }
      if(e.code==='KeyK'&&!panel.open&&!nativeVisible()&&!e.ctrlKey&&!e.metaKey&&!e.altKey){
        if(down&&!e.repeat)requestSkip();
        e.preventDefault();e.stopImmediatePropagation();return;
      }
      if(e.code==='Escape'&&!panel.open&&!nativeVisible()){
        if(down)releaseCamera();e.stopImmediatePropagation();return;
      }
      if(e.code==='KeyM'&&!e.ctrlKey&&!e.metaKey&&!e.altKey&&(!panel.open||!e.target.matches?.('input[type=search],textarea,input[type=text]'))){
        e.preventDefault();e.stopImmediatePropagation();
        if(down&&!e.repeat){
          if(listening){status.textContent='M opens the pause menu. Choose another key.'}
          else if(panel.open||nativeVisible())closePanel();
          else enterMenu();
        }
        return;
      }
      if(panel.open){
        if(listening&&down){
          e.preventDefault();e.stopImmediatePropagation();
          if(e.code==='Escape'){listening=null;status.textContent='Binding cancelled.';return}
          if(!/^(Key[A-Z]|Digit[0-9]|Arrow(Up|Down|Left|Right)|Tab|Space|Shift(Left|Right)|Bracket(Left|Right)|Comma|Period|Slash|Semicolon|Quote|Minus|Equal)$/.test(e.code)||e.ctrlKey||e.metaKey||e.altKey){status.textContent='Choose a letter, number, arrow, Shift, Space or punctuation key.';return}
          if(reserved.has(e.code)){status.textContent='M pauses, K skips cutscenes, and Space jumps. Choose another key.';return}
          if(Object.keys(bindings).some(k=>k!==listening&&bindings[k]===e.code)){status.textContent='That key already has an action. Choose another key.';return}
          bindings[listening]=e.code;panel.querySelector('[data-bind="'+listening+'"]').textContent=pretty(e.code);listening=null;status.textContent='Binding saved.';persist();
          updateKeyboardHelp();
          if(promptsReady) updateKeyPrompts(engine(),bindings);
          return
        }
        return
      }
      if(!down && held.has(e.code)){
        e.preventDefault();e.stopImmediatePropagation();keyEvent(type,held.get(e.code));held.delete(e.code);return;
      }
      if(e.ctrlKey||e.metaKey||e.altKey||e.target.matches?.('input,textarea,select'))return;
      const target=Object.keys(bindings).find(k=>bindings[k]===e.code);
      if(!target&&!Object.hasOwn(actions,e.code))return;
      e.preventDefault();e.stopImmediatePropagation();
      if(!target)return;
      if(down){if(target==='Space')zero();held.set(e.code,target);keyEvent(type,target,e.repeat)}
      else {held.delete(e.code);keyEvent(type,target)}
    },true)
  }
  // Keep HTML menu interaction out of the paused SDL event queue.
  for(const type of ['keydown','keyup','mousemove','mousedown','mouseup','wheel','pointermove','pointerdown','pointerup'])panel.addEventListener(type,e=>e.stopPropagation());
  function zero(){if(engine()){engine().dragX.value=0;engine().dragY.value=0}}
  function endDrag(){drag=null;clearTimeout(expiry);zero()}
  const hud = createHudButtons({
    canvas, engine, keyEvent, keyLabel:code=>pretty(bindings[code]),
    canInteract:()=>promptsReady && !panel.open && !document.pointerLockElement && !document.hidden
  });
  const notice=document.createElement('div');
  notice.id='camera-notice';notice.hidden=true;notice.setAttribute('role','status');document.body.append(notice);
  let noticeTimer, lockPending=false;
  function hint(message) {
    clearTimeout(noticeTimer);notice.textContent=message;notice.hidden=false;
    noticeTimer=setTimeout(()=>notice.hidden=true,3000);
  }
  function releaseCamera() {
    if(cameraMode==='move' && document.pointerLockElement===canvas) document.exitPointerLock();
    zero();
  }
  function captureCamera() {
    if(cameraMode!=='move' || nativeVisible() || panel.open || !canMove() || document.pointerLockElement || lockPending) return;
    if(!canvas.requestPointerLock){hint('Mouse capture is unavailable in this browser.');return}
    lockPending=true;
    try {
      canvas.requestPointerLock()?.catch(()=>{lockPending=false;hint('Click the game to capture the mouse.')});
    }catch{lockPending=false;hint('Click the game to capture the mouse.')}
  }
  document.addEventListener('pointerlockerror',()=>{lockPending=false});
  document.addEventListener('pointerlockchange',()=>{
    lockPending=false;zero();hud.refresh();
    if(!document.pointerLockElement){clearTimeout(noticeTimer);notice.hidden=true}
    if(document.pointerLockElement===canvas && cameraMode==='move'){
      if(panel.open||document.hidden){releaseCamera();return}
      hint('Esc releases the mouse for HUD buttons.');
    }
  });
  window.addEventListener('wheel',e=>{
    if(e.target!==canvas || panel.open || nativeVisible() || document.hidden || e.ctrlKey || e.metaKey ||
       cameraMode==='off' || !e.deltaY || !canMove())return;
    e.preventDefault();e.stopImmediatePropagation();
    const current=options.read(distanceSetting,185);
    if(wheelDistance===null || Math.round(wheelDistance)!==current)wheelDistance=current;
    const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?canvas.clientHeight:1);
    wheelDistance=Math.max(100,Math.min(900,wheelDistance+Math.max(-100,Math.min(100,pixels))*0.45));
    const distance=Math.round(wheelDistance);
    if(distance===current)return;
    integer(distanceSetting,distance);prefs.cameraDistance=distance;persist();
    // A small horizontal input engages the engine's orbit camera even before the first drag.
    if(Math.abs(engine().dragX.value)<15)engine().dragX.value=15;
    clearTimeout(expiry);expiry=setTimeout(zero,180);
  },{capture:true,passive:false});
  canvas.addEventListener('click',e=>{if(e.button===0)captureCamera()});
  canvas.addEventListener('pointerdown',e=>{if(e.button===2&&cameraMode==='drag'&&!panel.open){drag=e.pointerId;canvas.setPointerCapture(e.pointerId);e.preventDefault()}});
  canvas.addEventListener('pointermove',e=>{
    if(cameraMode==='drag' && drag===e.pointerId && (e.buttons&2)) moveCamera(e);
  });
  document.addEventListener('mousemove',e=>{
    if(cameraMode==='move' && document.pointerLockElement===canvas) moveCamera(e);
  });
  function canMove(){
    const api=engine();if(!api?.gameLoaded(1)||panel.open||nativeVisible())return false;
    const play=HEAPU32[api.playStateAddress.value>>>2];
    return play&&!api.gameplayPaused()&&!api.playerInCutscene(play);
  }
  function jump(){
    if(!canMove())return;
    const play=HEAPU32[engine().playStateAddress.value>>>2],player=HEAPU32[(play+0x1d38)>>>2];
    if(!player || !(HEAPU16[(player+0x88)>>>1]&1) || HEAPF32[(player+0x60)>>>2]>0)return;
    HEAPF32[(player+0x60)>>>2]=6.34375;
    HEAPU16[(player+0x88)>>>1]&=~1;
  }
  function moveCamera(e) {
    if(!canMove()){zero();return;}
    const gain=35*sensitivity;
    const clip=n=>Math.max(-4000,Math.min(4000,n));
    engine().dragX.value=clip(engine().dragX.value-gain*e.movementX);
    engine().dragY.value=clip(engine().dragY.value+gain*(prefs.invertMouseY?-1:1)*e.movementY);
    clearTimeout(expiry);expiry=setTimeout(zero,180)
  }
  // Menus and cutscenes suppress camera input without surrendering pointer lock.
  setInterval(()=>{if(!canMove())zero()},100);
  for(const event of ['pointerup','pointercancel','lostpointercapture'])canvas.addEventListener(event,endDrag);
  function pauseOnLeave(){
    release();
    if(prefs.pauseWhenHidden!==false && !panel.open && !nativeVisible() && promptsReady && !document.querySelector('.file-chooser[open]'))enterMenu();
  }
  window.addEventListener('blur',pauseOnLeave);
  document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseOnLeave()});
})();
