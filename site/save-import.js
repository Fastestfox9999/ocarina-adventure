// Import while paused, then restart so the engine reads fresh slot metadata.
function addSaveImport(content, status, occupied) {
  const group=document.createElement('fieldset');
  group.innerHTML='<legend>Restore a backup</legend><label>Destination <select aria-label="Import destination"></select></label><p>Import a Ship of Harkinian .sav file. The game will restart at file select. Save any current progress first.</p><button type="button">Import backup…</button><input type="file" hidden accept=".sav,.json">';
  const destination=group.querySelector('select'),picker=group.querySelector('input'),button=group.querySelector('button');
  for(const slot of [1,2,3,4,5])destination.add(new Option('File '+slot+(occupied.includes(slot)?' · occupied':' · empty'),slot));
  destination.value=[1,2,3,4,5].find(slot=>!occupied.includes(slot))||1;
  button.onclick=()=>picker.click();
  picker.onchange=async()=>{
    const file=picker.files[0];if(!file)return;
    const slot=Number(destination.value),path='/Save/file'+slot+'.sav';
    let previous,changed=false;
    const flush=()=>new Promise((resolve,reject)=>FS.syncfs(false,error=>error?reject(error):resolve()));
    try{
      button.disabled=true;destination.disabled=true;
      if(file.size>16*1024*1024)throw Error('This file is too large for a game save.');
      const bytes=new Uint8Array(await file.arrayBuffer());
      let doc;try{doc=JSON.parse(new TextDecoder().decode(bytes))}catch{throw Error('Choose a Ship of Harkinian .sav backup.')}
      const base=doc?.sections?.base,data=base?.data;
      if(doc?.version!==1||![1,2,3,4].includes(base?.version)||!Array.isArray(data?.playerName)||data.playerName.length!==8||!Array.isArray(data.inventory?.items)||data.inventory.items.length!==24||!Number.isInteger(data.healthCapacity)||Object.values(doc.sections).some(s=>!Number.isInteger(s?.version)||typeof s.data!=='object'||s.data===null))throw Error('Unsupported or incomplete save file.');
      const exists=FS.analyzePath(path).exists;
      if(!confirm((exists?'Replace the current save in File '+slot:'Import this backup into File '+slot)+' and restart the game?'))return;
      previous=exists?FS.readFile(path):null;
      FS.writeFile(path,bytes);changed=true;await flush();
      location.reload();
    }catch(error){
      if(changed){if(previous)FS.writeFile(path,previous);else FS.unlink(path);try{await flush()}catch{}}
      status.textContent='Import failed. '+error.message;
    }finally{button.disabled=false;destination.disabled=false;picker.value=''}
  };
  content.append(group);
}
