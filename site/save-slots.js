function addSaveSlots(content,status,saveCurrent){
  const box=document.createElement('fieldset');
  box.innerHTML='<legend>Save slots</legend><p>Keep five independent checkpoints. Loading restarts at the original file chooser. Select the game file shown in the confirmation to continue.</p>';
  const flush=()=>new Promise((resolve,reject)=>FS.syncfs(false,e=>e?reject(e):resolve()));
  function draw(){
    box.querySelectorAll('.save-slot').forEach(e=>e.remove());
    for(let slot=1;slot<=5;slot++){
      const path='/Save/checkpoint'+slot+'.sav',exists=FS.analyzePath(path).exists;
      const row=document.createElement('div');row.className='row save-slot';
      const label=document.createElement('span');label.textContent='Slot '+slot+(exists?' · '+new Date(FS.stat(path).mtime).toLocaleString():' · Empty');
      const save=document.createElement('button'),load=document.createElement('button');
      save.textContent='Save';save.setAttribute('aria-label','Save to slot '+slot);
      load.textContent='Load';load.setAttribute('aria-label','Load slot '+slot);load.disabled=!exists;
      async function write(target,bytes){
        const previous=FS.analyzePath(target).exists?FS.readFile(target):null;
        try{FS.writeFile(target,bytes);await flush()}
        catch(e){if(previous)FS.writeFile(target,previous);else FS.unlink(target);await flush().catch(()=>{});throw e}
      }
      async function perform(action){
        if(window.saveSlotBusy)return;
        window.saveSlotBusy=true;box.querySelectorAll('button').forEach(b=>b.disabled=true);
        try{await action()}catch(e){status.textContent='Save slot failed. '+e.message}
        finally{window.saveSlotBusy=false;draw()}
      }
      save.onclick=()=>perform(async()=>{
        if(exists&&!confirm('Replace Slot '+slot+' with your current progress?'))return;
        const source=await saveCurrent();if(!source)return;
        await write(path,FS.readFile(source));status.textContent='Progress saved to Slot '+slot+'.';
      });
      load.onclick=()=>perform(async()=>{
        const targetSlot=[1,2,3].find(n=>!FS.analyzePath('/Save/file'+n+'.sav').exists)||1;
        const target='/Save/file'+targetSlot+'.sav',occupied=FS.analyzePath(target).exists;
        if(!confirm('Load Slot '+slot+' into File '+targetSlot+' and restart? Select File '+targetSlot+' at the opening screen.'+(occupied?' Its previous save will be kept as a recovery backup.':'')+' Unsaved progress will be lost.'))return;
        if(occupied)await write('/Save/before-slot-load.sav',FS.readFile(target));
        await write(target,FS.readFile(path));location.reload();
      });
      row.append(label,save,load);box.append(row);
    }
  }
  draw();content.append(box);
  if(FS.analyzePath('/Save/before-slot-load.sav').exists){
    const recovery=document.createElement('button');recovery.textContent='Download previous file before slot load';
    recovery.onclick=()=>{const url=URL.createObjectURL(new Blob([FS.readFile('/Save/before-slot-load.sav')]));const a=document.createElement('a');a.href=url;a.download='before-slot-load.sav';a.click();setTimeout(()=>URL.revokeObjectURL(url),3000)};
    content.append(recovery);
  }
}
