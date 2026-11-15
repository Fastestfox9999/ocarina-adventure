// Keep a stalled download recoverable without clearing saves or site data.
addEventListener('DOMContentLoaded',()=>{
  const overlay=document.querySelector('#overlay');if(!overlay)return;
  const help=document.createElement('div');help.className='boot-help';help.hidden=true;
  const message=document.createElement('p');message.textContent='The first launch downloads the game and textures. If loading stalls, try the smaller Classic texture pack.';
  const retry=document.createElement('button');retry.textContent='Retry loading';retry.onclick=()=>location.reload();
  const classic=document.createElement('button');classic.textContent='Start with Classic textures';classic.onclick=()=>{
    const key='ocarina.adventure.settings.v1';let prefs={};try{prefs=JSON.parse(localStorage.getItem(key))||{}}catch{}
    prefs.texturePack='classic';localStorage.setItem(key,JSON.stringify(prefs));location.reload();
  };
  help.append(message,retry,classic);overlay.append(help);
  if(location.protocol==='file:'){
    help.replaceChildren();const text=document.createElement('p');text.textContent='The downloaded repository cannot run by opening index.html directly. Open the playable website instead:';
    const link=document.createElement('a');link.textContent='Play Ocarina of Time';link.href='https://fastestfox9999.github.io/ocarina-adventure/?update=original12';help.append(text,link);help.hidden=false;
  }else setTimeout(()=>{if(!overlay.classList.contains('hidden'))help.hidden=false},12000);
});
