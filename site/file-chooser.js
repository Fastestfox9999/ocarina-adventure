// Give each browser profile five real save files. The native engine works with
// slot zero internally; its file1 operations are routed to the chosen profile.
function installFileChooser(){
  let selected=Math.max(1,Math.min(5,Number(sessionStorage.getItem('ocarina.selectedFile'))||1));
  let physical=0;
  function unroute(fn){physical++;try{return fn()}finally{physical--}}
  const route=p=>typeof p==='string'&&!physical?p.replace(/((?:^|\/)Save\/)file1\.(sav|temp)$/,'$1file'+selected+'.$2'):p;
  for(const name of ['lookupPath','open','mknod','unlink']){
    const original=FS[name];FS[name]=function(path,...args){return original.call(FS,route(path),...args)};
  }
  const rename=FS.rename;FS.rename=function(from,to){return rename.call(FS,route(from),route(to))};
  for(const name of ['readFile','writeFile','analyzePath']){
    const original=FS[name];FS[name]=function(...args){return unroute(()=>original.apply(FS,args))};
  }
  // Persistence must always enumerate and store the physical filenames.
  for(const name of ['getLocalSet','loadLocalEntry','storeLocalEntry','removeLocalEntry']){
    const original=IDBFS[name];IDBFS[name]=function(...args){return unroute(()=>original.apply(IDBFS,args))};
  }
  window.activeSaveFile=selected;
  const chooser=document.createElement('dialog');chooser.className='file-chooser';
  chooser.setAttribute('aria-label','Choose a game file');
  chooser.innerHTML='<div class="file-select-panel"><h1><img src="file-select/title.png" alt="Please select a file."></h1><div class="file-select-body"></div><footer role="status" aria-live="polite"></footer></div>';
  document.body.append(chooser);
  const body=chooser.querySelector('.file-select-body'),status=chooser.querySelector('footer');
  const flush=()=>new Promise((resolve,reject)=>FS.syncfs(false,e=>e?reject(e):resolve()));
  const path=n=>'/Save/file'+n+'.sav';
  const exists=n=>FS.analyzePath(path(n)).exists;
  const decode=values=>(values||[]).map(c=>c===223?' ':c<10?String(c):c>=171&&c<=196?String.fromCharCode(c-171+65):c>=197&&c<=222?String.fromCharCode(c-197+97):'?').join('').trim();
  let busy=false,mode='browse',source=0,ready=false;
  // The old chooser reloaded the engine after every selection. Switch only the
  // save routing here, then let FileChoose_LoadGame perform its normal transition.
  sessionStorage.removeItem('ocarina.launchFile');
  const freeze=()=>!chooser.open;
  function button(label,fn,parent=body){const b=document.createElement('button');b.type='button';b.textContent=label;b.onclick=()=>{if(!busy)fn()};parent.append(b);return b}
  function begin(message){body.replaceChildren();status.textContent=message||''}
  function cancel(){if(!busy)draw()}
  function confirmation(message,fn){
    mode='confirm';begin(message);
    const controls=document.createElement('div');controls.className='file-actions';body.append(controls);
    button('Yes',fn,controls);button('Cancel',cancel,controls).focus();
  }
  async function perform(fn){
    if(busy)return;busy=true;chooser.setAttribute('aria-busy','true');
    body.querySelectorAll('button,input').forEach(b=>b.disabled=true);
    try{await fn()}catch(e){status.textContent='Could not complete that action. '+e.message}
    finally{busy=false;chooser.removeAttribute('aria-busy');body.querySelectorAll('button,input').forEach(b=>b.disabled=false)}
  }
  function launch(slot){return perform(async()=>{
    // Parse before asking the engine to load, so an invalid file cannot abort it.
    const save=JSON.parse(FS.readFile(path(slot),{encoding:'utf8'}));
    if(save.version!==1||!save.sections?.base?.data?.inventory)throw Error('This save is not compatible. Import a valid backup.');
    selected=slot;window.activeSaveFile=slot;sessionStorage.setItem('ocarina.selectedFile',slot);
    status.textContent='Opening File '+slot+'…';
    const pointer=wasmExports.fileChoosePointer.value;if(!pointer)throw Error('Please reopen the game.');
    HEAP16[(pointer+0x3122c)>>>1]=0;
    wasmExports.fileChooseLoad(pointer);
    chooser.close();document.querySelector('#canvas').focus();
  })}
  function newFile(slot){
    mode='name';begin('Choose a name for File '+slot+'.');
    const form=document.createElement('form');form.className='file-name-form';
    const label=document.createElement('label');label.textContent='Name';
    const input=document.createElement('input');input.setAttribute('aria-label','Name');input.maxLength=8;input.pattern='[A-Za-z0-9 ]{1,8}';input.required=true;input.value='Link';label.append(input);form.append(label);
    const controls=document.createElement('div');controls.className='file-actions';form.append(controls);
    const start=button('Start',()=>form.requestSubmit(),controls);button('Cancel',cancel,controls);body.append(form);
    form.onsubmit=async e=>{e.preventDefault();if(busy||!form.reportValidity())return;
      let created=false;await perform(async()=>{
        const response=await fetch('new-game.json?v=selector11');if(!response.ok)throw Error('New-game data could not load.');
        const data=await response.json(),name=input.value.trim()||'Link';
        data.sections.base.data.playerName=Array.from(name.padEnd(8),c=>/[A-Z]/.test(c)?171+c.charCodeAt(0)-65:/[a-z]/.test(c)?197+c.charCodeAt(0)-97:/[0-9]/.test(c)?Number(c):223);
        FS.writeFile(path(slot),JSON.stringify(data));await flush();created=true;
      });if(created)await launch(slot);
    };input.focus();input.select();
  }
  function draw(next='browse',from=0){
    mode=next;source=from;begin(next==='copy-source'?'Copy which file?':next==='copy-target'?'Copy to which file?':next==='erase'?'Erase which file?':'Select a file to begin.');
    const list=document.createElement('div');list.className='file-list';body.append(list);
    for(let slot=1;slot<=5;slot++){
      let data=null,invalid=false;try{if(exists(slot))data=JSON.parse(FS.readFile(path(slot),{encoding:'utf8'})).sections.base.data}catch{invalid=true}
      const b=button('',()=>{
        if(mode==='copy-source'){if(data)draw('copy-target',slot);return}
        if(mode==='copy-target'){
          if(slot===source)return;
          const copy=()=>perform(async()=>{const old=exists(slot)?FS.readFile(path(slot)):null;try{FS.writeFile(path(slot),FS.readFile(path(source)));await flush()}catch(e){if(old)FS.writeFile(path(slot),old);else unroute(()=>FS.unlink(path(slot)));throw e}draw();status.textContent='File copied.'});
          if(data)confirmation('Replace File '+slot+' with a copy of File '+source+'?',copy);else copy();return;
        }
        if(mode==='erase'){if(data||invalid)confirmation('Erase File '+slot+'? This cannot be undone.',()=>perform(async()=>{const old=FS.readFile(path(slot));try{unroute(()=>FS.unlink(path(slot)));await flush()}catch(e){FS.writeFile(path(slot),old);throw e}draw();status.textContent='File erased.'}));return}
        if(invalid){status.textContent='This file is damaged. Import a backup to replace it.';return}
        if(data)confirmation('Open File '+slot+' — '+decode(data.playerName)+'?',()=>launch(slot));else newFile(slot);
      },list);
      b.className='game-file';b.setAttribute('aria-label','File '+slot);
      const number=document.createElement('span');number.className='file-number';number.textContent='File '+slot;
      const info=document.createElement('span');info.className='file-info';
      const name=document.createElement('strong');name.textContent=invalid?'Unreadable file':data?decode(data.playerName):'New file';info.append(name);
      if(data){const hearts=document.createElement('small');hearts.className='file-hearts';const count=Math.max(0,Math.min(20,Math.floor(data.healthCapacity/16)));hearts.textContent='♥'.repeat(count);hearts.setAttribute('aria-label',count+' hearts');info.append(hearts)}
      b.append(number,info);b.disabled=(mode==='copy-source'&&!data)||(mode==='copy-target'&&slot===source)||(mode==='erase'&&!data&&!invalid);
    }
    const controls=document.createElement('div');controls.className='file-actions';body.append(controls);
    if(mode==='browse'){
      button('Copy',()=>draw('copy-source'),controls);button('Erase',()=>draw('erase'),controls);
      button('Import',()=>{mode='import';begin('Restore a saved adventure.');addSaveImport(body,status,[1,2,3,4,5].filter(exists));button('Cancel',cancel)},controls);
    }else button('Cancel',cancel,controls);
    requestAnimationFrame(()=>list.querySelector('button:not(:disabled)')?.focus());
  }
  const timer=setInterval(()=>{
    const api=typeof wasmExports!=='undefined'?wasmExports:null;
    if(ready||!api?.fileChoosePointer.value||api.gameLoaded(1)||!document.querySelector('#overlay.hidden'))return;
    ready=true;clearInterval(timer);
    if(typeof MainLoop!=='undefined')MainLoop.preMainLoop.push(freeze);
    chooser.showModal();draw();
  },100);
  chooser.addEventListener('cancel',e=>{e.preventDefault();cancel()});
  chooser.addEventListener('keydown',e=>{
    if(busy||e.target.matches('input,select,textarea'))return;
    if(['ArrowUp','ArrowDown'].includes(e.code)){
      e.preventDefault();const buttons=Array.from(body.querySelectorAll('button:not(:disabled)')),index=buttons.indexOf(document.activeElement),direction=e.code==='ArrowDown'?1:-1;
      buttons[(index+direction+buttons.length)%buttons.length]?.focus();
    }
    let bindings={};try{bindings=JSON.parse(localStorage.getItem('ocarina.adventure.settings.v1'))?.keys||{}}catch{}
    if(e.code===(bindings.KeyX||'KeyE')){e.preventDefault();document.activeElement?.click()}
    if(e.code===(bindings.KeyC||'KeyF')){e.preventDefault();cancel()}
  });
  for(const type of ['keydown','keyup','mousemove','mousedown','mouseup','wheel','pointermove','pointerdown','pointerup'])chooser.addEventListener(type,e=>e.stopPropagation());
}
