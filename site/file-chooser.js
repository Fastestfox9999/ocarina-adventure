// Give each browser profile five real save files. The native engine works with
// slot zero internally; its file1 operations are routed to the chosen profile.
function installFileChooser(){
  const selected=Number(sessionStorage.getItem('ocarina.selectedFile')||1);
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
  const chooser=document.createElement('dialog');chooser.className='adventure file-chooser';
  chooser.setAttribute('aria-label','Choose a game file');
  chooser.innerHTML='<header><h2>Choose a file</h2></header><section><label>New adventure name <input id="adventure-name" value="Link" maxlength="8" pattern="[A-Za-z0-9 ]{1,8}"></label><div id="file-list"></div><p>Five separate adventures. M opens settings after you enter the game.</p></section><footer role="status"></footer>';
  document.body.append(chooser);
  const flush=()=>new Promise((resolve,reject)=>FS.syncfs(false,e=>e?reject(e):resolve()));
  let ready=false,loading=false;
  const launch=sessionStorage.getItem('ocarina.launchFile');
  sessionStorage.removeItem('ocarina.launchFile');
  const timer=setInterval(()=>{
    const api=typeof wasmExports!=='undefined'?wasmExports:null;
    if(!api?.fileChoosePointer.value||api.gameLoaded(1)||!document.querySelector('#overlay.hidden'))return;
    if(ready)return;ready=true;
    if(launch===String(selected)){load();return}
    for(let slot=1;slot<=5;slot++){
      const path='/Save/file'+slot+'.sav',exists=FS.analyzePath(path).exists;
      const button=document.createElement('button');button.className='game-file';button.setAttribute('aria-label','File '+slot);
      button.textContent='File '+slot+' · '+(exists?'Continue':'New adventure');
      button.onclick=async()=>{
        if(loading)return;loading=true;button.disabled=true;
        try{
          if(!exists){
            const input=chooser.querySelector('input');if(!input.reportValidity())return;
            const response=await fetch('new-game.json');if(!response.ok)throw Error('New-game data could not load.');
            const data=await response.json(),name=input.value.trim()||'Link';
            data.sections.base.data.playerName=Array.from(name.padEnd(8),c=>/[A-Z]/.test(c)?171+c.charCodeAt(0)-65:/[a-z]/.test(c)?197+c.charCodeAt(0)-97:/[0-9]/.test(c)?Number(c):223);
            FS.writeFile(path,JSON.stringify(data));await flush();
          }
          sessionStorage.setItem('ocarina.selectedFile',slot);
          sessionStorage.setItem('ocarina.launchFile',slot);
          location.reload();
        }catch(e){chooser.querySelector('footer').textContent=e.message}
        finally{loading=false;button.disabled=false}
      };
      chooser.querySelector('#file-list').append(button);
    }
    chooser.showModal();
  },100);
  function load(){
    const pointer=wasmExports.fileChoosePointer.value;
    // FileChoose_LoadGame reads buttonIndex at this pinned build's verified offset.
    HEAP16[(pointer+0x3122c)>>>1]=0;
    wasmExports.fileChooseLoad(pointer);
    clearInterval(timer);
  }
  chooser.addEventListener('cancel',e=>e.preventDefault());
  for(const type of ['keydown','keyup','mousemove','mousedown','mouseup','wheel','pointermove','pointerdown','pointerup'])chooser.addEventListener(type,e=>e.stopPropagation());
}
